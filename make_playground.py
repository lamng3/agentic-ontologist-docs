#!/usr/bin/env python3
"""Write playground.html from getting-started.html's chrome, and add its link to every sidebar.

    python3 make_playground.py && python3 normalize.py .

Needs playground-data.json (playground_data.py), playground.js, and pg.js. Idempotent.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LINK = '<a href="playground.html">Playground</a>'
BODY = """<main id="content">
<p class="kicker">Try it</p>
<h1>Playground</h1>
<p class="lede">Pick a class of the mouse anatomy ontology and see what the matching agent's evidence tier does with it: its nearest human classes, their evidence, and whether the controller would settle each pair or ask a model.</p>
<div class="callout warning" role="note"><span class="label">What runs where</span><p>Everything runs in your browser, on the two real ontologies of the Mouse&ndash;Human track. The Agentic Ontologist itself is Python and is not run here: this page recomputes the <strong>evidence tier</strong> with a port of its name index (TF-IDF over character n-grams, as scikit-learn computes it) and of the matching agent's retrieval and the controller's rule, and checks the result against the Python. The <strong>local and API models</strong> are not hosted: <strong>Ask my model</strong> needs one you run yourself, for example Ollama on your computer.</p></div>
<div id="aplay" aria-label="Evidence tier playground">Loading the playground…</div>
<script src="pg.js"></script>
<script src="playground.js"></script>
<h2 id="how-to-read-it">How to read it</h2>
<ul>
<li>A class that shares a normalized name with a human class is <strong>settled by exact name</strong> and never asked about again. About 1,100 of the mouse classes are.</li>
<li>For every other class the agent asks about its <strong>nearest candidates</strong> (k of them) whose similarity reaches the floor. Parents that were matched exactly add a small bonus when they agree.</li>
<li>The <strong>controller</strong> settles a pair by evidence at or above Accept (yes) or at or below Floor (no). The rest go to a local model, then to an API model. That is the routing the <a href="https://lamng3.com/agentic-ontologist/showcase/">showcase</a> measures; the last column shows what the recorded run did with each pair.</li>
</ul>
<h2 id="what-is-not-here">What is not here</h2>
<ul>
<li>The local and API tiers, batching, recalibration, and the budget are not run. <strong>Ask my model</strong> sends one pair with the controller's instruction, which is simpler than the controller's batch prompt.</li>
<li>Extraction, reasoning, and validation are not run; see <a href="agents.html">Agents</a>.</li>
<li>When two candidates have exactly the same similarity at the cutoff, Python's sort and this page's can keep different ones. Their evidence is identical, so the routing is too.</li>
</ul>
</main>"""


def main():
    for f in sorted(ROOT.glob("*.html")):
        text = f.read_text()
        if '<nav class="nav"' in text and LINK not in text:
            text = re.sub(r'(<a href="getting-started.html"[^>]*>[^<]*</a>)', lambda m: m.group(1) + LINK, text, count=1)
            f.write_text(text)
    page = (ROOT / "getting-started.html").read_text()
    page = re.sub(r"<title>.*?</title>", "<title>Playground — Agentic Ontologist Manual</title>", page, count=1)
    page = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="Pick a class of the mouse anatomy ontology and see the matching agent\'s evidence tier: nearest human classes, evidence, and the controller\'s routing.">', page, count=1)
    page = re.sub(r'<main id="content">.*?</main>', lambda _: BODY, page, count=1, flags=re.S)
    page = page.replace(' aria-current="page"', "")
    page = page.replace(LINK, '<a href="playground.html" aria-current="page">Playground</a>')
    (ROOT / "playground.html").write_text(page)
    print("wrote playground.html")


if __name__ == "__main__":
    main()
