const state = {
  appConfig: null,
  health: null,
  missions: [],
  selectedMissionId: null,
  activity: [],
  apiKey: window.localStorage.getItem("adminApiKey") || "",
  paymentProof: window.localStorage.getItem("paymentProof") || "mock-paid"
};

const elements = {
  heroEyebrow: document.getElementById("hero-eyebrow"),
  heroKicker: document.getElementById("hero-kicker"),
  heroTitle: document.getElementById("hero-title"),
  heroCopy: document.getElementById("hero-copy"),
  modePill: document.getElementById("mode-pill"),
  healthStatus: document.getElementById("health-status"),
  appMode: document.getElementById("app-mode"),
  settlementAddress: document.getElementById("settlement-address"),
  treasuryAddress: document.getElementById("treasury-address"),
  xrplMode: document.getElementById("xrpl-mode"),
  missionCount: document.getElementById("mission-count"),
  selectedMissionPill: document.getElementById("selected-mission-pill"),
  doctrineList: document.getElementById("doctrine-list"),
  missionForm: document.getElementById("mission-form"),
  missionList: document.getElementById("mission-list"),
  selectedMissionEmpty: document.getElementById("selected-mission-empty"),
  selectedMissionContent: document.getElementById("selected-mission-content"),
  selectedMissionTitle: document.getElementById("selected-mission-title"),
  selectedMissionDescription: document.getElementById("selected-mission-description"),
  selectedStatusPill: document.getElementById("selected-status-pill"),
  metricBudget: document.getElementById("metric-budget"),
  metricFee: document.getElementById("metric-fee"),
  metricContributions: document.getElementById("metric-contributions"),
  metricTransactions: document.getElementById("metric-transactions"),
  workflowRail: document.getElementById("workflow-rail"),
  contributionForm: document.getElementById("contribution-form"),
  contributionList: document.getElementById("contribution-list"),
  resolveForm: document.getElementById("resolve-form"),
  scoreInputs: document.getElementById("score-inputs"),
  fundForm: document.getElementById("fund-form"),
  settlementBreakdown: document.getElementById("settlement-breakdown"),
  transactionList: document.getElementById("transaction-list"),
  queryForm: document.getElementById("query-form"),
  queryJson: document.getElementById("query-json"),
  missionJson: document.getElementById("mission-json"),
  settlementJson: document.getElementById("settlement-json"),
  activityLog: document.getElementById("activity-log"),
  companyWallet: document.getElementById("company-wallet"),
  apiKeyInput: document.getElementById("api-key-input"),
  paymentProofInput: document.getElementById("payment-proof-input")
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

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

function selectedMission() {
  return state.missions.find((mission) => mission.id === state.selectedMissionId) || null;
}

function logActivity(message, data) {
  state.activity.unshift({
    at: new Date().toLocaleTimeString(),
    message,
    data
  });
  renderActivity();
}

function renderActivity() {
  if (!state.activity.length) {
    elements.activityLog.innerHTML = `<div class="empty-state">No actions yet.</div>`;
    return;
  }

  elements.activityLog.innerHTML = state.activity
    .map(
      (entry) => `
        <article class="activity-entry">
          <time>${entry.at}</time>
          <div class="activity-copy">${escapeHtml(entry.message)}</div>
          ${entry.data ? `<pre class="json-panel compact">${escapeHtml(JSON.stringify(entry.data, null, 2))}</pre>` : ""}
        </article>
      `
    )
    .join("");
}

function renderDoctrine() {
  elements.doctrineList.innerHTML = (state.appConfig?.doctrine || [])
    .map((item) => `<div class="doctrine-chip">${escapeHtml(item)}</div>`)
    .join("");
}

function renderAppMode() {
  const isDemo = state.appConfig?.appMode === "demo";
  document.body.dataset.appMode = state.appConfig?.appMode || "production";
  elements.heroEyebrow.textContent = isDemo ? "Proof of Contribution Demo" : "Proof of Contribution";
  elements.heroKicker.textContent = state.appConfig?.tagline || "";
  elements.heroTitle.textContent = isDemo
    ? "Show the full XRPL mission workflow in one crisp live narrative."
    : "A clean operating surface for escrow-backed AI coordination.";
  elements.heroCopy.textContent = isDemo
    ? "Use the canonical mission, fund it with XRPL escrow, score multiple agent contributions, and settle payouts live with transaction visibility."
    : "Run missions like a real protocol operator: fund escrow, manage contribution flows, price intelligence access with x402-compatible endpoints, and settle value to the contributors that actually moved the solution forward.";
  elements.modePill.textContent = isDemo ? "Demo mode" : "Production mode";
}

function renderHealth() {
  if (!state.health) return;
  elements.healthStatus.textContent = state.health.ok ? "Live" : "Offline";
  elements.appMode.textContent = state.health.appMode;
  elements.xrplMode.textContent = state.health.useMockXrpl ? "Mock XRPL" : "Real XRPL";
  elements.settlementAddress.textContent = state.health.settlementAddress;
  elements.treasuryAddress.textContent = state.health.treasuryAddress;

  const companyButton = document.getElementById("generate-company-wallet");
  const contributorButton = document.getElementById("generate-contributor-wallet");
  companyButton.style.display = state.health.allowDemoWallets ? "" : "none";
  contributorButton.style.display = state.health.allowDemoWallets ? "" : "none";
}

function buildSettlementPreview(mission) {
  if (!mission.resolution) {
    return {
      message: "Resolve the mission to compute normalized contribution weights and payout allocation."
    };
  }

  return {
    platformFeeDrops: mission.resolution.platformFeeDrops,
    contributorPoolDrops: mission.resolution.contributorPoolDrops,
    minScoreThreshold: mission.resolution.minScoreThreshold,
    totalQualifiedWeight: mission.resolution.totalQualifiedWeight,
    payouts: mission.contributions.map((contribution) => ({
      contributorId: contribution.contributorId,
      score: contribution.score ?? 0,
      qualifies: contribution.qualifies ?? false,
      normalizedWeight: contribution.normalizedWeight ?? 0,
      payoutDrops: contribution.payoutDrops ?? "0"
    })),
    settlementTransactions: mission.settlementTransactions || []
  };
}

function renderMissionList() {
  elements.missionCount.textContent = String(state.missions.length);

  if (!state.missions.length) {
    elements.missionList.innerHTML = `<div class="empty-state">No missions yet. Load the canonical demo or create one manually.</div>`;
    return;
  }

  elements.missionList.innerHTML = state.missions
    .map((mission) => {
      const isActive = mission.id === state.selectedMissionId;
      return `
        <button class="mission-card ${isActive ? "active" : ""}" data-mission-id="${mission.id}" type="button">
          <div class="mission-card-top">
            <strong>${escapeHtml(mission.title)}</strong>
            <span class="mini-status">${escapeHtml(mission.status)}</span>
          </div>
          <p>${escapeHtml(mission.problemStatement)}</p>
          <div class="mission-meta">
            <span>${mission.budgetDrops} drops</span>
            <span>${mission.feeBps} bps fee</span>
            <span>${mission.contributions.length} contributions</span>
          </div>
        </button>
      `;
    })
    .join("");

  for (const button of elements.missionList.querySelectorAll("[data-mission-id]")) {
    button.addEventListener("click", async () => {
      state.selectedMissionId = button.dataset.missionId;
      await refreshSelectedMission();
    });
  }
}

function workflowSteps(mission) {
  return [
    { label: "Draft", active: true, done: true },
    {
      label: "Escrow funded",
      active: ["funded", "open", "resolved", "paid"].includes(mission.status),
      done: ["open", "resolved", "paid"].includes(mission.status)
    },
    {
      label: "Contributions submitted",
      active: mission.contributions.length > 0,
      done: mission.contributions.length > 0
    },
    {
      label: "Mission resolved",
      active: ["resolved", "paid"].includes(mission.status),
      done: ["paid"].includes(mission.status)
    },
    {
      label: "Settlement complete",
      active: mission.status === "paid",
      done: mission.status === "paid"
    }
  ];
}

function renderWorkflow(mission) {
  elements.workflowRail.innerHTML = workflowSteps(mission)
    .map(
      (step) => `
        <div class="workflow-step ${step.active ? "active" : ""} ${step.done ? "done" : ""}">
          <span class="workflow-dot"></span>
          <div>
            <strong>${escapeHtml(step.label)}</strong>
          </div>
        </div>
      `
    )
    .join("");
}

function renderContributions(mission) {
  if (!mission.contributions.length) {
    elements.contributionList.innerHTML = `<div class="empty-state">No contributions yet. Add a few agents to start the mission graph.</div>`;
    return;
  }

  elements.contributionList.innerHTML = mission.contributions
    .map(
      (contribution) => `
        <div class="data-card">
          <div class="data-card-top">
            <strong>${escapeHtml(contribution.title || contribution.contributorId)}</strong>
            <span class="mini-status ${contribution.qualifies ? "positive" : ""}">
              ${contribution.qualifies === undefined ? "pending" : contribution.qualifies ? "qualified" : "zeroed"}
            </span>
          </div>
          <p>${escapeHtml(contribution.content)}</p>
          <div class="data-meta">
            <span>${escapeHtml(contribution.contributorId)}</span>
            <span>score: ${contribution.score ?? "-"}</span>
            <span>payout: ${contribution.payoutDrops ?? "-"}</span>
          </div>
        </div>
      `
    )
    .join("");
}

function renderScoreInputs(mission) {
  if (!mission.contributions.length) {
    elements.scoreInputs.innerHTML = `<div class="empty-state">Add contributions to unlock the evaluation matrix.</div>`;
    return;
  }

  elements.scoreInputs.innerHTML = mission.contributions
    .map(
      (contribution, index) => `
        <label class="score-card">
          <span>${escapeHtml(contribution.contributorId)}</span>
          <input
            type="number"
            min="0"
            value="${contribution.score ?? (index === 0 ? 60 : index === 1 ? 30 : 0)}"
            data-contribution-id="${contribution.id}"
            required
          />
        </label>
      `
    )
    .join("");
}

function renderSettlementBreakdown(mission) {
  const preview = buildSettlementPreview(mission);
  if (!mission.resolution) {
    elements.settlementBreakdown.innerHTML = `<div class="empty-state">Resolution data will populate the payout telemetry once scoring is complete.</div>`;
    return;
  }

  elements.settlementBreakdown.innerHTML = `
    <div class="telemetry-card">
      <span class="metric-label">Platform fee</span>
      <strong>${preview.platformFeeDrops}</strong>
    </div>
    <div class="telemetry-card">
      <span class="metric-label">Contributor pool</span>
      <strong>${preview.contributorPoolDrops}</strong>
    </div>
    <div class="telemetry-card">
      <span class="metric-label">Qualified weight</span>
      <strong>${preview.totalQualifiedWeight}</strong>
    </div>
    <div class="telemetry-card">
      <span class="metric-label">Min threshold</span>
      <strong>${preview.minScoreThreshold}</strong>
    </div>
  `;
}

function renderTransactions(mission) {
  if (!mission.settlementTransactions?.length) {
    elements.transactionList.innerHTML = `<div class="empty-state">No settlement transactions yet. Finish the mission to populate the ledger trail.</div>`;
    return;
  }

  elements.transactionList.innerHTML = mission.settlementTransactions
    .map(
      (transaction) => `
        <div class="data-card">
          <div class="data-card-top">
            <strong>${escapeHtml(transaction.kind)}</strong>
            <span class="mini-status positive">${escapeHtml(transaction.amountDrops || "recorded")}</span>
          </div>
          <div class="data-meta">
            <span>${escapeHtml(transaction.txHash)}</span>
            <span>${escapeHtml(transaction.destinationWallet || "protocol step")}</span>
          </div>
        </div>
      `
    )
    .join("");
}

function renderSelectedMission() {
  const mission = selectedMission();

  if (!mission) {
    elements.selectedMissionEmpty.classList.remove("hidden");
    elements.selectedMissionContent.classList.add("hidden");
    elements.selectedMissionPill.textContent = "None selected";
    renderMissionList();
    return;
  }

  elements.selectedMissionEmpty.classList.add("hidden");
  elements.selectedMissionContent.classList.remove("hidden");
  elements.selectedMissionPill.textContent = mission.status;
  elements.selectedMissionTitle.textContent = mission.title;
  elements.selectedMissionDescription.textContent = mission.problemStatement;
  elements.selectedStatusPill.textContent = mission.status;
  elements.metricBudget.textContent = `${mission.budgetDrops} drops`;
  elements.metricFee.textContent = `${mission.feeBps} bps`;
  elements.metricContributions.textContent = String(mission.contributions.length);
  elements.metricTransactions.textContent = String(mission.settlementTransactions?.length || 0);
  elements.missionJson.textContent = JSON.stringify(mission, null, 2);
  elements.settlementJson.textContent = JSON.stringify(buildSettlementPreview(mission), null, 2);

  renderWorkflow(mission);
  renderContributions(mission);
  renderScoreInputs(mission);
  renderSettlementBreakdown(mission);
  renderTransactions(mission);
  renderMissionList();
}

async function loadAppConfig() {
  state.appConfig = await api("/app-config");
  renderDoctrine();
  renderAppMode();
}

async function loadHealth() {
  state.health = await api("/health");
  renderHealth();
  renderAppMode();
}

async function loadMissions() {
  const { missions } = await api("/missions");
  state.missions = missions;
  if (!state.selectedMissionId && missions.length) {
    state.selectedMissionId = missions[0].id;
  }
  if (state.selectedMissionId && !missions.find((mission) => mission.id === state.selectedMissionId)) {
    state.selectedMissionId = missions[0]?.id || null;
  }
  renderSelectedMission();
}

async function refreshSelectedMission() {
  if (!state.selectedMissionId) {
    renderSelectedMission();
    return;
  }

  const { mission } = await api(`/missions/${state.selectedMissionId}`);
  const index = state.missions.findIndex((item) => item.id === mission.id);
  if (index >= 0) state.missions[index] = mission;
  else state.missions.unshift(mission);
  renderSelectedMission();
}

async function generateWallet(targetInput) {
  const wallet = await api("/wallets/demo", { method: "POST", body: "{}" });
  targetInput.value = wallet.address;
  logActivity("Generated XRPL wallet", wallet);
}

function loadDemoScenario() {
  elements.missionForm.elements.title.value = "Improve support reply quality";
  elements.missionForm.elements.problemStatement.value =
    "Improve support reply quality by coordinating multiple useful agent contributions and rewarding only work that materially improves the final answer.";
  elements.missionForm.elements.budgetDrops.value = "1000000";
  elements.missionForm.elements.feeBps.value = "1000";
  elements.resolveForm.elements.minScoreThreshold.value = "10";
  elements.resolveForm.elements.notes.value = "Reward only the contributions that materially improve the final solution.";
  logActivity("Loaded canonical whitepaper demo scenario");
}

function loadDemoScores() {
  const mission = selectedMission();
  if (!mission) return;
  mission.contributions.forEach((contribution, index) => {
    const input = elements.resolveForm.querySelector(`[data-contribution-id="${contribution.id}"]`);
    if (input) {
      input.value = String(index === 0 ? 60 : index === 1 ? 30 : 0);
    }
  });
  logActivity("Loaded canonical evaluator weights (60 / 30 / 0)");
}

elements.missionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(elements.missionForm);
  try {
    const { mission } = await api("/missions", {
      method: "POST",
      body: JSON.stringify({
        title: form.get("title"),
        problemStatement: form.get("problemStatement"),
        budgetDrops: form.get("budgetDrops"),
        feeBps: Number(form.get("feeBps")),
        companyWallet: form.get("companyWallet")
      })
    });
    state.selectedMissionId = mission.id;
    logActivity("Created mission", mission);
    await loadMissions();
  } catch (error) {
    logActivity("Mission creation failed", { error: error.message });
  }
});

