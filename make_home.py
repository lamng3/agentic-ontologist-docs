#!/usr/bin/env python3
"""Write index.html: the home page with the live demo, and the old overview's body (home-body.html) beneath it.

    python3 make_home.py
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent
HEAD = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Overview — Agentic Ontologist Manual</title>\n<meta name="description" content="Agentic Ontologist manual: install, architecture, API, and experiments.">\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=TikTok+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">\n<link rel="icon" href="favicon.svg" type="image/svg+xml">\n<link rel="stylesheet" href="style.css">\n</head>\n'
HEADER = '<header class="site">\n  <a class="logo" href="index.html"><span class="logo-mark">AO</span><span>Agentic Ontologist</span></a>\n  <nav class="site">\n    <a href="getting-started.html">Start</a>\n    <a href="agents.html">Agents</a>\n    <a href="architecture.html">Architecture</a>\n    <label class="nav-button" for="nav-toggle">Menu</label>\n    <a href="https://github.com/lamng3/agentic-ontologist" class="pill">GitHub ↗</a>\n  </nav>\n</header>'
LEDE = 'The Agentic Ontologist is an orchestrator and four memory-augmented subagents (KROMA for matching, extraction, reasoning, and validation) that integrate ontologies, each question routed to the cheapest model that can settle it. Around them, a toolkit loads an ontology, retrieves nearby concepts, and answers with a language model.'

HERO = """<section class="hero">
  <div>
    <h1>Route each question to the cheapest model that can settle it</h1>
    <p class="lede">{lede}</p>
    <pre class="install"><span class="prompt">$ </span>git clone https://github.com/lamng3/agentic-ontologist.git &amp;&amp; cd agentic-ontologist
<span class="prompt">$ </span>./setup.sh &amp;&amp; source .venv/bin/activate
<span class="prompt">$ </span>agonto chat ontology.owl</pre>
    <div class="actions">
      <a class="btn solid" href="getting-started.html">Get started</a>
      <a class="btn" href="agents.html">Agents</a>
      <a class="btn" href="https://lamng3.com/agentic-ontologist/showcase/">Showcase</a>
    </div>
  </div>
  <div class="demo-card" id="demo">
    <div class="head"><h3>Quality against cost</h3><span class="tag">one <b>recorded run</b></span></div>
    <p class="try">Try it: Pick a task to compare routing policies, then press Another to watch a real question get settled.</p>
    <div class="tabs" id="tabs" role="tablist"></div>
    <div class="bars" id="policies"></div>
    <hr class="rule">
    <div class="head"><h3>Watch one question get settled</h3><button class="btn" id="ask">Another</button></div>
    <div class="ask" id="question"></div>
    <p class="note">The numbers and the decisions are from the recorded run on <span id="track"></span> ({local} and {api}), the same file as the <a href="https://lamng3.com/agentic-ontologist/showcase/">showcase</a>. The page computes nothing.</p>
  </div>
</section>
<section class="block"><div class="prose-home">{body}</div></section>
<script src="demo.js"></script>"""


def main():
    import json

    data = json.loads((ROOT / "demo-data.json").read_text())
    body = (ROOT / "home-body.html").read_text()
    hero = HERO.format(lede=LEDE, body=body, local=data["local"], api=data["api"])
    page = f"""<!DOCTYPE html>
<html lang="en">
{HEAD}
<body>
<a class="skip" href="#content">Skip to content</a>
{HEADER}
<input id="nav-toggle" class="nav-toggle" type="checkbox">
<main class="wrap" id="content" style="max-width:1280px">
{hero}
</main>
<footer class="site">Agentic Ontologist by <a href="https://github.com/lamng3">Lam Nguyen</a> · matching, extraction, reasoning, and validation under a budget</footer>
</body>
</html>
"""
    (ROOT / "index.html").write_text(page)
    print("wrote index.html")


if __name__ == "__main__":
    main()
