import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Contribution, EscrowInfo, Mission, MissionResolution, SettlementTransaction } from "../types";

type MissionRow = {
  id: string;
  title: string;
  problem_statement: string;
  company_wallet: string;
  platform_wallet: string;
  treasury_wallet: string;
  budget_drops: string;
  fee_bps: number;
  status: string;
  created_at: string;
  updated_at: string;
  escrow_create_tx_hash: string | null;
  escrow_sequence: number | null;
  escrow_owner: string | null;
  escrow_destination: string | null;
  escrow_amount_drops: string | null;
  escrow_finish_after: number | null;
  escrow_cancel_after: number | null;
  escrow_ledger_index: number | null;
  resolution_resolved_at: string | null;
  resolution_min_score_threshold: number | null;
  resolution_total_qualified_weight: number | null;
  resolution_platform_fee_drops: string | null;
  resolution_contributor_pool_drops: string | null;
  resolution_notes: string | null;
};

type ContributionRow = {
  id: string;
  mission_id: string;
  contributor_id: string;
  contributor_wallet: string;
  title: string | null;
  content: string;
  score: number | null;
  normalized_weight: number | null;
  payout_drops: string | null;
  qualifies: number | null;
};

type SettlementTransactionRow = {
  mission_id: string;
  tx_hash: string;
  kind: SettlementTransaction["kind"];
  destination_wallet: string | null;
  amount_drops: string | null;
  created_at: string;
};

export class StorageService {
  private readonly database: DatabaseSync;

  constructor(private readonly databasePath: string) {
    fs.mkdirSync(path.dirname(this.databasePath), { recursive: true });
    this.database = new DatabaseSync(this.databasePath);
    this.database.exec("PRAGMA journal_mode = WAL");
    this.database.exec("PRAGMA foreign_keys = ON");
  }

  async initialize(): Promise<void> {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS missions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        problem_statement TEXT NOT NULL,
        company_wallet TEXT NOT NULL,
        platform_wallet TEXT NOT NULL,
        treasury_wallet TEXT NOT NULL,
        budget_drops TEXT NOT NULL,
        fee_bps INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        escrow_create_tx_hash TEXT,
        escrow_sequence INTEGER,
        escrow_owner TEXT,
        escrow_destination TEXT,
        escrow_amount_drops TEXT,
        escrow_finish_after INTEGER,
        escrow_cancel_after INTEGER,
        escrow_ledger_index INTEGER,
        resolution_resolved_at TEXT,
        resolution_min_score_threshold REAL,
        resolution_total_qualified_weight REAL,
        resolution_platform_fee_drops TEXT,
        resolution_contributor_pool_drops TEXT,
        resolution_notes TEXT
      );

      CREATE TABLE IF NOT EXISTS contributions (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
        contributor_id TEXT NOT NULL,
        contributor_wallet TEXT NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        score REAL,
        normalized_weight REAL,
        payout_drops TEXT,
        qualifies INTEGER
      );

      CREATE INDEX IF NOT EXISTS contributions_mission_id_idx ON contributions (mission_id);

