#!/usr/bin/env python3
"""Rebuild the AZ-104 readiness outputs from data/*.json.

Outputs:
  READINESS.md        – the status check (what the skill and the artifact show)
  status/index.html   – READINESS.md rendered as a small static page
  docs/study-plan.md  – every booked session, from data/schedule.json

Usage: python3 scripts/build.py [--today YYYY-MM-DD]
"""
import argparse
import datetime as dt
import html
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
LIGHT = {"red": "🔴 Critical", "yellow": "🟡 Moderate", "green": "🟢 Excellent"}


def load(name):
    return json.loads((ROOT / "data" / name).read_text(encoding="utf-8"))


def mid(d):
    return (d["weight_low"] + d["weight_high"]) / 2


def scores(p):
    doms = p["domains"]
    wsum = sum(mid(d) for d in doms)

    # Practice: latest test taken on fresh questions (retakes don't count).
    fresh = [t for t in p["tests"] if t.get("kind") == "fresh"]
    latest = fresh[-1]
    practice = round(latest["correct"] / latest["total"] * 100)

    # Labs: share of labs done per domain, weighted by exam weight.
    lab_frac = {}
    for d in doms:
        mine = [l for l in p["labs"] if l[2] == d["name"]]
        lab_frac[d["name"]] = sum(1 for l in mine if l[3]) / len(mine) if mine else 0
    labs = round(sum(lab_frac[d["name"]] * mid(d) for d in doms) / wsum * 100)

    # Blueprint coverage: course items done in the sections mapped to each domain.
    secs = {str(s[0]): s for s in p["course"]["sections"]}
    cov = {}
    for d in doms:
        ids = [k for k, v in p["course"]["section_domain"].items() if v == d["name"]]
        done = sum(secs[k][2] for k in ids)
        total = sum(secs[k][3] for k in ids)
        cov[d["name"]] = done / total if total else 0
    blueprint = round(sum(cov[d["name"]] * mid(d) for d in doms) / wsum * 100)

    done_items = sum(s[2] for s in p["course"]["sections"])
    course = round(done_items / p["course"]["total_items"] * 100)

    w = p["score_weights"]
    overall = round(w["practice"] * practice + w["labs"] * labs + w["blueprint"] * blueprint + w["course"] * course)

    per_domain = []
    for d in doms:
        c, n = latest["by_domain"].get(d["name"], [0, 0])
        pct = round(c / n * 100) if n else 0
        lf = lab_frac[d["name"]]
        if pct < 60 or lf == 0:
            light = "red"
        elif pct >= 80 and lf == 1:
            light = "green"
        else:
            light = "yellow"
        per_domain.append(dict(name=d["name"], weight=f'{d["weight_low"]}–{d["weight_high"]}%',
                               practice=pct, practice_raw=f"{c}/{n}", labs=lf, course=cov[d["name"]], light=light))
    return dict(practice=practice, labs=labs, blueprint=blueprint, course=course, overall=overall,
                done_items=done_items, latest=latest, per_domain=per_domain)


