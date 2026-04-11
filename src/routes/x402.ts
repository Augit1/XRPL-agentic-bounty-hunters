import { Router } from "express";
import { z } from "zod";
import { MissionService } from "../services/missionService";
import { X402Adapter } from "../services/x402Adapter";
import { requireAdminApiKey } from "../middleware/auth";

type AsyncRoute = (request: any, response: any, next: any) => Promise<unknown>;

function asyncHandler(handler: AsyncRoute) {
  return (request: any, response: any, next: any) => {
    void handler(request, response, next).catch(next);
  };
}

const queryAgentSchema = z.object({
  missionId: z.string().min(1),
  question: z.string().min(3).max(1000)
});

export function createX402Router(missionService: MissionService, x402Adapter: X402Adapter): Router {
  const router = Router();

  router.use(x402Adapter.createQueryMiddleware());

  router.get("/status", (_request, response) => {
    response.json(x402Adapter.getPublicStatus());
  });

  router.post("/query-agent", asyncHandler(async (request, response) => {
    if (!x402Adapter.isEnabled()) {
      return response.status(503).json({
        error: "x402 is not configured on this deployment.",
        ...x402Adapter.getPublicStatus()
      });
    }

    const input = queryAgentSchema.parse(request.body);
    const mission = await missionService.getMission(input.missionId);
    return response.json(x402Adapter.buildQueryResponse(mission, input.question));
  }));

  router.post("/demo/query-agent", requireAdminApiKey, asyncHandler(async (request, response) => {
    const input = queryAgentSchema.parse(request.body);
    const result = await x402Adapter.runDemoQuery(input);
    response.json(result);
  }));

  return router;
}
