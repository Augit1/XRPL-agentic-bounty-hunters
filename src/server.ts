import express from "express";
import helmet from "helmet";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config, validateConfig } from "./config";
import { StorageService } from "./services/storageService";
import { ScoringService } from "./services/scoringService";
import { MissionService } from "./services/missionService";
import { SettlementExecutionService } from "./services/settlementExecutionService";
import { xrplService } from "./services/xrplService";
import { X402Adapter } from "./services/x402Adapter";
import { createMissionRouter } from "./routes/missions";
import { requireAdminApiKey } from "./middleware/auth";

async function main(): Promise<void> {
  validateConfig();

  const app = express();
  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use((request, response, next) => {
    const requestId = request.header("x-request-id") ?? randomUUID();
    const startedAt = Date.now();
    response.setHeader("x-request-id", requestId);
    response.on("finish", () => {
      console.log(
        JSON.stringify({
          requestId,
          method: request.method,
          path: request.originalUrl,
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt
        })
      );
    });
    next();
  });
  app.use(express.static(path.resolve(process.cwd(), "public")));

  const storageService = new StorageService(config.databasePath);
  await storageService.initialize();

  const settlementAddress = xrplService.getWalletAddress("settlement");
  const treasuryAddress = xrplService.getWalletAddress("treasury");
  const missionService = new MissionService(storageService, new ScoringService(), settlementAddress, treasuryAddress);
  const settlementExecutionService = new SettlementExecutionService(missionService, xrplService);
  const x402Adapter = new X402Adapter();

  app.get("/health", (_request, response) => {
    response.json({
      ok: true,
      environment: config.nodeEnv,
      appMode: config.appMode,
      xrplServer: config.xrplServer,
      useMockXrpl: config.useMockXrpl,
      allowDemoWallets: config.allowDemoWallets,
      settlementAddress,
      treasuryAddress
    });
  });

  app.get("/app-config", (_request, response) => {
    response.json({
      appMode: config.appMode,
      brand: "Proof of Contribution",
      tagline:
        config.appMode === "demo"
          ? "A guided demonstration of escrow-backed, multi-agent contribution payments on XRPL."
          : "The payment and coordination layer for AI agents doing real work.",
      doctrine: [
        "Maximize the probability of solving the problem in the best possible way.",
        "Payment follows real contribution to the solved outcome.",
        "There is no requirement for a single winner."
      ],
      whitepaperSummary: {
        fundingLayer: "XRPL escrow locks the company budget and guarantees solvency.",
        interactionLayer: "x402-compatible endpoints charge for premium problem intelligence and context access.",
        contributionLayer: "Multiple agents can submit modular or complete contributions.",
        evaluationLayer: "A platform evaluator attributes contribution weights based on usefulness."
      },
      x402: {
        enabled: true,
        contextFeeDrops: config.x402ContextFeeDrops,
        note: "x402 is implemented as a forward-compatible HTTP payment negotiation layer around paid intelligence access."
      },
      demoSharedApiKey: config.appMode === "demo" ? config.demoSharedApiKey || null : null
    });
  });

  app.get("/ready", async (_request, response, next) => {
    try {
      await storageService.ping();
      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.post("/wallets/demo", requireAdminApiKey, async (_request, response) => {
    if (!config.allowDemoWallets) {
      response.status(403).json({
        error: "Demo wallet creation is disabled in this environment"
      });
      return;
    }

    const wallet = await xrplService.createDemoWallet();
    response.status(201).json(wallet);
  });

  app.get("/", (_request, response) => {
    response.sendFile(path.resolve(process.cwd(), "public/index.html"));
  });

  app.use("/missions", createMissionRouter(missionService, settlementExecutionService, x402Adapter));

  app.use((error: unknown, request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unknown server error";
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? ((error as { statusCode: number }).statusCode)
        : 400;

    console.error(
      JSON.stringify({
        level: "error",
        method: request.method,
        path: request.originalUrl,
        message
      })
    );
    response.status(statusCode).json({ error: message });
  });

  const server = app.listen(config.port, config.host, () => {
    console.log(`XRPL mission payment MVP listening on ${config.host}:${config.port}`);
    console.log(`Settlement wallet: ${settlementAddress}`);
    console.log(`Treasury wallet: ${treasuryAddress}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await xrplService.disconnect();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main();
