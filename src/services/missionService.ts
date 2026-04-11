import { v4 as uuidv4 } from "uuid";
import { config } from "../config";
import {
  CreateContributionInput,
  CreateMissionInput,
  FundMissionInput,
  Mission,
  ResolveMissionInput,
  SettlementPlan
} from "../types";
import { StorageService } from "./storageService";
import { ScoringService } from "./scoringService";
import { buildSettlementPlan } from "./settlementService";

export class MissionService {
  constructor(
    private readonly storageService: StorageService,
    private readonly scoringService: ScoringService,
    private readonly platformWallet: string,
    private readonly treasuryWallet: string
  ) {}

  async listMissions(): Promise<Mission[]> {
    return this.storageService.listMissions();
  }

  async getMission(id: string): Promise<Mission> {
    const missions = await this.storageService.listMissions();
    const mission = missions.find((item) => item.id === id);

    if (!mission) {
      throw new Error(`Mission ${id} not found`);
    }

    return mission;
  }

  async createMission(input: CreateMissionInput): Promise<Mission> {
    if (!/^\d+$/.test(input.budgetDrops)) {
      throw new Error("budgetDrops must be a non-negative integer string in drops");
    }

    if (!Number.isInteger(input.feeBps) || input.feeBps < 0 || input.feeBps > 10_000) {
      throw new Error("feeBps must be an integer between 0 and 10000");
    }

    const now = new Date().toISOString();
    const mission: Mission = {
      id: uuidv4(),
      title: input.title,
      problemStatement: input.problemStatement,
      companyWallet: input.companyWallet,
      platformWallet: this.platformWallet,
      treasuryWallet: this.treasuryWallet,
      budgetDrops: input.budgetDrops,
      feeBps: input.feeBps,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      contributions: []
    };

    return this.storageService.saveMission(mission);
  }

  async attachPlatformWallets(missionId: string, platformWallet: string, treasuryWallet: string): Promise<Mission> {
    const mission = await this.getMission(missionId);

    const updated: Mission = {
      ...mission,
      platformWallet,
      treasuryWallet,
      updatedAt: new Date().toISOString()
    };

    return this.storageService.saveMission(updated);
  }

  async markFunded(
    missionId: string,
    escrow: Mission["escrow"],
    status: Mission["status"] = "open"
  ): Promise<Mission> {
    const mission = await this.getMission(missionId);

    const updated: Mission = {
      ...mission,
      escrow,
      status,
      updatedAt: new Date().toISOString()
    };

    return this.storageService.saveMission(updated);
  }

  async addContribution(missionId: string, input: CreateContributionInput): Promise<Mission> {
    const mission = await this.getMission(missionId);

    if (!["funded", "open"].includes(mission.status)) {
      throw new Error("Contributions can only be added to funded or open missions");
    }

    const updated: Mission = {
      ...mission,
      contributions: [
        ...mission.contributions,
        {
          id: uuidv4(),
          contributorId: input.contributorId,
          contributorWallet: input.contributorWallet,
          title: input.title,
          content: input.content
        }
      ],
      updatedAt: new Date().toISOString()
    };

    return this.storageService.saveMission(updated);
  }

  async resolveMission(missionId: string, input: ResolveMissionInput): Promise<{ mission: Mission; plan: SettlementPlan }> {
    const mission = await this.getMission(missionId);

    if (!["funded", "open"].includes(mission.status)) {
      throw new Error("Only funded or open missions can be resolved");
    }

    if (mission.contributions.length === 0) {
      throw new Error("Mission has no contributions to resolve");
    }

    const scoreMap = this.scoringService.validateScores(input.scores);

    const contributions = mission.contributions.map((contribution) => ({
      ...contribution,
      score: scoreMap.get(contribution.id) ?? 0
    }));

    const plan = buildSettlementPlan(
      {
        budgetDrops: mission.budgetDrops,
        feeBps: mission.feeBps,
        contributions
      },
      input.minScoreThreshold
    );

    const enrichedContributions = contributions.map((contribution) => {
      const payout = plan.payouts.find((item) => item.contributionId === contribution.id);

      return {
        ...contribution,
        qualifies: payout?.qualifies ?? false,
        normalizedWeight: payout?.normalizedWeight ?? 0,
        payoutDrops: payout?.payoutDrops ?? "0"
      };
    });

    const updated: Mission = {
      ...mission,
      contributions: enrichedContributions,
      resolution: {
        resolvedAt: new Date().toISOString(),
        minScoreThreshold: input.minScoreThreshold,
        totalQualifiedWeight: plan.totalQualifiedWeight,
        platformFeeDrops: plan.platformFeeDrops,
        contributorPoolDrops: plan.contributorPoolDrops,
        notes: input.notes
      },
      status: "resolved",
      updatedAt: new Date().toISOString()
    };

    return {
      mission: await this.storageService.saveMission(updated),
      plan
    };
  }

  async markPaid(missionId: string, payoutTxHashes: string[]): Promise<Mission> {
    const mission = await this.getMission(missionId);

    const updated: Mission = {
      ...mission,
      payoutTxHashes,
      status: "paid",
      updatedAt: new Date().toISOString()
    };

    return this.storageService.saveMission(updated);
  }

  async markCanceled(missionId: string, status: Mission["status"]): Promise<Mission> {
    const mission = await this.getMission(missionId);

    const updated: Mission = {
      ...mission,
      status,
      updatedAt: new Date().toISOString()
    };

    return this.storageService.saveMission(updated);
  }

  getFundingDefaults(input?: FundMissionInput): { finishAfter?: number; cancelAfter: number } {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const finishAfterSeconds = input?.finishAfterSeconds ?? config.defaultEscrowFinishAfterSeconds;
    const cancelAfterSeconds = input?.cancelAfterSeconds ?? config.defaultEscrowCancelAfterSeconds;

    return {
      finishAfter: finishAfterSeconds > 0 ? nowSeconds + finishAfterSeconds : undefined,
      cancelAfter: nowSeconds + cancelAfterSeconds
    };
  }
}
