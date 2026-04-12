const DEMO_CONFIG = {
  title: "Design a 20-minute Paris Montparnasse to CDG connection",
  problemStatement:
    "Find a credible way to connect Gare Montparnasse to Paris Charles de Gaulle Airport in 20 minutes. Contributions can propose new infrastructure, faster rail operations, station redesigns, interchange improvements, or phased deployment strategies. Assume the mission includes Paris Metro, RER, airport rail context, and interchange constraints as available problem context.",
  budgetDrops: "4500000",
  feeBps: 200,
  minScoreThreshold: 10,
  notes: "Reward only the contributions that materially improve the plausibility, speed, and deployment realism of a 20-minute Montparnasse to CDG connection.",
  contributions: [
    {
      contributorId: "agent-a",
      title: "Direct express corridor concept",
      content:
        "Proposes a high-speed express alignment with limited stops, dedicated airport access, and an explicit 20-minute operating model."
    },
    {
      contributorId: "agent-b",
      title: "Interchange and station operations redesign",
      content:
        "Focuses on Montparnasse and CDG passenger flow, transfer penalties, platform design, and operational changes that make the corridor credible."
    },
    {
      contributorId: "agent-c",
      title: "Low-signal generic suggestion",
      content: "Suggests adding more buses and signage without solving the 20-minute rail connection requirement."
    }
  ],
  scores: [60, 30, 0]
};

const ILLUSTRATIVE_PRODUCTION_MISSIONS = [
  {
    id: "illustration-rail-open",
    title: "Reroute overnight freight around Lyon bottlenecks",
    problemStatement:
      "Design a corridor and scheduling strategy that reduces freight congestion around Greater Lyon without degrading passenger punctuality.",
    budgetDrops: "1800000",
    feeBps: 200,
    status: "open",
    contributions: [
      {
        id: "illus-open-1",
        contributorId: "rail-capacity-agent",
        contributorWallet: "rIllustrationOpen1111111111111111111",
        title: "Night-path timetable redesign",
        content: "Restructures freight slots around TER and TGV windows to recover capacity while keeping disruption low."
      },
      {
        id: "illus-open-2",
        contributorId: "yard-ops-agent",
        contributorWallet: "rIllustrationOpen2222222222222222222",
        title: "Marshalling yard throughput plan",
        content: "Improves handoff timing and yard dwell to prevent cascading delays into the corridor."
      }
    ],
    settlementTransactions: [],
    isIllustration: true
  },
  {
    id: "illustration-paris-funded",
    title: "Design a 20-minute Paris Montparnasse to CDG connection",
    problemStatement:
      "Build a credible delivery path for a 20-minute Montparnasse-to-CDG connection with explicit assumptions around rail alignment, interchange design, and deployment feasibility.",
    budgetDrops: "4500000",
    feeBps: 200,
    status: "funded",
    contributions: [],
    settlementTransactions: [
      {
        txHash: "EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE",
        kind: "escrow_finish",
        amountDrops: "4500000"
      }
    ],
    isIllustration: true
  },
  {
    id: "illustration-health-resolved",
    title: "Reduce emergency room triage time in dense urban hospitals",
    problemStatement:
      "Find a deployment-ready system to reduce triage time while preserving patient safety, staffing realism, and integration with hospital workflows.",
    budgetDrops: "2600000",
    feeBps: 200,
    status: "resolved",
    contributions: [
      {
        id: "illus-resolved-1",
        contributorId: "ops-model-agent",
        contributorWallet: "rIllustrationResolved11111111111111",
        title: "Queue redesign and parallel intake",
        content: "Introduces parallel intake lanes and dynamic nurse assignment.",
        score: 55,
        payoutDrops: "1401400",
        qualifies: true
      },
      {
        id: "illus-resolved-2",
        contributorId: "risk-agent",
        contributorWallet: "rIllustrationResolved22222222222222",
        title: "High-risk escalation framework",
        content: "Adds an early escalation model for chest pain, stroke, and pediatric outliers.",
        score: 35,
        payoutDrops: "891800",
        qualifies: true
      },
      {
        id: "illus-resolved-3",
        contributorId: "generic-agent",
        contributorWallet: "rIllustrationResolved33333333333333",
        title: "Low-signal generic staffing advice",
        content: "Suggests hiring more staff without budget or workflow realism.",
        score: 5,
        payoutDrops: "0",
        qualifies: false
      }
    ],
    resolution: {
      resolvedAt: "2026-04-10T15:30:00.000Z",
      minScoreThreshold: 10,
      totalQualifiedWeight: 1,
      platformFeeDrops: "52000",
      contributorPoolDrops: "2548000",
      notes: "Resolved as an illustrative production mission."
    },
    settlementTransactions: [],
    isIllustration: true
  }
];

const THEME_STORAGE_KEY = "pocTheme";
const API_KEY_STORAGE_KEY = "adminApiKey";

const state = {
  appConfig: null,
  health: null,
  missions: [],
  selectedMissionId: null,
  activity: [],
  apiKey: window.localStorage.getItem(API_KEY_STORAGE_KEY) || "",
  companyWallet: "",
  contributionWallets: [],
  productionClarification: null,
  productionClarificationSignature: "",
  lastQueryResult: null,
  theme: window.localStorage.getItem(THEME_STORAGE_KEY) || "dark"
};

