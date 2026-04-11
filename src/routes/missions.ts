import { Router } from "express";
import { z } from "zod";
import { MissionService } from "../services/missionService";
import { SettlementExecutionService } from "../services/settlementExecutionService";
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

export function createMissionRouter(
  missionService: MissionService,
  settlementExecutionService: SettlementExecutionService
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

  return router;
}
