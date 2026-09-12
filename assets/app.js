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
        <p class="tiny">Multi-person by design: each person signs in with their own identifier + 6-digit code. Once you've both finished, either of you can compare the two sets of answers side by side.</p>
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
  /* A *share* file is the comparison-safe subset: answers only, no access code,
   * and none of your predictions about your partner. Handing someone this file
   * is the consent step for a comparison — it never hands over your login. */
  /* Short non-reversible tag for an identifier. Not a security control — it
   * exists so we can spot "that's your own file" without putting the person's
   * username or email into a file they hand to someone else. */
  function ownerTag(identifier) {
    let h = 5381;
    const s = normId(identifier);
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(16);
  }

  function buildShareData() {
    return {
      kind: "relationship-checkup-share", version: 1,
      displayName: current.profile.displayName || current.identifier,
      ownerTag: ownerTag(current.identifier),
      answers: current.answers,
      exportedAt: new Date().toISOString()
    };
  }
  function downloadShareFile() {
    if (!current) return;
    const blob = new Blob([JSON.stringify(buildShareData(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `checkup-share-${normId(current.profile.displayName || current.identifier).replace(/[^a-z0-9]+/g, "-")}.json`;
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
      ? dualResult("Overall lean", selfOverall, partOverall, "", "", me, partner)
      : el(`<div class="sec-result"><div class="top"><strong>Overall lean</strong><span class="pct">${selfOverall === null ? "—" : selfOverall + "%"}</span></div><div class="bar"><i style="width:${selfOverall || 0}%;background:${barColor(selfOverall)}"></i></div></div>`));

    rows.forEach(({ sec, s, p }) => {
      if (parallel) {
        card.appendChild(dualResult(sec.title, s.avg === null ? null : Math.round(s.avg), p.avg === null ? null : Math.round(p.avg),
          `${s.n}/${sec.items.length}`, `${p.n}/${sec.items.length}`, me, partner));
      } else {
        const pct = s.avg === null ? null : Math.round(s.avg);
        card.appendChild(el(`<div class="sec-result"><div class="top"><span>${esc(sec.title)} <span class="legend">(${s.n}/${sec.items.length} answered)</span></span><span class="pct">${pct === null ? "—" : pct + "%"}</span></div><div class="bar"><i style="width:${pct || 0}%;background:${barColor(pct)}"></i></div></div>`));
      }
    });

    // Perception gaps: items answered in BOTH maps, biggest divergence first.
    if (parallel) card.appendChild(renderGaps(me, partner));

    const nav = el(`<div class="row noprint" style="margin-top:18px">
      <button class="ghost" id="back" type="button">← Back to questions</button>
      <span class="spacer"></span>
      <button class="ghost" id="exp" type="button">Export my data (flat file)</button>
      <button class="ghost" id="share" type="button">Share my answers for comparison</button>
      <button class="primary" id="cmp" type="button">${hasPartner() ? `Compare with ${esc(partner)}'s own answers` : "Compare with a partner's answers"}</button>
    </div>`);
    card.appendChild(nav);
    app.appendChild(card);

    $("#back").onclick = viewAssessment;
    $("#exp").onclick = downloadKeyFile;
    $("#share").onclick = () => {
      downloadShareFile();
      toast("Share file saved — answers only, no access code");
    };
    $("#cmp").onclick = () => (compare ? viewCompareReport() : viewCompareSetup());
    window.scrollTo({ top: 0 });
  }

  // Two-bar row, used by both the parallel report and the two-person comparison.
  function dualResult(title, selfPct, partPct, selfN, partN, selfLabel, partLabel) {
    const row = (cls, pct, who, n) => `
      <div class="dual-line">
        <span class="dual-who">${esc(who)} ${n ? `<span class="legend">(${n})</span>` : ""}</span>
        <span class="bar mini"><i style="width:${pct || 0}%;background:${barColor(pct)}"></i></span>
        <span class="pct">${pct === null ? "—" : pct + "%"}</span>
      </div>`;
    const gap = (selfPct !== null && partPct !== null) ? Math.abs(selfPct - partPct) : null;
    return el(`<div class="sec-result dual">
      <div class="top"><strong>${esc(title)}</strong>${gap !== null && gap >= 20 ? `<span class="gap-flag">gap ${gap}%</span>` : ""}</div>
      ${row("self", selfPct, selfLabel || "You", selfN)}
      ${row("partner", partPct, partLabel || "Them", partN)}
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
  /* ═══════════════════════════════════════════════════════════════════════
   * VIEW: COMPARE — two people's *own* answers, side by side.
   *
   * This is the real two-person report, as opposed to the parallel report
   * above (which compares you against your *prediction* of your partner).
   * Two ways in, both flat-file / on-device only:
   *   1. Another profile saved in this browser — gated on their access code,
   *      so one person can't read another's answers without them unlocking it.
   *   2. A file they exported and sent you — the act of sending is consent.
   * Nothing here writes to the other person's record, and loading a partner
   * NEVER replaces your own signed-in session.
   * ═══════════════════════════════════════════════════════════════════════*/
  let compare = null; // { label, answers, source }

  function viewCompareSetup() {
    setSessionBar(true);
    app.innerHTML = "";
    const partner = current.profile.partnerName;
    const others = Object.values(loadStore().profiles)
      .filter((p) => normId(p.identifier) !== normId(current.identifier));

    const card = el(`<section class="card">
      <h1>Compare with ${partner ? esc(partner) + "'s" : "a partner's"} own answers</h1>
      <div class="disclaimer">This compares your answers with <strong>${partner ? esc(partner) + "'s actual answers" : "your partner's actual answers"}</strong> — what they said themselves, not what you predicted. It only works if they've completed their own check-up. Their answers stay on this device and are never sent anywhere.</div>
      <div class="context" style="margin-top:14px"><span class="tag">Before you do this</span><div>A comparison is meant to be opened <em>together</em>, or with a counsellor. Reading someone's answers without them knowing tends to cost more than it tells you — and nothing here is a verdict on either of you.</div></div>
    </section>`);

    const fromFile = el(`<div class="cmp-source">
      <h2>They sent me a file</h2>
      <p class="legend">Load the file they exported from their own check-up. It doesn't touch your profile or your login.</p>
      <div class="row">
        <button class="primary" id="cmp-pick" type="button">Choose their file…</button>
        <input type="file" id="cmp-file" accept="application/json" hidden />
      </div>
      <p class="tiny">They can produce one from their results screen: <em>Share my answers for comparison</em>. That file carries answers only — no access code.</p>
      <p id="cmp-file-err" class="error" hidden></p>
    </div>`);
    card.appendChild(fromFile);

    const onDevice = el(`<div class="cmp-source">
      <h2>They use this device</h2>
    </div>`);
    if (!others.length) {
      onDevice.appendChild(el(`<p class="legend">No other profile is saved in this browser. If ${partner ? esc(partner) : "your partner"} does their check-up here, their profile will appear in this list.</p>`));
    } else {
      onDevice.appendChild(el(`<p class="legend">Pick their profile, then have <strong>them</strong> enter their own 6-digit code to unlock it. You shouldn't be entering it for them.</p>`));
      others.forEach((p) => {
        const nm = p.profile && p.profile.displayName ? p.profile.displayName : p.identifier;
        const n = Object.keys(p.answers || {}).length;
        const row = el(`<div class="cmp-profile">
          <div><strong>${esc(nm)}</strong> <span class="legend">— ${n} of ${totalItems} answered</span></div>
          <div class="row cmp-unlock" hidden>
            <input type="text" inputmode="numeric" maxlength="6" placeholder="Their 6-digit code" class="cmp-code" />
            <button class="primary cmp-go" type="button">Unlock &amp; compare</button>
          </div>
          <p class="error cmp-err" hidden></p>
        </div>`);
        const btn = el(`<button class="ghost" type="button">Compare with ${esc(nm)}</button>`);
        btn.onclick = () => { row.querySelector(".cmp-unlock").hidden = false; row.querySelector(".cmp-code").focus(); };
        row.querySelector("div").appendChild(btn);
        row.querySelector(".cmp-go").onclick = () => {
          const err = row.querySelector(".cmp-err");
          if (row.querySelector(".cmp-code").value.trim() !== p.code) {
            err.textContent = "That code doesn't match this profile."; err.hidden = false; return;
          }
          if (!Object.keys(p.answers || {}).length) {
            err.textContent = `${nm} hasn't answered anything yet — there's nothing to compare.`; err.hidden = false; return;
          }
          startCompare({ label: nm, answers: p.answers, source: "this device" });
        };
        onDevice.appendChild(row);
      });
    }
    card.appendChild(onDevice);

    const nav = el(`<div class="row" style="margin-top:18px">
      <button class="ghost" id="cmp-back" type="button">← Back to my results</button>
    </div>`);
    card.appendChild(nav);
    app.appendChild(card);

    $("#cmp-pick").onclick = () => $("#cmp-file").click();
    $("#cmp-file").onchange = loadCompareFile;
    $("#cmp-back").onclick = viewResults;
    window.scrollTo({ top: 0 });
  }

  /* Accepts either a share file or a full profile export. Read-only: we take
   * the answers and the name and discard everything else, including any code. */
  function loadCompareFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const err = $("#cmp-file-err");
    const fail = (msg) => { if (err) { err.textContent = msg; err.hidden = false; } };
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try { data = JSON.parse(reader.result); }
      catch (x) { return fail("Couldn't read that file — it isn't valid JSON."); }
      const ok = data && (data.kind === "relationship-checkup-share" || data.kind === "relationship-checkup-profile");
      if (!ok) return fail("That isn't a check-up file.");
      const answers = data.answers || {};
      if (!Object.keys(answers).length) return fail("That file has no answers in it yet.");
      const sameAsMe = (data.identifier && normId(data.identifier) === normId(current.identifier))
        || (data.ownerTag && data.ownerTag === ownerTag(current.identifier));
      if (sameAsMe) return fail("That's your own file — load the one your partner exported.");
      const label = data.displayName
        || (data.profile && data.profile.displayName)
        || data.identifier
        || current.profile.partnerName
        || "Your partner";
      startCompare({ label, answers, source: "a file they sent" });
    };
    reader.onerror = () => fail("Couldn't read that file.");
    reader.readAsText(file);
  }

  function startCompare(payload) {
    const overlap = allItems.filter((it) =>
      current.answers[it.id] !== undefined && payload.answers[it.id] !== undefined).length;
    if (!overlap) {
      toast("You haven't both answered any of the same questions yet.");
      return;
    }
    compare = payload;
    viewCompareReport();
  }

  /* 0..100 strength → band. scale5: ≥67 is a 4 or 5, <40 is a 1 or 2. */
  function band(pct) { return pct >= 67 ? "strong" : pct < 40 ? "concern" : "middling"; }

  function viewCompareReport() {
    if (!compare) return viewCompareSetup();
    setSessionBar(true);
    app.innerHTML = "";
    const me = current.profile.displayName || "You";
    const them = compare.label;
    const theirs = compare.answers;

    const card = el(`<section class="card"></section>`);
    card.appendChild(el(`<h1>${esc(me)} &amp; ${esc(them)}</h1>`));
    card.appendChild(el(`<div class="disclaimer">Both of your <strong>own</strong> answers, side by side — loaded from ${esc(compare.source)}. Read it together if you can. Where you differ isn't a scoreline; it's usually just the place where one of you has information the other doesn't.</div>`));
    card.appendChild(el(`<div class="legend keylegend"><span><i class="swatch self"></i> ${esc(me)}</span> <span><i class="swatch partner"></i> ${esc(them)}</span></div>`));

    // ── section-by-section, both real ──────────────────────────────────────
    let aSum = 0, aN = 0, bSum = 0, bN = 0;
    const rows = [];
    SECTIONS.forEach((sec) => {
      const a = sectionAvg(sec, current.answers);
      const b = sectionAvg(sec, theirs);
      if (a.n) { aSum += a.avg * a.n; aN += a.n; }
      if (b.n) { bSum += b.avg * b.n; bN += b.n; }
      rows.push({ sec, a, b });
    });
    card.appendChild(dualResult("Overall lean", aN ? Math.round(aSum / aN) : null, bN ? Math.round(bSum / bN) : null, "", "", me, them));
    rows.filter(({ a, b }) => a.n || b.n).forEach(({ sec, a, b }) => card.appendChild(dualResult(
      sec.title,
      a.avg === null ? null : Math.round(a.avg),
      b.avg === null ? null : Math.round(b.avg),
      `${a.n}/${sec.items.length}`, `${b.n}/${sec.items.length}`, me, them)));

    // Rather than a run of empty bars, name the untouched sections once.
    const untouched = rows.filter(({ a, b }) => !a.n && !b.n).map(({ sec }) => sec.title);
    if (untouched.length) card.appendChild(el(
      `<p class="legend">Not started by either of you yet: ${esc(untouched.join(", "))}.</p>`));

    // ── item-level classification over the overlap ─────────────────────────
    const shared = [];
    allItems.forEach((it) => {
      const av = current.answers[it.id], bv = theirs[it.id];
      const as = itemStrength(it, av), bs = itemStrength(it, bv);
      if (as === null || bs === null) return;
      shared.push({ it, av, bv, as, bs, diff: Math.abs(as - bs) });
    });

    const strengths = shared.filter((r) => band(r.as) === "strong" && band(r.bs) === "strong");
    const concerns = shared.filter((r) => band(r.as) === "concern" && band(r.bs) === "concern");
    const differing = shared.filter((r) => r.diff >= 50).sort((x, y) => y.diff - x.diff);

    card.appendChild(el(`<p class="legend cmp-coverage">Based on the <strong>${shared.length}</strong> question${shared.length === 1 ? "" : "s"} you've both answered.</p>`));

    card.appendChild(cmpGroup(
      "You both already agree this is hard",
      concerns.length
        ? `Neither of you is defending these. That agreement is worth something — it's the shortest route to a change you'd both actually back.`
        : `Nothing you've both answered lands in the difficult range for both of you.`,
      concerns, me, them, "concern"));

    card.appendChild(cmpGroup(
      "You both see this as working",
      strengths.length
        ? `Shared ground. When a harder conversation stalls, this is what you're arguing <em>from</em>, not against.`
        : `Nothing you've both answered lands in the strong range for both of you yet.`,
      strengths, me, them, "strong"));

    card.appendChild(cmpGroup(
      "You're living this differently",
      differing.length
        ? `The same question, answered from two ends. Neither of you is the one who's wrong here — you're each reporting your own experience accurately. Start with the one that surprises you most.`
        : `On the questions you've both answered, you didn't land at opposite ends of anything.`,
      differing.slice(0, 8), me, them, "diverge"));

    // ── blind spots: your prediction vs what they actually said ────────────
    card.appendChild(renderBlindSpots(me, them, theirs));

    const nav = el(`<div class="row noprint" style="margin-top:18px">
      <button class="ghost" id="c-back" type="button">← My results</button>
      <button class="ghost" id="c-other" type="button">Compare with someone else</button>
      <span class="spacer"></span>
      <button class="ghost" id="c-print" type="button">Print / save as PDF</button>
      <button class="ghost" id="c-close" type="button">Close comparison</button>
    </div>`);
    card.appendChild(nav);
    app.appendChild(card);

    $("#c-back").onclick = viewResults;
    $("#c-other").onclick = () => { compare = null; viewCompareSetup(); };
    $("#c-print").onclick = () => window.print();
    $("#c-close").onclick = () => { compare = null; toast("Comparison closed — their answers aren't stored in your profile"); viewResults(); };
    window.scrollTo({ top: 0 });
  }

  /* One labelled group of items (shared concerns / strengths / divergences). */
  function cmpGroup(title, blurb, list, me, them, kind) {
    const box = el(`<div class="gaps cmp-group cmp-${esc(kind)}"><h2>${esc(title)} <span class="cmp-count">${list.length}</span></h2></div>`);
    box.appendChild(el(`<p class="legend">${blurb}</p>`));
    list.forEach((r) => {
      box.appendChild(el(`<div class="gap-item">
        <div class="gap-q">${esc(r.it.text)}</div>
        <div class="gap-rows">
          <div><span class="dual-who">${esc(me)}:</span> ${esc(answerLabel(r.it, r.av))}</div>
          <div><span class="dual-who">${esc(them)}:</span> ${esc(answerLabel(r.it, r.bv))}</div>
        </div>
      </div>`));
    });
    return box;
  }

  /* Where you predicted your partner and they answered differently themselves.
   * The half that matters is where you expected better than they reported. */
  function renderBlindSpots(me, them, theirs) {
    const box = el(`<div class="gaps cmp-blind"><h2>How well you read ${esc(them)}</h2></div>`);
    const preds = current.partnerAnswers || {};
    const pairs = [];
    allItems.forEach((it) => {
      const pv = preds[it.id], bv = theirs[it.id];
      const ps = itemStrength(it, pv), bs = itemStrength(it, bv);
      if (ps === null || bs === null) return;
      pairs.push({ it, pv, bv, ps, bs, diff: ps - bs });
    });

    if (!pairs.length) {
      box.appendChild(el(`<p class="legend">You haven't filled in the <em>“How would ${esc(them)} answer?”</em> pass yet — or it doesn't overlap with what they've answered. Do that pass and this section will show you where your reading of them was off. It's often the most useful part of the whole check-up.</p>`));
      return box;
    }

    const withinOne = pairs.filter((p) => Math.abs(p.diff) <= 25).length;
    const acc = Math.round((withinOne / pairs.length) * 100);
    box.appendChild(el(`<div class="sec-result"><div class="top"><strong>You read ${esc(them)} within one step on ${withinOne} of ${pairs.length}</strong><span class="pct">${acc}%</span></div><div class="bar"><i style="width:${acc}%;background:${barColor(acc)}"></i></div></div>`));

    const harsher = pairs.filter((p) => p.diff >= 50).sort((x, y) => y.diff - x.diff);
    const softer = pairs.filter((p) => p.diff <= -50).sort((x, y) => x.diff - y.diff);

    box.appendChild(el(`<p class="legend">This compares what you <em>predicted</em> ${esc(them)} would say against what they <em>actually</em> said. A low score isn't a failing — it's a map of where to ask instead of assume.</p>`));

    if (harsher.length) {
      box.appendChild(el(`<h3 class="cmp-sub">Harder for ${esc(them)} than you thought</h3>`));
      box.appendChild(el(`<p class="legend">You expected a better answer than they gave. These are the ones to ask about first.</p>`));
      harsher.slice(0, 6).forEach((p) => box.appendChild(el(`<div class="gap-item">
        <div class="gap-q">${esc(p.it.text)}</div>
        <div class="gap-rows">
          <div><span class="dual-who">You predicted:</span> ${esc(answerLabel(p.it, p.pv))}</div>
          <div><span class="dual-who">${esc(them)} said:</span> ${esc(answerLabel(p.it, p.bv))}</div>
        </div>
      </div>`)));
    }
    if (softer.length) {
      box.appendChild(el(`<h3 class="cmp-sub">Better for ${esc(them)} than you thought</h3>`));
      box.appendChild(el(`<p class="legend">You braced for worse than they reported. Worth noticing — you may be carrying weight they aren't.</p>`));
      softer.slice(0, 6).forEach((p) => box.appendChild(el(`<div class="gap-item">
        <div class="gap-q">${esc(p.it.text)}</div>
        <div class="gap-rows">
          <div><span class="dual-who">You predicted:</span> ${esc(answerLabel(p.it, p.pv))}</div>
          <div><span class="dual-who">${esc(them)} said:</span> ${esc(answerLabel(p.it, p.bv))}</div>
        </div>
      </div>`)));
    }
    if (!harsher.length && !softer.length) {
      box.appendChild(el(`<p class="legend">No large misses — your predictions tracked ${esc(them)}'s own answers closely across the overlap.</p>`));
    }
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
    compare = null;
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