elements.fundForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.selectedMissionId) return;
  const form = new FormData(elements.fundForm);
  try {
    const result = await api(`/missions/${state.selectedMissionId}/fund`, {
      method: "POST",
      body: JSON.stringify({
        finishAfterSeconds: Number(form.get("finishAfterSeconds")),
        cancelAfterSeconds: Number(form.get("cancelAfterSeconds"))
      })
    });
    logActivity("Locked budget in XRPL escrow", result);
    await refreshSelectedMission();
  } catch (error) {
    logActivity("Funding failed", { error: error.message });
  }
});

elements.contributionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.selectedMissionId) return;
  const form = new FormData(elements.contributionForm);
  try {
    const result = await api(`/missions/${state.selectedMissionId}/contributions`, {
      method: "POST",
      body: JSON.stringify({
        contributorId: form.get("contributorId"),
        contributorWallet: form.get("contributorWallet"),
        title: form.get("title"),
        content: form.get("content")
      })
    });
    logActivity("Saved contribution", result);
    elements.contributionForm.reset();
    await refreshSelectedMission();
  } catch (error) {
    logActivity("Contribution failed", { error: error.message });
  }
});

elements.resolveForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const mission = selectedMission();
  if (!mission) return;
  const form = new FormData(elements.resolveForm);
  try {
    const result = await api(`/missions/${mission.id}/resolve`, {
      method: "POST",
      body: JSON.stringify({
        minScoreThreshold: Number(form.get("minScoreThreshold")),
        notes: form.get("notes"),
        scores: mission.contributions.map((contribution) => ({
          contributionId: contribution.id,
          score: Number(elements.resolveForm.querySelector(`[data-contribution-id="${contribution.id}"]`).value)
        }))
      })
    });
    logActivity("Resolved mission with Proof of Contribution scoring", result.plan);
    await refreshSelectedMission();
  } catch (error) {
    logActivity("Resolution failed", { error: error.message });
  }
});

