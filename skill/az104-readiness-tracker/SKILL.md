---
name: az104-readiness-tracker
description: Update Nkosiphendule's AZ-104 exam readiness from new Udemy progress, practice-test results or lab progress - rescore, add flashcards, sync Google Calendar study sessions, refresh the plan doc, status artifact, quiz site and GitHub repo.
---

# AZ-104 readiness tracker

Use this whenever the user sends new AZ-104 data (Udemy section screenshots, a practice-test result or PDF, labs finished, study hours, a moved exam date) or asks for a readiness update, new flashcards, or calendar changes for AZ-104 study.

## Where everything lives

| Thing | Location |
| --- | --- |
| GitHub repo (source of truth for data, quiz, status) | `NkosiphenduleJwara/az104-readiness` |
| Progress data | `data/progress.json` (course sections, tests, labs, checkpoints, history) |
| Booked sessions | `data/schedule.json` (each session has its `calendar_event_id`) |
| Flashcards | `quiz/cards.js` (`window.CARDS` array) |
| Quiz progress | quiz artifact database (`attempts`, `cardstats`), or `data/quiz-results.json` from `scripts/serve.py` |
| Build script | `scripts/build.py` → `READINESS.md`, `status/index.html`, `docs/study-plan.md` |
| Full plan doc (Claude Docs) | https://claude.ai/artifact/GjXyMkqwDmCKHD4ENkibSE (doc id `7f6967bc-8412-4102-8300-12efef406977`) |
| Quiz artifact | https://claude.ai/artifact/YRV2QJwQqFotAFwHNfunDM (slug `fe766b60-f6f0-4de7-8554-2316ef2b27c0`) |
| Status artifact | https://claude.ai/artifact/QLx45Rs8NrKGregUaNyx21 (slug `bd0b3f9a-84aa-4fb1-8bc0-81794116a4e6`) |
| Project note | `claude/readiness-baseline.md` in the "AZ-104 Exam Prep" project |
| Calendar | primary Google Calendar, time zone Africa/Johannesburg |

## Steps

1. **Get the repo.** If it is not in the working directory, attach it with `add_repo` (owner `NkosiphenduleJwara`, repo `az104-readiness`, access `push`) and clone it.
2. **Read quiz progress.** Pull the user's own practice from the quiz: `db_query` on the quiz artifact slug, collections `attempts` (ordered by `ts`) and `cardstats`, and `data/quiz-results.json` in the repo if it was committed. Use the cards with the most `wrong` as the week's weak topics. Quiz scores are self-practice on known cards: report them, but never count them as a fresh practice test.
3. **Read the new data.** Zoom into screenshots if text is small; read PDFs with `pdftotext -layout`. Say plainly if a number had to be guessed.
4. **Update `data/progress.json`.**
   - Course: update each `[number, name, done, total]` in `course.sections`.
   - Tests: append `{date, name, kind, correct, total, by_domain}`. `kind` is `fresh` for new questions and `retake` for a repeat. Only fresh tests drive the practice score. Udemy exports have no domain tags: map each question to one of the five domains by topic and keep the mapping consistent (identity/governance, storage, compute incl. ARM/Bicep/App Service/containers, networking incl. DNS/LB/VPN, monitor & maintain incl. backup/ASR/Network Watcher).
   - Labs: set the 4th field to `true` when done.
   - Checkpoints: set `passed` and `result` when one is taken.
   - History: append one row `{date, course_pct, practice_pct, labs, readiness, note}` after step 6.
5. **Add flashcards for every new miss** to `quiz/cards.js`. Fields: `id` (`<test>-Q<n>`), `domain`, `source`, `question` (paraphrased, never copied), `answer`, `options` (4, or 2 for yes/no; `answer` must appear exactly once), `explanation` (why), and `hard: true` + `hint` when the miss came from misreading a rule or the scenario needs two steps. Update `window.DECK_UPDATED`. Validate:
   `node -e "global.window={};require('./quiz/cards.js');const C=window.CARDS;C.forEach(c=>{if(c.options.filter(o=>o===c.answer).length!==1)throw c.id});console.log(C.length)"`
6. **Rescore.** `python3 scripts/build.py --today <YYYY-MM-DD>`. Scoring (keep it stable so trends mean something):
   - Practice = latest fresh test %. Labs = done share per domain, weighted by exam-weight midpoints. Blueprint = course items done in each domain's mapped sections, weighted the same way. Course = items done / 191.
   - Overall = 0.40 practice + 0.25 labs + 0.20 blueprint + 0.15 course, each rounded first.
   - Domain light: 🔴 if practice < 60% or no labs in that domain; 🟢 if practice ≥ 80% and all its labs done; else 🟡.
   - GO only if the 10 Jan checkpoint rule is met (Microsoft practice assessment + a fresh full test, both ≥ 80%, no domain < 65%). Otherwise NO-GO, and propose 1–15 Feb.
7. **Update the plan doc** with the Claude Docs tools: read with `sinceRev` first, then change only what moved - dashboard component scores and domain table, Phase 2 section table, Phase 3 test table and flashcard table, Phase 7 checkpoints, and a new Progress log row. Keep the user's own edits.
8. **Sync Google Calendar** from `data/schedule.json`.
   - Changed session → `update_event` on its `calendar_event_id`. New session → check for clashes with `list_events`, then `create_event` (popup reminder 30 min, description ends with the plan doc link) and save the new id in `schedule.json`.
   - Done or skipped sessions: set `status` in `schedule.json`; leave the calendar event alone.
   - Never delete events, and never touch the user's own "Learning reminder AZ-104" series, unless the user asks.
   - If a week was missed, move its lab to the next free Saturday rather than stacking two labs in one slot.
9. **Republish artifacts.** Quiz: `publish_files` to the quiz slug with `cards.js` only (patch mode); the page keeps its `db` + `user` declaration, so saved progress survives. Status: `publish_files` to the status slug with `status/index.html` as `index.html`. Get `base_version` from `get_artifact` first.
10. **Commit and push.** One commit, message `Readiness update <date>: <score>/100` plus the session's attribution lines. Never commit the Udemy PDF or raw question exports (copyright); flashcards stay paraphrased.
11. **Update the project note** `claude/readiness-baseline.md`: add a dated section on top with score, what changed and next checkpoint.
12. **Reply** in a few lines: new score and change since last time, the weakest domain and the next action, what was added (cards, sessions), and the status link. Use the user's current tone setting (for example caveman mode if it is on).
