#!/usr/bin/env python3
"""Write leaderboard.html from getting-started.html's chrome, and add its link to every sidebar.

    python3 make_leaderboard.py && python3 normalize.py .

Needs leaderboard-data.json (leaderboard_data.py) and arena.js. Idempotent.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LINK = '<a href="leaderboard.html">Leaderboard</a>'
BODY = """<main id="content">
<p class="kicker">Results</p>
<h1>Leaderboard</h1>
<p class="lede">Every routing policy of the recorded run, ranked by quality for each agent, with what it spent.</p>
<p>The routed policy sends each question to the cheapest tier that can settle it. The board shows what that costs in quality: on matching it trails only the policy that pays the API model for everything, and spends less. Other policies are the alternatives it was compared with: local model only, API model only, evidence only, and routing under a cap on API calls.</p>
<div data-arena data-src="leaderboard-data.json"></div>
<script src="arena.js"></script>
<h2 id="how-to-read-it">How to read it</h2>
<ul>
<li><strong>Quality</strong> is the headline metric of each agent: F1 after repair for matching, precision for extraction, and correct placements for reasoning.</li>
<li><strong>API spend</strong> is list price, and each policy is charged only for the questions it asked. Local and evidence-only policies spend nothing.</li>
<li>Click a column to sort. Ranks stay with quality, so a sort does not change who is first.</li>
</ul>
<p>The <a href="https://lamng3.com/agentic-ontologist/showcase/">showcase</a> shows every decision behind these numbers.</p>
</main>"""


def main():
    pages = sorted(ROOT.glob("*.html"))
    for f in pages:
        text = f.read_text()
        if '<nav class="nav">' in text and LINK not in text:
            text = re.sub(r'(<a href="experiments.html"[^>]*>[^<]*</a>)', lambda m: m.group(1) + LINK, text, count=1)
            f.write_text(text)
    page = (ROOT / "getting-started.html").read_text()
    page = re.sub(r"<title>.*?</title>", "<title>Leaderboard — Agentic Ontologist Manual</title>", page, count=1)
    page = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="Routing policies of the recorded run, ranked by quality and API spend for each agent.">', page, count=1)
    page = re.sub(r'<main id="content">.*?</main>', lambda _: BODY, page, count=1, flags=re.S)
    page = page.replace(' aria-current="page"', "")
    page = page.replace(LINK, '<a href="leaderboard.html" aria-current="page">Leaderboard</a>')
    (ROOT / "leaderboard.html").write_text(page)
    print("wrote leaderboard.html")


if __name__ == "__main__":
    main()