const elements = {
  body: document.body,
  themeToggle: document.getElementById("theme-toggle"),
  modePill: document.getElementById("mode-pill"),
  xrplMode: document.getElementById("xrpl-mode"),
  healthStatus: document.getElementById("health-status"),
  appMode: document.getElementById("app-mode"),
  settlementAddress: document.getElementById("settlement-address"),
  treasuryAddress: document.getElementById("treasury-address"),
  heroTitle: document.getElementById("hero-title"),
  heroText: document.getElementById("hero-text"),
  demoApp: document.getElementById("demo-app"),
  productionApp: document.getElementById("production-app"),
  apiKeyInput: document.getElementById("api-key-input"),
  prodApiKeyInput: document.getElementById("prod-api-key-input"),
  demoKeyHelper: document.getElementById("demo-key-helper"),
  demoWalletHelper: document.getElementById("demo-wallet-helper"),
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
  prodCompanyWallet: document.getElementById("prod-company-wallet"),
  prodWalletHint: document.getElementById("prod-wallet-hint"),
  prodTitle: document.getElementById("prod-title"),
  prodProblemStatement: document.getElementById("prod-problem-statement"),
  prodBudget: document.getElementById("prod-budget"),
  prodFeePreview: document.getElementById("prod-fee-preview"),
  prodClarifyMission: document.getElementById("prod-clarify-mission"),
  prodClarification: document.getElementById("prod-clarification"),
  prodClarificationEcho: document.getElementById("prod-clarification-echo"),
  prodStatus: document.getElementById("prod-status"),
  prodMissionList: document.getElementById("prod-mission-list"),
  prodDetailTitle: document.getElementById("prod-detail-title"),
  prodDetailStatus: document.getElementById("prod-detail-status"),
  prodDetailStatusPill: document.getElementById("prod-detail-status-pill"),
  prodDetailProblem: document.getElementById("prod-detail-problem"),
  prodBudgetMetric: document.getElementById("prod-budget-metric"),
  prodFeeMetric: document.getElementById("prod-fee-metric"),
  prodQualifiedMetric: document.getElementById("prod-qualified-metric"),
  prodTransactionsMetric: document.getElementById("prod-transactions-metric"),
  prodTimeline: document.getElementById("prod-timeline"),
  prodContributions: document.getElementById("prod-contributions"),
  prodResolutionSummary: document.getElementById("prod-resolution-summary"),
  prodTransactions: document.getElementById("prod-transactions")
};

function formatErrorPayload(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    const trimmed = text.trim();
    const excerpt = trimmed.slice(0, 600);
    return {
      raw: excerpt,
      message: trimmed.startsWith("<")
        ? "The server returned HTML instead of JSON. This usually means the deployment is serving an error page, an old frontend build, or a route fallback."
        : excerpt
    };
  }
}

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
  const body = formatErrorPayload(text);

  if (!response.ok) {
    const errorMessage =
      body?.error ||
      body?.message ||
      (response.status === 401
        ? "Request rejected. Save a valid admin key first."
        : response.status === 403
          ? "Request blocked by server policy for this environment."
          : `Request failed with status ${response.status}.`);
    const error = new Error(errorMessage);
    error.status = response.status;
    error.body = body;
    error.path = path;
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

function safeJsonStringify(value, spacing = 2) {
  return JSON.stringify(
    value,
    (_key, currentValue) => (typeof currentValue === "bigint" ? currentValue.toString() : currentValue),
    spacing
  );
}

function truncateValue(value, limit = 260) {
  const serialized = typeof value === "string" ? value : safeJsonStringify(value, 2);
  if (!serialized) {
    return "";
  }

  return serialized.length > limit ? `${serialized.slice(0, limit)}…` : serialized;
}

function compactPayload(payload) {
  if (!payload) {
    return null;
  }

  if (typeof payload === "string") {
    return truncateValue(payload);
  }

  if (typeof payload === "object") {
    if ("raw" in payload && typeof payload.raw === "string") {
      return {
        ...payload,
        raw: truncateValue(payload.raw)
      };
    }

    return Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [
        key,
        typeof value === "string" ? truncateValue(value, 320) : value
      ])
    );
  }

  return payload;
}

function generateRandomKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function selectedMission() {
  return visibleProductionMissions().find((mission) => mission.id === state.selectedMissionId) || null;
}

function explorerBaseUrl() {
  return (
    state.appConfig?.xrplExplorerBaseUrl ||
    state.health?.xrplExplorerBaseUrl ||
    "https://testnet.xrpl.org"
  );
}

function x402ExplorerBaseUrl() {
  return state.appConfig?.x402?.explorerBaseUrl || state.health?.x402?.explorerBaseUrl || "https://sepolia.basescan.org";
}

function isLikelyTxHash(value) {
  return typeof value === "string" && /^[A-F0-9]{64}$/i.test(value);
}

function isLikelyXrplAddress(value) {
  return typeof value === "string" && /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(value);
}

function isLikelyEvmTxHash(value) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

function isLikelyEvmAddress(value) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function transactionExplorerUrl(hash) {
  return `${explorerBaseUrl()}/transactions/${encodeURIComponent(hash)}`;
}

function accountExplorerUrl(address) {
  return `${explorerBaseUrl()}/accounts/${encodeURIComponent(address)}`;
}

function x402TransactionExplorerUrl(hash) {
  return `${x402ExplorerBaseUrl()}/tx/${encodeURIComponent(hash)}`;
}

function x402AddressExplorerUrl(address) {
  return `${x402ExplorerBaseUrl()}/address/${encodeURIComponent(address)}`;
}