document.getElementById("settle-button").addEventListener("click", async () => {
  if (!state.selectedMissionId) return;
  try {
    const result = await api(`/missions/${state.selectedMissionId}/settle`, {
      method: "POST",
      body: JSON.stringify({})
    });
    logActivity("Settled mission on XRPL", result);
    await refreshSelectedMission();
  } catch (error) {
    logActivity("Settlement failed", { error: error.message });
  }
});

document.getElementById("cancel-button").addEventListener("click", async () => {
  if (!state.selectedMissionId) return;
  try {
    const result = await api(`/missions/${state.selectedMissionId}/cancel`, {
      method: "POST",
      body: JSON.stringify({})
    });
    logActivity("Canceled mission escrow", result);
    await refreshSelectedMission();
  } catch (error) {
    logActivity("Cancel failed", { error: error.message });
  }
});

elements.queryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const mission = selectedMission();
  if (!mission) return;
  const form = new FormData(elements.queryForm);
  try {
    const result = await api(`/missions/${mission.id}/query-agent`, {
      method: "POST",
      body: JSON.stringify({ question: form.get("question") }),
      usePaymentProof: true
    });
    elements.queryJson.textContent = JSON.stringify(result, null, 2);
    logActivity("Queried paid platform intelligence", result);
  } catch (error) {
    elements.queryJson.textContent = JSON.stringify(error.body || { error: error.message }, null, 2);
    logActivity(error.status === 402 ? "x402 payment required for intelligence access" : "Query failed", error.body || { error: error.message });
  }
});

