/*
 * app.js — Relationship Check-Up
 * No backend, no database. State lives in localStorage; portable as flat JSON.
 *
 * Storage shape (localStorage key "rcu:store"):
 *   {
 *     profiles: {
 *       "<identifier>": {
 *         identifier, code, profile:{displayName, situation, flags{...}},
 *         answers:{ <itemId>: value }, createdAt, updatedAt
 *       }, ...
 *     }
 *   }
 *
 * "Login" = identifier (username or email) + a 6-digit code. The code is
 * generated locally on sign-up, shown to the user, and can be emailed to
 * themselves via a mailto: link (the closest thing to "get sent" with no server).
 */

(function () {
  "use strict";

  const { GLOSSARY, SECTIONS, SCALE5, SCALE_TF } = window.CHECKUP;
  const STORE_KEY = "rcu:store";
  const SESSION_KEY = "rcu:session"; // remembers last signed-in identifier

  /* ── tiny DOM helpers ─────────────────────────────────────────────────── */
  const $ = (sel, root = document) => root.querySelector(sel);
  const app = $("#app");
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  /* ── storage ──────────────────────────────────────────────────────────── */
  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || { profiles: {} }; }
    catch (e) { return { profiles: {} }; }
  }
  function saveStore(s) { localStorage.setItem(STORE_KEY, JSON.stringify(s)); }
  function normId(s) { return String(s || "").trim().toLowerCase(); }
  function genCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

  /* ── session state ────────────────────────────────────────────────────── */
  let current = null; // { identifier, code, profile, answers }

  function persist() {
    if (!current) return;
    const store = loadStore();
    const key = normId(current.identifier);
    const prev = store.profiles[key] || {};
    store.profiles[key] = {
      identifier: current.identifier,
      code: current.code,
      profile: current.profile,
      answers: current.answers,
      partnerAnswers: current.partnerAnswers || {},
      createdAt: prev.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveStore(store);
  }

  /* ── answer-set mode ──────────────────────────────────────────────────────
   * "self"    -> filling in your own answers (current.answers)
   * "partner" -> filling in how you THINK your partner would answer
   *              (current.partnerAnswers) — only available if a partner name
   *              is set. Drives the parallel report at the end.
   * ────────────────────────────────────────────────────────────────────────*/
  let mode = "self";
  const activeAnswers = () => (mode === "partner" ? current.partnerAnswers : current.answers);
  const hasPartner = () => !!(current && current.profile && current.profile.partnerName);

  /* ── totals / counting ────────────────────────────────────────────────── */
  const allItems = SECTIONS.flatMap((s) => s.items);
  const totalItems = allItems.length;
  const answeredCount = () =>
    allItems.filter((it) => activeAnswers()[it.id] !== undefined).length;

  /* human-readable label for a chosen answer (used in the parallel report) */
  function answerLabel(item, value) {
    if (value === undefined) return "—";
    const list = optionList(item);
    const found = list.find((o) => o.value === value);
    return found ? found.label : String(value);
  }

  /* convert an answer to a 0..100 "strength" reading (high = healthier) */
  function itemStrength(item, value) {
    if (value === undefined) return null;
    if (item.type === "scale5") {
      const v = item.reverse ? 6 - value : value; // 1..5
      return ((v - 1) / 4) * 100;
    }
    if (item.type === "tf") {
      const healthy = item.reverse ? 0 : 1;
      return value === healthy ? 100 : 0;
    }
    // binary: options carry value 1 (healthy) / 0
    return value === 1 ? 100 : 0;
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * GLOSSARY: wrap known terms with hover/tap tooltip triggers
   * ═══════════════════════════════════════════════════════════════════════*/
  const GLOSS_KEYS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);
  function linkTerms(text) {
    let out = esc(text);
    for (const term of GLOSS_KEYS) {
      const re = new RegExp("\\b(" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")\\b", "g");
      let replaced = false;
      out = out.replace(re, (m) => {
        if (replaced) return m;        // only first occurrence per block
        replaced = true;
        return `<span class="term" data-term="${esc(term)}">${m}</span>`;
      });
    }
    return out;
  }

  /* floating tooltip */
  const tooltip = $("#tooltip");
  function showTip(target) {
    const term = target.getAttribute("data-term");
    const def = GLOSSARY[term];
    if (!def) return;
    tooltip.textContent = def;
    tooltip.hidden = false;
    const r = target.getBoundingClientRect();
    const top = r.bottom + window.scrollY + 6;
    let left = r.left + window.scrollX;
    left = Math.min(left, window.scrollX + document.documentElement.clientWidth - tooltip.offsetWidth - 10);
    tooltip.style.top = top + "px";
    tooltip.style.left = Math.max(8, left) + "px";
  }
  function hideTip() { tooltip.hidden = true; }
  document.addEventListener("mouseover", (e) => { const t = e.target.closest(".term"); if (t) showTip(t); });
  document.addEventListener("mouseout", (e) => { if (e.target.closest(".term")) hideTip(); });
  document.addEventListener("click", (e) => {
    const t = e.target.closest(".term");
    if (t) { e.preventDefault(); tooltip.hidden ? showTip(t) : hideTip(); }
    else if (!e.target.closest(".tooltip")) hideTip();
  });

  /* ═══════════════════════════════════════════════════════════════════════
   * VIEW: AUTH
   * ═══════════════════════════════════════════════════════════════════════*/
  function viewAuth() {
    setSessionBar(false);
    app.innerHTML = "";
    const wrap = el(`
      <div class="auth-wrap">
        <div class="card">
          <h1>Relationship Check-Up</h1>
          <p class="lead">A private, reflective check-up on your relationship — with definitions and guidance on every question. Your answers stay on this device.</p>
          <div class="tabs">
            <button class="tab active" id="tab-new" type="button">New profile</button>
            <button class="tab" id="tab-return" type="button">Returning</button>
          </div>
          <div id="auth-body"></div>
        </div>
        <p class="tiny">Multi-person by design: each person signs in with their own identifier + 6-digit code. A future update will let two saved profiles compare results.</p>
      </div>`);
    app.appendChild(wrap);
    $("#tab-new").onclick = () => { setTab("new"); };
    $("#tab-return").onclick = () => { setTab("return"); };
    setTab("new");

    function setTab(which) {
      $("#tab-new").classList.toggle("active", which === "new");
      $("#tab-return").classList.toggle("active", which === "return");
      which === "new" ? authNew() : authReturn();
    }
  }

  function authNew() {
    const body = $("#auth-body");
    body.innerHTML = `
      <label class="field"><span>Username or email <span class="hint">— how you'll sign back in</span></span>
        <input type="text" id="new-id" placeholder="e.g. alex or alex@email.com" autocomplete="username" /></label>
      <label class="field"><span>Display name <span class="hint">— optional</span></span>
        <input type="text" id="new-name" placeholder="Alex" /></label>
      <label class="field"><span>Your partner's name <span class="hint">— optional; lets you also answer “how would they answer?” for a parallel report</span></span>
        <input type="text" id="new-partner" placeholder="e.g. Sam" /></label>
      <label class="field"><span>A little about your situation <span class="hint">— optional; tailors some guidance to you</span></span>
        <textarea id="new-sit" placeholder="e.g. running two businesses, new baby, recently relocated…"></textarea></label>
      <div class="checks">
        <label><input type="checkbox" id="f-work" /> <span>I carry a high work / cognitive load (founder, multiple jobs, heavy caregiving)</span></label>
        <label><input type="checkbox" id="f-nd" /> <span>I'm neurodivergent &nbsp;<input type="text" id="f-nd-what" placeholder="e.g. ADHD" style="width:auto;display:inline-block;padding:4px 8px" /></span></label>
        <label><input type="checkbox" id="f-cp" /> <span>I have an active spiritual / contemplative practice &nbsp;<input type="text" id="f-cp-what" placeholder="e.g. Sikhi, meditation" style="width:auto;display:inline-block;padding:4px 8px" /></span></label>
      </div>
      <div class="row"><button class="primary" id="btn-create" type="button">Create profile &amp; get my code</button></div>
      <p id="new-err" class="error" hidden></p>
      <div id="code-area"></div>`;
    $("#btn-create").onclick = createProfile;
  }

  function createProfile() {
    const identifier = $("#new-id").value.trim();
    const err = $("#new-err");
    if (!identifier) { err.textContent = "Please enter a username or email."; err.hidden = false; return; }
    const store = loadStore();
    if (store.profiles[normId(identifier)]) {
      err.textContent = "That identifier already exists. Use the “Returning” tab with your code.";
      err.hidden = false; return;
    }
    err.hidden = true;
    const code = genCode();
    const flags = {
      highWorkload: $("#f-work").checked,
      neurodivergent: $("#f-nd").checked ? ($("#f-nd-what").value.trim() || "neurodivergence") : null,
      contemplativePractice: $("#f-cp").checked ? ($("#f-cp-what").value.trim() || "a contemplative practice") : null
    };
    current = {
      identifier,
      code,
      profile: {
        displayName: $("#new-name").value.trim() || identifier,
        partnerName: $("#new-partner").value.trim(),
        situation: $("#new-sit").value.trim(),
        flags
      },
      answers: {},
      partnerAnswers: {}
    };
    persist();
    localStorage.setItem(SESSION_KEY, normId(identifier));

    const isEmail = /\S+@\S+\.\S+/.test(identifier);
    const subject = encodeURIComponent("Your Relationship Check-Up access code");
    const bodyTxt = encodeURIComponent(
      `Keep this safe.\n\nSign in: ${identifier}\nAccess code: ${code}\n\nYou'll need both to reopen and keep editing your check-up.`);
    const mailto = `mailto:${isEmail ? encodeURIComponent(identifier) : ""}?subject=${subject}&body=${bodyTxt}`;

    $("#code-area").innerHTML = `
      <div class="note-box">
        <strong>Your access code — write this down.</strong>
        <div class="code-display">${esc(code)}</div>
        <p class="tiny">You'll need <em>${esc(identifier)}</em> + this code to sign back in and keep your progress. There is no server, so it can't be recovered if lost.</p>
        <div class="row">
          <button class="ghost" id="btn-copy" type="button">Copy code</button>
          <a class="ghost" href="${mailto}" id="btn-mail" style="text-decoration:none">Email this code to myself</a>
          <button class="ghost" id="btn-dl-key" type="button">Download key file</button>
          <span class="spacer"></span>
          <button class="primary" id="btn-begin" type="button">Begin check-up →</button>
        </div>
      </div>`;
    $("#btn-copy").onclick = () => navigator.clipboard?.writeText(code).then(() => toast("Code copied"));
    $("#btn-dl-key").onclick = () => downloadKeyFile();
    $("#btn-begin").onclick = () => viewAssessment();
  }

  function authReturn() {
    const body = $("#auth-body");
    body.innerHTML = `
      <label class="field"><span>Username or email</span>
        <input type="text" id="ret-id" placeholder="alex@email.com" autocomplete="username" /></label>
      <label class="field"><span>6-digit access code</span>
        <input type="text" id="ret-code" inputmode="numeric" maxlength="6" placeholder="••••••" autocomplete="one-time-code" /></label>
      <div class="row">
        <button class="primary" id="btn-signin" type="button">Sign in</button>
        <span class="spacer"></span>
        <button class="ghost" id="btn-import" type="button">Restore from file…</button>
        <input type="file" id="file-import" accept="application/json" hidden />
      </div>
      <p id="ret-err" class="error" hidden></p>`;
    $("#btn-signin").onclick = signIn;
    $("#btn-import").onclick = () => $("#file-import").click();
    $("#file-import").onchange = importKeyFile;
  }

  function signIn() {
    const id = $("#ret-id").value.trim();
    const code = $("#ret-code").value.trim();
    const err = $("#ret-err");
    const store = loadStore();
    const rec = store.profiles[normId(id)];
    if (!rec) { err.textContent = "No profile found for that identifier on this device. Use “Restore from file” or create a new profile."; err.hidden = false; return; }
    if (rec.code !== code) { err.textContent = "That code doesn't match."; err.hidden = false; return; }
    err.hidden = true;
    current = { identifier: rec.identifier, code: rec.code, profile: rec.profile, answers: rec.answers || {}, partnerAnswers: rec.partnerAnswers || {} };
    localStorage.setItem(SESSION_KEY, normId(id));
    viewAssessment();
  }

  /* ── flat-file export / import ────────────────────────────────────────── */
  function downloadKeyFile() {
    if (!current) return;
    const data = {
      kind: "relationship-checkup-profile", version: 1,
      identifier: current.identifier, code: current.code,
      profile: current.profile, answers: current.answers,
      partnerAnswers: current.partnerAnswers || {},
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `checkup-${normId(current.identifier).replace(/[^a-z0-9]+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function importKeyFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.kind !== "relationship-checkup-profile") throw new Error("Not a check-up file");
        current = { identifier: data.identifier, code: data.code, profile: data.profile, answers: data.answers || {}, partnerAnswers: data.partnerAnswers || {} };
        persist();
        localStorage.setItem(SESSION_KEY, normId(current.identifier));
        viewAssessment();
      } catch (err) {
        const e2 = $("#ret-err"); if (e2) { e2.textContent = "Couldn't read that file."; e2.hidden = false; }
      }
    };
    reader.readAsText(file);
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * VIEW: ASSESSMENT
   * ═══════════════════════════════════════════════════════════════════════*/
  let activeSection = 0;

  function viewAssessment() {
    setSessionBar(true);
    app.innerHTML = "";
    app.appendChild(el(`
      <div class="progress-wrap">
        <div id="modetoggle" class="mode-toggle"></div>
        <div class="progress"><i id="progbar"></i></div>
        <div class="progress-label" id="proglabel"></div>
        <div class="sec-nav" id="secnav"></div>
      </div>`));
    const host = el(`<div id="section-host"></div>`);
    app.appendChild(host);
    renderModeToggle();
    renderSecNav();
    renderSection(activeSection);
    updateProgress();
    window.scrollTo({ top: 0 });
  }

  function renderModeToggle() {
    const box = $("#modetoggle");
    if (!box) return;
    if (!hasPartner()) { box.hidden = true; return; }
    box.hidden = false;
    const me = current.profile.displayName || "Me";
    const partner = current.profile.partnerName;
    box.innerHTML = `
      <span class="mode-label">Answering as:</span>
      <button type="button" class="mode-btn ${mode === "self" ? "active" : ""}" data-mode="self">${esc(me)}</button>
      <button type="button" class="mode-btn ${mode === "partner" ? "active" : ""}" data-mode="partner">How would ${esc(partner)} answer?</button>`;
    box.querySelectorAll(".mode-btn").forEach((b) => {
      b.onclick = () => {
        mode = b.getAttribute("data-mode");
        renderModeToggle();
        renderSection(activeSection);
        renderSecNav();
        updateProgress();
      };
    });
  }

  function renderSecNav() {
    const nav = $("#secnav");
    nav.innerHTML = "";
    SECTIONS.forEach((sec, i) => {
      const done = sec.items.every((it) => activeAnswers()[it.id] !== undefined);
      const b = el(`<button type="button" class="${i === activeSection ? "active" : ""} ${done ? "done" : ""}">${esc(sec.title)}</button>`);
      b.onclick = () => { activeSection = i; renderSection(i); renderSecNav(); window.scrollTo({ top: 0, behavior: "smooth" }); };
      nav.appendChild(b);
    });
    const results = el(`<button type="button">📊 Results</button>`);
    results.onclick = viewResults;
    nav.appendChild(results);
  }

  function renderSection(i) {
    const sec = SECTIONS[i];
    const host = $("#section-host");
    host.innerHTML = "";
    const card = el(`<section class="card"></section>`);
    card.appendChild(el(`<h1>${esc(sec.title)} ${sec.term ? `<span class="term" data-term="${esc(sec.term)}" style="font-size:.7em;color:var(--muted)">ⓘ</span>` : ""}</h1>`));
    if (sec.intro) card.appendChild(el(`<p class="lead">${linkTerms(sec.intro)}</p>`));
    sec.items.forEach((item) => card.appendChild(renderItem(item)));

    const nav = el(`<div class="row" style="margin-top:18px">
      <button class="ghost" id="prev" type="button" ${i === 0 ? "disabled" : ""}>← Previous</button>
      <span class="spacer"></span>
      ${i < SECTIONS.length - 1
        ? `<button class="primary" id="next" type="button">Next section →</button>`
        : `<button class="primary" id="next" type="button">See results →</button>`}
    </div>`);
    card.appendChild(nav);
    host.appendChild(card);
    const prev = $("#prev"); if (prev) prev.onclick = () => { activeSection = i - 1; renderSection(activeSection); renderSecNav(); window.scrollTo({ top: 0, behavior: "smooth" }); };
    $("#next").onclick = () => {
      if (i < SECTIONS.length - 1) { activeSection = i + 1; renderSection(activeSection); renderSecNav(); window.scrollTo({ top: 0, behavior: "smooth" }); }
      else viewResults();
    };
  }

  function renderItem(item) {
    const wrap = el(`<div class="item" id="item-${esc(item.id)}"></div>`);

    const stem = el(`<div class="item-stem">
        <div class="q">${esc(item.text)}</div>
        <button class="tipbtn" type="button" aria-expanded="false" title="Hints & definitions">i</button>
      </div>`);
    wrap.appendChild(stem);

    // options
    const answers = activeAnswers();
    const opts = el(`<div class="options" role="radiogroup"></div>`);
    const list = optionList(item);
    list.forEach((o) => {
      const id = `${item.id}-${mode}-${o.value}`;
      const sel = answers[item.id] === o.value;
      const opt = el(`<label class="opt ${sel ? "sel" : ""}" for="${id}">
          <input type="radio" id="${id}" name="${esc(item.id)}-${mode}" value="${o.value}" ${sel ? "checked" : ""} />
          <span>
            <span class="lab">${esc(o.label)}</span>
            ${o.meaning ? `<span class="mean">${esc(o.meaning)}</span>` : ""}
          </span>
        </label>`);
      opt.querySelector("input").onchange = () => {
        activeAnswers()[item.id] = o.value;
        persist();
        opts.querySelectorAll(".opt").forEach((n) => n.classList.remove("sel"));
        opt.classList.add("sel");
        updateProgress(); renderSecNav();
      };
      opts.appendChild(opt);
    });
    wrap.appendChild(opts);

    if (mode === "partner") {
      // The "context bit" is keyed to the logged-in person, so in partner mode
      // we replace it with a prompt to answer from the partner's perspective.
      wrap.appendChild(el(`<div class="context partner-hint"><span class="tag">Predicting ${esc(current.profile.partnerName)}</span><div>Answer as you believe ${esc(current.profile.partnerName)} honestly would — not how you wish they'd answer.</div></div>`));
    } else {
      // per-participant context note (tailored to the logged-in person)
      const note = contextNoteFor(item);
      if (note) wrap.appendChild(el(`<div class="context"><span class="tag">For your situation</span><div>${linkTerms(note)}</div></div>`));
    }

    // guide panel (hidden until toggled)
    const guide = renderGuide(item);
    guide.hidden = true;
    wrap.appendChild(guide);
    stem.querySelector(".tipbtn").onclick = (e) => {
      const open = guide.hidden;
      guide.hidden = !open;
      e.currentTarget.setAttribute("aria-expanded", String(open));
    };
    return wrap;
  }

  function optionList(item) {
    if (item.type === "binary") return item.options;
    const scale = item.type === "tf" ? SCALE_TF : SCALE5;
    return scale.map((s) => ({
      value: s.value, label: s.label,
      meaning: item.optionMeanings ? item.optionMeanings[s.value] : null
    }));
  }

  function contextNoteFor(item) {
    if (typeof item.contextNote !== "function") return null;
    try { return item.contextNote(current.profile || { flags: {} }) || null; }
    catch (e) { return null; }
  }

  function renderGuide(item) {
    const g = item.guide || {};
    const parts = [];
    if (g.howToDecide) parts.push(`<h4>How to decide</h4><p>${linkTerms(g.howToDecide)}</p>`);
    if (g.why) parts.push(`<h4>Why this matters</h4><p>${linkTerms(g.why)}</p>`);
    if (g.distinguish && g.distinguish.length)
      parts.push(`<h4>Distinguish carefully</h4><ul>${g.distinguish.map((d) => `<li>${linkTerms(d)}</li>`).join("")}</ul>`);
    if (g.honesty) parts.push(`<h4>Don't soften it</h4><p>${linkTerms(g.honesty)}</p>`);
    if (g.gutCheck) parts.push(`<h4>Gut check</h4><p>${linkTerms(g.gutCheck)}</p>`);
    return el(`<div class="guide">${parts.join("")}</div>`);
  }

  function updateProgress() {
    const n = answeredCount();
    const pct = Math.round((n / totalItems) * 100);
    const bar = $("#progbar"); if (bar) bar.style.width = pct + "%";
    const who = mode === "partner" ? `for ${current.profile.partnerName}` : "for you";
    const label = $("#proglabel"); if (label) label.textContent = `${n} of ${totalItems} answered ${who} (${pct}%)`;
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * VIEW: RESULTS
   * ═══════════════════════════════════════════════════════════════════════*/
  // Average strength (0..100) for a section under a given answer map.
  function sectionAvg(sec, map) {
    const vals = sec.items.map((it) => itemStrength(it, map[it.id])).filter((v) => v !== null);
    return { avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null, n: vals.length };
  }

  function viewResults() {
    setSessionBar(true);
    app.innerHTML = "";
    const partnerAnswered = current.partnerAnswers && Object.keys(current.partnerAnswers).length > 0;
    const parallel = hasPartner() && partnerAnswered;

    const card = el(`<section class="card"></section>`);
    card.appendChild(el(`<h1>${parallel ? "Parallel reflection" : "Your reflection"}</h1>`));
    card.appendChild(el(`<div class="disclaimer">${parallel
      ? `Two readings, section by section: <strong>your own</strong> answers, and <strong>how you predicted ${esc(current.profile.partnerName)} would answer</strong>. This is <em>your perception</em> of their view — it's most useful as a conversation-starter, and the real test is comparing it with ${esc(current.profile.partnerName)}'s own answers later. Not a diagnosis or a verdict.`
      : `These bars summarise where your answers lean, section by section. They're a mirror for reflection and conversation — <strong>not</strong> a diagnosis or a verdict. The most useful part is often re-reading the items where you hesitated.`}</div>`));

    const me = current.profile.displayName || "You";
    const partner = current.profile.partnerName;

    if (parallel) {
      card.appendChild(el(`<div class="legend keylegend"><span><i class="swatch self"></i> ${esc(me)}</span> <span><i class="swatch partner"></i> ${esc(partner)} (predicted)</span></div>`));
    }

    // overall
    let selfSum = 0, selfN = 0, partSum = 0, partN = 0;
    const rows = [];
    SECTIONS.forEach((sec) => {
      const s = sectionAvg(sec, current.answers);
      const p = parallel ? sectionAvg(sec, current.partnerAnswers) : { avg: null, n: 0 };
      if (s.n) { selfSum += s.avg * s.n; selfN += s.n; }
      if (p.n) { partSum += p.avg * p.n; partN += p.n; }
      rows.push({ sec, s, p });
    });
    const selfOverall = selfN ? Math.round(selfSum / selfN) : null;
    const partOverall = partN ? Math.round(partSum / partN) : null;

    card.appendChild(parallel
      ? dualResult("Overall lean", selfOverall, partOverall, "", "")
      : el(`<div class="sec-result"><div class="top"><strong>Overall lean</strong><span class="pct">${selfOverall === null ? "—" : selfOverall + "%"}</span></div><div class="bar"><i style="width:${selfOverall || 0}%;background:${barColor(selfOverall)}"></i></div></div>`));

    rows.forEach(({ sec, s, p }) => {
      if (parallel) {
        card.appendChild(dualResult(sec.title, s.avg === null ? null : Math.round(s.avg), p.avg === null ? null : Math.round(p.avg),
          `${s.n}/${sec.items.length}`, `${p.n}/${sec.items.length}`));
      } else {
        const pct = s.avg === null ? null : Math.round(s.avg);
        card.appendChild(el(`<div class="sec-result"><div class="top"><span>${esc(sec.title)} <span class="legend">(${s.n}/${sec.items.length} answered)</span></span><span class="pct">${pct === null ? "—" : pct + "%"}</span></div><div class="bar"><i style="width:${pct || 0}%;background:${barColor(pct)}"></i></div></div>`));
      }
    });

    // Perception gaps: items answered in BOTH maps, biggest divergence first.
    if (parallel) card.appendChild(renderGaps(me, partner));

    const nav = el(`<div class="row" style="margin-top:18px">
      <button class="ghost" id="back" type="button">← Back to questions</button>
      <span class="spacer"></span>
      <button class="ghost" id="exp" type="button">Export my data (flat file)</button>
      <button class="ghost" id="cmp" type="button">${hasPartner() ? `Compare with ${esc(partner)}'s own answers (coming soon)` : "Compare (coming soon)"}</button>
    </div>`);
    card.appendChild(nav);
    app.appendChild(card);

    $("#back").onclick = viewAssessment;
    $("#exp").onclick = downloadKeyFile;
    $("#cmp").onclick = () => {
      const n = Object.keys(loadStore().profiles).length;
      toast(`Coming soon: invite ${partner || "your partner"} to answer for themselves, then compare. ${n} profile${n === 1 ? "" : "s"} saved here so far.`);
    };
    window.scrollTo({ top: 0 });
  }

  // Two-bar row for the parallel report.
  function dualResult(title, selfPct, partPct, selfN, partN) {
    const row = (cls, pct, who, n) => `
      <div class="dual-line">
        <span class="dual-who">${esc(who)} ${n ? `<span class="legend">(${n})</span>` : ""}</span>
        <span class="bar mini"><i style="width:${pct || 0}%;background:${barColor(pct)}"></i></span>
        <span class="pct">${pct === null ? "—" : pct + "%"}</span>
      </div>`;
    const gap = (selfPct !== null && partPct !== null) ? Math.abs(selfPct - partPct) : null;
    return el(`<div class="sec-result dual">
      <div class="top"><strong>${esc(title)}</strong>${gap !== null && gap >= 20 ? `<span class="gap-flag">gap ${gap}%</span>` : ""}</div>
      ${row("self", selfPct, "You", selfN)}
      ${row("partner", partPct, "Them", partN)}
    </div>`);
  }

  // List the items where your reading and your predicted-partner reading diverge most.
  function renderGaps(me, partner) {
    const gaps = [];
    allItems.forEach((it) => {
      const sv = current.answers[it.id], pv = current.partnerAnswers[it.id];
      const ss = itemStrength(it, sv), ps = itemStrength(it, pv);
      if (ss === null || ps === null) return;
      gaps.push({ it, diff: Math.abs(ss - ps), sv, pv });
    });
    gaps.sort((a, b) => b.diff - a.diff);
    const top = gaps.filter((g) => g.diff > 0).slice(0, 6);

    const box = el(`<div class="gaps"><h2>Where you predict you'll see things differently</h2></div>`);
    if (!top.length) {
      box.appendChild(el(`<p class="legend">On the items answered for both of you, you didn't predict any meaningful differences — you expect ${esc(partner)} to see these areas much as you do.</p>`));
      return box;
    }
    box.appendChild(el(`<p class="legend">The items below are where you expect the biggest difference between your view and ${esc(partner)}'s. These are usually the most fruitful things to actually talk about.</p>`));
    top.forEach((g) => {
      box.appendChild(el(`<div class="gap-item">
        <div class="gap-q">${esc(g.it.text)}</div>
        <div class="gap-rows">
          <div><span class="dual-who">${esc(me)}:</span> ${esc(answerLabel(g.it, g.sv))}</div>
          <div><span class="dual-who">${esc(partner)} (predicted):</span> ${esc(answerLabel(g.it, g.pv))}</div>
        </div>
      </div>`));
    });
    return box;
  }
  function barColor(pct) {
    if (pct === null) return "var(--line)";
    if (pct >= 67) return "var(--good)";
    if (pct >= 40) return "var(--warn)";
    return "var(--risk)";
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * Session bar, glossary drawer, toast
   * ═══════════════════════════════════════════════════════════════════════*/
  function setSessionBar(show) {
    const s = $("#session");
    s.hidden = !show;
    if (show && current) $("#whoami").textContent = `Signed in as ${current.profile.displayName || current.identifier}`;
  }
  $("#btn-signout").onclick = () => {
    persist();
    current = null;
    localStorage.removeItem(SESSION_KEY);
    viewAuth();
  };
  $("#btn-save").onclick = () => { persist(); toast("Saved on this device"); };
  $("#btn-glossary").onclick = openGlossary;
  $("#btn-glossary-close").onclick = closeGlossary;
  $("#scrim").onclick = closeGlossary;

  function openGlossary() {
    const body = $("#glossary-body");
    body.innerHTML = Object.keys(GLOSSARY).sort().map((k) =>
      `<dl class="gloss-term"><dt>${esc(k)}</dt><dd>${esc(GLOSSARY[k])}</dd></dl>`).join("");
    $("#glossary-drawer").hidden = false;
    $("#scrim").hidden = false;
  }
  function closeGlossary() { $("#glossary-drawer").hidden = true; $("#scrim").hidden = true; }

  let toastTimer = null;
  function toast(msg) {
    let t = $("#toast");
    if (!t) {
      t = el(`<div id="toast" style="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#2c2a28;color:#fff;padding:10px 16px;border-radius:999px;z-index:120;box-shadow:var(--shadow)"></div>`);
      document.body.appendChild(t);
    }
    t.textContent = msg; t.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.style.opacity = "0"; }, 2200);
  }

  /* ── boot ─────────────────────────────────────────────────────────────── */
  function boot() {
    const lastId = localStorage.getItem(SESSION_KEY);
    if (lastId) {
      const rec = loadStore().profiles[lastId];
      if (rec) {
        current = { identifier: rec.identifier, code: rec.code, profile: rec.profile, answers: rec.answers || {}, partnerAnswers: rec.partnerAnswers || {} };
        viewAssessment();
        return;
      }
    }
    viewAuth();
  }
  boot();
})();
