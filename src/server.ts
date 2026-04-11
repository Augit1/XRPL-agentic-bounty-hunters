import express from "express";
import helmet from "helmet";
import path from "node:path";
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
  app.use(express.static(path.resolve(process.cwd(), "public")));

  const storageService = new StorageService(config.missionStorePath);
  await storageService.ensureStore();

  const settlementAddress = xrplService.getWalletAddress("settlement");
  const treasuryAddress = xrplService.getWalletAddress("treasury");
  const missionService = new MissionService(storageService, new ScoringService(), settlementAddress, treasuryAddress);
  const settlementExecutionService = new SettlementExecutionService(missionService, xrplService);
  const x402Adapter = new X402Adapter();

  app.get("/health", (_request, response) => {
    response.json({
      ok: true,
      environment: config.nodeEnv,
      xrplServer: config.xrplServer,
      useMockXrpl: config.useMockXrpl,
      allowDemoWallets: config.allowDemoWallets,
      settlementAddress,
      treasuryAddress
    });
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

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unknown server error";
    response.status(400).json({ error: message });
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
