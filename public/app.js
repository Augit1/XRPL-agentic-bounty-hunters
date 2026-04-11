const DEMO_CONFIG = {
  title: "Improve support reply quality",
  problemStatement:
    "Improve support reply quality by coordinating multiple useful agent contributions and rewarding only work that materially improves the final answer.",
  budgetDrops: "1000000",
  feeBps: 1000,
  minScoreThreshold: 10,
  notes: "Reward only the contributions that materially improve the final solution.",
  contributions: [
    {
      contributorId: "agent-a",
      title: "Improved tone and structure",
      content: "Proposes a more empathetic and structured support reply template."
    },
    {
      contributorId: "agent-b",
      title: "Constraint-aware troubleshooting block",
      content: "Adds a concise troubleshooting segment that reduces back-and-forth."
    },
    {
      contributorId: "agent-c",
      title: "Low-signal generic answer",
      content: "Generic support copy with little mission-specific value."
    }
  ],
  scores: [60, 30, 0]
};

const state = {
  appConfig: null,
  health: null,
  missions: [],
  selectedMissionId: null,
  activity: [],
  apiKey: window.localStorage.getItem("adminApiKey") || "",
  paymentProof: "mock-paid",
  companyWallet: "",
  contributionWallets: [],
  lastQueryResult: null
};

const elements = {
  modePill: document.getElementById("mode-pill"),
  xrplMode: document.getElementById("xrpl-mode"),
  healthStatus: document.getElementById("health-status"),
  appMode: document.getElementById("app-mode"),
  settlementAddress: document.getElementById("settlement-address"),
  treasuryAddress: document.getElementById("treasury-address"),
  selectedMissionPill: document.getElementById("selected-mission-pill"),
  missionJson: document.getElementById("mission-json"),
  queryJson: document.getElementById("query-json"),
  activityLog: document.getElementById("activity-log"),
  humanSummary: document.getElementById("human-summary"),
  settlementBreakdown: document.getElementById("settlement-breakdown"),
  transactionList: document.getElementById("transaction-list"),
  workflowRail: document.getElementById("workflow-rail"),
  metricBudget: document.getElementById("metric-budget"),
  metricFee: document.getElementById("metric-fee"),
  metricContributions: document.getElementById("metric-contributions"),
  metricTransactions: document.getElementById("metric-transactions"),
  apiKeyInput: document.getElementById("api-key-input"),
  demoKeyHelper: document.getElementById("demo-key-helper")
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.apiKey ? { "x-api-key": state.apiKey } : {}),
      ...(options.usePaymentProof ? { "x-payment-proof": state.paymentProof } : {}),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(body?.error || body?.message || JSON.stringify(body));
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function selectedMission() {
  return state.missions.find((mission) => mission.id === state.selectedMissionId) || null;
}

function generateRandomKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function logActivity(step, detail, payload) {
  state.activity.unshift({
    at: new Date().toLocaleTimeString(),
    step,
    detail,
    payload
  });
  renderActivity();
}

function renderActivity() {
  if (!state.activity.length) {
    elements.activityLog.innerHTML = `<div class="empty-state">No protocol events yet. Use the buttons on the left to run the flow.</div>`;
    return;
  }

  elements.activityLog.innerHTML = state.activity
    .map(
      (entry) => `
        <article class="activity-entry">
          <time>${entry.at}</time>
          <strong>${escapeHtml(entry.step)}</strong>
          <p>${escapeHtml(entry.detail)}</p>
          ${entry.payload ? `<pre class="json-panel compact">${escapeHtml(JSON.stringify(entry.payload, null, 2))}</pre>` : ""}
        </article>
      `
    )
    .join("");
}

function renderHealth() {
  if (!state.health) return;
  elements.modePill.textContent = state.appConfig?.appMode === "demo" ? "Demo mode" : "Production mode";
  elements.xrplMode.textContent = state.health.useMockXrpl ? "Mock XRPL" : "Real XRPL";
  elements.healthStatus.textContent = state.health.ok ? "Live" : "Offline";
  elements.appMode.textContent = state.health.appMode;
  elements.settlementAddress.textContent = state.health.settlementAddress;
  elements.treasuryAddress.textContent = state.health.treasuryAddress;
}

