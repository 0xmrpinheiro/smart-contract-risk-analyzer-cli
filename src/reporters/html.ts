import type { AnalysisResult, Finding } from "../core/types"
import { escapeHtml, groupFindingsByContract } from "../core/utils"

export function renderHtmlReport(result: AnalysisResult): string {
	const groupedFindings = groupFindingsByContract(result.findings)
	const findingsPayload = JSON.stringify(result.findings).replaceAll("<", "\\u003c")

	return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>scra report</title>
    <style>
      :root {
        --bg: #f6f1e8;
        --panel: rgba(255, 255, 255, 0.88);
        --ink: #1f1d1a;
        --muted: #6b6257;
        --border: rgba(39, 34, 28, 0.14);
        --critical: #7d1128;
        --high: #be3a34;
        --medium: #dc9f2d;
        --low: #1f7a72;
        --shadow: 0 24px 70px rgba(42, 31, 21, 0.12);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        background:
          radial-gradient(circle at top left, rgba(220, 159, 45, 0.18), transparent 28%),
          radial-gradient(circle at top right, rgba(31, 122, 114, 0.18), transparent 30%),
          linear-gradient(180deg, #fbf7ef 0%, var(--bg) 100%);
        color: var(--ink);
      }
      .shell {
        max-width: 1180px;
        margin: 0 auto;
        padding: 40px 20px 80px;
      }
      .hero {
        display: grid;
        gap: 20px;
        padding: 28px;
        border: 1px solid var(--border);
        border-radius: 28px;
        background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(255,248,235,0.9));
        box-shadow: var(--shadow);
      }
      .hero h1 {
        margin: 0;
        font-size: clamp(2rem, 5vw, 3.7rem);
        line-height: 0.95;
      }
      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        color: var(--muted);
      }
      .pill {
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: rgba(255, 255, 255, 0.72);
      }
      .metrics {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 16px;
        margin-top: 12px;
      }
      .metric {
        padding: 18px;
        border-radius: 20px;
        background: var(--panel);
        border: 1px solid var(--border);
      }
      .metric .label {
        display: block;
        font-size: 0.82rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .metric .value {
        margin-top: 8px;
        font-size: 2rem;
      }
      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin: 28px 0;
      }
      .filters button {
        border: 1px solid var(--border);
        background: white;
        color: var(--ink);
        padding: 10px 14px;
        border-radius: 999px;
        cursor: pointer;
        transition: transform 120ms ease, background 120ms ease;
      }
      .filters button:hover,
      .filters button.active {
        background: #1f1d1a;
        color: white;
        transform: translateY(-1px);
      }
      .group {
        margin-top: 24px;
        padding: 24px;
        border-radius: 24px;
        background: var(--panel);
        border: 1px solid var(--border);
        box-shadow: var(--shadow);
      }
      .group h2 {
        margin: 0 0 18px;
        font-size: 1.7rem;
      }
      .finding {
        border-left: 6px solid var(--medium);
        padding: 16px 18px;
        background: rgba(255,255,255,0.86);
        border-radius: 16px;
        margin-top: 14px;
      }
      .finding[data-severity="critical"] { border-left-color: var(--critical); }
      .finding[data-severity="high"] { border-left-color: var(--high); }
      .finding[data-severity="medium"] { border-left-color: var(--medium); }
      .finding[data-severity="low"] { border-left-color: var(--low); }
      .finding header {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 8px;
        align-items: baseline;
      }
      .severity {
        font-size: 0.78rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .location, .message, .remediation, .rule-meta, .limitations {
        color: var(--muted);
      }
      .remediation strong, .message strong {
        color: var(--ink);
      }
      .limitations {
        margin-top: 30px;
        padding: 20px 22px;
        border-radius: 22px;
        border: 1px dashed var(--border);
        background: rgba(255,255,255,0.7);
      }
      .empty {
        padding: 28px;
        border-radius: 24px;
        background: var(--panel);
        border: 1px solid var(--border);
        text-align: center;
        color: var(--muted);
      }
      @media (max-width: 720px) {
        .shell { padding: 24px 14px 60px; }
        .hero { padding: 22px; border-radius: 24px; }
        .group { padding: 18px; border-radius: 20px; }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <div>
          <h1>Smart Contract Risk Analyzer</h1>
          <div class="meta">
            <span class="pill">Target: ${escapeHtml(result.target)}</span>
            <span class="pill">Project: ${escapeHtml(result.projectType)}</span>
            <span class="pill">Version: ${escapeHtml(result.version)}</span>
          </div>
        </div>
        <div class="metrics">
          <article class="metric"><span class="label">Risk Score</span><div class="value">${result.score}/100</div></article>
          <article class="metric"><span class="label">Critical</span><div class="value">${result.summary.critical}</div></article>
          <article class="metric"><span class="label">High</span><div class="value">${result.summary.high}</div></article>
          <article class="metric"><span class="label">Medium</span><div class="value">${result.summary.medium}</div></article>
          <article class="metric"><span class="label">Low</span><div class="value">${result.summary.low}</div></article>
        </div>
      </section>
      <section class="filters" aria-label="Severity filters">
        <button type="button" class="active" data-filter="all">All</button>
        <button type="button" data-filter="critical">Critical</button>
        <button type="button" data-filter="high">High</button>
        <button type="button" data-filter="medium">Medium</button>
        <button type="button" data-filter="low">Low</button>
      </section>
      ${result.findings.length === 0 ? renderEmptyState() : groupedFindings.map(renderGroup).join("\n")}
      <section class="limitations">
        <strong>Limitations / false positives:</strong>
        <p>
          This report is generated from heuristic static analysis. It can miss project-specific controls and may flag benign code paths. Use it as a triage aid, not as a substitute for formal verification or a professional audit.
        </p>
      </section>
    </main>
    <script>
      const findings = ${findingsPayload};
      const buttons = document.querySelectorAll("[data-filter]");
      const cards = document.querySelectorAll(".finding");
      const groups = document.querySelectorAll(".group");
      function applyFilter(filter) {
        for (const button of buttons) {
          button.classList.toggle("active", button.dataset.filter === filter);
        }
        for (const card of cards) {
          const visible = filter === "all" || card.dataset.severity === filter;
          card.style.display = visible ? "" : "none";
        }
        for (const group of groups) {
          const visibleCards = group.querySelectorAll('.finding:not([style*="display: none"])');
          group.style.display = visibleCards.length > 0 ? "" : "none";
        }
      }
      for (const button of buttons) {
        button.addEventListener("click", () => applyFilter(button.dataset.filter));
      }
      applyFilter("all");
    </script>
  </body>
</html>`
}

function renderEmptyState(): string {
	return `<section class="empty"><strong>No findings</strong><p>No findings matched the selected severity filter.</p></section>`
}

function renderGroup([groupName, findings]: [string, Finding[]]): string {
	return `<section class="group">
    <h2>${escapeHtml(groupName)}</h2>
    ${findings.map(renderFinding).join("\n")}
  </section>`
}

function renderFinding(finding: Finding): string {
	return `<article class="finding" data-severity="${escapeHtml(finding.severity)}">
    <header>
      <strong>${escapeHtml(finding.title)}</strong>
      <span class="severity">${escapeHtml(finding.severity)}</span>
    </header>
    <p class="rule-meta">${escapeHtml(finding.ruleId)} • ${escapeHtml(finding.category)} • confidence ${escapeHtml(finding.confidence)}</p>
    <p class="location">${escapeHtml(finding.location.relativePath)}:${finding.location.line}:${finding.location.column}${finding.functionName ? ` • ${escapeHtml(finding.functionName)}` : ""}</p>
    <p class="message"><strong>Why it matters:</strong> ${escapeHtml(finding.message)}</p>
    <p class="remediation"><strong>Suggested remediation:</strong> ${escapeHtml(finding.remediation)}</p>
  </article>`
}
