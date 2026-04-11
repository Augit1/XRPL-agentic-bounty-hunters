import type { RequestHandler } from "express";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { config } from "../config";
import type { Mission } from "../types";

const { HTTPFacilitatorClient, x402ResourceServer } = require("@x402/core/server") as {
  HTTPFacilitatorClient: any;
  x402ResourceServer: any;
};
const { decodePaymentRequiredHeader, decodePaymentResponseHeader } = require("@x402/core/http") as {
  decodePaymentRequiredHeader: (header: string) => unknown;
  decodePaymentResponseHeader: (header: string) => {
    success?: boolean;
    payer?: string;
    transaction: string;
    network: string;
  } | null;
};
const { paymentMiddleware } = require("@x402/express") as {
  paymentMiddleware: (...args: any[]) => RequestHandler;
};
const { ExactEvmScheme: ExactEvmClientScheme } = require("@x402/evm/exact/client") as {
  ExactEvmScheme: new (...args: any[]) => any;
};
const { ExactEvmScheme: ExactEvmServerScheme } = require("@x402/evm/exact/server") as {
  ExactEvmScheme: new (...args: any[]) => any;
};
const { toClientEvmSigner } = require("@x402/evm") as {
  toClientEvmSigner: (...args: any[]) => any;
};
const { wrapFetchWithPaymentFromConfig } = require("@x402/fetch") as {
  wrapFetchWithPaymentFromConfig: (
    fetchFn: typeof fetch,
    config: Record<string, unknown>
  ) => (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

const QUERY_ROUTE_PATH = "/query-agent";

type SafeJson = Record<string, unknown> | string | number | boolean | null;

function safeParseJson(text: string): SafeJson {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as SafeJson;
  } catch {
    return text;
  }
}

function extractErrorMessage(payload: SafeJson, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  if (payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string") {
    return payload.message;
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  return fallback;
}

export class X402Adapter {
  private paymentHandler?: RequestHandler;
  private paymentFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  private demoBuyerAddress?: `0x${string}`;
  private resourceServer?: { initialize: () => Promise<void> };
  private initializationPromise?: Promise<void>;

  isEnabled(): boolean {
    return config.x402Enabled && Boolean(config.x402PayTo);
  }

  isDemoBuyerConfigured(): boolean {
    return Boolean(config.x402DemoBuyerPrivateKey);
  }

  getPublicStatus() {
    return {
      enabled: this.isEnabled(),
      facilitatorUrl: config.x402FacilitatorUrl,
      network: config.x402Network,
      price: config.x402PriceUsd,
      payTo: config.x402PayTo || null,
      explorerBaseUrl: config.x402ExplorerBaseUrl,
      demoBuyerConfigured: this.isDemoBuyerConfigured(),
      demoBuyerAddress: this.getDemoBuyerAddress()
    };
  }

  buildPaymentRequiredPayload(params: {
    missionId?: string;
    purpose: "context_query";
    resource?: string;
  }) {
    return {
      version: "x402-v2",
      missionId: params.missionId ?? null,
      purpose: params.purpose,
      message: "x402 payment required before granting paid platform intelligence access.",
      resource: params.resource ?? `/x402${QUERY_ROUTE_PATH}`,
      facilitatorUrl: config.x402FacilitatorUrl,
      accepted: [
        {
          scheme: "exact",
          network: config.x402Network,
          price: config.x402PriceUsd,
          payTo: config.x402PayTo || null,
          assetHint: "USDC on Base Sepolia"
        }
      ]
    };
  }

  buildQueryResponse(mission: Mission, question: string) {
    return {
      missionId: mission.id,
      question,
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
  }

  createQueryMiddleware(): RequestHandler {
    if (!this.isEnabled()) {
      return (_request, _response, next) => next();
    }

    if (!this.paymentHandler) {
      const facilitatorClient = new HTTPFacilitatorClient({
        url: config.x402FacilitatorUrl
      });

      const resourceServer = new x402ResourceServer(facilitatorClient).register(
        config.x402Network,
        new ExactEvmServerScheme()
      );
      this.resourceServer = resourceServer;
      this.initializationPromise = resourceServer.initialize();

      this.paymentHandler = paymentMiddleware(
        {
          [`POST ${QUERY_ROUTE_PATH}`]: {
            accepts: {
              scheme: "exact",
              network: config.x402Network,
              price: config.x402PriceUsd,
              payTo: config.x402PayTo,
              extra: {
                product: "proof-of-contribution-context-query",
                purpose: "context_query"
              }
            },
            resource: `/x402${QUERY_ROUTE_PATH}`,
            description: "Paid platform-agent guidance for mission clarification.",
            unpaidResponseBody: async (context: any) => {
              const body =
                typeof context.adapter.getBody === "function" &&
                context.adapter.getBody() &&
                typeof context.adapter.getBody() === "object"
                  ? ((context.adapter.getBody() as Record<string, unknown>))
                  : undefined;

              return {
                contentType: "application/json",
                body: this.buildPaymentRequiredPayload({
                  missionId: typeof body?.missionId === "string" ? body.missionId : undefined,
                  purpose: "context_query",
                  resource: `/x402${QUERY_ROUTE_PATH}`
                })
              };
            }
          }
        },
        resourceServer,
        undefined,
        undefined
      );
    }

    if (!this.paymentHandler) {
      throw new Error("Unable to initialize x402 payment middleware.");
    }

    return this.paymentHandler;
  }

  async runDemoQuery(params: { missionId: string; question: string }) {
    if (!this.isEnabled()) {
      throw new Error(
        "x402 is not configured. Set X402_ENABLED=true together with X402_PAY_TO and X402_DEMO_BUYER_PRIVATE_KEY."
      );
    }

    if (!this.isDemoBuyerConfigured()) {
      throw new Error("X402_DEMO_BUYER_PRIVATE_KEY is required to run the real x402 demo flow.");
    }

    await this.ensureInitialized();

    const url = this.getLocalQueryUrl();
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json"
    };
    const body = JSON.stringify({
      missionId: params.missionId,
      question: params.question
    });

    const unpaidResponse = await fetch(url, {
      method: "POST",
      headers,
      body
    });
    const unpaidText = await unpaidResponse.text();
    const unpaidBody = safeParseJson(unpaidText);
    const paymentRequiredHeader = unpaidResponse.headers.get("PAYMENT-REQUIRED");
    const paymentRequired =
      paymentRequiredHeader ? decodePaymentRequiredHeader(paymentRequiredHeader) : unpaidBody;

    const fetchWithPayment = this.getDemoBuyerFetch();
    const paidResponse = await fetchWithPayment(url, {
      method: "POST",
      headers,
      body
    });
    const paidText = await paidResponse.text();
    const paidBody = safeParseJson(paidText);

    if (!paidResponse.ok) {
      const error = new Error(
        extractErrorMessage(paidBody, `x402 paid query failed with status ${paidResponse.status}.`)
      ) as Error & { body?: SafeJson };
      error.body = paidBody;
      throw error;
    }

    const paymentResponseHeader = paidResponse.headers.get("PAYMENT-RESPONSE");
    const paymentResponse =
      paymentResponseHeader ? decodePaymentResponseHeader(paymentResponseHeader) : null;

    return {
      ...((paidBody && typeof paidBody === "object" ? paidBody : { result: paidBody }) as Record<string, unknown>),
      x402: {
        ...this.getPublicStatus(),
        buyerAddress: this.getDemoBuyerAddress(),
        initialStatus: unpaidResponse.status,
        paidStatus: paidResponse.status,
        paymentRequired,
        paymentResponse,
        transactionExplorerUrl:
          paymentResponse?.transaction && paymentResponse.network === config.x402Network
            ? `${config.x402ExplorerBaseUrl}/tx/${paymentResponse.transaction}`
            : null
      }
    };
  }

  private getLocalQueryUrl(): string {
    return `http://127.0.0.1:${config.port}/x402${QUERY_ROUTE_PATH}`;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    if (!this.paymentHandler) {
      this.createQueryMiddleware();
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
    } else if (this.resourceServer) {
      this.initializationPromise = this.resourceServer.initialize();
      await this.initializationPromise;
    }
  }

  private getDemoBuyerFetch(): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
    if (!config.x402DemoBuyerPrivateKey) {
      throw new Error("X402_DEMO_BUYER_PRIVATE_KEY is required.");
    }

    if (!this.paymentFetch) {
      const account = privateKeyToAccount(config.x402DemoBuyerPrivateKey as `0x${string}`);
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(config.x402EvmRpcUrl)
      });
      const signer = toClientEvmSigner(account, publicClient);

      this.paymentFetch = wrapFetchWithPaymentFromConfig(fetch, {
        schemes: [
          {
            network: config.x402Network,
            client: new ExactEvmClientScheme(signer)
          }
        ]
      });
    }

    if (!this.paymentFetch) {
      throw new Error("Unable to initialize x402 demo buyer.");
    }

    return this.paymentFetch;
  }

  private getDemoBuyerAddress(): `0x${string}` | null {
    if (!config.x402DemoBuyerPrivateKey) {
      return null;
    }

    if (!this.demoBuyerAddress) {
      this.demoBuyerAddress = privateKeyToAccount(config.x402DemoBuyerPrivateKey as `0x${string}`).address;
    }

    return this.demoBuyerAddress;
  }
}
