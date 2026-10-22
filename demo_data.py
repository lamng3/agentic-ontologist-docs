#!/usr/bin/env python3
"""Export the recorded run behind the showcase for the manual's live demo.

    ../agentic-ontologist/.venv/bin/python demo_data.py [../agentic-ontologist/results/agentic_workflow/2026-10-18.json]

Reuses the showcase's own page data (agentic-ontologist/showcase/build.py), so the numbers match the showcase.
Keeps the policy table per task, and a fixed-seed sample of the routed run's decisions, evenly from each tier.
"""

import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent / "agentic-ontologist"
RESULT = Path(sys.argv[1]) if len(sys.argv) > 1 else PROJECT / "results/agentic_workflow/2026-10-18.json"
sys.path.insert(0, str(PROJECT / "showcase"))

import build  # noqa: E402


def main():
    run = json.loads(RESULT.read_text())
    page = build.page_data(run)
    tasks = [
        {
            "title": t["title"],
            "metric": t["metric"],
            "note": t["note"],
            "rows": [{"config": r["config"], "quality": r["quality"], "api_usd": r["api_usd"]} for r in t["rows"]],
        }
        for t in page["tasks"]
    ]
    rng = random.Random(0)
    sample = []
    for tier in ("evidence", "local", "api"):
        pool = [d for d in page["decisions"] if d["agent"] == "kroma" and d["tier"] == tier]
        sample += rng.sample(pool, min(8, len(pool)))
    rng.shuffle(sample)
    counts = {}
    for d in (d for d in page["decisions"] if d["agent"] == "kroma"):
        counts[d["tier"]] = counts.get(d["tier"], 0) + 1
    out = {
        "source": f"results/agentic_workflow/{RESULT.name}",
        "track": run["track"],
        "local": run["local"],
        "api": run["api"],
        "tasks": tasks,
        "sample": sample,
        "tiers": counts,
    }
    (ROOT / "demo-data.json").write_text(json.dumps(out))
    print(f"{len(tasks)} tasks, {len(sample)} sampled decisions, tiers {counts}")


if __name__ == "__main__":
    main()
