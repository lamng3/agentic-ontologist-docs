#!/usr/bin/env python3
"""Export what the Agentic Ontologist playground needs from the real code.

    ../agentic-ontologist/.venv/bin/python playground_data.py

The two ontologies of the Mouse-Human track as the workflow reads them (labels, synonyms, parents, part-of), the matching
agent's default parameters, the recorded decisions of the routed run, and a fixture: for a fixed sample of source classes,
the questions kroma.KromaAgent asks (candidate, TF-IDF similarity, evidence). The page's JavaScript recomputes these and its
tests compare them to the fixture.
"""

import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent / "agentic-ontologist"
sys.path.insert(0, str(PROJECT / "showcase"))

import build  # noqa: E402

from agentic_ontologist.workflow import KromaAgent, load_owl  # noqa: E402
from agentic_ontologist.workflow.ontology import normalize  # noqa: E402

DATA = PROJECT / "data" / "MouseHuman"
RESULT = PROJECT / "results/agentic_workflow/2026-10-18.json"
SAMPLE = 120


def pack(onto):
    index = {c: i for i, c in enumerate(onto.classes)}
    return {
        "labels": [onto.labels[c] for c in onto.classes],
        "synonyms": [onto.synonyms.get(c, []) for c in onto.classes],
        "parents": [sorted(index[p] for p in onto.parents.get(c, ())) for c in onto.classes],
        "part_of": [sorted(index[p] for p in onto.part_of.get(c, ())) for c in onto.classes],
    }


def main():
    mouse, human = load_owl(DATA / "mouse.owl", "mouse"), load_owl(DATA / "human.owl", "human")
    agent = KromaAgent()
    exact = agent.exact(mouse, human)
    questions = agent.questions(mouse, human, exact)
    m_index, h_index = {c: i for i, c in enumerate(mouse.classes)}, {c: i for i, c in enumerate(human.classes)}
    rng = random.Random(7)
    asked = sorted({m_index[q.subject] for q in questions})
    exact_sources = sorted({m_index[s] for s, _ in exact})
    sample = sorted(rng.sample(asked, SAMPLE // 2) + rng.sample(exact_sources, SAMPLE // 2))
    fixture = {
        "sources": sample,
        "exact": [[m_index[s], h_index[t], conf] for (s, t), conf in sorted(exact.items()) if m_index[s] in set(sample)],
        "questions": [[m_index[q.subject], h_index[q.candidate], q.evidence] for q in questions if m_index[q.subject] in set(sample)],
        "totals": {"exact": len(exact), "questions": len(questions)},
    }
    run = json.loads(RESULT.read_text())
    recorded = {}
    for d in build.page_data(run)["decisions"]:
        if d["agent"] == "kroma":
            recorded[normalize(d["s"]) + "|" + normalize(d["c"])] = [d["tier"], d["ans"], round(d["conf"], 3), d["ok"]]
    data = {
        "mouse": pack(mouse), "human": pack(human),
        "params": {"k": agent.k, "floor": agent.floor, "accept": agent.accept, "structure_weight": agent.structure_weight},
        "recorded": recorded, "fixture": fixture,
    }
    (ROOT / "playground-data.json").write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False))
    size = (ROOT / "playground-data.json").stat().st_size // 1024
    print(f"{len(mouse.classes)} mouse and {len(human.classes)} human classes, {len(exact)} exact, {len(questions)} questions, {len(recorded)} recorded, {size} KB")


if __name__ == "__main__":
    main()