function renderWorkflow() {
  const mission = selectedMission();
  const steps = [
    {
      label: "Mission structured",
      active: Boolean(mission),
      done: Boolean(mission)
    },
    {
      label: "Budget locked",
      active: mission ? ["funded", "open", "resolved", "paid"].includes(mission.status) : false,
      done: mission ? ["open", "resolved", "paid"].includes(mission.status) : false
    },
    {
      label: "Contributions stored",
      active: mission ? mission.contributions.length > 0 : false,
      done: mission ? mission.contributions.length > 0 : false
    },
    {
      label: "Weights assigned",
      active: mission ? ["resolved", "paid"].includes(mission.status) : false,
      done: mission ? mission.status === "paid" : false
    },
    {
      label: "Settlement complete",
      active: mission ? mission.status === "paid" : false,
      done: mission ? mission.status === "paid" : false
    }
  ];

  elements.workflowRail.innerHTML = steps
    .map(
      (step) => `
        <div class="workflow-step ${step.active ? "active" : ""} ${step.done ? "done" : ""}">
          <span class="workflow-dot"></span>
          <span>${escapeHtml(step.label)}</span>
        </div>
      `
    )
    .join("");
}

function renderSummary() {
  const mission = selectedMission();
  elements.selectedMissionPill.textContent = mission ? mission.status : "No mission";
  elements.metricBudget.textContent = mission ? `${mission.budgetDrops} drops` : "-";
  elements.metricFee.textContent = mission ? `${mission.feeBps} bps` : "-";
  elements.metricContributions.textContent = mission ? String(mission.contributions.length) : "-";
  elements.metricTransactions.textContent = mission ? String(mission.settlementTransactions?.length || 0) : "-";
  elements.missionJson.textContent = mission ? JSON.stringify(mission, null, 2) : "";

  if (!mission) {
    elements.humanSummary.innerHTML = `<div class="empty-state">No mission yet. Start with “Generate company wallet” and “Create structured mission”.</div>`;
    elements.settlementBreakdown.innerHTML = `<div class="empty-state">Settlement numbers will appear after resolution.</div>`;
    elements.transactionList.innerHTML = `<div class="empty-state">Transaction hashes will appear after funding and settlement.</div>`;
    renderWorkflow();
    return;
  }

  elements.humanSummary.innerHTML = `
    <div class="summary-card">
      <strong>${escapeHtml(mission.title)}</strong>
      <p>${escapeHtml(mission.problemStatement)}</p>
      <div class="summary-meta">
        <span>Status: ${escapeHtml(mission.status)}</span>
        <span>Contributions: ${mission.contributions.length}</span>
      </div>
    </div>
  `;

  if (mission.resolution) {
    elements.settlementBreakdown.innerHTML = `
      <div class="summary-card">
        <div class="summary-meta">
          <span>Platform fee: ${mission.resolution.platformFeeDrops}</span>
          <span>Contributor pool: ${mission.resolution.contributorPoolDrops}</span>
          <span>Threshold: ${mission.resolution.minScoreThreshold}</span>
        </div>
      </div>
      ${mission.contributions
        .map(
          (contribution) => `
            <div class="summary-row">
              <span>${escapeHtml(contribution.contributorId)}</span>
              <span>score ${contribution.score ?? 0}</span>
              <span>${contribution.payoutDrops ?? "0"} drops</span>
            </div>
          `
        )
        .join("")}
    `;
  } else {
    elements.settlementBreakdown.innerHTML = `<div class="empty-state">Resolve the mission to compute payout weights and split.</div>`;
  }

  if (mission.settlementTransactions?.length) {
    elements.transactionList.innerHTML = mission.settlementTransactions
      .map(
        (transaction) => `
          <div class="summary-row">
            <span>${escapeHtml(transaction.kind)}</span>
            <span>${escapeHtml(transaction.amountDrops || "-")}</span>
            <span>${escapeHtml(transaction.txHash)}</span>
          </div>
        `
      )
      .join("");
  } else {
    elements.transactionList.innerHTML = `<div class="empty-state">No transaction trail yet.</div>`;
  }

  renderWorkflow();
}

async function loadAppState() {
  state.appConfig = await api("/app-config");
  if (state.appConfig?.demoSharedApiKey && !state.apiKey) {
    state.apiKey = state.appConfig.demoSharedApiKey;
    window.localStorage.setItem("adminApiKey", state.apiKey);
  }
  state.health = await api("/health");
  const { missions } = await api("/missions");
  state.missions = missions;
  if (!state.selectedMissionId && missions.length) {
    state.selectedMissionId = missions[0].id;
  }
  renderHealth();
  renderSummary();
}

