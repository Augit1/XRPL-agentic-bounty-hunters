import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const cwd = process.cwd();

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === "true";
}

function parseInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseAppMode(value: string | undefined): "demo" | "production" {
  return value === "demo" ? "demo" : "production";
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  appMode: parseAppMode(process.env.APP_MODE),
  port: parseInteger(process.env.PORT, 3000),
  host: process.env.HOST ?? "0.0.0.0",
  xrplServer: process.env.XRPL_SERVER ?? "wss://s.altnet.rippletest.net:51233",
  xrplExplorerBaseUrl: process.env.XRPL_EXPLORER_BASE_URL ?? "https://testnet.xrpl.org",
  databasePath: path.resolve(cwd, process.env.DATABASE_PATH ?? "./data/app.db"),
  adminApiKey: process.env.ADMIN_API_KEY ?? "",
  demoSharedApiKey: process.env.DEMO_SHARED_API_KEY ?? "",
  settlementSeed: process.env.XRPL_SETTLEMENT_SEED ?? "",
  treasurySeed: process.env.XRPL_TREASURY_SEED ?? "",
  companySeed: process.env.XRPL_COMPANY_SEED ?? "",
  useMockXrpl: parseBoolean(process.env.USE_MOCK_XRPL, false),
  allowDemoWallets: parseBoolean(process.env.ALLOW_DEMO_WALLETS, true),
  x402ContextFeeDrops: parseInteger(process.env.X402_CONTEXT_FEE_DROPS, 10),
  defaultEscrowFinishAfterSeconds: parseInteger(process.env.DEFAULT_ESCROW_FINISH_AFTER_SECONDS, 10),
  defaultEscrowCancelAfterSeconds: parseInteger(process.env.DEFAULT_ESCROW_CANCEL_AFTER_SECONDS, 600)
};

export function validateConfig(): void {
  if (!config.adminApiKey) {
    throw new Error("ADMIN_API_KEY is required");
  }

  if (!config.useMockXrpl) {
    if (!config.settlementSeed) {
      throw new Error("XRPL_SETTLEMENT_SEED is required when USE_MOCK_XRPL=false");
    }

    if (!config.treasurySeed) {
      throw new Error("XRPL_TREASURY_SEED is required when USE_MOCK_XRPL=false");
    }

    if (!config.companySeed) {
      throw new Error("XRPL_COMPANY_SEED is required when USE_MOCK_XRPL=false");
    }
  }
}
