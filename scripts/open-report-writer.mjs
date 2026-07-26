// Writes the interactive (`cypress open`) HTML test report.
//
// Cypress only runs the configured `reporter` (mochawesome) in `cypress run`, so
// in open mode we collect results in the browser (see cypress/support/e2e.ts) and
// hand them to the `recordOpenReport` task, which calls writeOpenReport() here.
// Results accumulate per spec across the interactive session into a small JSON,
// and a self-contained HTML report is regenerated on every spec.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REPORT_DIR = join(ROOT, 'cypress', 'reports')
const RESULTS_FILE = join(REPORT_DIR, 'open-results.json')
const HTML_FILE = join(REPORT_DIR, 'index.html')

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const formatDuration = (ms) => {
  if (!ms || ms < 1000) return `${ms || 0} ms`
  const s = ms / 1000
  return s < 60 ? `${s.toFixed(1)} s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
}

const readResults = () => {
  if (!existsSync(RESULTS_FILE)) return { specs: {} }
  try {
    return JSON.parse(readFileSync(RESULTS_FILE, 'utf8'))
  } catch {
    return { specs: {} }
  }
}

/**
 * Record one spec's results and regenerate the HTML report.
 * @param {{ spec: string, browser?: string, tests: Array<{fullTitle:string,title:string,state:string,duration:number,error?:string|null}> }} payload
 */
export function writeOpenReport({ spec, browser, cypressVersion, platform, viewport, tests }) {
  mkdirSync(REPORT_DIR, { recursive: true })

  const results = readResults()
  results.specs[spec] = {
    spec,
    browser: browser || 'electron',
    finishedAt: new Date().toISOString(),
    tests,
  }
  results.generatedAt = new Date().toISOString()
  results.env = {
    cypressVersion: cypressVersion || results.env?.cypressVersion,
    platform: platform || results.env?.platform,
    viewport: viewport || results.env?.viewport,
  }
  writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2))

  writeFileSync(HTML_FILE, renderHtml(results))
  return HTML_FILE
}

const ICONS = { passed: '✓', failed: '✕', pending: '–', skipped: '–', unknown: '?' }
const normState = (s) =>
  s === 'skipped' ? 'pending' : s === 'unknown' ? 'pending' : s || 'pending'

function renderHtml(results) {
  const specs = Object.values(results.specs).sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1))
  const allTests = specs.flatMap((s) => s.tests)
  const total = allTests.length
  const passed = allTests.filter((t) => normState(t.state) === 'passed').length
  const failed = allTests.filter((t) => normState(t.state) === 'failed').length
  const pending = allTests.filter((t) => normState(t.state) === 'pending').length
  const totalDuration = allTests.reduce((sum, t) => sum + (t.duration || 0), 0)
  const passRate = total ? Math.round((passed / total) * 100) : 0
  const env = results.env || {}
  const pct = (n) => (total ? (n / total) * 100 : 0)

  const embedScreenshot = (path) => {
    try {
      if (!path || !existsSync(path)) return ''
      const b64 = readFileSync(path).toString('base64')
      const uri = `data:image/png;base64,${b64}`
      return `<a class="shot-link" href="${uri}" target="_blank" rel="noopener"><img class="shot" alt="Step screenshot" loading="lazy" src="${uri}"></a>`
    } catch {
      return ''
    }
  }

  const renderCmd = (st) =>
    `<li class="step s-${escapeHtml(st.state)}"><span class="cmd">${escapeHtml(st.name)}</span>` +
    `<span class="smsg">${escapeHtml(st.message)}</span></li>`

  const renderCaptures = (shots) =>
    shots
      .map((p) => {
        const img = embedScreenshot(p)
        return img ? `<figure class="cap-item">${img}</figure>` : ''
      })
      .filter(Boolean)
      .join('')

  // A phase's revealed content: its command log, split beside its screenshot(s)
  // when the phase captured any (Step('…', { shot: true })).
  const renderPhaseBody = (cmds, shots) => {
    const log = cmds.length
      ? `<ol class="steps">${cmds.map(renderCmd).join('')}</ol>`
      : '<p class="nosteps">No commands.</p>'
    const cap = renderCaptures(shots)
    if (!cap) return `<div class="phase-body">${log}</div>`
    return `<div class="phase-body"><div class="split"><div class="col-log">${log}</div><div class="col-cap">${cap}</div></div></div>`
  }

  // Groups commands + screenshots under their `Step('…')` marker; each phase is a
  // collapsible accordion that reveals its log and screenshot together.
  const renderLog = (steps) => {
    if (!steps || steps.length === 0) {
      return '<p class="nosteps">No command log captured.</p>'
    }
    const groups = []
    let current = { phase: null, cmds: [], shots: [] }
    for (const st of steps) {
      if (st.name === 'step') {
        if (current.phase !== null || current.cmds.length || current.shots.length) {
          groups.push(current)
        }
        current = { phase: st.message, cmds: [], shots: [] }
      } else if (st.name === 'screenshot' && st.screenshot) {
        current.shots.push(st.screenshot)
      } else {
        current.cmds.push(st)
      }
    }
    groups.push(current)

    return groups
      .map((g) => {
        // Commands before the first Step marker render flat (no phase header).
        if (g.phase === null) {
          return g.cmds.length || g.shots.length
            ? `<div class="pre-steps">${renderPhaseBody(g.cmds, g.shots)}</div>`
            : ''
        }
        const hasFail = g.cmds.some((c) => c.state === 'failed')
        const cam = g.shots.length ? '<span class="phase-cam">shot</span>' : ''
        return `<details class="phase-group"${hasFail ? ' open' : ''}>
          <summary class="phase"><span class="phase-arrow">&rsaquo;</span><span class="phase-label">${escapeHtml(g.phase)}</span>${cam}<span class="phase-count">${g.cmds.length}</span></summary>
          ${renderPhaseBody(g.cmds, g.shots)}
        </details>`
      })
      .join('')
  }

  const renderTest = (t) => {
    const state = normState(t.state)
    const err = t.error ? `<pre class="err">${escapeHtml(t.error)}</pre>` : ''
    return `<details class="test t-${state}" data-state="${state}"${state === 'failed' ? ' open' : ''}>
      <summary>
        <span class="mark m-${state}" aria-hidden="true">${ICONS[t.state] || ICONS.unknown}</span>
        <span class="ttitle">${escapeHtml(t.fullTitle || t.title)}</span>
        <span class="dur">${formatDuration(t.duration)}</span>
        <span class="chev" aria-hidden="true">&rsaquo;</span>
      </summary>
      <div class="tbody">${err}${renderLog(t.steps || [])}</div>
    </details>`
  }

  const countText = (n, cls, label) => (n ? `<span class="c ${cls}">${n} ${label}</span>` : '')

  const specSections = specs
    .map((s) => {
      const sPassed = s.tests.filter((t) => normState(t.state) === 'passed').length
      const sFailed = s.tests.filter((t) => normState(t.state) === 'failed').length
      const sPending = s.tests.filter((t) => normState(t.state) === 'pending').length
      const ok = sFailed === 0
      return `<section class="spec">
        <div class="spec-head">
          <span class="mark ${ok ? 'm-passed' : 'm-failed'}" aria-hidden="true">${ok ? ICONS.passed : ICONS.failed}</span>
          <span class="spec-name">${escapeHtml(s.spec)}</span>
          <span class="spec-counts">${countText(sPassed, 'pass', 'passed')}${countText(sFailed, 'fail', 'failed')}${countText(sPending, 'pend', 'pending')}</span>
          <span class="spec-meta">${escapeHtml(s.browser)} · ${new Date(s.finishedAt).toLocaleTimeString()}</span>
        </div>
        <div class="tests">${s.tests.map(renderTest).join('')}</div>
      </section>`
    })
    .join('')

  const metaLine = [
    env.cypressVersion ? `Cypress ${escapeHtml(env.cypressVersion)}` : '',
    env.platform ? escapeHtml(env.platform) : '',
    env.viewport ? escapeHtml(env.viewport) : '',
    `${formatDuration(totalDuration)}`,
  ]
    .filter(Boolean)
    .join('  ·  ')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cypress Interactive Report</title>
<style>
  :root {
    --bg:#fff; --fg:#1f2328; --muted:#59636e; --border:#d1d9e0; --subtle:#f6f8fa; --subtle2:#eaeef2;
    --pass:#1a7f37; --fail:#cf222e; --pend:#9a6700;
    --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0d1117; --fg:#e6edf3; --muted:#9198a1; --border:#3d444d; --subtle:#161b22; --subtle2:#21262d;
      --pass:#3fb950; --fail:#f85149; --pend:#d29922; }
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--fg);
    font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  .wrap { max-width:960px; margin:0 auto; padding:26px 20px 56px; }
  a { color:inherit; }

  header { margin-bottom:18px; }
  header h1 { margin:0; font-size:17px; font-weight:600; }
  header .meta { color:var(--muted); font-size:12.5px; margin-top:3px; }
  header .meta code { font-family:var(--mono); }

  .summary { border:1px solid var(--border); border-radius:6px; background:var(--subtle);
    padding:11px 14px; margin-bottom:16px; }
  .summary-top { display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; font-size:13px; }
  .rate { font-weight:600; } .rate .n { color:${failed ? 'var(--fail)' : 'var(--pass)'}; }
  .summary-top .sep { color:var(--border); }
  .c { font-weight:600; } .c.total { color:var(--muted); font-weight:500; }
  .c.pass { color:var(--pass); } .c.fail { color:var(--fail); } .c.pend { color:var(--pend); }
  .bar { height:6px; border-radius:3px; overflow:hidden; display:flex; background:var(--subtle2); margin-top:10px; }
  .bar span { display:block; height:100%; }
  .bar .b-pass { background:var(--pass); } .bar .b-fail { background:var(--fail); } .bar .b-pend { background:var(--pend); }

  .toolbar { position:sticky; top:0; z-index:5; display:flex; gap:6px; align-items:center;
    flex-wrap:wrap; padding:9px 0; margin-bottom:10px; background:var(--bg); border-bottom:1px solid var(--border); }
  .seg { display:inline-flex; border:1px solid var(--border); border-radius:6px; overflow:hidden; }
  .seg .btn { border:none; border-right:1px solid var(--border); border-radius:0; }
  .seg .btn:last-child { border-right:none; }
  .btn { cursor:pointer; font:inherit; font-size:12.5px; font-weight:500; padding:5px 12px;
    background:var(--bg); color:var(--fg); border:1px solid var(--border); border-radius:6px; }
  .btn:hover { background:var(--subtle); }
  .btn.active { background:var(--subtle2); font-weight:600; }
  .btn.ghost { margin-left:auto; }

  .spec { border:1px solid var(--border); border-radius:6px; margin-bottom:12px; overflow:hidden; }
  .spec-head { padding:9px 12px; background:var(--subtle); border-bottom:1px solid var(--border);
    display:flex; align-items:center; gap:9px; flex-wrap:wrap; font-size:13px; }
  .spec-name { font-family:var(--mono); font-weight:600; }
  .spec-counts { display:flex; gap:12px; font-size:12px; }
  .spec-meta { margin-left:auto; color:var(--muted); font-size:11.5px; }

  .mark { font-weight:700; width:13px; text-align:center; flex:0 0 auto; }
  .m-passed { color:var(--pass); } .m-failed { color:var(--fail); } .m-pending { color:var(--pend); }

  .test { border-top:1px solid var(--border); }
  .tests > .test:first-child { border-top:none; }
  .test > summary { list-style:none; cursor:pointer; padding:9px 12px;
    display:flex; align-items:center; gap:10px; font-size:13.5px; }
  .test > summary::-webkit-details-marker { display:none; }
  .test > summary:hover { background:var(--subtle); }
  .ttitle { flex:1; }
  .dur { color:var(--muted); font-variant-numeric:tabular-nums; font-size:12px; }
  .chev { color:var(--muted); font-size:15px; transition:transform .12s ease; }
  .test[open] > summary .chev { transform:rotate(90deg); }

  .tbody { padding:4px 12px 14px 12px; }
  .err { margin:6px 0 12px; padding:9px 11px; background:var(--subtle);
    border:1px solid var(--border); border-left:3px solid var(--fail); border-radius:4px;
    overflow-x:auto; color:var(--fail); font-size:12px; white-space:pre-wrap; word-break:break-word;
    font-family:var(--mono); }

  /* Inside an expanded phase: log 40% · capture 60% (flex 2:3). */
  .phase-body { padding:8px 2px 4px; }
  .split { display:flex; gap:14px; align-items:flex-start; }
  .col-log { flex:2 1 0; min-width:0; }
  .col-cap { flex:3 1 0; min-width:0; display:flex; flex-direction:column; gap:12px; }
  .cap-item { margin:0; }
  .shot-link { display:block; }
  .shot { width:100%; height:auto; border:1px solid var(--border); border-radius:4px; display:block; }
  @media (max-width:680px) {
    .split { flex-direction:column; }
    .col-cap { width:100%; }
  }

  /* Only the command list scrolls; the phase header above it stays put. */
  .steps { margin:0; padding:0; list-style:none; max-height:300px; overflow:auto; counter-reset:cmd; }
  .step { display:grid; grid-template-columns:20px 74px 1fr; gap:9px; align-items:baseline;
    padding:4px 8px 4px 4px; font-size:12.5px; font-family:var(--mono); border-radius:3px; }
  .step + .step { border-top:1px solid color-mix(in srgb,var(--border) 45%,transparent); }
  .step:hover { background:var(--subtle); }
  .step::before { counter-increment:cmd; content:counter(cmd); color:var(--muted); opacity:.5;
    font-size:10px; text-align:right; align-self:center; }
  .cmd { font-weight:600; color:var(--fg); background:var(--subtle2);
    padding:1px 6px; border-radius:3px; justify-self:start; line-height:1.35; }
  .smsg { color:var(--muted); word-break:break-word; }
  .step.s-failed { background:color-mix(in srgb,var(--fail) 8%,transparent); }
  .step.s-failed .cmd { color:var(--fail); background:color-mix(in srgb,var(--fail) 14%,transparent); }
  .step.s-failed .smsg { color:var(--fail); }
  .pre-steps { margin-bottom:6px; }
  .phase-group { margin:6px 0; }
  .phase { cursor:pointer; list-style:none; padding:6px 10px; font-weight:600; font-size:12.5px;
    display:flex; align-items:center; gap:8px; background:var(--subtle);
    border:1px solid var(--border); border-left:3px solid var(--muted); border-radius:4px; }
  .phase::-webkit-details-marker { display:none; }
  .phase:hover { background:var(--subtle2); }
  .phase-arrow { color:var(--muted); font-size:15px; line-height:1; display:inline-block; transition:transform .12s ease; }
  .phase-group[open] .phase-arrow { transform:rotate(90deg); }
  .phase-label { flex:1; }
  .phase-cam { font-size:10px; color:var(--muted); border:1px solid var(--border);
    border-radius:3px; padding:0 5px; font-weight:500; }
  .phase-count { color:var(--muted); font-weight:500; font-size:11px; min-width:14px; text-align:right; }
  .nosteps { color:var(--muted); font-size:12px; margin:4px 0; }

  .empty { color:var(--muted); text-align:center; padding:40px; }
  footer { color:var(--muted); font-size:11.5px; margin-top:24px; padding-top:14px; border-top:1px solid var(--border); }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>Cypress · interactive run</h1>
      <div class="meta"><code>cypress open</code> · ${new Date(results.generatedAt).toLocaleString()}${metaLine ? ' · ' + metaLine : ''}</div>
    </header>

    <div class="summary">
      <div class="summary-top">
        <span class="rate"><span class="n">${passRate}%</span> passed</span>
        <span class="sep">·</span>
        <span class="c total">${total} total</span>
        ${passed ? `<span class="c pass">${passed} passed</span>` : ''}
        ${failed ? `<span class="c fail">${failed} failed</span>` : ''}
        ${pending ? `<span class="c pend">${pending} pending</span>` : ''}
      </div>
      <div class="bar">
        <span class="b-pass" style="width:${pct(passed)}%"></span>
        <span class="b-fail" style="width:${pct(failed)}%"></span>
        <span class="b-pend" style="width:${pct(pending)}%"></span>
      </div>
    </div>

    <div class="toolbar">
      <div class="seg">
        <button class="btn active" data-filter="all" type="button">All</button>
        <button class="btn" data-filter="passed" type="button">Passed</button>
        <button class="btn" data-filter="failed" type="button">Failed</button>
        <button class="btn" data-filter="pending" type="button">Pending</button>
      </div>
      <button id="toggleAll" class="btn ghost" type="button">Expand all</button>
    </div>

    ${specSections || '<div class="empty">No specs recorded yet. Run a spec in <code>cypress open</code>.</div>'}
    <footer>${total} tests · ${specs.length} spec${specs.length === 1 ? '' : 's'}</footer>
  </div>
  <script>
    (function () {
      var tests = Array.prototype.slice.call(document.querySelectorAll('details.test'))
      var specs = Array.prototype.slice.call(document.querySelectorAll('section.spec'))

      // Expand / collapse all — tests and their phase groups
      var phaseGroups = Array.prototype.slice.call(document.querySelectorAll('details.phase-group'))
      var toggle = document.getElementById('toggleAll')
      var expanded = false
      if (toggle) {
        toggle.addEventListener('click', function () {
          expanded = !expanded
          tests.forEach(function (t) { if (t.style.display !== 'none') t.open = expanded })
          phaseGroups.forEach(function (p) { p.open = expanded })
          toggle.textContent = expanded ? 'Collapse all' : 'Expand all'
        })
      }

      // Filter by state
      var filterBtns = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'))
      filterBtns.forEach(function (b) {
        b.addEventListener('click', function () {
          var f = b.getAttribute('data-filter')
          filterBtns.forEach(function (x) { x.classList.toggle('active', x === b) })
          tests.forEach(function (t) {
            t.style.display = f === 'all' || t.getAttribute('data-state') === f ? '' : 'none'
          })
          specs.forEach(function (s) {
            var visible = s.querySelectorAll('details.test:not([style*="display: none"])').length
            s.style.display = visible ? '' : 'none'
          })
        })
      })
    })()
  </script>
</body>
</html>`
}