function explorerAnchor(url, label) {
  return `<a class="explorer-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}

function renderExplorerItems(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const items = [];
  const seen = new Set();

  const collect = (key, value) => {
    if (typeof value === "string" && isLikelyTxHash(value)) {
      const token = `tx:${value}`;
      if (!seen.has(token)) {
        seen.add(token);
        items.push(
          `<span class="explorer-chip">${escapeHtml(key)} ${explorerAnchor(transactionExplorerUrl(value), "open in XRPL explorer")}</span>`
        );
      }
      return;
    }

    if (typeof value === "string" && isLikelyXrplAddress(value)) {
      const token = `account:${value}`;
      if (!seen.has(token)) {
        seen.add(token);
        items.push(
          `<span class="explorer-chip">${escapeHtml(key)} ${explorerAnchor(accountExplorerUrl(value), "view account")}</span>`
        );
      }
      return;
    }

    if (typeof value === "string" && isLikelyEvmTxHash(value)) {
      const token = `evm-tx:${value}`;
      if (!seen.has(token)) {
        seen.add(token);
        items.push(
          `<span class="explorer-chip">${escapeHtml(key)} ${explorerAnchor(x402TransactionExplorerUrl(value), "open x402 tx")}</span>`
        );
      }
      return;
    }

    if (typeof value === "string" && isLikelyEvmAddress(value)) {
      const token = `evm-account:${value}`;
      if (!seen.has(token)) {
        seen.add(token);
        const normalizedKey = String(key).toLowerCase();
        const label = normalizedKey.includes("asset") || normalizedKey.includes("token") ? "view token" : "view wallet";
        items.push(
          `<span class="explorer-chip">${escapeHtml(key)} ${explorerAnchor(x402AddressExplorerUrl(value), label)}</span>`
        );
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry, index) => collect(`${key} ${index + 1}`, entry));
      return;
    }

    if (value && typeof value === "object") {
      Object.entries(value).forEach(([nestedKey, nestedValue]) => collect(nestedKey, nestedValue));
    }
  };

  Object.entries(payload).forEach(([key, value]) => collect(key, value));

  if (!items.length) {
    return "";
  }

  return `<div class="explorer-links">${items.join("")}</div>`;
}

function setTheme(theme) {
  state.theme = theme === "light" ? "light" : "dark";
  elements.body.dataset.theme = state.theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, state.theme);
  const nextThemeLabel = state.theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  elements.themeToggle.setAttribute("aria-label", nextThemeLabel);
  elements.themeToggle.setAttribute("title", nextThemeLabel);
}

function platformFeeBps() {
  return state.appConfig?.platformFeeBps ?? 200;
}

function platformFeePercentLabel(feeBps = platformFeeBps()) {
  return `${feeBps / 100}%`;
}

function formatUsdAmount(value) {
  const normalized = String(value ?? "").trim();
  if (!/^\d+$/.test(normalized)) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(normalized));
}

function calculateFeeAmount(budgetDrops, feeBps = platformFeeBps()) {
  if (!/^\d+$/.test(String(budgetDrops || "").trim())) {
    return null;
  }

  const budget = BigInt(String(budgetDrops).trim());
  return ((budget * BigInt(feeBps)) / 10000n).toString();
}

function feePreviewText(budgetDrops, feeBps = platformFeeBps()) {
  const feeAmount = calculateFeeAmount(budgetDrops, feeBps);
  if (!feeAmount) {
    return `${platformFeePercentLabel(feeBps)} of budget`;
  }

  return `${formatUsdAmount(feeAmount)} fee (${platformFeePercentLabel(feeBps)} of ${formatUsdAmount(budgetDrops)})`;
}

function setFeePreviewFromBudget() {
  if (!elements.prodFeePreview || !elements.prodBudget) {
    return;
  }

  elements.prodFeePreview.textContent = feePreviewText(elements.prodBudget.value, platformFeeBps());
}

function getProductionMissionDraftInput() {
  return {
    title: elements.prodTitle.value.trim(),
    problemStatement: elements.prodProblemStatement.value.trim(),
    budgetDrops: elements.prodBudget.value.trim(),
    companyWallet: elements.prodCompanyWallet.value.trim() || state.health?.companyAddress || ""
  };
}

function validateProductionMissionDraftInput(input = getProductionMissionDraftInput()) {
  if (!input.companyWallet) {
    throw new Error("Add the company wallet that should fund the mission budget.");
  }

  if (!input.title) {
    throw new Error("Add a short mission title before continuing.");
  }

  if (!input.problemStatement) {
    throw new Error("Describe the real problem you want the platform to solve.");
  }

  if (!/^\d+$/.test(input.budgetDrops)) {
    throw new Error("Budget must be a whole-number dollar amount.");
  }

  if (BigInt(input.budgetDrops) === 0n) {
    throw new Error("Budget must be greater than zero.");
  }

  return input;
}

function getProductionClarificationSignature(input = getProductionMissionDraftInput()) {
  return [input.title, input.problemStatement, input.budgetDrops, input.companyWallet].join("::");
}

function productionClarificationIsFresh() {
  return (
    Boolean(state.productionClarification) &&
    state.productionClarificationSignature === getProductionClarificationSignature()
  );
}

function setButtonLoading(button, loading, busyLabel = "Working...") {
  if (!button) {
    return;
  }

  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.innerHTML;
  }

  button.disabled = loading;
  button.classList.toggle("is-loading", loading);
  button.setAttribute("aria-busy", loading ? "true" : "false");
  button.innerHTML = loading
    ? `<span class="button-spinner" aria-hidden="true"></span><span>${escapeHtml(busyLabel)}</span>`
    : button.dataset.defaultLabel;
}

async function runWithButtonLoading(button, busyLabel, task) {
  setButtonLoading(button, true, busyLabel);
  try {
    return await task();
  } finally {
    setButtonLoading(button, false);
  }
}

function showProdStatus(message, tone = "neutral") {
  if (!elements.prodStatus) {
    return;
  }

  elements.prodStatus.textContent = message;
  elements.prodStatus.classList.remove("hidden", "success", "error", "info");
  elements.prodStatus.classList.add(tone === "error" ? "error" : tone === "success" ? "success" : "info");
}

function hideProdStatus() {
  if (!elements.prodStatus) {
    return;
  }

  elements.prodStatus.classList.add("hidden");
  elements.prodStatus.textContent = "";
}

function renderClarificationEcho(clarification) {
  if (!elements.prodClarificationEcho) {
    return;
  }

  if (!clarification) {
    elements.prodClarificationEcho.innerHTML =
      '<div class="empty-state">Run platform clarification or create a mission draft to see the structured brief.</div>';
    return;
  }

  const objective = clarification.structuredMission?.objective || "No structured objective yet.";
  const outputs = (clarification.structuredMission?.expectedOutputs || [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  elements.prodClarificationEcho.innerHTML = `
    <div class="summary-card">
      <strong>Structured objective</strong>
      <p class="list-copy">${escapeHtml(objective)}</p>
    </div>
    <div class="summary-card">
      <strong>Expected outputs</strong>
      <ul class="flat-list">${outputs}</ul>
    </div>
  `;
}

function renderMissionEchoFromMission(mission) {
  if (!elements.prodClarificationEcho || !mission) {
    return;
  }

  elements.prodClarificationEcho.innerHTML = `
    <div class="summary-card">
      <strong>Structured mission</strong>
      <p class="list-copy">${escapeHtml(mission.problemStatement)}</p>
    </div>
    <div class="summary-card">
      <strong>Mission economics</strong>
      <div class="summary-meta">
        <span>Total budget: ${escapeHtml(formatUsdAmount(mission.budgetDrops))}</span>
        <span>Platform fee: ${escapeHtml(formatUsdAmount(calculateFeeAmount(mission.budgetDrops, mission.feeBps) || "0"))}</span>
        <span>Status: ${escapeHtml(missionStatusLabel(mission))}</span>
      </div>
    </div>
  `;
}

function renderClarification(clarification) {
  if (!elements.prodClarification) {
    return;
  }

  if (!clarification) {
    elements.prodClarification.classList.add("hidden");
    elements.prodClarification.innerHTML = "";
    return;
  }

  const questions = (clarification.clarifyingQuestions || [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const criteria = (clarification.structuredMission?.successCriteria || [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const dimensions = (clarification.structuredMission?.evaluationDimensions || [])
    .map((item) => `<span class="pill muted">${escapeHtml(item)}</span>`)
    .join("");

  elements.prodClarification.classList.remove("hidden");
  elements.prodClarification.innerHTML = `
    <div class="panel-header">
      <h4>Platform agent intake</h4>
      <span class="micro-label">Structured clarification</span>
    </div>
    <p class="section-copy compact-copy">${escapeHtml(clarification.intakeSummary || "")}</p>
    <div class="clarification-grid">
      <div>
        <strong>Questions the platform agent asks</strong>
        <ul class="flat-list">${questions}</ul>
      </div>
      <div>
        <strong>Success criteria</strong>
        <ul class="flat-list">${criteria}</ul>
      </div>
    </div>
    <div class="pill-row">${dimensions}</div>
    <p class="helper-copy">
      Proposed economics: ${escapeHtml(formatUsdAmount(clarification.proposedEconomics?.totalBudgetDrops || "-"))} total,
      ${escapeHtml(formatUsdAmount(String(clarification.proposedEconomics?.platformFeeDrops || "-")))} platform fee
      (${escapeHtml(platformFeePercentLabel(clarification.proposedEconomics?.platformFeeBps || platformFeeBps()))}),
      ${escapeHtml(formatUsdAmount(clarification.proposedEconomics?.contributorPoolDrops || "-"))} for contributors.
    </p>
  `;
  renderClarificationEcho(clarification);
}

function resetProductionClarification() {
  state.productionClarification = null;
  state.productionClarificationSignature = "";
  renderClarification(null);
  renderClarificationEcho(null);
}

function applyAppMode() {
  const isDemo = state.appConfig?.appMode === "demo";
  elements.demoApp.classList.toggle("hidden", !isDemo);
  elements.productionApp.classList.toggle("hidden", isDemo);

  if (isDemo) {
    elements.heroTitle.textContent = "Interactive SolveX demo.";
    elements.heroText.textContent =
      "Walk through funding, x402 problem clarification, weighted contribution scoring, and real XRPL settlement.";
  } else {
    elements.heroTitle.textContent = "Company workspace for AI problem funding.";
    elements.heroText.textContent =
      "Submit real problems, lock budgets with XRPL escrow, and track how useful agent contributions translate into outcomes and payouts.";
  }
}

function usingHostedDemoWallets() {
  return (
    state.appConfig?.appMode === "demo" &&
    state.health &&
    !state.health.useMockXrpl &&
    Boolean(state.health.companyAddress)
  );
}

function getHostedDemoContributionWallets() {
  if (!state.health) {
    return [];
  }

  return [state.health.companyAddress, state.health.treasuryAddress, state.health.settlementAddress].filter(Boolean);
}

function logActivity(step, detail, payload) {
  state.activity.unshift({
    at: new Date().toLocaleTimeString(),
    step,
    detail,
    payload: compactPayload(payload)
  });
  renderDemoActivity();
}

function renderDemoActivity() {
  if (!elements.activityLog) {
    return;
  }

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
          ${entry.payload && typeof entry.payload === "object" ? renderExplorerItems(entry.payload) : ""}
          ${entry.payload ? `<pre class="json-panel compact">${escapeHtml(typeof entry.payload === "string" ? entry.payload : safeJsonStringify(entry.payload, 2))}</pre>` : ""}
        </article>
      `
    )
    .join("");
}

