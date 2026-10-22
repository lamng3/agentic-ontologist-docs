# Agentic Ontologist manual

The manual for the Agentic Ontologist, published at <https://lamng3.com/agentic-ontologist/>.

The content pages are written as HTML. The home page is generated, so edit `home-body.html` or `make_home.py` and run:

```bash
../agentic-ontologist/.venv/bin/python demo_data.py   # the demo's data, from the recorded run
python3 make_home.py                                  # index.html
python3 normalize.py .                                # search, on-this-page lists, previous and next links
```

`demo_data.py` reads the same result file as the showcase (`agentic-ontologist/results/agentic_workflow/`), so the numbers match.