async function refreshSelectedMission() {
  if (!state.selectedMissionId) {
    renderSummary();
    return;
  }

  const { mission } = await api(`/missions/${state.selectedMissionId}`);
  const index = state.missions.findIndex((item) => item.id === mission.id);
  if (index >= 0) {
    state.missions[index] = mission;
  } else {
    state.missions.unshift(mission);
  }
  renderSummary();
}

async function ensureContributionWallets() {
  while (state.contributionWallets.length < DEMO_CONFIG.contributions.length) {
    const wallet = await api("/wallets/demo", { method: "POST", body: "{}" });
    state.contributionWallets.push(wallet.address);
  }
}

async function generateCompanyWallet() {
  const wallet = await api("/wallets/demo", { method: "POST", body: "{}" });
  state.companyWallet = wallet.address;
  logActivity("1. Company wallet generated", "Created XRPL wallet for the company funding side.", wallet);
}

async function createMission() {
  if (!state.companyWallet) {
    await generateCompanyWallet();
  }

  const { mission } = await api("/missions", {
    method: "POST",
    body: JSON.stringify({
      title: DEMO_CONFIG.title,
      problemStatement: DEMO_CONFIG.problemStatement,
      budgetDrops: DEMO_CONFIG.budgetDrops,
      feeBps: DEMO_CONFIG.feeBps,
      companyWallet: state.companyWallet
    })
  });

  state.selectedMissionId = mission.id;
  state.missions.unshift(mission);
  logActivity(
    "2. Structured mission created",
    "Platform-side mission structure is ready with budget cap, fee, and problem context.",
    mission
  );
  renderSummary();
}

async function fundMission() {
  const mission = selectedMission();
  if (!mission) {
    throw new Error("Create a mission before funding it.");
  }

  const result = await api(`/missions/${mission.id}/fund`, {
    method: "POST",
    body: JSON.stringify({
      finishAfterSeconds: 10,
      cancelAfterSeconds: 600
    })
  });

  logActivity(
    "3. Budget locked in XRPL escrow",
    "Company wallet reserved the mission budget to the platform settlement wallet using EscrowCreate.",
    result
  );
  await refreshSelectedMission();
}

async function queryPlatformAgent() {
  const mission = selectedMission();
  if (!mission) {
    throw new Error("Create a mission before querying the platform agent.");
  }

  const result = await api(`/missions/${mission.id}/query-agent`, {
    method: "POST",
    body: JSON.stringify({
      question: "What kind of contribution creates the strongest marginal improvement?"
    }),
    usePaymentProof: true
  });

  state.lastQueryResult = result;
  elements.queryJson.textContent = JSON.stringify(result, null, 2);
  logActivity(
    "4. Agent queried platform intelligence via x402",
    "Paid context access returned structured hints about how to maximize useful contribution.",
    result
  );
}

async function addContributions() {
  const mission = selectedMission();
  if (!mission) {
    throw new Error("Create and fund a mission before adding contributions.");
  }

  await ensureContributionWallets();

  for (let index = 0; index < DEMO_CONFIG.contributions.length; index += 1) {
    const contribution = DEMO_CONFIG.contributions[index];
    const result = await api(`/missions/${mission.id}/contributions`, {
      method: "POST",
      body: JSON.stringify({
        contributorId: contribution.contributorId,
        contributorWallet: state.contributionWallets[index],
        title: contribution.title,
        content: contribution.content
      })
    });

    logActivity(
      `5.${index + 1} Contribution stored`,
      `${contribution.contributorId} submitted a solution brick and the platform linked it to a wallet identity.`,
      result.contribution
    );
  }

  await refreshSelectedMission();
}