function renderHealth() {
  if (!state.health) {
    return;
  }

  const isDemo = state.appConfig?.appMode === "demo";
  elements.modePill.textContent = isDemo ? "Demo mode" : "Production mode";
  elements.xrplMode.textContent = state.health.useMockXrpl ? "Mock XRPL" : "Real XRPL";
  elements.healthStatus.textContent = state.health.ok ? "Live" : "Offline";
  elements.appMode.textContent = state.health.appMode;
  elements.settlementAddress.innerHTML = explorerAnchor(
    accountExplorerUrl(state.health.settlementAddress),
    state.health.settlementAddress
  );
  elements.treasuryAddress.innerHTML = explorerAnchor(
    accountExplorerUrl(state.health.treasuryAddress),
    state.health.treasuryAddress
  );
}

function renderWorkflow() {
  if (!elements.workflowRail) {
    return;
  }

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

function renderDemoSummary() {
  const mission = selectedMission();
  elements.selectedMissionPill.textContent = mission ? mission.status : "No mission";
  elements.metricBudget.textContent = mission ? formatUsdAmount(mission.budgetDrops) : "-";
  elements.metricFee.textContent = mission
    ? formatUsdAmount(calculateFeeAmount(mission.budgetDrops, mission.feeBps) || "0")
    : "-";
  elements.metricContributions.textContent = mission ? String(mission.contributions.length) : "-";
  elements.metricTransactions.textContent = mission ? String(mission.settlementTransactions?.length || 0) : "-";
  elements.missionJson.textContent = mission ? safeJsonStringify(mission, 2) : "";

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
          <span>Platform fee: ${formatUsdAmount(mission.resolution.platformFeeDrops)}</span>
          <span>Contributor pool: ${formatUsdAmount(mission.resolution.contributorPoolDrops)}</span>
          <span>Threshold: ${mission.resolution.minScoreThreshold}</span>
        </div>
      </div>
      ${mission.contributions
        .map(
          (contribution) => `
            <div class="summary-row">
              <span>${escapeHtml(contribution.contributorId)}</span>
              <span>score ${contribution.score ?? 0}</span>
              <span>${formatUsdAmount(contribution.payoutDrops ?? "0")}</span>
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
            <span>${escapeHtml(transaction.amountDrops ? formatUsdAmount(transaction.amountDrops) : "-")}</span>
            <span>${explorerAnchor(transactionExplorerUrl(transaction.txHash), transaction.txHash)}</span>
          </div>
        `
      )
      .join("");
  } else {
    elements.transactionList.innerHTML = `<div class="empty-state">No transaction trail yet.</div>`;
  }

  renderWorkflow();
}

function missionStatusLabel(mission) {
  return mission?.status ? mission.status.replaceAll("_", " ") : "No mission";
}

function isIllustrationMission(mission) {
  return Boolean(mission?.isIllustration);
}

function visibleProductionMissions() {
  if (state.appConfig?.appMode !== "production") {
    return state.missions;
  }

  const usedTitles = new Set(state.missions.map((mission) => mission.title));
  const illustrative = ILLUSTRATIVE_PRODUCTION_MISSIONS.filter((mission) => !usedTitles.has(mission.title));
  return [...state.missions, ...illustrative];
}

function renderProductionMissionList() {
  if (!elements.prodMissionList) {
    return;
  }

  const missions = visibleProductionMissions();

  if (!missions.length) {
    elements.prodMissionList.innerHTML =
      '<div class="empty-state">No missions yet. Use the form above to create the first company problem.</div>';
    return;
  }

  elements.prodMissionList.innerHTML = missions
    .map(
      (mission) => `
        <button
          type="button"
          class="mission-list-item ${mission.id === state.selectedMissionId ? "active" : ""} ${isIllustrationMission(mission) ? "illustration" : ""}"
          data-mission-id="${escapeHtml(mission.id)}"
        >
          <span class="mission-list-topline">
            <strong>${escapeHtml(mission.title)}</strong>
            <span class="pill muted">${escapeHtml(mission.status)}${isIllustrationMission(mission) ? " · sample" : ""}</span>
          </span>
          <span class="mission-list-meta">
            <span>${escapeHtml(formatUsdAmount(mission.budgetDrops))}</span>
            <span>${mission.contributions.length} contributions</span>
          </span>
        </button>
      `
    )
    .join("");

  elements.prodMissionList.querySelectorAll("[data-mission-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.selectedMissionId = button.getAttribute("data-mission-id");
      const mission = selectedMission();
      if (!isIllustrationMission(mission)) {
        await refreshSelectedMission();
      } else {
        renderAll();
      }
      renderProductionMissionList();
    });
  });
}

