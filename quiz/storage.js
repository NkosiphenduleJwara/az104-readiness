// Quiz progress storage with three backends, picked at load:
//   1. "sqlite"  – local server (python3 scripts/serve.py): SQLite file + data/quiz-results.json
//   2. "claude"  – the Claude artifact's database (owner-only)
//   3. "browser" – localStorage in this browser (use Export / Import to move it)
// Every backend keeps the same shape:
//   attempts: [{id, ts, mode, filter, correct, total, pct, byDomain:{domain:[ok,n]}, misses:[cardId], deck}]
//   cards:    {cardId: {known, seen, right, wrong, lastSeen, lastResult}}
(function () {
  "use strict";
  const LS_KEY = "az104-progress-v1";

  function emptyState() { return { attempts: [], cards: {} }; }

  function readLocal() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (s && Array.isArray(s.attempts) && s.cards) return s;
      // migrate the first version, which stored only known ids
      const old = JSON.parse(localStorage.getItem("az104-known") || "[]");
      const st = emptyState();
      old.forEach((id) => { st.cards[id] = { known: true, seen: 0, right: 0, wrong: 0, lastSeen: null, lastResult: null }; });
      return st;
    } catch (e) { return emptyState(); }
  }
  function writeLocal(st) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch (e) { /* storage blocked */ }
  }

  // Union of two states: attempts by id, cards by most recent lastSeen.
  function merge(a, b) {
    const out = emptyState();
    const seen = new Set();
    a.attempts.concat(b.attempts).forEach((x) => { if (x && x.id && !seen.has(x.id)) { seen.add(x.id); out.attempts.push(x); } });
    out.attempts.sort((x, y) => String(x.ts).localeCompare(String(y.ts)));
    const ids = new Set(Object.keys(a.cards).concat(Object.keys(b.cards)));
    ids.forEach((id) => {
      const x = a.cards[id], y = b.cards[id];
      if (!x) out.cards[id] = y; else if (!y) out.cards[id] = x;
      else out.cards[id] = String(x.lastSeen || "") >= String(y.lastSeen || "") ? x : y;
    });
    return out;
  }

  function withTimeout(p, ms) {
    return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
  }

  // ---------- backend: local SQLite server ----------
  const sqliteBackend = {
    name: "sqlite",
    label: "SQLite on this computer (data/quiz.db + data/quiz-results.json)",
    async probe() {
      if (!/^https?:$/.test(location.protocol)) return false;
      try {
        const r = await withTimeout(fetch("/api/health", { cache: "no-store" }), 1500);
        if (!r.ok) return false;
        const j = await r.json();
        return j && j.backend === "sqlite";
      } catch (e) { return false; }
    },
    async load() {
      const r = await fetch("/api/state", { cache: "no-store" });
      if (!r.ok) throw new Error("load failed");
      return r.json();
    },
    async saveAttempt(a) {
      const r = await fetch("/api/attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a) });
      if (!r.ok) throw new Error("save failed");
    },
    async saveCard(id, c) {
      const r = await fetch("/api/cards/" + encodeURIComponent(id), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
      if (!r.ok) throw new Error("save failed");
    }
  };

  // ---------- backend: Claude artifact database ----------
  let db = null;
  const claudeBackend = {
    name: "claude",
    label: "Your Claude account (artifact database, only you can see it)",
    async probe() {
      if (!window.claude || typeof window.claude.use !== "function") return false;
      try {
        db = await withTimeout(window.claude.use("db"), 11000);
        return !!db;
      } catch (e) { return false; }
    },
    async load() {
      const st = emptyState();
      const a = await db.collection("attempts").orderBy("ts", "asc").limit(1000).get();
      a.docs.forEach((d) => { const v = d.data(); if (v) st.attempts.push(Object.assign({ id: d.id }, v)); });
      const c = await db.collection("cardstats").limit(1000).get();
      c.docs.forEach((d) => { const v = d.data(); if (v) st.cards[d.id] = v; });
      return st;
    },
    async saveAttempt(a) { await db.collection("attempts").doc(a.id).set(a); },
    async saveCard(id, c) { await db.collection("cardstats").doc(id).set(c); }
  };

  // ---------- backend: this browser only ----------
  const browserBackend = {
    name: "browser",
    label: "This browser only – use Export to keep a copy",
    async probe() { return true; },
    async load() { return readLocal(); },
    async saveAttempt() { /* the local mirror below already holds it */ },
    async saveCard() { }
  };

  let backend = browserBackend;
  let state = readLocal();
  let lastError = "";

  // One write at a time per key, in order.
  const chains = {};
  function queue(key, fn) {
    const prev = chains[key] || Promise.resolve();
    const next = prev.then(fn, fn);
    chains[key] = next.catch(() => {});
    return next;
  }
  async function retryOnce(fn) {
    try { return await fn(); } catch (e) {
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
      return fn();
    }
  }

  const Store = {
    get backend() { return backend; },
    get state() { return state; },
    get lastError() { return lastError; },

    // Picks a backend, loads its data and merges anything only this browser had.
    async init() {
      for (const b of [sqliteBackend, claudeBackend]) {
        if (await b.probe()) {
          try {
            const remote = await b.load();
            const local = readLocal();
            state = merge(remote, local);
            backend = b;
            // push anything that was only in this browser
            const have = new Set(remote.attempts.map((x) => x.id));
            for (const a of local.attempts) if (!have.has(a.id)) await queue("a:" + a.id, () => retryOnce(() => b.saveAttempt(a)));
            for (const id of Object.keys(local.cards)) {
              if (state.cards[id] === local.cards[id] && remote.cards[id] !== local.cards[id]) {
                await queue("c:" + id, () => retryOnce(() => b.saveCard(id, local.cards[id])));
              }
            }
            writeLocal(state);
            return backend;
          } catch (e) { lastError = "Could not load saved progress (" + b.name + "); using this browser."; }
        }
      }
      backend = browserBackend;
      state = readLocal();
      return backend;
    },

    card(id) {
      return state.cards[id] || { known: false, seen: 0, right: 0, wrong: 0, lastSeen: null, lastResult: null };
    },

    async updateCard(id, patch) {
      const c = Object.assign({}, this.card(id), patch, { lastSeen: new Date().toISOString() });
      state.cards[id] = c;
      writeLocal(state);
      try { await queue("c:" + id, () => retryOnce(() => backend.saveCard(id, c))); lastError = ""; }
      catch (e) { lastError = "Saved in this browser; the " + backend.name + " save failed."; }
    },

    async addAttempt(a) {
      state.attempts.push(a);
      writeLocal(state);
      try { await queue("a:" + a.id, () => retryOnce(() => backend.saveAttempt(a))); lastError = ""; }
      catch (e) { lastError = "Saved in this browser; the " + backend.name + " save failed."; }
    },

    exportJSON() {
      return JSON.stringify({ app: "az104-quiz", version: 1, exportedAt: new Date().toISOString(), attempts: state.attempts, cards: state.cards }, null, 2);
    },

    async importJSON(text) {
      const j = JSON.parse(text);
      if (!j || !Array.isArray(j.attempts) || typeof j.cards !== "object") throw new Error("Not an AZ-104 quiz export");
      const incoming = { attempts: j.attempts, cards: j.cards };
      const before = state;
      state = merge(before, incoming);
      writeLocal(state);
      const have = new Set(before.attempts.map((x) => x.id));
      for (const a of incoming.attempts) if (a && a.id && !have.has(a.id)) await queue("a:" + a.id, () => retryOnce(() => backend.saveAttempt(a)));
      for (const id of Object.keys(incoming.cards)) {
        if (state.cards[id] === incoming.cards[id]) await queue("c:" + id, () => retryOnce(() => backend.saveCard(id, state.cards[id])));
      }
      return incoming.attempts.length;
    }
  };

  window.Store = Store;
})();
