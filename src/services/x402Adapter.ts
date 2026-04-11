export class X402Adapter {
  buildPaymentRequiredPayload(missionId: string) {
    return {
      version: "x402-draft-mvp",
      missionId,
      message: "Payment proof required before accepting this submission.",
      accepted: [
        {
          scheme: "x402-placeholder",
          network: "xrpl-testnet",
          purpose: "anti-spam submission fee"
        }
      ]
    };
  }

  validatePaymentHeader(paymentHeader?: string): boolean {
    return paymentHeader === "mock-paid";
  }
}
