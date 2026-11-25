(function () {
  "use strict";
  const ALL = (window.CARDS || []).slice();
  const $ = (id) => document.getElementById(id);

  // Light per-viewer memory of "known" cards. Storage may be blocked; fail quietly.
  const store = {
    get() { try { return JSON.parse(localStorage.getItem("az104-known") || "[]"); } catch (e) { return []; } },
    set(v) { try { localStorage.setItem("az104-known", JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };
  let known = new Set(store.get());

  let deck = [];
  let i = 0;

  // ---------- filters ----------
  const domains = ["All domains", ...Array.from(new Set(ALL.map((c) => c.domain)))];
  domains.forEach((d) => { const o = document.createElement("option"); o.textContent = d; $("domain").appendChild(o); });
  $("count").textContent = ALL.length;
  $("updated").textContent = window.DECK_UPDATED || "";

  function filtered() {
    const d = $("domain").value;
    return ALL.filter((c) =>
      (d === "All domains" || c.domain === d) &&
      (!$("hardOnly").checked || c.hard) &&
      (!$("hideKnown").checked || !known.has(c.id)));
  }
  function shuffle(a) {
    for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; }
    return a;
  }
  function tag(el, c) {
    el.textContent = c.domain + (c.hard ? " · hard" : "");
    el.classList.toggle("hard", !!c.hard);
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
    $("cardPos").textContent = `Card ${i + 1} of ${deck.length} · ${known.size} marked known`;
    $("cardBar").style.width = ((i + 1) / deck.length * 100) + "%";
  }
  function move(step) { if (deck.length) { i = (i + step + deck.length) % deck.length; renderCard(); } }
  function mark(isKnown) {
    if (!deck.length) return;
    const id = deck[i].id;
    if (isKnown) known.add(id); else known.delete(id);
    store.set(Array.from(known));
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
    if (!deck.length) { $("qText").textContent = "No cards match these filters."; $("options").innerHTML = ""; return; }
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
    deck.forEach((c) => { per[c.domain] = per[c.domain] || { n: 0, ok: 0 }; per[c.domain].n++; });
    deck.forEach((c) => { if (!misses.includes(c)) per[c.domain].ok++; });
    $("byDomain").innerHTML = "";
    Object.keys(per).forEach((d) => {
      const r = document.createElement("div"); r.className = "dom";
      r.innerHTML = `<span></span><strong></strong>`;
      r.firstChild.textContent = d;
      r.lastChild.textContent = `${per[d].ok}/${per[d].n}`;
      $("byDomain").appendChild(r);
    });
    const ul = $("missList"); ul.innerHTML = "";
    if (!misses.length) { const li = document.createElement("li"); li.textContent = "No misses. Nice."; ul.appendChild(li); }
    misses.forEach((c) => {
      const li = document.createElement("li");
      li.textContent = `${c.question} → ${c.answer}`;
      ul.appendChild(li);
    });
    $("result").hidden = false;
  }
  $("hintBtn").addEventListener("click", () => { $("hint").hidden = false; });
  $("qNext").addEventListener("click", nextQ);
  $("restart").addEventListener("click", () => { deck = shuffle(filtered()); startQuiz(); });

  // ---------- modes & filters ----------
  let mode = "cards";
  function rebuild(doShuffle) {
    deck = filtered(); if (doShuffle) shuffle(deck);
    i = 0;
    if (mode === "cards") renderCard(); else startQuiz();
  }
  document.querySelectorAll(".mode").forEach((b) => b.addEventListener("click", () => {
    mode = b.dataset.mode;
    document.querySelectorAll(".mode").forEach((x) => { x.classList.toggle("active", x === b); x.setAttribute("aria-selected", x === b); });
    $("cardsView").hidden = mode !== "cards";
    $("quizView").hidden = mode !== "quiz";
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

  rebuild(false);
})();