def readiness_md(p, s, sched, today):
    lines = []
    ex = p["exam"]
    days = (dt.date.fromisoformat(ex["date"]) - today).days
    verdict = "GO" if s["overall"] >= 80 and s["practice"] >= 80 else "NO-GO (conditional GO if checkpoints pass)"
    lines += [
        "# AZ-104 readiness check",
        "",
        f"As of {today.isoformat()} · exam {ex['date']} ({days} days) · {ex['centre']}",
        "",
        f"**Readiness {s['overall']}/100 · {verdict}**",
        "",
        "| Component | Score | Weight |",
        "| --- | --- | --- |",
        f"| Practice exam (latest fresh test: {s['latest']['name']}, {s['latest']['correct']}/{s['latest']['total']}) | {s['practice']} | {int(p['score_weights']['practice']*100)}% |",
        f"| Lab experience ({sum(1 for l in p['labs'] if l[3])}/{len(p['labs'])} labs) | {s['labs']} | {int(p['score_weights']['labs']*100)}% |",
        f"| Blueprint coverage | {s['blueprint']} | {int(p['score_weights']['blueprint']*100)}% |",
        f"| Udemy progress ({s['done_items']}/{p['course']['total_items']} items) | {s['course']} | {int(p['score_weights']['course']*100)}% |",
        "",
        "## Domains",
        "",
        "| Domain | Exam weight | Practice | Labs done | Course | Readiness |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for d in s["per_domain"]:
        lines.append(f"| {d['name']} | {d['weight']} | {d['practice']}% ({d['practice_raw']}) | {round(d['labs']*100)}% | {round(d['course']*100)}% | {LIGHT[d['light']]} |")

    todo = [l for l in p["labs"] if not l[3]]
    lines += ["", "## Labs still to do", ""]
    lines += [f"- [ ] {l[0]} – {l[1]} ({l[2]})" for l in todo] or ["- All labs done"]

    left = [s_ for s_ in p["course"]["sections"] if s_[2] < s_[3]]
    lines += ["", "## Course sections not finished", ""]
    lines += [f"- Section {x[0]} {x[1]}: {x[2]}/{x[3]}" for x in left] or ["- Course complete"]

    upcoming = [x for x in sched["sessions"] if x["date"] >= today.isoformat()][:7]
    lines += ["", "## Next sessions (Google Calendar, SAST)", "", "| Date | Time | Session |", "| --- | --- | --- |"]
    for x in upcoming:
        t = "all day" if x["start"] == "all-day" else f"{x['start']}–{x['end']}"
        lines.append(f"| {x['date']} | {t} | {x['title']} |")

    lines += ["", "## Checkpoints", ""]
    for c in p["checkpoints"]:
        box = "x" if c.get("passed") else " "
        lines.append(f"- [{box}] {c['date']} · {c['name']}: {c['rule']}" + (f" → {c['result']}" if c.get("result") else ""))

    lines += ["", "## Trend", "", "| Date | Course | Practice | Labs | Readiness | Note |", "| --- | --- | --- | --- | --- | --- |"]
    for h in p["history"]:
        lines.append(f"| {h['date']} | {h['course_pct']}% | {h['practice_pct']}% | {h['labs']} | {h['readiness']} | {h['note']} |")

    lines += ["", "## Links", "",
              f"- Full plan (Claude doc, private to the owner): {p['links']['plan_doc']}",
              f"- Flashcards and quiz: [quiz/](quiz/index.html) · Claude artifact: {p['links'].get('quiz_artifact', '')}",
              f"- Official study guide: {p['links']['study_guide']}",
              f"- Microsoft labs: {p['links']['labs']}", ""]
    return "\n".join(lines)


def plan_md(sched):
    out = ["# Study plan – booked sessions", "",
           f"Time zone {sched['timezone']}. Slots: weekdays {sched['slots']['weekday']}, "
           f"Saturday {sched['slots']['saturday']}, Sunday {sched['slots']['sunday']}. "
           f"Popup reminder {sched['reminder_minutes']} min before.", "",
           "| Date | Day | Time | Session | Kind | Status |", "| --- | --- | --- | --- | --- | --- |"]
    for x in sched["sessions"]:
        d = dt.date.fromisoformat(x["date"])
        t = "all day" if x["start"] == "all-day" else f"{x['start']}–{x['end']}"
        out.append(f"| {x['date']} | {d.strftime('%a')} | {t} | {x['title']} | {x['kind']} | {x['status']} |")
    return "\n".join(out) + "\n"


def to_html(md_text):
    try:
        import markdown
        body = markdown.markdown(md_text, extensions=["tables"])
    except ImportError:  # plain fallback
        body = "<pre>" + html.escape(md_text) + "</pre>"
    body = body.replace('href="quiz/index.html"', 'href="../quiz/index.html"')
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>AZ-104 readiness check</title>
<style>
body{{font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;max-width:860px;margin:0 auto;padding:24px 16px;color:#1d2433;background:#f6f7fb}}
h1{{font-size:1.5rem}} h2{{font-size:1.15rem;margin-top:28px}}
table{{border-collapse:collapse;width:100%;background:#fff;font-size:.92rem}}
th,td{{border:1px solid #dfe3ec;padding:6px 10px;text-align:left;vertical-align:top}} th{{background:#eef1f7}}
a{{color:#2f6fde}} code{{background:#eef1f7;padding:1px 4px;border-radius:4px}}
@media (prefers-color-scheme:dark){{body{{background:#12151c;color:#e8ebf2}}table{{background:#1b2029}}th{{background:#232a36}}th,td{{border-color:#2c3340}}a{{color:#6b9dff}}}}
</style></head><body>
{body}
</body></html>
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--today", default=dt.date.today().isoformat())
    a = ap.parse_args()
    today = dt.date.fromisoformat(a.today)
    p, sched = load("progress.json"), load("schedule.json")
    s = scores(p)
    md = readiness_md(p, s, sched, today)
    (ROOT / "READINESS.md").write_text(md, encoding="utf-8")
    (ROOT / "status").mkdir(exist_ok=True)
    (ROOT / "status" / "index.html").write_text(to_html(md), encoding="utf-8")
    (ROOT / "docs").mkdir(exist_ok=True)
    (ROOT / "docs" / "study-plan.md").write_text(plan_md(sched), encoding="utf-8")
    print(json.dumps({k: s[k] for k in ("overall", "practice", "labs", "blueprint", "course")}))


if __name__ == "__main__":
    main()
