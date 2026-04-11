import xrpl, { Client, Wallet, convertStringToHex } from "xrpl";
import { config } from "../config";
import { EscrowCancelResult, EscrowCreateResult, EscrowFinishResult, PaymentResult } from "../types";

type WalletRole = "settlement" | "treasury" | "company" | "seed";

function unixToRippleTime(unixSeconds: number): number {
  return unixSeconds - 946684800;
}

export class XrplService {
  private client: Client | null = null;
  private readonly mockWallets = {
    settlement: Wallet.generate(),
    treasury: Wallet.generate(),
    company: Wallet.generate()
  };

  async connect(): Promise<Client | null> {
    if (config.useMockXrpl) {
      return null;
    }

    if (this.client?.isConnected()) {
      return this.client;
    }

    this.client = new xrpl.Client(config.xrplServer);
    await this.client.connect();
    return this.client;
  }

  async disconnect(): Promise<void> {
    if (this.client?.isConnected()) {
      await this.client.disconnect();
    }
  }

  private getSeedForRole(role: WalletRole, seed?: string): string {
    if (role === "seed" && seed) {
      return seed;
    }

    const map: Record<Exclude<WalletRole, "seed">, string> = {
      settlement: config.settlementSeed,
      treasury: config.treasurySeed,
      company: config.companySeed
    };

    const resolved = role === "seed" ? "" : map[role];

    if (!resolved) {
      throw new Error(`Missing seed for XRPL wallet role: ${role}`);
    }

    return resolved;
  }

  loadWallet(role: WalletRole, seed?: string): Wallet {
    if (config.useMockXrpl && role !== "seed" && !seed) {
      return this.mockWallets[role];
    }

    const resolvedSeed = this.getSeedForRole(role, seed);
    return Wallet.fromSeed(resolvedSeed);
  }

  getWalletAddress(role: Exclude<WalletRole, "seed">): string {
    return this.loadWallet(role).address;
  }

  async createDemoWallet(): Promise<{ address: string; seed: string }> {
    if (config.useMockXrpl) {
      const wallet = Wallet.generate();
      return { address: wallet.address, seed: wallet.seed! };
    }

    const client = await this.connect();
    if (!client) {
      throw new Error("XRPL client unavailable");
    }

    const fundedWallet = await client.fundWallet();
    return {
      address: fundedWallet.wallet.address,
      seed: fundedWallet.wallet.seed!
    };
  }

  async createEscrow(params: {
    companySeed?: string;
    destination: string;
    amountDrops: string;
    finishAfter?: number;
    cancelAfter: number;
    missionId: string;
  }): Promise<EscrowCreateResult> {
    if (config.useMockXrpl) {
      return {
        txHash: `MOCK_ESCROW_CREATE_${params.missionId}`,
        sequence: Math.floor(Math.random() * 100000),
        owner: this.loadWallet("company", params.companySeed).address,
        destination: params.destination,
        amountDrops: params.amountDrops,
        finishAfter: params.finishAfter,
        cancelAfter: params.cancelAfter,
        ledgerIndex: Math.floor(Date.now() / 1000)
      };
    }

    const client = await this.connect();
    if (!client) {
      throw new Error("XRPL client unavailable");
    }

    const companyWallet = this.loadWallet("company", params.companySeed);

    const tx: xrpl.EscrowCreate = {
      TransactionType: "EscrowCreate",
      Account: companyWallet.address,
      Destination: params.destination,
      Amount: params.amountDrops,
      CancelAfter: unixToRippleTime(params.cancelAfter),
      FinishAfter: params.finishAfter ? unixToRippleTime(params.finishAfter) : undefined,
      Memos: [
        {
          Memo: {
            MemoType: convertStringToHex("mission_id"),
            MemoData: convertStringToHex(params.missionId)
          }
        }
      ]
    };

    const prepared = await client.autofill(tx);
    const signed = companyWallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    const txResult = result.result.meta;

    return {
      txHash: signed.hash,
      sequence: prepared.Sequence,
      owner: companyWallet.address,
      destination: params.destination,
      amountDrops: params.amountDrops,
      finishAfter: params.finishAfter,
      cancelAfter: params.cancelAfter,
      ledgerIndex: typeof prepared.LastLedgerSequence === "number" ? prepared.LastLedgerSequence : undefined
    };
  }

  async finishEscrow(params: {
    owner: string;
    offerSequence: number;
  }): Promise<EscrowFinishResult> {
    if (config.useMockXrpl) {
      return { txHash: `MOCK_ESCROW_FINISH_${params.offerSequence}` };
    }

    const client = await this.connect();
    if (!client) {
      throw new Error("XRPL client unavailable");
    }

    const settlementWallet = this.loadWallet("settlement");
    const tx: xrpl.EscrowFinish = {
      TransactionType: "EscrowFinish",
      Account: settlementWallet.address,
      Owner: params.owner,
      OfferSequence: params.offerSequence
    };

    const prepared = await client.autofill(tx);
    const signed = settlementWallet.sign(prepared);
    await client.submitAndWait(signed.tx_blob);

    return { txHash: signed.hash };
  }

  async cancelEscrow(params: {
    owner: string;
    offerSequence: number;
    companySeed?: string;
  }): Promise<EscrowCancelResult> {
    if (config.useMockXrpl) {
      return { txHash: `MOCK_ESCROW_CANCEL_${params.offerSequence}` };
    }

    const client = await this.connect();
    if (!client) {
      throw new Error("XRPL client unavailable");
    }

    const companyWallet = this.loadWallet("company", params.companySeed);
    const tx: xrpl.EscrowCancel = {
      TransactionType: "EscrowCancel",
      Account: companyWallet.address,
      Owner: params.owner,
      OfferSequence: params.offerSequence
    };

    const prepared = await client.autofill(tx);
    const signed = companyWallet.sign(prepared);
    await client.submitAndWait(signed.tx_blob);

    return { txHash: signed.hash };
  }

  async sendPayment(params: {
    destination: string;
    amountDrops: string;
    sourceRole?: "settlement" | "treasury" | "company";
    sourceSeed?: string;
  }): Promise<PaymentResult> {
    if (config.useMockXrpl) {
      return {
        txHash: `MOCK_PAYMENT_${params.destination.slice(0, 8)}_${params.amountDrops}`,
        destination: params.destination,
        amountDrops: params.amountDrops
      };
    }

    const client = await this.connect();
    if (!client) {
      throw new Error("XRPL client unavailable");
    }

    const role = params.sourceSeed ? "seed" : params.sourceRole ?? "settlement";
    const wallet = this.loadWallet(role, params.sourceSeed);

    const tx: xrpl.Payment = {
      TransactionType: "Payment",
      Account: wallet.address,
      Destination: params.destination,
      Amount: params.amountDrops
    };

    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    await client.submitAndWait(signed.tx_blob);

    return {
      txHash: signed.hash,
      destination: params.destination,
      amountDrops: params.amountDrops
    };
  }
}

export const xrplService = new XrplService();
