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

export const config = {
  port: parseInteger(process.env.PORT, 3000),
  xrplServer: process.env.XRPL_SERVER ?? "wss://s.altnet.rippletest.net:51233",
  xrplExplorerBaseUrl: process.env.XRPL_EXPLORER_BASE_URL ?? "https://testnet.xrpl.org",
  missionStorePath: path.resolve(cwd, process.env.MISSION_STORE_PATH ?? "./data/missions.json"),
  settlementSeed: process.env.XRPL_SETTLEMENT_SEED ?? "",
  treasurySeed: process.env.XRPL_TREASURY_SEED ?? "",
  companySeed: process.env.XRPL_COMPANY_SEED ?? "",
  useMockXrpl: parseBoolean(process.env.USE_MOCK_XRPL, false),
  defaultEscrowFinishAfterSeconds: parseInteger(process.env.DEFAULT_ESCROW_FINISH_AFTER_SECONDS, 10),
  defaultEscrowCancelAfterSeconds: parseInteger(process.env.DEFAULT_ESCROW_CANCEL_AFTER_SECONDS, 600)
};