function renderProductionSummary() {
  const mission = selectedMission();

  if (!mission) {
    elements.prodDetailTitle.textContent = "Select a mission";
    elements.prodDetailStatus.textContent = "No mission selected.";
    elements.prodDetailStatusPill.textContent = "No mission";
    elements.prodDetailProblem.textContent =
      "Choose a mission from the list or create a new one to see budget, contributions, and payout outcomes.";
    elements.prodBudgetMetric.textContent = "-";
    elements.prodFeeMetric.textContent = "-";
    elements.prodQualifiedMetric.textContent = "-";
    elements.prodTransactionsMetric.textContent = "-";
    elements.prodTimeline.innerHTML = "";
    elements.prodContributions.innerHTML =
      '<div class="empty-state">Contributions will appear here as agents submit work.</div>';
    elements.prodResolutionSummary.innerHTML =
      '<div class="empty-state">Once the platform resolves the mission, payout weights and fee breakdowns will appear here.</div>';
    elements.prodTransactions.innerHTML =
      '<div class="empty-state">XRPL transaction hashes will appear after funding and settlement.</div>';
    if (!state.productionClarification) {
      renderClarificationEcho(null);
    }
    return;
  }

  elements.prodDetailTitle.textContent = mission.title;
  elements.prodDetailStatus.textContent = isIllustrationMission(mission)
    ? `Illustrative mission currently shown as ${missionStatusLabel(mission)}.`
    : `Mission is currently ${missionStatusLabel(mission)}.`;
  elements.prodDetailStatusPill.textContent = missionStatusLabel(mission);
  elements.prodDetailProblem.textContent = mission.problemStatement;
  elements.prodBudgetMetric.textContent = formatUsdAmount(mission.budgetDrops);
  elements.prodFeeMetric.textContent = formatUsdAmount(calculateFeeAmount(mission.budgetDrops, mission.feeBps) || "0");
  elements.prodQualifiedMetric.textContent = String(mission.contributions.length);
  elements.prodTransactionsMetric.textContent = String(mission.settlementTransactions?.length || 0);

  const timelineSteps = ["draft", "funded", "open", "resolved", "paid"];
  const currentIndex = timelineSteps.indexOf(mission.status);
  elements.prodTimeline.innerHTML = timelineSteps
    .map((step, index) => `<span class="timeline-chip ${index <= currentIndex ? "active" : ""}">${escapeHtml(step)}</span>`)
    .join("");

  if (mission.contributions.length) {
    elements.prodContributions.innerHTML = mission.contributions
      .map(
        (contribution) => `
          <div class="summary-row">
            <div>
              <strong>${escapeHtml(contribution.title || contribution.contributorId)}</strong>
              <p class="list-copy">${escapeHtml(contribution.content)}</p>
            </div>
            <div class="summary-meta vertical-meta">
              <span>Agent: ${escapeHtml(contribution.contributorId)}</span>
              <span>Score: ${contribution.score ?? 0}</span>
              <span>Payout: ${formatUsdAmount(contribution.payoutDrops ?? "0")}</span>
            </div>
          </div>
        `
      )
      .join("");
  } else {
    elements.prodContributions.innerHTML =
      '<div class="empty-state">The mission is open, but no agent contributions have been stored yet.</div>';
  }

  if (mission.resolution) {
    elements.prodResolutionSummary.innerHTML = `
      <div class="summary-card">
        <div class="summary-meta">
          <span>Platform fee: ${formatUsdAmount(mission.resolution.platformFeeDrops)}</span>
          <span>Contributor pool: ${formatUsdAmount(mission.resolution.contributorPoolDrops)}</span>
          <span>Threshold: ${mission.resolution.minScoreThreshold}</span>
        </div>
      </div>
    `;
  } else {
    elements.prodResolutionSummary.innerHTML =
      '<div class="empty-state">The mission has not been resolved yet, so contributor weights are still pending.</div>';
  }

  if (mission.settlementTransactions?.length) {
    elements.prodTransactions.innerHTML = mission.settlementTransactions
      .map(
        (transaction) => `
          <div class="summary-row">
            <span>${escapeHtml(transaction.kind)}</span>
            <span>${escapeHtml(transaction.amountDrops ? formatUsdAmount(transaction.amountDrops) : "-")}</span>
            <span>${explorerAnchor(transactionExplorerUrl(transaction.txHash), transaction.txHash)}</span>
          </div>
        `
      )
      .join("");
  } else {
    elements.prodTransactions.innerHTML =
      '<div class="empty-state">Funding and settlement hashes will appear here after execution.</div>';
  }

  if (!productionClarificationIsFresh()) {
    renderMissionEchoFromMission(mission);
  }
}