async function resolveMission() {
  const mission = selectedMission();
  if (!mission) {
    throw new Error("Create, fund, and populate a mission before resolving it.");
  }

  if (mission.contributions.length < 3) {
    throw new Error("Need the three demo contributions before resolving the mission.");
  }

  const result = await api(`/missions/${mission.id}/resolve`, {
    method: "POST",
    body: JSON.stringify({
      minScoreThreshold: DEMO_CONFIG.minScoreThreshold,
      notes: DEMO_CONFIG.notes,
      scores: mission.contributions.map((contribution, index) => ({
        contributionId: contribution.id,
        score: DEMO_CONFIG.scores[index] ?? 0
      }))
    })
  });

  elements.queryJson.textContent = JSON.stringify(result.plan, null, 2);
  logActivity(
    "6. Contribution weights assigned",
    "Platform evaluation scored usefulness, zeroed low-value work, and computed the settlement plan.",
    result.plan
  );
  await refreshSelectedMission();
}

async function settleMission() {
  const mission = selectedMission();
  if (!mission) {
    throw new Error("Resolve a mission before settling it.");
  }

  const result = await api(`/missions/${mission.id}/settle`, {
    method: "POST",
    body: JSON.stringify({})
  });

  logActivity(
    "7. Mission settled on XRPL",
    "Escrow was finished, contributor payments were executed, and the fee was routed to treasury.",
    result
  );
  await refreshSelectedMission();
}

async function runDemo() {
  try {
    await generateCompanyWallet();
    await createMission();
    await fundMission();
    await queryPlatformAgent();
    await addContributions();
    await resolveMission();
    await settleMission();
    logActivity("Demo complete", "The full Proof of Contribution flow executed successfully.");
  } catch (error) {
    logActivity("Demo failed", error.message, error.body || undefined);
  }
}

document.getElementById("save-api-key").addEventListener("click", () => {
  state.apiKey = elements.apiKeyInput.value.trim();
  window.localStorage.setItem("adminApiKey", state.apiKey);
  logActivity("Credentials saved", "Stored admin key locally in the browser.");
});

document.getElementById("generate-api-key").addEventListener("click", () => {
  const generated = generateRandomKey();
  elements.apiKeyInput.value = generated;
  state.apiKey = generated;
  window.localStorage.setItem("adminApiKey", generated);
  logActivity(
    "Generated admin key",
    "Created a random key in the browser. Use this for local or deployment setup, not as a public production secret."
  );
});

document.getElementById("generate-company-wallet").addEventListener("click", async () => {
  try {
    await generateCompanyWallet();
  } catch (error) {
    logActivity("Wallet generation failed", error.message, error.body || undefined);
  }
});

document.getElementById("create-mission-button").addEventListener("click", async () => {
  try {
    await createMission();
  } catch (error) {
    logActivity("Mission creation failed", error.message, error.body || undefined);
  }
});

document.getElementById("fund-mission-button").addEventListener("click", async () => {
  try {
    await fundMission();
  } catch (error) {
    logActivity("Funding failed", error.message, error.body || undefined);
  }
});

document.getElementById("query-agent-button").addEventListener("click", async () => {
  try {
    await queryPlatformAgent();
  } catch (error) {
    logActivity("x402 query failed", error.message, error.body || undefined);
  }
});

document.getElementById("add-contributions-button").addEventListener("click", async () => {
  try {
    await addContributions();
  } catch (error) {
    logActivity("Contribution submission failed", error.message, error.body || undefined);
  }
});

document.getElementById("resolve-mission-button").addEventListener("click", async () => {
  try {
    await resolveMission();
  } catch (error) {
    logActivity("Resolution failed", error.message, error.body || undefined);
  }
});

document.getElementById("settle-mission-button").addEventListener("click", async () => {
  try {
    await settleMission();
  } catch (error) {
    logActivity("Settlement failed", error.message, error.body || undefined);
  }
});

document.getElementById("run-demo-button").addEventListener("click", async () => {
  await runDemo();
});

document.getElementById("clear-log").addEventListener("click", () => {
  state.activity = [];
  renderActivity();
});

async function boot() {
  elements.apiKeyInput.value = state.apiKey;
  renderActivity();

  try {
    await loadAppState();
    elements.apiKeyInput.value = state.apiKey;
    if (state.appConfig?.demoSharedApiKey) {
      elements.demoKeyHelper.textContent =
        "A shared demo key is preloaded for this site so visitors can test the full workflow. Production should keep keys private.";
    }
    logActivity(
      "Interface ready",
      "Button-first demo board loaded. Use the controls on the left to illustrate the protocol step by step."
    );
  } catch (error) {
    logActivity("Initial load failed", error.message, error.body || undefined);
  }
}

void boot();
