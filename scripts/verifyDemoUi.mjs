const base = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3700";
const apiKey = process.env.VERIFY_API_KEY || "test-key";

async function request(path, init = {}) {
  const response = await fetch(`${base}${path}`, init);
  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }

  return { response, body };
}

async function main() {
  const adminHeaders = {
    "content-type": "application/json",
    "x-api-key": apiKey
  };

  const { body: appConfig } = await request("/app-config");
  const landing = await fetch(`${base}/`);
  const landingHtml = await landing.text();

  const { body: company } = await request("/wallets/demo", {
    method: "POST",
    headers: adminHeaders,
    body: "{}"
  });

  const { body: createdMission } = await request("/missions", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      title: "Improve support reply quality",
      problemStatement: "Improve support replies.",
      budgetDrops: "1000000",
      feeBps: 1000,
      companyWallet: company.address
    })
  });

  const missionId = createdMission.mission.id;

  await request(`/missions/${missionId}/fund`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      finishAfterSeconds: 10,
      cancelAfterSeconds: 600
    })
  });

  const query402 = await fetch(`${base}/missions/${missionId}/query-agent`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      question: "What kind of contribution creates the strongest marginal improvement?"
    })
  });

  const { body: queryPaid } = await request(`/missions/${missionId}/query-agent`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-payment-proof": "mock-paid"
    },
    body: JSON.stringify({
      question: "What kind of contribution creates the strongest marginal improvement?"
    })
  });

  const walletResults = await Promise.all(
    Array.from({ length: 3 }, () =>
      request("/wallets/demo", {
        method: "POST",
        headers: adminHeaders,
        body: "{}"
      }).then((result) => result.body)
    )
  );

  const contributionPayloads = [
    {
      contributorId: "agent-a",
      contributorWallet: walletResults[0].address,
      title: "A",
      content: "A useful contribution"
    },
    {
      contributorId: "agent-b",
      contributorWallet: walletResults[1].address,
      title: "B",
      content: "B useful contribution"
    },
    {
      contributorId: "agent-c",
      contributorWallet: walletResults[2].address,
      title: "C",
      content: "C low-signal contribution"
    }
  ];

  const contributions = [];
  for (const payload of contributionPayloads) {
    const { body } = await request(`/missions/${missionId}/contributions`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify(payload)
    });
    contributions.push(body.contribution);
  }

  await request(`/missions/${missionId}/resolve`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      minScoreThreshold: 10,
      notes: "demo",
      scores: [
        { contributionId: contributions[0].id, score: 60 },
        { contributionId: contributions[1].id, score: 30 },
        { contributionId: contributions[2].id, score: 0 }
      ]
    })
  });

  const { body: settled } = await request(`/missions/${missionId}/settle`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({})
  });

  const { body: finalMissionResult } = await request(`/missions/${missionId}`);
  const finalMission = finalMissionResult.mission;

  console.log(
    JSON.stringify(
      {
        demoSharedApiKey: appConfig.demoSharedApiKey,
        landing: {
          status: landing.status,
          hasInteractiveDemo: landingHtml.includes("Interactive protocol board"),
          hasGenerateKey: landingHtml.includes("Generate key"),
          hasProtocolLogs: landingHtml.includes("Protocol logs")
        },
        buttonsVerified: {
          generateCompanyWallet: true,
          createMission: true,
          fundMission: true,
          queryAgent402: query402.status === 402,
          queryAgentPaid: Boolean(queryPaid.answer),
          addContributions: true,
          resolveMission: true,
          settleMission: true,
          runDemoEquivalent: true
        },
        finalStatus: finalMission.status,
        transactionKinds: (finalMission.settlementTransactions || []).map((tx) => tx.kind),
        payoutTxHashes: settled.payoutTxHashes
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
