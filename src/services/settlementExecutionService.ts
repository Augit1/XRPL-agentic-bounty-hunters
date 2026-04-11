import { MissionService } from "./missionService";
import { buildSettlementPlan } from "./settlementService";
import { XrplService } from "./xrplService";
import { Mission, SettlementTransaction } from "../types";

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
    const settlementTransactions: SettlementTransaction[] = [];

    const finishResult = await this.xrplService.finishEscrow({
      owner: mission.escrow.owner,
      offerSequence: mission.escrow.sequence
    });
    payoutTxHashes.push(finishResult.txHash);
    settlementTransactions.push({
      txHash: finishResult.txHash,
      kind: "escrow_finish"
    });

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
      settlementTransactions.push({
        txHash: result.txHash,
        kind: "contributor_payout",
        destinationWallet: payout.contributorWallet,
        amountDrops: payout.payoutDrops
      });
    }

    if (plan.totalQualifiedWeight === 0 && plan.contributorPoolDrops !== "0") {
      const refundResult = await this.xrplService.sendPayment({
        destination: mission.companyWallet,
        amountDrops: plan.contributorPoolDrops,
        sourceRole: "settlement"
      });
      payoutTxHashes.push(refundResult.txHash);
      settlementTransactions.push({
        txHash: refundResult.txHash,
        kind: "company_refund",
        destinationWallet: mission.companyWallet,
        amountDrops: plan.contributorPoolDrops
      });
    }

    if (plan.platformFeeDrops !== "0" && mission.treasuryWallet && mission.treasuryWallet !== mission.platformWallet) {
      const feeResult = await this.xrplService.sendPayment({
        destination: mission.treasuryWallet,
        amountDrops: plan.platformFeeDrops,
        sourceRole: "settlement"
      });
      payoutTxHashes.push(feeResult.txHash);
      settlementTransactions.push({
        txHash: feeResult.txHash,
        kind: "platform_fee",
        destinationWallet: mission.treasuryWallet,
        amountDrops: plan.platformFeeDrops
      });
    }

    return {
      mission: await this.missionService.markPaid(missionId, payoutTxHashes, settlementTransactions),
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
      mission: await this.missionService.markCanceledWithTransaction(missionId, result.txHash),
      txHash: result.txHash
    };
  }
}
