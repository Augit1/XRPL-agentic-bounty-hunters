import { Router } from "express";
import { z } from "zod";
import { config } from "../config";
import { MissionService } from "../services/missionService";
import { SettlementExecutionService } from "../services/settlementExecutionService";
import { buildSettlementPlan, calculateFeeAndPool } from "../services/settlementService";
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

const intakeMissionSchema = z.object({
  title: z.string().min(1),
  problemStatement: z.string().min(1),
  budgetDrops: z.string().regex(/^\d+$/),
  companyWallet: z.string().min(1)
});

function buildClarificationBrief(input: z.infer<typeof intakeMissionSchema>) {
  const { totalBudget, platformFee, contributorPool } = calculateFeeAndPool(input.budgetDrops, config.platformFeeBps);
  const isParisTransitMission = /montparnasse|charles de gaulle|cdg|paris/i.test(
    `${input.title} ${input.problemStatement}`
  );

  if (isParisTransitMission) {
    return {
      intakeSummary:
        'The platform agent reframed this into a high-stakes urban mobility mission: design a credible path to a 20-minute connection between Paris Montparnasse and Charles de Gaulle Airport.',
      clarifyingQuestions: [
        "Is the 20-minute target expected to be a transfer-free connection or can a tightly managed interchange be acceptable?",
        "What trade-off matters most to the company: speed to deployment, capital efficiency, or long-term system throughput?",
        "Which constraints must be respected: heritage/tunneling limits, disruption during construction, airport security flows, or integration with existing RER/Metro/TGV lines?"
      ],
      structuredMission: {
        objective: input.problemStatement,
        expectedOutputs: [
          "A corridor or service design that makes a 20-minute Montparnasse-to-CDG journey plausible",
          "Station, interchange, and passenger-flow improvements that reduce transfer friction",
          "A phased implementation path with explicit assumptions, risks, and integration points across the Paris rail network"
        ],
        successCriteria: [
          "The proposal should materially reduce end-to-end travel time with clear operational reasoning.",
          "Contributions should use Paris rail context such as Metro, RER, airport rail access, and interchange bottlenecks.",
          "The strongest work should balance engineering feasibility, travel-time gains, and deployment realism."
        ],
        evaluationDimensions: [
          "travel time reduction",
          "engineering feasibility",
          "network integration",
          "capital efficiency",
          "deployment realism"
        ]
      },
      proposedEconomics: {
        totalBudgetDrops: totalBudget.toString(),
        platformFeeBps: config.platformFeeBps,
        platformFeeDrops: platformFee.toString(),
        contributorPoolDrops: contributorPool.toString()
      }
    };
  }

  return {
    intakeSummary: `The platform agent reframed "${input.title}" into an escrow-backed mission with measurable outcomes and contributor attribution.`,
    clarifyingQuestions: [
      "What does a clearly successful final outcome look like for the company?",
      "Which constraints or failure cases must every contribution respect?",
      "What types of contribution should be rewarded even if they are partial rather than final?"
    ],
    structuredMission: {
      objective: input.problemStatement,
      expectedOutputs: [
        "A stronger final solution that directly improves the target problem",
        "Partial solution bricks that materially improve quality, relevance, or completeness",
        "Evidence explaining why a contribution changes the probability of success"
      ],
      successCriteria: [
        "Contributions should improve the solved outcome, not just add volume.",
        "Redundant or low-signal submissions should receive zero.",
        "Useful partial work should remain rewardable even without a single winner."
      ],
      evaluationDimensions: [
        "relevance",
        "usefulness",
        "uniqueness",
        "marginal improvement to final solution"
      ]
    },
    proposedEconomics: {
      totalBudgetDrops: totalBudget.toString(),
      platformFeeBps: config.platformFeeBps,
      platformFeeDrops: platformFee.toString(),
      contributorPoolDrops: contributorPool.toString()
    }
  };
}

export function createMissionRouter(
  missionService: MissionService,
  settlementExecutionService: SettlementExecutionService
): Router {
  const router = Router();

  router.post("/intake/clarify", asyncHandler(async (request, response) => {
    const input = intakeMissionSchema.parse(request.body);
    response.json({
      clarification: buildClarificationBrief(input)
    });
  }));

  router.post("/intake", asyncHandler(async (request, response) => {
    const input = intakeMissionSchema.parse(request.body);
    const mission = await missionService.createMission({
      ...input,
      feeBps: config.platformFeeBps
    });

    response.status(201).json({
      mission,
      clarification: buildClarificationBrief(input)
    });
  }));

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

  return router;
}