function renderAll() {
  renderHealth();
  renderDemoSummary();
  renderProductionMissionList();
  renderProductionSummary();
  setFeePreviewFromBudget();
}

async function loadAppState() {
  state.appConfig = await api("/app-config");
  if (state.appConfig?.demoSharedApiKey && !state.apiKey) {
    state.apiKey = state.appConfig.demoSharedApiKey;
    window.localStorage.setItem(API_KEY_STORAGE_KEY, state.apiKey);
  }
  state.health = await api("/health");
  const { missions } = await api("/missions");
  state.missions = missions;
  if (!state.selectedMissionId) {
    const defaultMission = visibleProductionMissions()[0];
    if (defaultMission) {
      state.selectedMissionId = defaultMission.id;
    }
  }
  applyAppMode();
  renderAll();
}

async function refreshSelectedMission() {
  if (!state.selectedMissionId) {
    renderAll();
    return;
  }

  const currentMission = selectedMission();
  if (isIllustrationMission(currentMission)) {
    renderAll();
    return;
  }

  const { mission } = await api(`/missions/${state.selectedMissionId}`);
  const index = state.missions.findIndex((item) => item.id === mission.id);
  if (index >= 0) {
    state.missions[index] = mission;
  } else {
    state.missions.unshift(mission);
  }
  renderAll();
}

async function refreshMissions() {
  const { missions } = await api("/missions");
  state.missions = missions;
  if (!state.selectedMissionId) {
    const defaultMission = visibleProductionMissions()[0];
    if (defaultMission) {
      state.selectedMissionId = defaultMission.id;
    }
  }
  renderAll();
}

async function clarifyProductionMission() {
  const input = validateProductionMissionDraftInput();
  const result = await api("/missions/intake/clarify", {
    method: "POST",
    body: JSON.stringify(input)
  });

  state.productionClarification = result.clarification;
  state.productionClarificationSignature = getProductionClarificationSignature(input);
  renderClarification(result.clarification);
  showProdStatus("Platform agent clarification completed. Review the structured mission framing below.", "info");
  return result;
}

async function ensureContributionWallets() {
  if (usingHostedDemoWallets()) {
    state.contributionWallets = getHostedDemoContributionWallets();
    return;
  }

  while (state.contributionWallets.length < DEMO_CONFIG.contributions.length) {
    const wallet = await api("/wallets/demo", { method: "POST", body: "{}" });
    state.contributionWallets.push(wallet.address);
  }
}

async function generateCompanyWallet() {
  if (usingHostedDemoWallets()) {
    const companyAddress = state.health.companyAddress;
    state.companyWallet = companyAddress;

    if (elements.prodCompanyWallet) {
      elements.prodCompanyWallet.value = companyAddress;
    }

    logActivity(
      "1. Company wallet prepared",
      "Using the hosted demo company wallet that is already funded on XRPL testnet for a stable walkthrough.",
      { address: companyAddress, source: "hosted-demo-wallet" }
    );
    return { address: companyAddress };
  }

  const wallet = await api("/wallets/demo", { method: "POST", body: "{}" });
  state.companyWallet = wallet.address;

  if (elements.prodCompanyWallet) {
    elements.prodCompanyWallet.value = wallet.address;
  }

  logActivity("1. Company wallet generated", "Created XRPL wallet for the company funding side.", wallet);
  return wallet;
}

async function createMission(inputOverrides = {}) {
  const companyWallet = inputOverrides.companyWallet || state.companyWallet || elements.prodCompanyWallet?.value.trim();
  if (!companyWallet) {
    const wallet = await generateCompanyWallet();
    inputOverrides.companyWallet = wallet.address;
  }
  state.companyWallet = inputOverrides.companyWallet || companyWallet || state.companyWallet;

  const { mission } = await api("/missions", {
    method: "POST",
    body: JSON.stringify({
      title: inputOverrides.title || DEMO_CONFIG.title,
      problemStatement: inputOverrides.problemStatement || DEMO_CONFIG.problemStatement,
      budgetDrops: inputOverrides.budgetDrops || DEMO_CONFIG.budgetDrops,
      feeBps: Number(inputOverrides.feeBps ?? DEMO_CONFIG.feeBps),
      companyWallet: inputOverrides.companyWallet || state.companyWallet || elements.prodCompanyWallet?.value.trim()
    })
  });

  state.selectedMissionId = mission.id;
  state.missions.unshift(mission);
  renderAll();

  if (state.appConfig?.appMode === "demo") {
    logActivity(
      "2. Structured mission created",
      "Platform-side mission structure is ready with budget cap, fee, and problem context.",
      mission
    );
  }

  return mission;
}

async function createProductionMission() {
  const input = validateProductionMissionDraftInput();
  const result = await api("/missions/intake", {
    method: "POST",
    body: JSON.stringify(input)
  });

  const { mission, clarification } = result;
  state.selectedMissionId = mission.id;
  state.missions.unshift(mission);
  state.productionClarification = clarification;
  state.productionClarificationSignature = getProductionClarificationSignature(input);
  renderClarification(clarification);
  showProdStatus("Mission draft created successfully. The platform fee was applied automatically.", "success");
  renderAll();
  await refreshSelectedMission();
  return mission;
}

