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
  heroTitle: document.getElementById("hero-title"),
  heroCopy: document.getElementById("hero-copy"),
  modePill: document.getElementById("mode-pill"),
  healthStatus: document.getElementById("health-status"),
  appMode: document.getElementById("app-mode"),
  settlementAddress: document.getElementById("settlement-address"),
  treasuryAddress: document.getElementById("treasury-address"),
  xrplMode: document.getElementById("xrpl-mode"),
  doctrineList: document.getElementById("doctrine-list"),
  architectureList: document.getElementById("architecture-list"),
  missionForm: document.getElementById("mission-form"),
  missionList: document.getElementById("mission-list"),
  missionCount: document.getElementById("mission-count"),
  selectedMissionPill: document.getElementById("selected-mission-pill"),
  selectedMissionEmpty: document.getElementById("selected-mission-empty"),
  selectedMissionContent: document.getElementById("selected-mission-content"),
  missionJson: document.getElementById("mission-json"),
  settlementJson: document.getElementById("settlement-json"),
  contributionForm: document.getElementById("contribution-form"),
  resolveForm: document.getElementById("resolve-form"),
  fundForm: document.getElementById("fund-form"),
  scoreInputs: document.getElementById("score-inputs"),
  activityLog: document.getElementById("activity-log"),
  companyWallet: document.getElementById("company-wallet"),
  apiKeyInput: document.getElementById("api-key-input"),
  paymentProofInput: document.getElementById("payment-proof-input"),
  queryForm: document.getElementById("query-form"),
  queryJson: document.getElementById("query-json"),
  demoPlaybook: document.getElementById("demo-playbook")
};