      CREATE TABLE IF NOT EXISTS settlement_transactions (
        mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
        tx_hash TEXT NOT NULL,
        kind TEXT NOT NULL,
        destination_wallet TEXT,
        amount_drops TEXT,
        created_at TEXT NOT NULL,
        PRIMARY KEY (mission_id, tx_hash)
      );
    `);
  }

  async ping(): Promise<void> {
    this.database.prepare("SELECT 1").get();
  }

  async listMissions(): Promise<Mission[]> {
    const missionRows = this.database
      .prepare("SELECT * FROM missions ORDER BY datetime(created_at) DESC")
      .all() as MissionRow[];

    return missionRows.map((row) => this.mapMissionRow(row));
  }

  async getMission(id: string): Promise<Mission | null> {
    const row = this.database.prepare("SELECT * FROM missions WHERE id = ?").get(id) as MissionRow | undefined;
    return row ? this.mapMissionRow(row) : null;
  }

  async saveMission(mission: Mission): Promise<Mission> {
    const upsertMission = this.database.prepare(`
      INSERT INTO missions (
        id, title, problem_statement, company_wallet, platform_wallet, treasury_wallet, budget_drops, fee_bps, status,
        created_at, updated_at, escrow_create_tx_hash, escrow_sequence, escrow_owner, escrow_destination,
        escrow_amount_drops, escrow_finish_after, escrow_cancel_after, escrow_ledger_index,
        resolution_resolved_at, resolution_min_score_threshold, resolution_total_qualified_weight,
        resolution_platform_fee_drops, resolution_contributor_pool_drops, resolution_notes
      ) VALUES (
        @id, @title, @problem_statement, @company_wallet, @platform_wallet, @treasury_wallet, @budget_drops, @fee_bps, @status,
        @created_at, @updated_at, @escrow_create_tx_hash, @escrow_sequence, @escrow_owner, @escrow_destination,
        @escrow_amount_drops, @escrow_finish_after, @escrow_cancel_after, @escrow_ledger_index,
        @resolution_resolved_at, @resolution_min_score_threshold, @resolution_total_qualified_weight,
        @resolution_platform_fee_drops, @resolution_contributor_pool_drops, @resolution_notes
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        problem_statement = excluded.problem_statement,
        company_wallet = excluded.company_wallet,
        platform_wallet = excluded.platform_wallet,
        treasury_wallet = excluded.treasury_wallet,
        budget_drops = excluded.budget_drops,
        fee_bps = excluded.fee_bps,
        status = excluded.status,
        updated_at = excluded.updated_at,
        escrow_create_tx_hash = excluded.escrow_create_tx_hash,
        escrow_sequence = excluded.escrow_sequence,
        escrow_owner = excluded.escrow_owner,
        escrow_destination = excluded.escrow_destination,
        escrow_amount_drops = excluded.escrow_amount_drops,
        escrow_finish_after = excluded.escrow_finish_after,
        escrow_cancel_after = excluded.escrow_cancel_after,
        escrow_ledger_index = excluded.escrow_ledger_index,
        resolution_resolved_at = excluded.resolution_resolved_at,
        resolution_min_score_threshold = excluded.resolution_min_score_threshold,
        resolution_total_qualified_weight = excluded.resolution_total_qualified_weight,
        resolution_platform_fee_drops = excluded.resolution_platform_fee_drops,
        resolution_contributor_pool_drops = excluded.resolution_contributor_pool_drops,
        resolution_notes = excluded.resolution_notes
    `);

    const deleteContributions = this.database.prepare("DELETE FROM contributions WHERE mission_id = ?");
    const insertContribution = this.database.prepare(`
      INSERT INTO contributions (
        id, mission_id, contributor_id, contributor_wallet, title, content, score, normalized_weight, payout_drops, qualifies
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const deleteTransactions = this.database.prepare("DELETE FROM settlement_transactions WHERE mission_id = ?");
    const insertTransaction = this.database.prepare(`
      INSERT INTO settlement_transactions (mission_id, tx_hash, kind, destination_wallet, amount_drops, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const save = (nextMission: Mission) => {
      this.database.exec("BEGIN");
      try {
      upsertMission.run({
        id: nextMission.id,
        title: nextMission.title,
        problem_statement: nextMission.problemStatement,
        company_wallet: nextMission.companyWallet,
        platform_wallet: nextMission.platformWallet,
        treasury_wallet: nextMission.treasuryWallet,
        budget_drops: nextMission.budgetDrops,
        fee_bps: nextMission.feeBps,
        status: nextMission.status,
        created_at: nextMission.createdAt,
        updated_at: nextMission.updatedAt,
        escrow_create_tx_hash: nextMission.escrow?.createTxHash ?? null,
        escrow_sequence: nextMission.escrow?.sequence ?? null,
        escrow_owner: nextMission.escrow?.owner ?? null,
        escrow_destination: nextMission.escrow?.destination ?? null,
        escrow_amount_drops: nextMission.escrow?.amountDrops ?? null,
        escrow_finish_after: nextMission.escrow?.finishAfter ?? null,
        escrow_cancel_after: nextMission.escrow?.cancelAfter ?? null,
        escrow_ledger_index: nextMission.escrow?.ledgerIndex ?? null,
        resolution_resolved_at: nextMission.resolution?.resolvedAt ?? null,
        resolution_min_score_threshold: nextMission.resolution?.minScoreThreshold ?? null,
        resolution_total_qualified_weight: nextMission.resolution?.totalQualifiedWeight ?? null,
        resolution_platform_fee_drops: nextMission.resolution?.platformFeeDrops ?? null,
        resolution_contributor_pool_drops: nextMission.resolution?.contributorPoolDrops ?? null,
        resolution_notes: nextMission.resolution?.notes ?? null
      });

      deleteContributions.run(nextMission.id);
      for (const contribution of nextMission.contributions) {
        insertContribution.run(
          contribution.id,
          nextMission.id,
          contribution.contributorId,
          contribution.contributorWallet,
          contribution.title ?? null,
          contribution.content,
          contribution.score ?? null,
          contribution.normalizedWeight ?? null,
          contribution.payoutDrops ?? null,
          contribution.qualifies === undefined ? null : contribution.qualifies ? 1 : 0
        );
      }

      deleteTransactions.run(nextMission.id);
      for (const transaction of nextMission.settlementTransactions ?? []) {
        insertTransaction.run(
          nextMission.id,
          transaction.txHash,
          transaction.kind,
          transaction.destinationWallet ?? null,
          transaction.amountDrops ?? null,
          new Date().toISOString()
        );
      }
        this.database.exec("COMMIT");
      } catch (error) {
        this.database.exec("ROLLBACK");
        throw error;
      }
    };

    save(mission);
    const persistedMission = await this.getMission(mission.id);

    if (!persistedMission) {
      throw new Error(`Failed to persist mission ${mission.id}`);
    }

    return persistedMission;
  }

  private mapMissionRow(row: MissionRow): Mission {
    const contributions = this.database
      .prepare("SELECT * FROM contributions WHERE mission_id = ? ORDER BY rowid ASC")
      .all(row.id) as ContributionRow[];

    const settlementTransactions = this.database
      .prepare("SELECT * FROM settlement_transactions WHERE mission_id = ? ORDER BY created_at ASC, tx_hash ASC")
      .all(row.id) as SettlementTransactionRow[];

    return {
      id: row.id,
      title: row.title,
      problemStatement: row.problem_statement,
      companyWallet: row.company_wallet,
      platformWallet: row.platform_wallet,
      treasuryWallet: row.treasury_wallet,
      budgetDrops: row.budget_drops,
      feeBps: row.fee_bps,
      status: row.status as Mission["status"],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      contributions: contributions.map((contribution) => this.mapContributionRow(contribution)),
      escrow: this.mapEscrow(row),
      resolution: this.mapResolution(row),
      settlementTransactions: settlementTransactions.map((transaction) => ({
        txHash: transaction.tx_hash,
        kind: transaction.kind,
        destinationWallet: transaction.destination_wallet ?? undefined,
        amountDrops: transaction.amount_drops ?? undefined
      })),
      payoutTxHashes: settlementTransactions.map((transaction) => transaction.tx_hash)
    };
  }

  private mapContributionRow(row: ContributionRow): Contribution {
    return {
      id: row.id,
      contributorId: row.contributor_id,
      contributorWallet: row.contributor_wallet,
      title: row.title ?? undefined,
      content: row.content,
      score: row.score ?? undefined,
      normalizedWeight: row.normalized_weight ?? undefined,
      payoutDrops: row.payout_drops ?? undefined,
      qualifies: row.qualifies === null ? undefined : row.qualifies === 1
    };
  }

  private mapEscrow(row: MissionRow): EscrowInfo | undefined {
    if (!row.escrow_create_tx_hash || !row.escrow_amount_drops || row.escrow_cancel_after === null) {
      return undefined;
    }

    return {
      createTxHash: row.escrow_create_tx_hash,
      sequence: row.escrow_sequence ?? undefined,
      owner: row.escrow_owner ?? undefined,
      destination: row.escrow_destination ?? undefined,
      amountDrops: row.escrow_amount_drops,
      finishAfter: row.escrow_finish_after ?? undefined,
      cancelAfter: row.escrow_cancel_after,
      ledgerIndex: row.escrow_ledger_index ?? undefined
    };
  }

  private mapResolution(row: MissionRow): MissionResolution | undefined {
    if (
      !row.resolution_resolved_at ||
      row.resolution_min_score_threshold === null ||
      row.resolution_total_qualified_weight === null ||
      !row.resolution_platform_fee_drops ||
      !row.resolution_contributor_pool_drops
    ) {
      return undefined;
    }

    return {
      resolvedAt: row.resolution_resolved_at,
      minScoreThreshold: row.resolution_min_score_threshold,
      totalQualifiedWeight: row.resolution_total_qualified_weight,
      platformFeeDrops: row.resolution_platform_fee_drops,
      contributorPoolDrops: row.resolution_contributor_pool_drops,
      notes: row.resolution_notes ?? undefined
    };
  }
}
