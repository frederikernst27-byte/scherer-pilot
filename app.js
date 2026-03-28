const storageKey = "scherer-pilot-console";
const defaults = {
  endpoint: "",
  projectName: "Scherer Pilot Console",
  approvalMode: "approve-before-buy"
};

const state = {
  config: loadConfig(),
  messages: [],
  logs: []
};

const promptInput = document.getElementById("promptInput");
const chatWindow = document.getElementById("chatWindow");
const logbook = document.getElementById("logbook");
const modeBadge = document.getElementById("modeBadge");
const connectionBadge = document.getElementById("connectionBadge");
const intentLabel = document.getElementById("intentLabel");
const riskLabel = document.getElementById("riskLabel");
const outputLabel = document.getElementById("outputLabel");
const endpointInput = document.getElementById("endpointInput");
const projectNameInput = document.getElementById("projectNameInput");
const approvalMode = document.getElementById("approvalMode");
const title = document.querySelector("title");
const heroTitle = document.querySelector(".topbar h1");

function loadConfig() {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey));
    return { ...defaults, ...(raw || {}) };
  } catch {
    return { ...defaults };
  }
}

function saveConfig() {
  localStorage.setItem(storageKey, JSON.stringify(state.config));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseIntent(prompt) {
  const lower = prompt.toLowerCase();

  if (lower.includes("amazon") && (lower.includes("warenkorb") || lower.includes("checkout") || lower.includes("kaufen"))) {
    return {
      intent: "Amazon flow",
      output: "Browser-run mit Warenkorb-/Freigabe-Flow",
      risk: state.config.approvalMode === "full-run" ? "Vollausführung möglich" : "Freigabe vor Kauf aktiv",
      steps: [
        "Zielshop und Produktkategorie aus dem Prompt extrahieren",
        "Browser-Session oder bestehenden Login-Kontext öffnen",
        "Produktliste prüfen, Preis / Relevanz / Lieferzeit filtern",
        "Zielartikel in den Warenkorb legen",
        state.config.approvalMode === "manual-only"
          ? "Bestellschritt blockieren und nur Handlungsvorschlag ausgeben"
          : "Vor finalem Kauf einen Approval-Checkpoint setzen"
      ]
    };
  }

  if (lower.includes("pdf") || lower.includes("rechnung") || lower.includes("invoice")) {
    return {
      intent: "Invoice intake",
      output: "PDF-Erfassung + Basisdaten + Logbuch",
      risk: "Dokumentenworkflow / kein kritischer Checkout",
      steps: [
        "Eingangsquelle prüfen (Upload, Mail oder Ordner)",
        "PDF klassifizieren und Basisdaten extrahieren",
        "Betrag, Datum und Referenz im Logbuch speichern",
        "Fehlerhafte Dokumente markieren und eskalieren"
      ]
    };
  }

  if (lower.includes("portal") || lower.includes("login") || lower.includes("browser") || lower.includes("klick")) {
    return {
      intent: "Portal automation",
      output: "UI-gestützte Schrittfolge mit Retry und Logging",
      risk: "Login / UI-Änderungen erfordern Beobachtung",
      steps: [
        "Zielsystem und benötigten Pfad identifizieren",
        "Schritte als deterministischen Ablauf definieren",
        "Elemente überwachen, Screenshots und Fehlersignale loggen",
        "Abweichungen mit Retry / Eskalation behandeln"
      ]
    };
  }

  return {
    intent: "Research / operator task",
    output: "Recherche, Strukturierung oder Handlungsvorschlag",
    risk: "Niedriges Risiko / keine kritische Systemaktion",
    steps: [
      "Anfrage klassifizieren und Ziel definieren",
      "Relevante Quellen oder Systeme auswählen",
      "Ergebnis in einer verständlichen Handlungsausgabe zurückgeben"
    ]
  };
}

function pushMessage(role, body) {
  state.messages.push({ role, body });
  renderMessages();
}

function pushLog(titleText, bodyText, variant = "default") {
  const now = new Date();
  state.logs.unshift({
    title: titleText,
    body: bodyText,
    variant,
    time: now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  });
  state.logs = state.logs.slice(0, 18);
  renderLogs();
}

function renderMessages() {
  chatWindow.innerHTML = "";
  const template = document.getElementById("messageTemplate");

  state.messages.forEach((entry) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".message__role").textContent = entry.role;
    node.querySelector(".message__body").innerHTML = entry.body;
    chatWindow.appendChild(node);
  });
}

function renderLogs() {
  logbook.innerHTML = state.logs
    .map(
      (entry) => `
        <article class="log-entry ${entry.variant === "warning" ? "log-entry--warning" : entry.variant === "success" ? "log-entry--success" : ""}">
          <div class="log-entry__title">
            <strong>${escapeHtml(entry.title)}</strong>
            <span>${escapeHtml(entry.time)}</span>
          </div>
          <p>${escapeHtml(entry.body)}</p>
        </article>
      `
    )
    .join("");
}