document.getElementById("premium-context-button").addEventListener("click", async () => {
  const mission = selectedMission();
  if (!mission) return;
  try {
    const result = await api(`/missions/${mission.id}/premium-context`, {
      method: "GET",
      usePaymentProof: true
    });
    elements.queryJson.textContent = JSON.stringify(result, null, 2);
    logActivity("Fetched premium mission context", result);
  } catch (error) {
    elements.queryJson.textContent = JSON.stringify(error.body || { error: error.message }, null, 2);
    logActivity(error.status === 402 ? "x402 payment required for premium context" : "Premium context failed", error.body || { error: error.message });
  }
});

document.getElementById("refresh-missions").addEventListener("click", async () => {
  try {
    await loadMissions();
    logActivity("Refreshed mission rail");
  } catch (error) {
    logActivity("Refresh failed", { error: error.message });
  }
});

document.getElementById("clear-log").addEventListener("click", () => {
  state.activity = [];
  renderActivity();
});

document.getElementById("save-api-key").addEventListener("click", () => {
  state.apiKey = elements.apiKeyInput.value.trim();
  state.paymentProof = elements.paymentProofInput.value.trim();
  window.localStorage.setItem("adminApiKey", state.apiKey);
  window.localStorage.setItem("paymentProof", state.paymentProof);
  logActivity("Saved local operator credentials");
});

document.getElementById("generate-company-wallet").addEventListener("click", async () => {
  try {
    await generateWallet(elements.companyWallet);
  } catch (error) {
    logActivity("Wallet generation failed", { error: error.message });
  }
});

document.getElementById("generate-contributor-wallet").addEventListener("click", async () => {
  try {
    await generateWallet(elements.contributionForm.querySelector('input[name="contributorWallet"]'));
  } catch (error) {
    logActivity("Wallet generation failed", { error: error.message });
  }
});

document.getElementById("load-demo-scenario").addEventListener("click", loadDemoScenario);
document.getElementById("load-demo-scores").addEventListener("click", loadDemoScores);

async function boot() {
  renderActivity();
  elements.apiKeyInput.value = state.apiKey;
  elements.paymentProofInput.value = state.paymentProof;

  try {
    await loadAppConfig();
    await loadHealth();
    await loadMissions();
    if (state.appConfig?.appMode === "demo") {
      loadDemoScenario();
    }
    logActivity("Interface ready", {
      appMode: state.appConfig?.appMode,
      xrplMode: state.health?.useMockXrpl ? "mock" : "real"
    });
  } catch (error) {
    logActivity("Initial load failed", { error: error.message });
  }
}

void boot();
