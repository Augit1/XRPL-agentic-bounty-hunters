const state = {
  health: null,
  missions: [],
  selectedMissionId: null,
  activity: [],
  apiKey: window.localStorage.getItem("adminApiKey") || ""
};

const elements = {
  healthStatus: document.getElementById("health-status"),
  settlementAddress: document.getElementById("settlement-address"),
  treasuryAddress: document.getElementById("treasury-address"),
  xrplMode: document.getElementById("xrpl-mode"),
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
  apiKeyInput: document.getElementById("api-key-input")
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.apiKey ? { "x-api-key": state.apiKey } : {}),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(body?.error || body?.message || JSON.stringify(body));
  }

  return body;
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
        <article class="log-entry">
          <time>${entry.at}</time>
          <div>${entry.message}</div>
          ${entry.data ? `<pre class="json-view">${escapeHtml(JSON.stringify(entry.data, null, 2))}</pre>` : ""}
        </article>
      `
    )
    .join("");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function selectedMission() {
  return state.missions.find((mission) => mission.id === state.selectedMissionId) || null;
}

function formatMissionCard(mission) {
  const activeClass = mission.id === state.selectedMissionId ? "active" : "";
  return `
    <button class="mission-card ${activeClass}" data-mission-id="${mission.id}" type="button">
      <div class="panel-header">
        <h3>${escapeHtml(mission.title)}</h3>
        <span class="pill">${mission.status}</span>
      </div>
      <p>${escapeHtml(mission.problemStatement)}</p>
      <div class="mono">${mission.budgetDrops} drops • ${mission.feeBps} bps fee</div>
      <div class="mono">${mission.id}</div>
    </button>
  `;
}

function renderMissionList() {
  elements.missionCount.textContent = `${state.missions.length} loaded`;

  if (!state.missions.length) {
    elements.missionList.innerHTML = `<div class="empty-state">No missions yet.</div>`;
    return;
  }

  elements.missionList.innerHTML = state.missions.map(formatMissionCard).join("");

  for (const button of elements.missionList.querySelectorAll("[data-mission-id]")) {
    button.addEventListener("click", async () => {
      state.selectedMissionId = button.dataset.missionId;
      await refreshSelectedMission();
    });
  }
}

function renderScoreInputs(mission) {
  if (!mission) {
    elements.scoreInputs.innerHTML = "";
    return;
  }

  if (!mission.contributions.length) {
    elements.scoreInputs.innerHTML = `<div class="empty-state">Add contributions to unlock scoring inputs.</div>`;
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
  renderMissionList();
  renderScoreInputs(mission);
}

function buildSettlementPreview(mission) {
  if (!mission.resolution) {
    return {
      message: "Resolve the mission to preview computed platform fee, contributor pool, and payout hashes."
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
    payoutTxHashes: mission.payoutTxHashes || []
  };
}

async function loadHealth() {
  const health = await api("/health");
  state.health = health;
  elements.healthStatus.textContent = health.ok ? "Live" : "Unavailable";
  elements.settlementAddress.textContent = health.settlementAddress;
  elements.treasuryAddress.textContent = health.treasuryAddress;
  elements.xrplMode.textContent = health.useMockXrpl ? "Mock XRPL" : "XRPL network";
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
  state.missions = state.missions.map((item) => (item.id === mission.id ? mission : item));
  if (!state.missions.find((item) => item.id === mission.id)) {
    state.missions.unshift(mission);
  }
  renderSelectedMission();
}

async function generateWallet(targetInput) {
  const wallet = await api("/wallets/demo", { method: "POST" });
  targetInput.value = wallet.address;
  logActivity("Generated demo wallet", wallet);
}

elements.missionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(elements.missionForm);
  const payload = {
    title: form.get("title"),
    problemStatement: form.get("problemStatement"),
    budgetDrops: form.get("budgetDrops"),
    feeBps: Number(form.get("feeBps")),
    companyWallet: form.get("companyWallet")
  };

  try {
    const { mission } = await api("/missions", {
      method: "POST",
      body: JSON.stringify(payload)
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
  if (!state.selectedMissionId) {
    return;
  }

  const form = new FormData(elements.fundForm);
  const payload = {
    finishAfterSeconds: Number(form.get("finishAfterSeconds")),
    cancelAfterSeconds: Number(form.get("cancelAfterSeconds"))
  };

  try {
    const result = await api(`/missions/${state.selectedMissionId}/fund`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    logActivity("Funded mission escrow", result);
    await refreshSelectedMission();
  } catch (error) {
    logActivity("Funding failed", { error: error.message });
  }
});

elements.contributionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.selectedMissionId) {
    return;
  }

  const form = new FormData(elements.contributionForm);
  const payload = {
    contributorId: form.get("contributorId"),
    contributorWallet: form.get("contributorWallet"),
    title: form.get("title"),
    content: form.get("content")
  };

  try {
    const result = await api(`/missions/${state.selectedMissionId}/contributions`, {
      method: "POST",
      body: JSON.stringify(payload)
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
  if (!mission) {
    return;
  }

  const form = new FormData(elements.resolveForm);
  const scores = mission.contributions.map((contribution) => {
    const input = elements.resolveForm.querySelector(`[data-contribution-id="${contribution.id}"]`);
    return {
      contributionId: contribution.id,
      score: Number(input.value)
    };
  });

  const payload = {
    minScoreThreshold: Number(form.get("minScoreThreshold")),
    notes: form.get("notes"),
    scores
  };

  try {
    const result = await api(`/missions/${mission.id}/resolve`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    logActivity("Resolved mission", result.plan);
    await refreshSelectedMission();
  } catch (error) {
    logActivity("Resolution failed", { error: error.message });
  }
});

document.getElementById("settle-button").addEventListener("click", async () => {
  if (!state.selectedMissionId) {
    return;
  }

  try {
    const result = await api(`/missions/${state.selectedMissionId}/settle`, {
      method: "POST",
      body: JSON.stringify({})
    });
    logActivity("Settled mission", result);
    await refreshSelectedMission();
  } catch (error) {
    logActivity("Settlement failed", { error: error.message });
  }
});

document.getElementById("cancel-button").addEventListener("click", async () => {
  if (!state.selectedMissionId) {
    return;
  }

  try {
    const result = await api(`/missions/${state.selectedMissionId}/cancel`, {
      method: "POST",
      body: JSON.stringify({})
    });
    logActivity("Canceled mission", result);
    await refreshSelectedMission();
  } catch (error) {
    logActivity("Cancel failed", { error: error.message });
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
  window.localStorage.setItem("adminApiKey", state.apiKey);
  logActivity("Saved admin API key in browser");
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
    const input = elements.contributionForm.querySelector('input[name="contributorWallet"]');
    await generateWallet(input);
  } catch (error) {
    logActivity("Wallet generation failed", { error: error.message });
  }
});

async function boot() {
  renderActivity();
  elements.apiKeyInput.value = state.apiKey;
  try {
    await loadHealth();
    await loadMissions();
    logActivity("Dashboard ready", state.health);
  } catch (error) {
    logActivity("Initial load failed", { error: error.message });
  }
}

void boot();