function syncUi() {
  endpointInput.value = state.config.endpoint;
  projectNameInput.value = state.config.projectName;
  approvalMode.value = state.config.approvalMode;
  heroTitle.textContent = state.config.projectName;
  title.textContent = `Automate X — ${state.config.projectName}`;
  modeBadge.textContent = state.config.endpoint ? "Endpoint mode" : "Demo mode";
  connectionBadge.textContent = state.config.endpoint ? state.config.endpoint : "Kein Endpoint verbunden";
}

async function sendToEndpoint(payload) {
  const response = await fetch(state.config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Endpoint antwortet mit ${response.status}`);
  }

  const data = await response.json().catch(() => ({}));
  return data;
}

async function runPrompt() {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    pushLog("Leere Eingabe", "Bitte zuerst einen Befehl formulieren.", "warning");
    return;
  }

  const analysis = parseIntent(prompt);
  intentLabel.textContent = analysis.intent;
  riskLabel.textContent = analysis.risk;
  outputLabel.textContent = analysis.output;

  pushMessage("Operator", `<p>${escapeHtml(prompt)}</p>`);
  pushMessage(
    "System",
    `
      <p><strong>Routing:</strong> ${escapeHtml(analysis.intent)}</p>
      <p><strong>Erwarteter Output:</strong> ${escapeHtml(analysis.output)}</p>
      <p><strong>Geplante Schritte:</strong></p>
      <ol>${analysis.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
    `
  );

  pushLog("Prompt klassifiziert", `${analysis.intent} erkannt — ${analysis.output}`);

  if (!state.config.endpoint) {
    simulateRun(prompt, analysis);
    return;
  }

  pushLog("Endpoint gestartet", "Befehl wird an die private Execution-Bridge gesendet.");

  try {
    const result = await sendToEndpoint({
      project: state.config.projectName,
      prompt,
      analysis,
      approvalMode: state.config.approvalMode,
      timestamp: new Date().toISOString()
    });

    pushMessage(
      "Execution bridge",
      `<p><strong>Status:</strong> ${escapeHtml(result.status || "accepted")}</p><p>${escapeHtml(result.message || "Request wurde angenommen.")}</p>`
    );
    pushLog("Bridge bestätigt", result.message || "Request angenommen.", "success");
  } catch (error) {
    pushMessage(
      "System",
      `<p><strong>Endpoint-Fehler:</strong> ${escapeHtml(error.message)}</p><p>Fallback auf Demo-Flow aktiviert.</p>`
    );
    pushLog("Bridge-Fehler", error.message, "warning");
    simulateRun(prompt, analysis);
  }
}

function simulateRun(prompt, analysis) {
  const simulated = analysis.steps.map((step, index) => ({
    title: `Schritt ${index + 1}`,
    body: step,
    variant: index === analysis.steps.length - 1 ? "success" : "default"
  }));

  if (analysis.intent === "Amazon flow") {
    simulated.splice(2, 0, {
      title: "Safety gate",
      body:
        state.config.approvalMode === "manual-only"
          ? "Checkout wird blockiert — System liefert nur Einkaufs- / Preisvorschlag."
          : "Vor dem finalen Kauf wird ein manueller Freigabepunkt gesetzt.",
      variant: "warning"
    });
  }

  simulated.forEach((entry, index) => {
    setTimeout(() => pushLog(entry.title, entry.body, entry.variant), 280 * (index + 1));
  });

  setTimeout(() => {
    pushMessage(
      "Pilot output",
      `
        <p><strong>Demo-Ausgabe:</strong> ${escapeHtml(analysis.output)}</p>
        <p>Dieses GitHub-Pages-Frontend ist bereits vorbereitet. Für echte Live-Aktionen wird später nur noch eine private Execution-Bridge angeschlossen.</p>
      `
    );
  }, 280 * (simulated.length + 1));
}

function init() {
  syncUi();
  renderMessages();
  renderLogs();

  pushMessage(
    "System",
    `
      <p><strong>${escapeHtml(state.config.projectName)}</strong> ist bereit.</p>
      <p>Nutze oben einen natürlichen Befehl, um einen Prozess zu beschreiben. Der Prototyp analysiert die Anfrage, klassifiziert das Intent und zeigt die Execution-Logik inklusive Freigabestufe.</p>
    `
  );
  pushLog("Console bereit", "Prototype loaded. Command routing, logbook and approval logic are active.", "success");

  document.getElementById("runPrompt").addEventListener("click", runPrompt);
  document.getElementById("fillDemo").addEventListener("click", () => {
    promptInput.value = "Suche bei Amazon nach einem günstigen Mehrfachstecker, lege das passendste Produkt in den Warenkorb und stoppe vor dem finalen Bestellklick.";
  });
  document.getElementById("saveConfig").addEventListener("click", () => {
    state.config = {
      endpoint: endpointInput.value.trim(),
      projectName: projectNameInput.value.trim() || defaults.projectName,
      approvalMode: approvalMode.value
    };
    saveConfig();
    syncUi();
    pushLog("Konfiguration gespeichert", `Projektname: ${state.config.projectName}`, "success");
  });

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      promptInput.value = chip.dataset.prompt || "";
    });
  });
}

init();
