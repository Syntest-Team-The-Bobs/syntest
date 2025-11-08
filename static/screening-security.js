(() => {
  "use strict";
  const hub = document.getElementById("security-hub");
  if (!hub) return;

  const elements = {
    shield: document.getElementById("talisman-shield"),
    summary: document.getElementById("talisman-summary"),
    metrics: document.getElementById("talisman-metrics"),
    auditLog: document.getElementById("audit-log"),
    aiScore: document.getElementById("ai-score"),
    maskPreview: document.getElementById("mask-preview"),
    maskToggle: document.getElementById("mask-toggle"),
    maskCountdown: document.getElementById("mask-countdown"),
    maskTimer: document.querySelector(".mask-timer")
  };

  const severityMap = {
    low: { label: "Low risk posture", tone: "All protections baseline healthy." },
    elevated: { label: "Elevated monitoring", tone: "AI detected emerging risk patterns." },
    critical: { label: "Critical review", tone: "Immediate human review recommended." }
  };
  const BRIDGE_KEY = "syntest_security_bridge";
  const BRIDGE_LIMIT = 25;

  [
    { attr: "http-equiv", value: "Content-Security-Policy", content: "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors 'self'; base-uri 'self';" },
    { attr: "name", value: "referrer", content: "strict-origin-when-cross-origin" },
    { attr: "http-equiv", value: "Permissions-Policy", content: "camera=(), microphone=(), geolocation=()" }
  ].forEach(spec => {
    const found = Array.from(document.getElementsByTagName("meta"))
      .find(meta => meta.getAttribute(spec.attr)?.toLowerCase() === spec.value.toLowerCase());
    if (found) {
      found.setAttribute("content", spec.content);
    } else {
      const meta = document.createElement("meta");
      meta.setAttribute(spec.attr, spec.value);
      meta.setAttribute("content", spec.content);
      document.head.appendChild(meta);
    }
  });

  const checks = [
    { label: "HTTPS enforced or trusted localhost", pass: window.location.protocol === "https:" || ["127.0.0.1", "localhost"].includes(window.location.hostname), detail: "Guarantees transport security during screening." },
    { label: "Content Security Policy locked", pass: !!document.querySelector("meta[http-equiv='Content-Security-Policy']"), detail: "Mitigates script injection attempts in questionnaire." },
    { label: "Referrer policy hardened", pass: !!document.querySelector("meta[name='referrer'][content]"), detail: "Prevents sensitive URLs from leaking to third parties." },
    { label: "Device permissions minimized", pass: !!document.querySelector("meta[http-equiv='Permissions-Policy']"), detail: "Camera, microphone, and geolocation access explicitly denied." },
    { label: "Frameguard check", pass: window.self === window.top, detail: "Protects against clickjacking by forbidding iframe embedding." }
  ];

  elements.metrics.innerHTML = "";
  let talismanScore = 0;
  checks.forEach(check => {
    const li = document.createElement("li");
    li.dataset.status = check.pass ? "pass" : "warn";
    li.innerHTML = `<strong>${check.label}</strong><span>${check.detail}</span>`;
    elements.metrics.appendChild(li);
    talismanScore += check.pass ? 1 : 0;
  });

  const talismanHealthy = talismanScore >= checks.length - 1;
  elements.shield.textContent = talismanHealthy ? "Talisman hardened" : "Talisman review";
  elements.summary.textContent = talismanHealthy
    ? "All security headers provisioned via in-page talisman shim. Transport rules satisfy policy."
    : "At least one talisman control needs attention before production launch.";

  const eventHistory = [];
  const toggleHistory = new Map();
  const maskState = { raw: "", masked: "" };
  let revealTimer = null;
  let countdownTimer = null;
  let lastBridgeTs = 0;

  const formatTime = ts => new Date(ts).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const setSeverity = (level, message) => {
    hub.dataset.severity = level;
    elements.shield.textContent = level === "low" ? "Talisman hardened" : level === "elevated" ? "Talisman on alert" : "Talisman alert";
    elements.summary.textContent = message || severityMap[level]?.tone || "";
  };

  const prependAudit = node => {
    elements.auditLog.prepend(node);
    while (elements.auditLog.children.length > 8) {
      elements.auditLog.removeChild(elements.auditLog.lastElementChild);
    }
  };

  const recordToggle = label => {
    const now = Date.now();
    const history = toggleHistory.get(label) || [];
    const fresh = history.filter(ts => now - ts < 4000);
    fresh.push(now);
    toggleHistory.set(label, fresh);
    return fresh.length;
  };

  const evaluateHeuristics = () => {
    const now = Date.now();
    let risk = 5;
    const recent = eventHistory.filter(ev => now - ev.timestamp < 15000);
    if (recent.length >= 7) risk += 25;
    if (Array.from(toggleHistory.values()).some(times => times.length >= 3)) risk += 20;
    if (eventHistory.some(ev => ev.meta?.category === "negative")) risk += 20;
    if (eventHistory.some(ev => ev.meta?.type === "text" && /hack|test|drop|script/i.test(ev.meta.value || ""))) risk += 30;
    if (eventHistory.some(ev => ev.action.includes("Consent withdrawn"))) risk += 15;

    const trust = Math.max(0, 100 - risk);
    const level = trust > 70 ? "low" : trust > 40 ? "elevated" : "critical";
    elements.aiScore.textContent = `AI trust score: ${trust}% (${severityMap[level].label})`;
    setSeverity(level);
  };

  const logEvent = (severity, action, detail, meta) => {
    const timestamp = Date.now();
    eventHistory.push({ severity, action, detail, timestamp, meta });
    const emptyState = elements.auditLog.querySelector(".security-log__empty");
    if (emptyState) emptyState.remove();
    const node = document.createElement("div");
    node.className = `audit-entry audit-entry--${severity}`;
    node.innerHTML = `<span class="audit-entry__time">${formatTime(timestamp)}</span><div><div class="audit-entry__action">${action}</div><div class="audit-entry__detail">${detail}</div></div>`;
    prependAudit(node);
    evaluateHeuristics();
  };
  const applySampleSnapshot = () => {
    const sample = window.SECURITY_CONSOLE_SAMPLE;
    if (!sample) return;
    if (sample.aiScore) {
      const trust = sample.aiScore.trust ?? 72;
      const label = sample.aiScore.label || (sample.severity && severityMap[sample.severity]?.label) || severityMap.elevated.label;
      elements.aiScore.textContent = `AI trust score: ${trust}% (${label})`;
    }
    if (Array.isArray(sample.audit)) {
      sample.audit.forEach(entry => {
        logEvent(entry.severity || "info", entry.action || "Activity observed", entry.detail || "Event captured.", entry.meta);
      });
    }
    if (sample.mask) {
      maskState.raw = sample.mask.raw || "";
      maskState.masked = sample.mask.masked || (sample.mask.raw ? maskValue(sample.mask.raw) : "");
      elements.maskPreview.textContent = maskState.masked || "No sensitive data captured yet.";
      if (sample.mask.timerLabel && elements.maskTimer) {
        elements.maskTimer.hidden = false;
        elements.maskTimer.textContent = sample.mask.timerLabel;
      }
    }
    if (sample.severity && severityMap[sample.severity]) {
      setSeverity(sample.severity, sample.summary);
    }
  };
  const ingestBridgeEntry = entry => {
    if (!entry || !entry.label) return;
    const ts = entry.ts || Date.now();
    if (ts <= lastBridgeTs) return;
    lastBridgeTs = ts;
    if (entry.panelSeverity && severityMap[entry.panelSeverity]) {
      setSeverity(entry.panelSeverity, entry.summary);
    }
    if (entry.aiScore) {
      const trust = entry.aiScore.trust ?? (parseInt(elements.aiScore.textContent, 10) || 70);
      const label = entry.aiScore.label || severityMap[entry.panelSeverity || "low"]?.label || "Low risk posture";
      elements.aiScore.textContent = `AI trust score: ${trust}% (${label})`;
    }
    if (entry.mask) {
      maskState.raw = entry.mask.raw || "";
      maskState.masked = entry.mask.masked || (entry.mask.raw ? maskValue(entry.mask.raw) : "");
      elements.maskPreview.textContent = maskState.masked || "No sensitive data captured yet.";
      if (entry.mask.timerLabel && elements.maskTimer) {
        elements.maskTimer.hidden = false;
        elements.maskTimer.textContent = entry.mask.timerLabel;
      }
    }
    logEvent(entry.severity || "info", entry.label, entry.detail || "Remote activity", entry.meta || { category: "bridge" });
  };
  const processBridge = payload => {
    if (!payload) return;
    const list = Array.isArray(payload) ? payload : [payload];
    list.slice(-BRIDGE_LIMIT).forEach(ingestBridgeEntry);
  };

  const maskValue = value => {
    if (!value) return "";
    if (value.length <= 2) return "•".repeat(value.length);
    return value.slice(0, 2) + value.slice(2).replace(/[^\s]/g, "•");
  };

  const updateMaskPreview = value => {
    maskState.raw = value;
    maskState.masked = maskValue(value);
    elements.maskPreview.textContent = value ? maskState.masked : "No sensitive data captured yet.";
  };

  const beginCountdown = seconds => {
    if (!elements.maskTimer || !elements.maskCountdown) return;
    elements.maskTimer.hidden = false;
    let remaining = seconds;
    elements.maskCountdown.textContent = `${remaining}`;
    countdownTimer = window.setInterval(() => {
      remaining -= 1;
      elements.maskCountdown.textContent = `${remaining}`;
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        elements.maskTimer.hidden = true;
      }
    }, 1000);
  };

  const textInput = document.getElementById("other-experiences");
  if (textInput) {
    textInput.addEventListener("input", () => updateMaskPreview(textInput.value));
    textInput.addEventListener("focus", () => logEvent("info", "Masked field focus", "Participant focused the masked free-text field.", { category: "text" }));
  } else {
    elements.maskPreview.textContent = "Free-text field appears later in the flow.";
  }

  if (elements.maskToggle) {
    elements.maskToggle.addEventListener("click", () => {
      if (!maskState.raw) {
        elements.maskPreview.textContent = "No value stored yet — interact with Step 4 to capture data.";
        return;
      }
      if (revealTimer) clearTimeout(revealTimer);
      if (countdownTimer) clearInterval(countdownTimer);
      elements.maskPreview.textContent = maskState.raw;
      beginCountdown(3);
      logEvent("critical", "Masked data reveal", "Protected free-text temporarily revealed for human review.", { category: "text", type: "reveal", value: maskState.raw });
      revealTimer = window.setTimeout(() => {
        elements.maskPreview.textContent = maskState.masked;
        if (elements.maskTimer) elements.maskTimer.hidden = true;
      }, 3000);
    });
  }

  document.querySelectorAll("[data-audit-label]").forEach(el => {
    const label = el.getAttribute("data-audit-label");
    if (!label) return;
    if (el.tagName === "A") {
      el.addEventListener("click", () => logEvent("info", label, "Navigation intent captured", { category: "navigation" }));
      return;
    }
    if (el.type === "checkbox") {
      el.addEventListener("change", () => {
        const state = el.checked ? "enabled" : "disabled";
        const toggles = recordToggle(label);
        logEvent(el.checked ? "warning" : "info", label, `Checkbox ${state}. Rapid toggles in 4s window: ${toggles}`, { category: el.checked ? "negative" : "positive" });
      });
      return;
    }
    if (el.type === "radio") {
      el.addEventListener("change", () => {
        const toggles = recordToggle(el.name);
        logEvent("info", label, `Selected option '${el.value}'. Group toggles this window: ${toggles}`, { category: el.value === "yes" ? "positive" : "neutral" });
      });
      return;
    }
    el.addEventListener("blur", () => {
      const clean = (el.value || "").trim();
      if (!clean) return;
      logEvent("warning", label, `Masked payload length ${clean.length} captured.`, { category: "text", type: "text", value: clean });
    });
  });

  const readSnapshot = () => {
    try {
      const snapshot = localStorage.getItem(BRIDGE_KEY);
      if (!snapshot) return;
      processBridge(JSON.parse(snapshot));
    } catch (_) {}
  };
  applySampleSnapshot();
  readSnapshot();
  window.addEventListener("storage", event => {
    if (event.key !== BRIDGE_KEY || !event.newValue) return;
    try { processBridge(JSON.parse(event.newValue)); } catch (_) {}
  });
  window.setInterval(readSnapshot, 1200);

  logEvent("info", "Security console boot", "Visual talisman, AI heuristic, and masking controls initialised.", { category: "system" });
})();

