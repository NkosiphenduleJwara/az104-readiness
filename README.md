# AZ-104 readiness tracker

Personal exam-prep system for the **Microsoft Certified: Azure Administrator Associate (AZ-104)** exam, sat in person at a Pearson VUE test centre on **18 January 2027**.

## The problem it solves

Many AZ-104 candidates fail not on theory but on hands-on scenarios. After passing AZ-900, I had watched most of an AZ-104 video course but scored 55% on my first practice test. Every weak domain (storage, compute, monitoring and backup) was one where I had done no labs.

This repo turns that into a measured plan:

- **One readiness score** (0–100) built from practice tests, labs, course coverage and blueprint coverage, re-calculated every time new results come in.
- **Lab first, video second.** Each weak domain starts with a Microsoft Learning GitHub lab done cold, then only the lectures for the parts that went wrong.
- **Flashcards from every miss**, practised in a small Quizlet-style site with a quiz mode and hints on the hard ones.
- **Booked study time.** 43 sessions in Google Calendar with checkpoints on 19 Dec, 20 Dec and 10 Jan that decide GO / NO-GO for the exam date.

## What's inside

| Path | What it is |
| --- | --- |
| [`READINESS.md`](READINESS.md) | Current status check: score, domain traffic lights, labs and course left, next sessions, checkpoints, trend |
| [`quiz/`](quiz/) | Static flashcard + quiz site (HTML, CSS, JS). Open `quiz/index.html` in a browser; no build step |
| [`quiz/cards.js`](quiz/cards.js) | The flashcard deck, one card per practice-test miss |
| [`docs/study-plan.md`](docs/study-plan.md) | Every booked study session, 25 Nov 2026 – 18 Jan 2027 |
| [`status/`](status/) | `READINESS.md` rendered as a small web page |
| [`data/progress.json`](data/progress.json) | Course sections, tests, labs, checkpoints, history (source of truth) |
| [`data/schedule.json`](data/schedule.json) | Study sessions with their Google Calendar event ids |
| [`scripts/build.py`](scripts/build.py) | Recalculates scores and rebuilds `READINESS.md`, `status/` and `docs/study-plan.md` |
| [`skill/az104-readiness-tracker/SKILL.md`](skill/az104-readiness-tracker/SKILL.md) | Claude skill that runs the whole update cycle |

## Current snapshot (25 Nov 2026)

Readiness **63/100**, NO-GO today, conditional GO for 18 Jan. See [`READINESS.md`](READINESS.md) for the live version.

| Domain | Exam weight | Practice Test 1 | Status |
| --- | --- | --- | --- |
| Identity & governance | 20–25% | 67% | 🟡 |
| Storage | 15–20% | 44% | 🔴 |
| Compute | 20–25% | 50% | 🔴 |
| Networking | 15–20% | 60% | 🟡 |
| Monitor & maintain | 10–15% | 40% | 🔴 |

## How scoring works

- **Practice** – latest test on fresh questions (retakes don't count).
- **Labs** – share of the 14 Microsoft labs done per domain, weighted by exam weight.
- **Blueprint coverage** – course items finished in each domain's sections, weighted by exam weight.
- **Course** – Udemy items finished out of 191.
- **Overall** = 40% practice + 25% labs + 20% blueprint + 15% course.
- Domain light: 🔴 under 60% on practice or no labs; 🟢 80%+ and all labs done; 🟡 otherwise.

## Updating

```bash
# edit data/progress.json and/or data/schedule.json, add cards to quiz/cards.js, then:
python3 scripts/build.py
```

Or hand new screenshots and results to Claude with the `az104-readiness-tracker` skill, which also updates the plan doc, calendar, artifacts and this repo.

## Study resources

- [Official AZ-104 study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104)
- [Microsoft Learning AZ-104 labs](https://github.com/MicrosoftLearning/AZ-104-MicrosoftAzureAdministrator/tree/master/Instructions/Labs)
- Scott Duffy, *AZ-104 Microsoft Azure Administrator – Complete Exam Prep* (Udemy)
- Microsoft's free AZ-104 practice assessment (AI Skills Navigator)

## Notes

- Flashcards are paraphrased from my own misses. No practice-test questions or exports are stored here.
- The full written plan lives in a private Claude doc; this repo carries its data, schedule and status.
