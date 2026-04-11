export type MissionStatus =
  | "draft"
  | "funded"
  | "open"
  | "resolved"
  | "paid"
  | "expired"
  | "canceled";

export type Contribution = {
  id: string;
  contributorId: string;
  contributorWallet: string;
  title?: string;
  content: string;
  score?: number;
  normalizedWeight?: number;
  payoutDrops?: string;
  qualifies?: boolean;
};

export type EscrowInfo = {
  createTxHash: string;
  sequence?: number;
  owner?: string;
  destination?: string;
  amountDrops: string;
  finishAfter?: number;
  cancelAfter: number;
  ledgerIndex?: number;
};

export type MissionResolution = {
  resolvedAt: string;
  minScoreThreshold: number;
  totalQualifiedWeight: number;
  platformFeeDrops: string;
  contributorPoolDrops: string;
  notes?: string;
};

export type SettlementTransaction = {
  txHash: string;
  kind: "escrow_finish" | "contributor_payout" | "company_refund" | "platform_fee" | "escrow_cancel";
  destinationWallet?: string;
  amountDrops?: string;
};

export type Mission = {
  id: string;
  title: string;
  problemStatement: string;
  companyWallet: string;
  platformWallet: string;
  treasuryWallet: string;
  budgetDrops: string;
  feeBps: number;
  status: MissionStatus;
  createdAt: string;
  updatedAt: string;
  contributions: Contribution[];
  escrow?: EscrowInfo;
  resolution?: MissionResolution;
  payoutTxHashes?: string[];
  settlementTransactions?: SettlementTransaction[];
};

export type CreateMissionInput = {
  title: string;
  problemStatement: string;
  companyWallet: string;
  budgetDrops: string;
  feeBps: number;
};

export type CreateContributionInput = {
  contributorId: string;
  contributorWallet: string;
  content: string;
  title?: string;
};

export type ContributionScoreInput = {
  contributionId: string;
  score: number;
};

export type ResolveMissionInput = {
  minScoreThreshold: number;
  notes?: string;
  scores: ContributionScoreInput[];
};

export type FundMissionInput = {
  finishAfterSeconds?: number;
  cancelAfterSeconds?: number;
};

export type SettlementLineItem = {
  contributionId: string;
  contributorId: string;
  contributorWallet: string;
  qualifies: boolean;
  score: number;
  normalizedWeight: number;
  payoutDrops: string;
};

export type SettlementPlan = {
  totalBudgetDrops: string;
  platformFeeDrops: string;
  contributorPoolDrops: string;
  minScoreThreshold: number;
  totalQualifiedWeight: number;
  payouts: SettlementLineItem[];
};

export type EscrowCreateResult = {
  txHash: string;
  sequence?: number;
  owner?: string;
  destination?: string;
  amountDrops: string;
  finishAfter?: number;
  cancelAfter: number;
  ledgerIndex?: number;
};

export type EscrowFinishResult = {
  txHash: string;
};

export type EscrowCancelResult = {
  txHash: string;
};

export type PaymentResult = {
  txHash: string;
  destination: string;
  amountDrops: string;
};