function escapeHtml(value) {
  return String(value)
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

function logActivity(message, data) {
  state.activity.unshift({ at: new Date().toLocaleTimeString(), message, data });
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
        <article class="log-entry">
          <time>${entry.at}</time>
          <div>${escapeHtml(entry.message)}</div>
          ${entry.data ? `<pre class="json-view">${escapeHtml(JSON.stringify(entry.data, null, 2))}</pre>` : ""}
        </article>
      `
    )
    .join("");
}

function selectedMission() {
  return state.missions.find((mission) => mission.id === state.selectedMissionId) || null;
}

function renderAppMode() {
  const isDemo = state.appConfig?.appMode === "demo";
  document.body.dataset.appMode = state.appConfig?.appMode || "production";
  elements.heroEyebrow.textContent = isDemo ? "Proof of Contribution Demo" : "Proof of Contribution";
  elements.heroTitle.textContent = isDemo
    ? "Judge-ready XRPL escrow demo for multi-agent contribution payments"
    : "The payment and coordination layer for AI agents doing real work";
  elements.heroCopy.textContent = state.appConfig?.tagline || "";
  elements.modePill.textContent = isDemo ? "Demo mode" : "Production mode";
  elements.demoPlaybook.classList.toggle("hidden", !isDemo);
  document.getElementById("generate-company-wallet").classList.toggle("hidden", !state.health?.allowDemoWallets);
  document.getElementById("generate-contributor-wallet").classList.toggle("hidden", !state.health?.allowDemoWallets);
}

function renderDoctrine() {
  elements.doctrineList.innerHTML = (state.appConfig?.doctrine || [])
    .map((item) => `<div class="doctrine-item">${escapeHtml(item)}</div>`)
    .join("");

  const architecture = state.appConfig?.whitepaperSummary || {};
  elements.architectureList.innerHTML = Object.entries(architecture)
    .map(
      ([key, value]) => `
        <div class="architecture-item">
          <strong>${escapeHtml(key.replace(/([A-Z])/g, " $1"))}</strong>
          <p>${escapeHtml(value)}</p>
        </div>
      `
    )
    .join("");
}

function buildSettlementPreview(mission) {
  if (!mission.resolution) {
    return {
      message: "Resolve the mission to see contribution weights, platform fee, and settlement transactions."
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

function formatMissionCard(mission) {
  const activeClass = mission.id === state.selectedMissionId ? "active" : "";
  const txCount = mission.settlementTransactions?.length || 0;
  return `
    <button class="mission-card ${activeClass}" data-mission-id="${mission.id}" type="button">
      <div class="panel-header">
        <h3>${escapeHtml(mission.title)}</h3>
        <span class="pill">${escapeHtml(mission.status)}</span>
      </div>
      <p>${escapeHtml(mission.problemStatement)}</p>
      <div class="mono">${mission.budgetDrops} drops • ${mission.feeBps} bps fee • ${txCount} settlement txs</div>
      <div class="mono">${mission.id}</div>
    </button>
  `;
}

function renderMissionList() {
  elements.missionCount.textContent = `${state.missions.length} loaded`;
  elements.missionList.innerHTML = state.missions.length
    ? state.missions.map(formatMissionCard).join("")
    : `<div class="empty-state">No missions yet.</div>`;

  for (const button of elements.missionList.querySelectorAll("[data-mission-id]")) {
    button.addEventListener("click", async () => {
      state.selectedMissionId = button.dataset.missionId;
      await refreshSelectedMission();
    });
  }
}

function renderScoreInputs(mission) {
  if (!mission?.contributions?.length) {
    elements.scoreInputs.innerHTML = `<div class="empty-state">Add contributions to unlock evaluator scoring.</div>`;
    return;
  }

  elements.scoreInputs.innerHTML = mission.contributions
    .map(
      (contribution, index) => `
        <label>
          ${escapeHtml(contribution.contributorId)} score
          <input
            name="score-${contribution.id}"
            data-contribution-id="${contribution.id}"
            type="number"
            min="0"
            value="${contribution.score ?? (index === 0 ? 60 : index === 1 ? 30 : 0)}"
            required
          />
        </label>
      `
    )
    .join("");
}

function renderSelectedMission() {
  const mission = selectedMission();
  if (!mission) {
    elements.selectedMissionPill.textContent = "None selected";
    elements.selectedMissionPill.className = "pill muted";
    elements.selectedMissionEmpty.classList.remove("hidden");
    elements.selectedMissionContent.classList.add("hidden");
    elements.missionJson.textContent = "";
    elements.settlementJson.textContent = "";
    renderMissionList();
    return;
  }

  elements.selectedMissionPill.textContent = `${mission.status} • ${mission.id.slice(0, 8)}`;
  elements.selectedMissionPill.className = "pill";
  elements.selectedMissionEmpty.classList.add("hidden");
  elements.selectedMissionContent.classList.remove("hidden");
  elements.missionJson.textContent = JSON.stringify(mission, null, 2);
  elements.settlementJson.textContent = JSON.stringify(buildSettlementPreview(mission), null, 2);
  renderScoreInputs(mission);
  renderMissionList();
}

async function loadAppConfig() {
  state.appConfig = await api("/app-config");
  renderAppMode();
  renderDoctrine();
}

async function loadHealth() {
  state.health = await api("/health");
  elements.healthStatus.textContent = state.health.ok ? "Live" : "Unavailable";
  elements.appMode.textContent = state.health.appMode;
  elements.xrplMode.textContent = state.health.useMockXrpl ? "Mock XRPL" : "Real XRPL";
  elements.settlementAddress.textContent = state.health.settlementAddress;
  elements.treasuryAddress.textContent = state.health.treasuryAddress;
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
  const idx = state.missions.findIndex((item) => item.id === mission.id);
  if (idx >= 0) state.missions[idx] = mission;
  else state.missions.unshift(mission);
  renderSelectedMission();
}

async function generateWallet(targetInput) {
  const wallet = await api("/wallets/demo", { method: "POST", body: "{}" });
  targetInput.value = wallet.address;
  logActivity("Generated XRPL test wallet", wallet);
}

function loadDemoScenario() {
  elements.missionForm.elements.title.value = "Improve support reply quality";
  elements.missionForm.elements.problemStatement.value =
    "Improve support reply quality by coordinating multiple agent contributions and rewarding only the work that materially improves the final answer.";
  elements.missionForm.elements.budgetDrops.value = "1000000";
  elements.missionForm.elements.feeBps.value = "1000";
  elements.resolveForm.elements.minScoreThreshold.value = "10";
  elements.resolveForm.elements.notes.value =
    "Reward only the contributions that materially improve the final solution. Low-value or redundant work receives zero.";
  logActivity("Loaded canonical PoC demo scenario");
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
  logActivity("Loaded demo evaluator scores (60 / 30 / 0)");
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
    logActivity("Locked mission budget in XRPL escrow", result);
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
    logActivity("Resolved mission using Proof of Contribution scoring", result.plan);
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
    logActivity("Fetched premium problem context", result);
  } catch (error) {
    elements.queryJson.textContent = JSON.stringify(error.body || { error: error.message }, null, 2);
    logActivity(error.status === 402 ? "x402 payment required for premium context" : "Premium context failed", error.body || { error: error.message });
  }
});

document.getElementById("refresh-missions").addEventListener("click", async () => {
  try {
    await loadMissions();
    logActivity("Refreshed mission list");
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
    logActivity("Proof of Contribution interface ready", {
      appMode: state.appConfig?.appMode,
      xrplMode: state.health?.useMockXrpl ? "mock" : "real"
    });
  } catch (error) {
    logActivity("Initial load failed", { error: error.message });
  }
}

void boot();