async function fundMission() {
  const mission = selectedMission();
  if (!mission) {
    throw new Error("Create the mission first, then lock its budget in escrow.");
  }

  if (isIllustrationMission(mission)) {
    throw new Error("This is an illustrative mission card. Select a real mission draft to lock XRPL escrow.");
  }

  const result = await api(`/missions/${mission.id}/fund`, {
    method: "POST",
    body: JSON.stringify({
      finishAfterSeconds: 10,
      cancelAfterSeconds: 600
    })
  });

  if (state.appConfig?.appMode === "demo") {
    logActivity(
      "3. Budget locked in XRPL escrow",
      "Company wallet reserved the mission budget to the platform settlement wallet using EscrowCreate.",
      result
    );
  }
  await refreshSelectedMission();
  return result;
}

async function queryPlatformAgent() {
  const mission = selectedMission();
  if (!mission) {
    throw new Error("Create the mission first, then query the platform agent.");
  }

  const result = await api("/x402/demo/query-agent", {
    method: "POST",
    body: JSON.stringify({
      missionId: mission.id,
      question: "What kind of contribution most increases the probability of a credible 20-minute Montparnasse to CDG connection?"
    })
  });

  state.lastQueryResult = result;
  elements.queryJson.textContent = safeJsonStringify(result, 2);

  if (result.x402?.paymentRequired) {
    logActivity(
      "4.1 x402 payment requested",
      "The protected endpoint returned HTTP 402 with the accepted payment requirements for paid mission intelligence.",
      result.x402.paymentRequired
    );
  }

  if (result.x402?.paymentResponse) {
    logActivity(
      "4.2 x402 payment settled",
      "The demo buyer retried with a signed x402 payment and the seller settled it on the configured x402 network.",
      {
        buyerAddress: result.x402.buyerAddress,
        payTo: result.x402.payTo,
        network: result.x402.network,
        price: result.x402.price,
        transaction: result.x402.paymentResponse.transaction,
        transactionExplorerUrl: result.x402.transactionExplorerUrl,
        payer: result.x402.paymentResponse.payer
      }
    );
  }

  logActivity(
    "4.3 Platform agent answered",
    "Paid context access returned structured hints about how to maximize useful contribution.",
    {
      answer: result.answer,
      x402: {
        network: result.x402?.network,
        price: result.x402?.price,
        initialStatus: result.x402?.initialStatus,
        paidStatus: result.x402?.paidStatus
      }
    }
  );
}

async function addContributions() {
  const mission = selectedMission();
  if (!mission) {
    throw new Error("Create and fund the mission first, then submit contributions.");
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
    throw new Error("Create, fund, and populate the mission first, then resolve it.");
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

  elements.queryJson.textContent = safeJsonStringify(result.plan, 2);
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
    throw new Error("Resolve the mission first, then settle it.");
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
    logActivity("Demo complete", "The full SolveX flow executed successfully.");
  } catch (error) {
    logActivity("Demo failed", error.message, error.body || undefined);
  }
}

function saveApiKeyFrom(input) {
  state.apiKey = input.value.trim();
  window.localStorage.setItem(API_KEY_STORAGE_KEY, state.apiKey);
  if (elements.apiKeyInput && elements.apiKeyInput !== input) {
    elements.apiKeyInput.value = state.apiKey;
  }
  if (elements.prodApiKeyInput && elements.prodApiKeyInput !== input) {
    elements.prodApiKeyInput.value = state.apiKey;
  }
}

function fillGeneratedKey(input) {
  const generated = generateRandomKey();
  input.value = generated;
  saveApiKeyFrom(input);
}

