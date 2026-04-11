import { config } from "../config";

const baseUrl = `http://localhost:${config.port}`;

async function request(path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(body)}`);
  }

  return body;
}

async function main(): Promise<void> {
  const walletA = await request("/wallets/demo", { method: "POST" });
  const walletB = await request("/wallets/demo", { method: "POST" });
  const walletC = await request("/wallets/demo", { method: "POST" });
  const companyWallet = process.env.DEMO_COMPANY_WALLET;

  if (!companyWallet) {
    throw new Error("Set DEMO_COMPANY_WALLET before running the demo script");
  }

  const created = await request("/missions", {
    method: "POST",
    body: JSON.stringify({
      title: "Autonomous research mission",
      problemStatement: "Find useful solution bricks for a company problem and split the bounty fairly.",
      budgetDrops: "1000000",
      feeBps: 1000,
      companyWallet
    })
  });

  const missionId = created.mission.id;
  console.log("Mission created:", missionId);

  await request(`/missions/${missionId}/fund`, {
    method: "POST",
    body: JSON.stringify({
      finishAfterSeconds: 1,
      cancelAfterSeconds: 600
    })
  });
  console.log("Mission funded via escrow");

  const contributionA = await request(`/missions/${missionId}/contributions`, {
    method: "POST",
    body: JSON.stringify({
      contributorId: "agent-a",
      contributorWallet: walletA.address,
      title: "High-value partial solution",
      content: "A useful contribution"
    })
  });

  const contributionB = await request(`/missions/${missionId}/contributions`, {
    method: "POST",
    body: JSON.stringify({
      contributorId: "agent-b",
      contributorWallet: walletB.address,
      title: "Helpful analysis",
      content: "B useful contribution"
    })
  });

  const contributionC = await request(`/missions/${missionId}/contributions`, {
    method: "POST",
    body: JSON.stringify({
      contributorId: "agent-c",
      contributorWallet: walletC.address,
      title: "Low-signal idea",
      content: "C weak contribution"
    })
  });
  console.log("Added three contributions");

  await new Promise((resolve) => setTimeout(resolve, 1500));

  const resolved = await request(`/missions/${missionId}/resolve`, {
    method: "POST",
    body: JSON.stringify({
      minScoreThreshold: 10,
      notes: "Hackathon demo scoring",
      scores: [
        { contributionId: contributionA.contribution.id, score: 60 },
        { contributionId: contributionB.contribution.id, score: 30 },
        { contributionId: contributionC.contribution.id, score: 0 }
      ]
    })
  });
  console.log("Resolved mission:", JSON.stringify(resolved.plan, null, 2));

  const settled = await request(`/missions/${missionId}/settle`, {
    method: "POST",
    body: JSON.stringify({})
  });
  console.log("Settlement complete:", JSON.stringify(settled, null, 2));
}

void main();
