import assert from "node:assert/strict";
import { buildSettlementPlan } from "../src/services/settlementService";

const plan = buildSettlementPlan(
  {
    budgetDrops: "1000000",
    feeBps: 1000,
    contributions: [
      {
        id: "a",
        contributorId: "agent-a",
        contributorWallet: "rA",
        content: "A",
        score: 60
      },
      {
        id: "b",
        contributorId: "agent-b",
        contributorWallet: "rB",
        content: "B",
        score: 30
      },
      {
        id: "c",
        contributorId: "agent-c",
        contributorWallet: "rC",
        content: "C",
        score: 0
      }
    ]
  },
  10
);

assert.equal(plan.platformFeeDrops, "100000");
assert.equal(plan.contributorPoolDrops, "900000");
assert.equal(plan.payouts[0].payoutDrops, "600000");
assert.equal(plan.payouts[1].payoutDrops, "300000");
assert.equal(plan.payouts[2].payoutDrops, "0");

console.log("Settlement math test passed");
