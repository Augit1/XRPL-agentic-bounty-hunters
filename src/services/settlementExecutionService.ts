import { MissionService } from "./missionService";
import { buildSettlementPlan } from "./settlementService";
import { XrplService } from "./xrplService";
import { Mission } from "../types";

export class SettlementExecutionService {
  constructor(
    private readonly missionService: MissionService,
    private readonly xrplService: XrplService
  ) {}

  async fundMission(missionId: string, input?: { finishAfterSeconds?: number; cancelAfterSeconds?: number }): Promise<Mission> {
    const mission = await this.missionService.getMission(missionId);

    if (mission.status !== "draft") {
      throw new Error("Only draft missions can be funded");
    }

    if (!mission.platformWallet) {
      throw new Error("Platform settlement wallet is not configured on the mission");
    }

    const timing = this.missionService.getFundingDefaults(input);
    const escrow = await this.xrplService.createEscrow({
      destination: mission.platformWallet,
      amountDrops: mission.budgetDrops,
      finishAfter: timing.finishAfter,
      cancelAfter: timing.cancelAfter,
      missionId: mission.id
    });

    return this.missionService.markFunded(missionId, {
      createTxHash: escrow.txHash,
      sequence: escrow.sequence,
      owner: escrow.owner,
      destination: escrow.destination,
      amountDrops: escrow.amountDrops,
      finishAfter: escrow.finishAfter,
      cancelAfter: escrow.cancelAfter,
      ledgerIndex: escrow.ledgerIndex
    });
  }

  async settleMission(missionId: string): Promise<{ mission: Mission; payoutTxHashes: string[] }> {
    const mission = await this.missionService.getMission(missionId);

    if (mission.status !== "resolved") {
      throw new Error("Only resolved missions can be settled");
    }

    if (!mission.escrow?.owner || mission.escrow.sequence === undefined) {
      throw new Error("Mission escrow metadata is incomplete");
    }

    const plan = buildSettlementPlan(
      {
        budgetDrops: mission.budgetDrops,
        feeBps: mission.feeBps,
        contributions: mission.contributions
      },
      mission.resolution?.minScoreThreshold ?? 0
    );

    const payoutTxHashes: string[] = [];

    const finishResult = await this.xrplService.finishEscrow({
      owner: mission.escrow.owner,
      offerSequence: mission.escrow.sequence
    });
    payoutTxHashes.push(finishResult.txHash);

    for (const payout of plan.payouts) {
      if (!payout.qualifies || payout.payoutDrops === "0") {
        continue;
      }

      const result = await this.xrplService.sendPayment({
        destination: payout.contributorWallet,
        amountDrops: payout.payoutDrops,
        sourceRole: "settlement"
      });
      payoutTxHashes.push(result.txHash);
    }

    if (plan.totalQualifiedWeight === 0 && plan.contributorPoolDrops !== "0") {
      const refundResult = await this.xrplService.sendPayment({
        destination: mission.companyWallet,
        amountDrops: plan.contributorPoolDrops,
        sourceRole: "settlement"
      });
      payoutTxHashes.push(refundResult.txHash);
    }

    if (plan.platformFeeDrops !== "0" && mission.treasuryWallet && mission.treasuryWallet !== mission.platformWallet) {
      const feeResult = await this.xrplService.sendPayment({
        destination: mission.treasuryWallet,
        amountDrops: plan.platformFeeDrops,
        sourceRole: "settlement"
      });
      payoutTxHashes.push(feeResult.txHash);
    }

    return {
      mission: await this.missionService.markPaid(missionId, payoutTxHashes),
      payoutTxHashes
    };
  }

  async cancelMission(missionId: string): Promise<{ mission: Mission; txHash: string }> {
    const mission = await this.missionService.getMission(missionId);

    if (!mission.escrow?.owner || mission.escrow.sequence === undefined) {
      throw new Error("Mission has no cancelable escrow");
    }

    const nowSeconds = Math.floor(Date.now() / 1000);

    if (nowSeconds < mission.escrow.cancelAfter) {
      throw new Error("Escrow cancel window has not opened yet");
    }

    const result = await this.xrplService.cancelEscrow({
      owner: mission.escrow.owner,
      offerSequence: mission.escrow.sequence
    });

    return {
      mission: await this.missionService.markCanceled(missionId, "canceled"),
      txHash: result.txHash
    };
  }
}
