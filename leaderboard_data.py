#!/usr/bin/env python3
"""Export the routing policies of the recorded run as arena boards.

    ../agentic-ontologist/.venv/bin/python leaderboard_data.py [../agentic-ontologist/results/agentic_workflow/2026-10-18.json]

Reuses the showcase's own task tables (agentic-ontologist/showcase/build.py), one board per agent: each routing policy
ranked by quality, with its spend and calls. Nothing is recomputed.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent / "agentic-ontologist"
RESULT = Path(sys.argv[1]) if len(sys.argv) > 1 else PROJECT / "results/agentic_workflow/2026-10-18.json"
sys.path.insert(0, str(PROJECT / "showcase"))

import build  # noqa: E402


def number(text):
    m = re.search(r"-?\d[\d,]*\.?\d*", text)
    return float(m.group(0).replace(",", "")) if m else None


def main():
    run = json.loads(RESULT.read_text())
    page = build.page_data(run)
    boards = []
    for task in page["tasks"]:
        columns = []
        for label in task["columns"][1:]:
            fmt = "usd" if "spend" in label.lower() else "f1" if "calls" in label.lower() else "int" if label == "Proposed" else "f3"
            columns.append({"key": label, "label": label, "fmt": fmt})
        rows = []
        for r in task["rows"]:
            values = {label: number(cell) for label, cell in zip(task["columns"][1:], r["cells"][1:])}
            if "—" in r["cells"][1:]:  # a policy that spent nothing shows a dash, not a missing number
                values = {k: (0 if "spend" in k.lower() and v is None else v) for k, v in values.items()}
            rows.append({"name": r["config"], "group": "routed" if r["config"].startswith("routed") else "policy",
                         "tag": "", "score": r["quality"], "values": values})
        boards.append({"id": task["title"], "name": re.sub(r" \(.*\)| and repair", "", task["title"]), "sub": task["note"],
                       "metric": task["metric"], "metricLabel": task["metric"][0].upper() + task["metric"][1:], "fmt": "f3",
                       "columns": columns, "rows": rows})
    out = {
        "note": f"One recorded run on {run['track']} ({run['local']} locally, {run['api']} as the API model); API spend is list price, and each policy is charged only for the questions it asked. From results/agentic_workflow/{RESULT.name}.",
        "groups": {"routed": {"label": "Routed", "ours": True}, "policy": {"label": "Other policy"}},
        "boards": boards,
    }
    (ROOT / "leaderboard-data.json").write_text(json.dumps(out))
    print(", ".join(f"{b['name']}: {len(b['rows'])}" for b in boards))


if __name__ == "__main__":
    main()