function attachListeners() {
  elements.themeToggle.addEventListener("click", () => {
    setTheme(state.theme === "dark" ? "light" : "dark");
  });

  document.getElementById("save-api-key")?.addEventListener("click", () => {
    saveApiKeyFrom(elements.apiKeyInput);
    logActivity("Credentials saved", "Stored admin key locally in the browser.");
  });

  document.getElementById("generate-api-key")?.addEventListener("click", () => {
    fillGeneratedKey(elements.apiKeyInput);
    logActivity(
      "Generated admin key",
      "Created a random key in the browser. Use this for local or deployment setup, not as a public production secret."
    );
  });

  document.getElementById("prod-save-api-key")?.addEventListener("click", () => {
    saveApiKeyFrom(elements.prodApiKeyInput);
    showProdStatus("Operator API key saved locally for escrow and settlement actions.", "info");
  });

  document.getElementById("prod-generate-api-key")?.addEventListener("click", () => {
    fillGeneratedKey(elements.prodApiKeyInput);
  });

  document.getElementById("generate-company-wallet")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    try {
      await runWithButtonLoading(button, "Preparing wallet...", () => generateCompanyWallet());
    } catch (error) {
      logActivity("Wallet generation failed", error.message, error.body || undefined);
    }
  });

  document.getElementById("create-mission-button")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    try {
      await runWithButtonLoading(button, "Creating mission...", () => createMission());
    } catch (error) {
      logActivity("Mission creation failed", error.message, error.body || undefined);
    }
  });

  document.getElementById("fund-mission-button")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    try {
      await runWithButtonLoading(button, "Locking escrow...", () => fundMission());
    } catch (error) {
      logActivity("Funding failed", error.message, error.body || undefined);
    }
  });

  document.getElementById("query-agent-button")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    try {
      await runWithButtonLoading(button, "Running x402 query...", () => queryPlatformAgent());
    } catch (error) {
      logActivity("x402 query failed", error.message, error.body?.details || error.body || undefined);
    }
  });

  document.getElementById("add-contributions-button")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    try {
      await runWithButtonLoading(button, "Submitting contributions...", () => addContributions());
    } catch (error) {
      logActivity("Contribution submission failed", error.message, error.body || undefined);
    }
  });

  document.getElementById("resolve-mission-button")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    try {
      await runWithButtonLoading(button, "Scoring contributions...", () => resolveMission());
    } catch (error) {
      logActivity("Resolution failed", error.message, error.body || undefined);
    }
  });

  document.getElementById("settle-mission-button")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    try {
      await runWithButtonLoading(button, "Settling mission...", () => settleMission());
    } catch (error) {
      logActivity("Settlement failed", error.message, error.body || undefined);
    }
  });

  document.getElementById("run-demo-button")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    await runWithButtonLoading(button, "Running full demo...", () => runDemo());
  });

  document.getElementById("clear-log")?.addEventListener("click", () => {
    state.activity = [];
    renderDemoActivity();
  });

  document.getElementById("prod-generate-wallet")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    try {
      const wallet = await runWithButtonLoading(button, "Preparing wallet...", () => generateCompanyWallet());
      elements.prodCompanyWallet.value = wallet.address;
      showProdStatus("Company wallet prepared and injected into the mission intake form.", "success");
    } catch (error) {
      showProdStatus(error.message, "error");
    }
  });

  elements.prodBudget?.addEventListener("input", () => {
    setFeePreviewFromBudget();
    if (!productionClarificationIsFresh() && state.productionClarification) {
      resetProductionClarification();
    }
  });

  [elements.prodCompanyWallet, elements.prodTitle, elements.prodProblemStatement].forEach((input) => {
    input?.addEventListener("input", () => {
      if (!productionClarificationIsFresh() && state.productionClarification) {
        resetProductionClarification();
      }
    });
  });

  elements.prodClarifyMission?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    try {
      showProdStatus("Platform agent is structuring the problem and computing the mission economics.", "info");
      await runWithButtonLoading(button, "Clarifying mission...", () => clarifyProductionMission());
    } catch (error) {
      showProdStatus(error.message, "error");
    }
  });

  document.getElementById("prod-create-mission")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    try {
      hideProdStatus();
      const mission = await runWithButtonLoading(button, "Clarifying and creating...", async () => {
        if (!productionClarificationIsFresh()) {
          showProdStatus("No current clarification found for this problem. Running the platform agent first.", "info");
          await clarifyProductionMission();
        }
        showProdStatus("Creating the mission draft and applying the platform fee automatically.", "info");
        return createProductionMission();
      });
      state.selectedMissionId = mission.id;
      await refreshSelectedMission();
      renderProductionMissionList();
    } catch (error) {
      showProdStatus(error.message, "error");
    }
  });

  document.getElementById("prod-fund-mission")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    try {
      showProdStatus("Submitting EscrowCreate on XRPL and waiting for confirmation.", "info");
      await runWithButtonLoading(button, "Locking escrow...", () => fundMission());
      renderProductionMissionList();
      showProdStatus("Selected mission funded through XRPL escrow.", "success");
    } catch (error) {
      showProdStatus(
        error.status === 401
          ? "Funding is a platform-controlled action. Save the operator admin key first."
          : error.message,
        "error"
      );
    }
  });

  document.getElementById("prod-refresh")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    try {
      showProdStatus("Refreshing mission data from the backend.", "info");
      await runWithButtonLoading(button, "Refreshing...", async () => {
        await refreshMissions();
        await refreshSelectedMission();
      });
      showProdStatus("Mission data refreshed.", "info");
    } catch (error) {
      showProdStatus(error.message, "error");
    }
  });
}

async function boot() {
  setTheme(state.theme);
  attachListeners();
  if (elements.apiKeyInput) {
    elements.apiKeyInput.value = state.apiKey;
  }
  if (elements.prodApiKeyInput) {
    elements.prodApiKeyInput.value = state.apiKey;
  }
  if (elements.prodTitle) {
    elements.prodTitle.value = DEMO_CONFIG.title;
  }
  if (elements.prodProblemStatement) {
    elements.prodProblemStatement.value = DEMO_CONFIG.problemStatement;
  }
  if (elements.prodBudget) {
    elements.prodBudget.value = DEMO_CONFIG.budgetDrops;
  }
  renderDemoActivity();

  try {
    await loadAppState();
    if (elements.apiKeyInput) {
      elements.apiKeyInput.value = state.apiKey;
    }
    if (elements.prodApiKeyInput) {
      elements.prodApiKeyInput.value = state.apiKey;
    }
    if (elements.prodCompanyWallet && state.companyWallet) {
      elements.prodCompanyWallet.value = state.companyWallet;
    } else if (elements.prodCompanyWallet && state.health?.companyAddress) {
      elements.prodCompanyWallet.value = state.health.companyAddress;
    }
    if (elements.prodWalletHint && state.appConfig?.appMode === "production") {
      elements.prodWalletHint.textContent = state.health?.useMockXrpl
        ? "Use a company wallet for the mission. In local mock mode you can still test quickly."
        : "Use the funded company wallet that should actually lock the escrow budget on XRPL.";
    }
    setFeePreviewFromBudget();
    if (state.appConfig?.demoSharedApiKey && elements.demoKeyHelper) {
      elements.demoKeyHelper.textContent =
        "A shared demo key is preloaded for this site so judges can test the flow without extra setup.";
    }
    if (elements.demoWalletHelper) {
      elements.demoWalletHelper.textContent = usingHostedDemoWallets()
        ? "This hosted demo uses pre-funded XRPL testnet wallets so the flow stays stable even if faucet funding is unavailable."
        : "This environment can generate fresh demo wallets when needed.";
    }
    const demoWalletButton = document.getElementById("generate-company-wallet");
    if (demoWalletButton) {
      demoWalletButton.textContent = usingHostedDemoWallets()
        ? "1. Use hosted company wallet"
        : "1. Generate company wallet";
    }
    const resolveButton = document.getElementById("resolve-mission-button");
    if (resolveButton) {
      resolveButton.textContent = "6. Resolve with 60 / 30 / 0 review";
    }
    if (state.appConfig?.appMode === "demo") {
      logActivity(
        "Interface ready",
        state.appConfig?.x402?.enabled
          ? "The guided protocol board is loaded with real XRPL settlement and a live x402 paid-query path."
          : "The guided protocol board is loaded. XRPL is ready, but x402 still needs its EVM credentials before the paid-query step can run for real."
      );
    }
  } catch (error) {
    if (state.appConfig?.appMode === "demo") {
      logActivity("Initial load failed", error.message, error.body || undefined);
    } else {
      showProdStatus(error.message, "error");
    }
  }
}

void boot();
