import { Router } from "express";
import { z } from "zod";
import { MissionService } from "../services/missionService";
import { SettlementExecutionService } from "../services/settlementExecutionService";
import { X402Adapter } from "../services/x402Adapter";
import { buildSettlementPlan } from "../services/settlementService";
import { requireAdminApiKey } from "../middleware/auth";

type AsyncRoute = (request: any, response: any, next: any) => Promise<unknown>;

function asyncHandler(handler: AsyncRoute) {
  return (request: any, response: any, next: any) => {
    void handler(request, response, next).catch(next);
  };
}

const createMissionSchema = z.object({
  title: z.string().min(1),
  problemStatement: z.string().min(1),
  budgetDrops: z.string().regex(/^\d+$/),
  feeBps: z.number().int().min(0).max(10_000),
  companyWallet: z.string().min(1)
});

const fundMissionSchema = z.object({
  finishAfterSeconds: z.number().int().positive().optional(),
  cancelAfterSeconds: z.number().int().positive().optional()
});

const contributionSchema = z.object({
  contributorId: z.string().min(1),
  contributorWallet: z.string().min(1),
  title: z.string().optional(),
  content: z.string().min(1)
});

const resolveMissionSchema = z.object({
  minScoreThreshold: z.number().min(0),
  notes: z.string().optional(),
  scores: z.array(
    z.object({
      contributionId: z.string().min(1),
      score: z.number().min(0)
    })
  )
});

const queryAgentSchema = z.object({
  question: z.string().min(3).max(1000)
});

export function createMissionRouter(
  missionService: MissionService,
  settlementExecutionService: SettlementExecutionService,
  x402Adapter: X402Adapter
): Router {
  const router = Router();

  router.get("/", asyncHandler(async (_request, response) => {
    const missions = await missionService.listMissions();
    response.json({ missions });
  }));

  router.post("/", requireAdminApiKey, asyncHandler(async (request, response) => {
    const input = createMissionSchema.parse(request.body);
    const mission = await missionService.createMission(input);
    response.status(201).json({ mission });
  }));

  router.get("/:id", asyncHandler(async (request, response) => {
    const mission = await missionService.getMission(request.params.id);
    const settlementPreview =
      mission.status === "resolved"
        ? buildSettlementPlan(
            {
              budgetDrops: mission.budgetDrops,
              feeBps: mission.feeBps,
              contributions: mission.contributions
            },
            mission.resolution?.minScoreThreshold ?? 0
          )
        : undefined;

    response.json({ mission, settlementPreview });
  }));

  router.post("/:id/fund", requireAdminApiKey, asyncHandler(async (request, response) => {
    const input = fundMissionSchema.parse(request.body ?? {});
    const mission = await settlementExecutionService.fundMission(request.params.id, input);
    response.json({ mission });
  }));

  router.post("/:id/contributions", requireAdminApiKey, asyncHandler(async (request, response) => {
    const input = contributionSchema.parse(request.body);
    const mission = await missionService.addContribution(request.params.id, input);
    response.status(201).json({ mission, contribution: mission.contributions.at(-1) });
  }));

  router.post("/:id/resolve", requireAdminApiKey, asyncHandler(async (request, response) => {
    const input = resolveMissionSchema.parse(request.body);
    const result = await missionService.resolveMission(request.params.id, input);
    response.json(result);
  }));

  router.post("/:id/settle", requireAdminApiKey, asyncHandler(async (request, response) => {
    const result = await settlementExecutionService.settleMission(request.params.id);
    response.json(result);
  }));

  router.post("/:id/cancel", requireAdminApiKey, asyncHandler(async (request, response) => {
    const result = await settlementExecutionService.cancelMission(request.params.id);
    response.json(result);
  }));

  router.post("/:id/submit-paid", requireAdminApiKey, asyncHandler(async (request, response) => {
    const input = contributionSchema.parse(request.body);
    const paymentHeader = request.header("x-payment-proof");

    if (!x402Adapter.validatePaymentHeader(paymentHeader ?? undefined)) {
      return response.status(402).json(
        x402Adapter.buildPaymentRequiredPayload({
          missionId: request.params.id,
          purpose: "submission",
          resource: `/missions/${request.params.id}/submit-paid`
        })
      );
    }

    const mission = await missionService.addContribution(request.params.id, input);
    return response.status(201).json({ mission, contribution: mission.contributions.at(-1) });
  }));

  router.post("/:id/query-agent", asyncHandler(async (request, response) => {
    const input = queryAgentSchema.parse(request.body);
    const paymentHeader = request.header("x-payment-proof");
    const mission = await missionService.getMission(request.params.id);

    if (!x402Adapter.validatePaymentHeader(paymentHeader ?? undefined)) {
      return response.status(402).json(
        x402Adapter.buildPaymentRequiredPayload({
          missionId: request.params.id,
          purpose: "context_query",
          amountDrops: 10,
          resource: `/missions/${request.params.id}/query-agent`
        })
      );
    }

    const responsePayload = {
      missionId: mission.id,
      question: input.question,
      answer: {
        missionSummary: mission.problemStatement,
        evaluationFocus: [
          "Reward marginal improvement to the final solution.",
          "Do not reward redundant or low-signal work.",
          "Maximize solved outcomes rather than participation."
        ],
        suggestedContributionAngles: [
          "Provide unique information or reasoning the other contributors did not add.",
          "Target measurable improvements in solution quality, relevance, or completeness.",
          "Explain why the contribution changes the probability of solving the mission."
        ],
        currentSignal: {
          contributionCount: mission.contributions.length,
          status: mission.status
        }
      }
    };

    return response.json(responsePayload);
  }));

  router.get("/:id/premium-context", asyncHandler(async (request, response) => {
    const paymentHeader = request.header("x-payment-proof");
    const mission = await missionService.getMission(request.params.id);

    if (!x402Adapter.validatePaymentHeader(paymentHeader ?? undefined)) {
      return response.status(402).json(
        x402Adapter.buildPaymentRequiredPayload({
          missionId: request.params.id,
          purpose: "premium_context",
          amountDrops: 10,
          resource: `/missions/${request.params.id}/premium-context`
        })
      );
    }

    return response.json({
      missionId: mission.id,
      premiumContext: {
        doctrine: [
          "Maximize the probability of solving the problem in the best possible way.",
          "Only contributions that materially improve the final solution should be paid.",
          "There is no requirement for a single winner."
        ],
        evaluationCriteria: [
          "relevance",
          "usefulness",
          "uniqueness",
          "marginal improvement to final solution"
        ],
        missionStatus: mission.status,
        existingContributions: mission.contributions.map((contribution) => ({
          contributorId: contribution.contributorId,
          title: contribution.title ?? null,
          score: contribution.score ?? null
        }))
      }
    });
  }));

  return router;
}
