import { Contribution, Mission, SettlementPlan, SettlementLineItem } from "../types";

function assertNonNegativeIntegerString(value: string, fieldName: string): bigint {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${fieldName} must be a non-negative integer string in drops`);
  }

  return BigInt(value);
}

function toScaledWeight(score: number, totalScore: number): number {
  if (totalScore <= 0 || score <= 0) {
    return 0;
  }

  return score / totalScore;
}

export function calculateFeeAndPool(budgetDrops: string, feeBps: number): {
  totalBudget: bigint;
  platformFee: bigint;
  contributorPool: bigint;
} {
  const totalBudget = assertNonNegativeIntegerString(budgetDrops, "budgetDrops");

  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 10_000) {
    throw new Error("feeBps must be an integer between 0 and 10000");
  }

  const platformFee = (totalBudget * BigInt(feeBps)) / 10_000n;
  const contributorPool = totalBudget - platformFee;

  return { totalBudget, platformFee, contributorPool };
}

function buildPayouts(contributions: Contribution[], contributorPool: bigint, minScoreThreshold: number): {
  payouts: SettlementLineItem[];
  totalQualifiedWeight: number;
} {
  const scored = contributions.map((contribution) => ({
    contribution,
    score: contribution.score ?? 0,
    qualifies: (contribution.score ?? 0) >= minScoreThreshold
  }));

  const qualified = scored.filter((entry) => entry.qualifies && entry.score > 0);
  const totalQualifiedScore = qualified.reduce((sum, entry) => sum + entry.score, 0);
  const qualifiedContributionIds = new Set(qualified.map((entry) => entry.contribution.id));
  const lastQualifiedContributionId = qualified.at(-1)?.contribution.id;

  let allocated = 0n;

  const payouts = scored.map((entry) => {
    const normalizedWeight =
      entry.qualifies && totalQualifiedScore > 0 ? toScaledWeight(entry.score, totalQualifiedScore) : 0;

    let payout = 0n;

    if (entry.qualifies && totalQualifiedScore > 0) {
      if (entry.contribution.id === lastQualifiedContributionId) {
        payout = contributorPool - allocated;
      } else {
        payout = (contributorPool * BigInt(entry.score)) / BigInt(totalQualifiedScore);
      }

      allocated += payout;
    }

    return {
      contributionId: entry.contribution.id,
      contributorId: entry.contribution.contributorId,
      contributorWallet: entry.contribution.contributorWallet,
      qualifies: entry.qualifies,
      score: entry.score,
      normalizedWeight,
      payoutDrops: payout.toString()
    };
  });

  if (allocated !== contributorPool && qualified.length > 0) {
    let lastQualifiedIndex = -1;
    for (let index = payouts.length - 1; index >= 0; index -= 1) {
      if (qualifiedContributionIds.has(payouts[index].contributionId)) {
        lastQualifiedIndex = index;
        break;
      }
    }

    if (lastQualifiedIndex >= 0) {
      const diff = contributorPool - allocated;
      const corrected = BigInt(payouts[lastQualifiedIndex].payoutDrops) + diff;
      payouts[lastQualifiedIndex].payoutDrops = corrected.toString();
      allocated += diff;
    }
  }

  if (qualified.length === 0) {
    return {
      payouts: payouts.map((item) => ({ ...item, payoutDrops: "0", normalizedWeight: 0 })),
      totalQualifiedWeight: 0
    };
  }

  return { payouts, totalQualifiedWeight: 1 };
}

export function buildSettlementPlan(
  mission: Pick<Mission, "budgetDrops" | "feeBps" | "contributions">,
  minScoreThreshold: number
): SettlementPlan {
  if (!Number.isFinite(minScoreThreshold) || minScoreThreshold < 0) {
    throw new Error("minScoreThreshold must be a non-negative number");
  }

  const { totalBudget, platformFee, contributorPool } = calculateFeeAndPool(mission.budgetDrops, mission.feeBps);
  const { payouts, totalQualifiedWeight } = buildPayouts(mission.contributions, contributorPool, minScoreThreshold);

  const distributed = payouts.reduce((sum, payout) => sum + BigInt(payout.payoutDrops), 0n);

  if (totalQualifiedWeight > 0 && distributed !== contributorPool) {
    throw new Error("Contributor payout total does not match contributor pool");
  }

  return {
    totalBudgetDrops: totalBudget.toString(),
    platformFeeDrops: platformFee.toString(),
    contributorPoolDrops: contributorPool.toString(),
    minScoreThreshold,
    totalQualifiedWeight,
    payouts
  };
}
