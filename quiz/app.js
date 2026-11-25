(function () {
  "use strict";
  const ALL = (window.CARDS || []).slice();
  const BY_ID = Object.fromEntries(ALL.map((c) => [c.id, c]));
  const Store = window.Store;
  const $ = (id) => document.getElementById(id);

  let deck = [];
  let i = 0;
  let mode = "cards";

  // ---------- helpers ----------
  const domains = ["All domains", ...Array.from(new Set(ALL.map((c) => c.domain)))];
  domains.forEach((d) => { const o = document.createElement("option"); o.textContent = d; $("domain").appendChild(o); });
  $("count").textContent = ALL.length;
  $("updated").textContent = window.DECK_UPDATED || "";

  const isKnown = (id) => !!Store.card(id).known;
  function knownCount() { return ALL.filter((c) => isKnown(c.id)).length; }
  function filterLabel() {
    const parts = [$("domain").value];
    if ($("hardOnly").checked) parts.push("hard only");
    if ($("hideKnown").checked) parts.push("hide known");
    return parts.join(", ");
  }
  function filtered() {
    const d = $("domain").value;
    return ALL.filter((c) =>
      (d === "All domains" || c.domain === d) &&
      (!$("hardOnly").checked || c.hard) &&
      (!$("hideKnown").checked || !isKnown(c.id)));
  }
  function shuffle(a) {
    for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; }
    return a;
  }
  function tag(el, c) {
    el.textContent = c.domain + (c.hard ? " · hard" : "");
    el.classList.toggle("hard", !!c.hard);
  }
  function showSaved() {
    const el = $("savedTo");
    el.textContent = Store.lastError || ("Progress saved to: " + Store.backend.label);
    el.classList.toggle("warn", !!Store.lastError || Store.backend.name === "browser");
  }
  function newId() {
    return "a-" + new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14) + "-" + Math.random().toString(36).slice(2, 7);
  }

  // ---------- flashcards ----------
  function renderCard() {
    const fc = $("flashcard");
    fc.classList.remove("flipped");
    if (!deck.length) {
      $("fQuestion").textContent = "No cards match these filters.";
      $("bAnswer").textContent = ""; $("bWhy").textContent = "";
      $("cardPos").textContent = ""; $("cardBar").style.width = "0";
      return;
    }
    const c = deck[i];
    tag($("fTag"), c); tag($("bTag"), c);
    $("fQuestion").textContent = c.question;
    $("bAnswer").textContent = c.answer;
    $("bWhy").textContent = c.explanation;
    $("cardPos").textContent = `Card ${i + 1} of ${deck.length} · ${knownCount()} of ${ALL.length} marked known`;
    $("cardBar").style.width = ((i + 1) / deck.length * 100) + "%";
  }
  function move(step) { if (deck.length) { i = (i + step + deck.length) % deck.length; renderCard(); } }
  function mark(known) {
    if (!deck.length) return;
    const c = deck[i];
    const cur = Store.card(c.id);
    Store.updateCard(c.id, { known, seen: cur.seen + 1 }).then(showSaved);
    move(1);
  }
  $("flashcard").addEventListener("click", () => $("flashcard").classList.toggle("flipped"));
  $("prev").addEventListener("click", () => move(-1));
  $("next").addEventListener("click", () => move(1));
  $("known").addEventListener("click", () => mark(true));
  $("again").addEventListener("click", () => mark(false));

  // ---------- quiz ----------
  let q = 0, score = 0, misses = [], answered = false;
  function startQuiz() {
    q = 0; score = 0; misses = [];
    $("result").hidden = true;
    document.querySelector(".qcard").hidden = false;
    $("qNext").hidden = false;
    renderQ();
  }
  function renderQ() {
    answered = false;
    $("qNext").disabled = true;
    $("feedback").hidden = true;
    $("hint").hidden = true;
    if (!deck.length) { $("qText").textContent = "No cards match these filters."; $("options").innerHTML = ""; $("hintBtn").hidden = true; return; }
    const c = deck[q];
    tag($("qTag"), c);
    $("qText").textContent = c.question;
    $("quizPos").textContent = `Question ${q + 1} of ${deck.length} · score ${score}`;
    $("quizBar").style.width = (q / deck.length * 100) + "%";
    $("hintBtn").hidden = !c.hint;
    $("hint").textContent = c.hint ? "Hint: " + c.hint : "";
    const box = $("options");
    box.innerHTML = "";
    shuffle(c.options.slice()).forEach((opt) => {
      const b = document.createElement("button");
      b.className = "opt"; b.textContent = opt;
      b.addEventListener("click", () => choose(b, opt, c));
      box.appendChild(b);
    });
  }
  function choose(btn, opt, c) {
    if (answered) return;
    answered = true;
    const ok = opt === c.answer;
    if (ok) score++; else misses.push(c);
    const cur = Store.card(c.id);
    Store.updateCard(c.id, {
      seen: cur.seen + 1,
      right: cur.right + (ok ? 1 : 0),
      wrong: cur.wrong + (ok ? 0 : 1),
      lastResult: ok ? "right" : "wrong",
      hintUsed: !$("hint").hidden
    }).then(showSaved);
    document.querySelectorAll(".opt").forEach((b) => {
      b.disabled = true;
      if (b.textContent === c.answer) b.classList.add("right");
    });
    if (!ok) btn.classList.add("wrong");
    const fb = $("feedback");
    fb.hidden = false;
    fb.className = "feedback " + (ok ? "ok" : "no");
    fb.textContent = (ok ? "Correct. " : "Not quite. Answer: " + c.answer + ". ") + c.explanation;
    $("qNext").disabled = false;
    $("quizPos").textContent = `Question ${q + 1} of ${deck.length} · score ${score}`;
  }
  function nextQ() {
    q++;
    if (q < deck.length) { renderQ(); return; }
    $("quizBar").style.width = "100%";
    document.querySelector(".qcard").hidden = true;
    $("qNext").hidden = true;
    const pct = Math.round(score / deck.length * 100);
    $("scoreLine").textContent = `${score} / ${deck.length} (${pct}%)`;
    const per = {};
    deck.forEach((c) => { per[c.domain] = per[c.domain] || [0, 0]; per[c.domain][1]++; if (!misses.includes(c)) per[c.domain][0]++; });
    $("byDomain").innerHTML = "";
    Object.keys(per).forEach((d) => {
      const r = document.createElement("div"); r.className = "dom";
      const a = document.createElement("span"); a.textContent = d;
      const b = document.createElement("strong"); b.textContent = `${per[d][0]}/${per[d][1]}`;
      r.append(a, b); $("byDomain").appendChild(r);
    });
    const ul = $("missList"); ul.innerHTML = "";
    if (!misses.length) { const li = document.createElement("li"); li.textContent = "No misses. Nice."; ul.appendChild(li); }
    misses.forEach((c) => { const li = document.createElement("li"); li.textContent = `${c.question} → ${c.answer}`; ul.appendChild(li); });
    $("result").hidden = false;
    Store.addAttempt({
      id: newId(), ts: new Date().toISOString(), mode: "quiz", filter: filterLabel(),
      correct: score, total: deck.length, pct, byDomain: per,
      misses: misses.map((c) => c.id), deck: window.DECK_UPDATED || ""
    }).then(showSaved);
  }
  $("hintBtn").addEventListener("click", () => { $("hint").hidden = false; });
  $("qNext").addEventListener("click", nextQ);
  $("restart").addEventListener("click", () => { deck = shuffle(filtered()); startQuiz(); });

  // ---------- progress ----------
  function stat(label, value) {
    const d = document.createElement("div"); d.className = "stat";
    const b = document.createElement("b"); b.textContent = value;
    const s = document.createElement("span"); s.textContent = label;
    d.append(b, s); return d;
  }
  function renderProgress() {
    const st = Store.state;
    const atts = st.attempts.slice().sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
    const best = atts.reduce((m, a) => Math.max(m, a.pct || 0), 0);
    const stats = $("stats"); stats.innerHTML = "";
    stats.append(
      stat("quiz attempts", String(atts.length)),
      stat("last score", atts.length ? atts[0].pct + "%" : "–"),
      stat("best score", atts.length ? best + "%" : "–"),
      stat("cards known", `${knownCount()} / ${ALL.length}`)
    );

    const rows = $("attemptRows"); rows.innerHTML = "";
    if (!atts.length) {
      const tr = document.createElement("tr"); const td = document.createElement("td");
      td.colSpan = 4; td.textContent = "No quiz attempts yet. Finish a quiz and it shows up here."; tr.appendChild(td); rows.appendChild(tr);
    }
    atts.slice(0, 50).forEach((a) => {
      const tr = document.createElement("tr");
      let weakest = "–", low = 2;
      Object.entries(a.byDomain || {}).forEach(([d, v]) => { const r = v[1] ? v[0] / v[1] : 1; if (r < low) { low = r; weakest = d; } });
      [new Date(a.ts).toLocaleString(), a.filter || "", `${a.correct}/${a.total} (${a.pct}%)`, weakest].forEach((t, k) => {
        const td = document.createElement("td"); td.textContent = t; if (k === 2) td.className = "num"; tr.appendChild(td);
      });
      rows.appendChild(tr);
    });

    // accuracy by domain from card stats
    const agg = {};
    ALL.forEach((c) => {
      const s = Store.card(c.id);
      agg[c.domain] = agg[c.domain] || [0, 0];
      agg[c.domain][0] += s.right || 0; agg[c.domain][1] += (s.right || 0) + (s.wrong || 0);
    });
    const bars = $("domainBars"); bars.innerHTML = "";
    Object.entries(agg).forEach(([d, v]) => {
      const pct = v[1] ? Math.round(v[0] / v[1] * 100) : null;
      const row = document.createElement("div"); row.className = "bar";
      const name = document.createElement("span"); name.textContent = d;
      const track = document.createElement("div"); track.className = "track";
      const fill = document.createElement("div"); fill.className = "fill" + (pct === null ? "" : pct < 60 ? " low" : pct >= 80 ? " high" : "");
      fill.style.width = (pct || 0) + "%"; track.appendChild(fill);
      const val = document.createElement("span"); val.className = "v"; val.textContent = pct === null ? "no data" : `${pct}% (${v[1]})`;
      row.append(name, track, val); bars.appendChild(row);
    });

    const worst = ALL.map((c) => ({ c, s: Store.card(c.id) })).filter((x) => (x.s.wrong || 0) > 0)
      .sort((a, b) => (b.s.wrong - b.s.right) - (a.s.wrong - a.s.right) || b.s.wrong - a.s.wrong).slice(0, 8);
    const ol = $("worstCards"); ol.innerHTML = "";
    if (!worst.length) { const li = document.createElement("li"); li.textContent = "No misses recorded yet."; ol.appendChild(li); }
    worst.forEach(({ c, s }) => {
      const li = document.createElement("li");
      li.textContent = `${c.question} → ${c.answer} (wrong ${s.wrong}, right ${s.right})`;
      ol.appendChild(li);
    });
  }

  function download(name, text) {
    try {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      a.download = name; document.body.appendChild(a); a.click(); a.remove();
      $("ioMsg").textContent = "Export started: " + name + ". If nothing downloads here, use Copy JSON.";
    } catch (e) { $("ioMsg").textContent = "Download is blocked here. Use Copy JSON."; }
  }
  $("exportBtn").addEventListener("click", () => download("az104-quiz-progress-" + new Date().toISOString().slice(0, 10) + ".json", Store.exportJSON()));
  $("copyBtn").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(Store.exportJSON()); $("ioMsg").textContent = "Copied. Paste it into a .json file to keep it."; }
    catch (e) { $("ioMsg").textContent = "Copy was blocked by the browser."; }
  });
  $("importFile").addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const n = await Store.importJSON(await f.text());
      $("ioMsg").textContent = `Imported. ${n} attempts in the file; duplicates skipped.`;
      renderProgress(); showSaved();
    } catch (err) { $("ioMsg").textContent = "Import failed: " + err.message; }
    e.target.value = "";
  });

  // ---------- modes & filters ----------
  function rebuild(doShuffle) {
    deck = filtered(); if (doShuffle) shuffle(deck);
    i = 0;
    if (mode === "cards") renderCard();
    else if (mode === "quiz") startQuiz();
    else renderProgress();
  }
  document.querySelectorAll(".mode").forEach((b) => b.addEventListener("click", () => {
    mode = b.dataset.mode;
    document.querySelectorAll(".mode").forEach((x) => { x.classList.toggle("active", x === b); x.setAttribute("aria-selected", x === b); });
    $("cardsView").hidden = mode !== "cards";
    $("quizView").hidden = mode !== "quiz";
    $("progressView").hidden = mode !== "progress";
    $("filters").hidden = mode === "progress";
    rebuild(mode === "quiz");
  }));
  ["domain", "hardOnly", "hideKnown"].forEach((id) => $(id).addEventListener("change", () => rebuild(mode === "quiz")));
  $("shuffle").addEventListener("click", () => rebuild(true));

  document.addEventListener("keydown", (e) => {
    if (mode !== "cards" || ["SELECT", "INPUT"].includes(e.target.tagName)) return;
    if (e.key === " " && e.target.tagName === "BUTTON") return; // the focused button handles Space itself
    if (e.key === " ") { e.preventDefault(); $("flashcard").classList.toggle("flipped"); }
    else if (e.key === "ArrowRight") move(1);
    else if (e.key === "ArrowLeft") move(-1);
    else if (e.key.toLowerCase() === "k") mark(true);
    else if (e.key.toLowerCase() === "l") mark(false);
  });

  // Render straight away from this browser's copy, then switch to the real store.
  rebuild(false);
  Store.init().then(() => { showSaved(); if (mode !== "quiz") rebuild(false); })
    .catch(() => showSaved());
})();
