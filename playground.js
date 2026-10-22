// The Agentic Ontologist playground: the matching agent's evidence tier, on the real Mouse-Human ontologies, in the browser.
// A port of agentic_ontologist.workflow.agents.text.NameIndex (TF-IDF over character 3- to 5-grams, as scikit-learn computes
// it) and of KromaAgent.exact / .questions and the controller's evidence rule. The page's tests compare it to the Python.
var AO = (function () {
  function normalize(text) { var m = text.toLowerCase().match(/[a-z0-9]+/g); return m ? m.join(" ") : ""; }
  function names(o, i) {
    var out = [normalize(o.labels[i])].concat((o.synonyms[i] || []).map(normalize)), seen = {}, res = [];
    out.forEach(function (n) { if (n && !seen[n]) { seen[n] = 1; res.push(n); } });
    return res;
  }
  function doc(o, i) { return names(o, i).join(" ; "); }
  // scikit-learn's _char_wb_ngrams, ngram_range (3, 5)
  function ngrams(text) {
    var out = [], words = text.toLowerCase().replace(/\s\s+/g, " ").split(/\s+/).filter(Boolean);
    words.forEach(function (w0) {
      var w = " " + w0 + " ", len = w.length;
      for (var n = 3; n <= 5; n++) {
        var offset = 0; out.push(w.slice(offset, offset + n));
        while (offset + n < len) { offset++; out.push(w.slice(offset, offset + n)); }
        if (offset === 0) break;
      }
    });
    return out;
  }
  // TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True, min_df=1), smooth idf, l2 norm
  function Index(docs) {
    var vocab = new Map(), df = [];
    docs.forEach(function (d) {
      var seen = new Set();
      ngrams(d).forEach(function (g) { if (!vocab.has(g)) { vocab.set(g, vocab.size); df.push(0); } var id = vocab.get(g); if (!seen.has(id)) { seen.add(id); df[id]++; } });
    });
    var n = docs.length;
    this.vocab = vocab; this.idf = df.map(function (c) { return Math.log((1 + n) / (1 + c)) + 1; });
  }
  Index.prototype.vector = function (text) {
    var counts = new Map(), self = this;
    ngrams(text).forEach(function (g) { var id = self.vocab.get(g); if (id !== undefined) counts.set(id, (counts.get(id) || 0) + 1); });
    var ids = [], vals = [], norm = 0;
    counts.forEach(function (tf, id) { var v = (1 + Math.log(tf)) * self.idf[id]; ids.push(id); vals.push(v); norm += v * v; });
    norm = Math.sqrt(norm) || 1;
    return { ids: ids, vals: vals.map(function (v) { return v / norm; }) };
  };
  function dot(a, b) { var map = new Map(), s = 0; a.ids.forEach(function (id, i) { map.set(id, a.vals[i]); }); b.ids.forEach(function (id, i) { if (map.has(id)) s += map.get(id) * b.vals[i]; }); return s; }

  // The world: both ontologies, their name index, vectors, exact matches
  function World(data) {
    var w = this; w.data = data; w.m = data.mouse; w.h = data.human;
    w.index = new Index([].concat(data.mouse.labels.map(function (_, i) { return doc(data.mouse, i); }), data.human.labels.map(function (_, i) { return doc(data.human, i); })));
    w.hv = data.human.labels.map(function (_, i) { return w.index.vector(doc(data.human, i)); });
    w.mv = data.mouse.labels.map(function (_, i) { return w.index.vector(doc(data.mouse, i)); });
    // exact: label to label 1.0, label to synonym 0.99, synonym to synonym 0.98
    var byName = {};
    data.human.labels.forEach(function (_, t) { names(data.human, t).forEach(function (n, i) { (byName[n] = byName[n] || []).push([t, i === 0]); }); });
    w.exact = new Map(); w.settledT = new Set(); w.anchors = new Map();
    data.mouse.labels.forEach(function (_, s) {
      names(data.mouse, s).forEach(function (n, i) {
        (byName[n] || []).forEach(function (e) {
          var conf = 1.0 - 0.01 * ((i !== 0) + (!e[1])), key = s + "," + e[0];
          w.exact.set(key, Math.max(w.exact.get(key) || 0, conf));
        });
      });
    });
    w.exact.forEach(function (_, key) { var p = key.split(",").map(Number); w.settledT.add(p[1]); if (!w.anchors.has(p[0])) w.anchors.set(p[0], new Set()); w.anchors.get(p[0]).add(p[1]); });
    w.openT = []; data.human.labels.forEach(function (_, t) { if (!w.settledT.has(t)) w.openT.push(t); });
    w.ancMemo = new Map();
    // inverted index over the open targets for fast nearest-neighbour search
    w.post = new Map();
    w.openT.forEach(function (t) { var v = w.hv[t]; v.ids.forEach(function (id, i) { if (!w.post.has(id)) w.post.set(id, []); w.post.get(id).push([t, v.vals[i]]); }); });
  }
  World.prototype.ancestors = function (t) {
    var memo = this.ancMemo; if (memo.has(t)) return memo.get(t);
    var seen = new Set(), stack = (this.h.parents[t] || []).slice();
    while (stack.length) { var p = stack.pop(); if (!seen.has(p)) { seen.add(p); (this.h.parents[p] || []).forEach(function (q) { stack.push(q); }); } }
    memo.set(t, seen); return seen;
  };
  World.prototype.nearest = function (vec, k) {
    var sims = new Map(), self = this;
    vec.ids.forEach(function (id, i) { (self.post.get(id) || []).forEach(function (e) { sims.set(e[0], (sims.get(e[0]) || 0) + vec.vals[i] * e[1]); }); });
    var all = []; sims.forEach(function (s, t) { all.push([t, s]); });
    all.sort(function (a, b) { return b[1] - a[1] || a[0] - b[0]; });
    return all.slice(0, k);
  };
  // The questions asked about one source (a class index, or free text with no parents)
  World.prototype.questions = function (source, params) {
    var vec = typeof source === "number" ? this.mv[source] : this.index.vector(normalize(source)), self = this;
    var parents = typeof source === "number" ? this.m.parents[source] || [] : [];
    var matchedParents = new Set();
    parents.forEach(function (p) { (self.anchors.get(p) || new Set()).forEach(function (t) { matchedParents.add(t); }); });
    return this.nearest(vec, params.k).filter(function (hit) { return hit[1] >= params.floor; }).map(function (hit) {
      var t = hit[0], sim = hit[1], target = new Set(self.ancestors(t)); (self.h.parents[t] || []).forEach(function (p) { target.add(p); });
      var agree = 0; matchedParents.forEach(function (p) { if (target.has(p)) agree = 1; });
      var ev = Math.min(1, (1 - params.structure_weight) * sim + params.structure_weight * agree);
      var route = ev >= params.accept ? "yes" : ev <= params.floor ? "no" : "model";
      return { t: t, sim: sim, agree: agree, evidence: ev, route: route };
    });
  };
  World.prototype.exactFor = function (s) { var out = [], self = this; this.exact.forEach(function (conf, key) { var p = key.split(",").map(Number); if (p[0] === s) out.push([p[1], conf]); }); return out; };
  function describe(o, i, limit) {
    limit = limit || 3;
    var parts = [o.labels[i].replace(/_/g, " ")], syn = (o.synonyms[i] || []).filter(Boolean).slice(0, 4);
    if (syn.length) parts.push("synonyms: " + syn.join("; "));
    var sub = (o.parents[i] || []).map(function (p) { return o.labels[p].replace(/_/g, " "); }).slice(0, limit); if (sub.length) parts.push("is a: " + sub.join("; "));
    var part = (o.part_of[i] || []).map(function (p) { return o.labels[p].replace(/_/g, " "); }).slice(0, limit); if (part.length) parts.push("part of: " + part.join("; "));
    return parts.join(" | ");
  }
  return { normalize: normalize, World: World, describe: describe, names: names };
})();

(async function () {
  var root = document.getElementById("aplay");
  if (!root) return;
  var h = PG.h, data, world, source = null;
  var INSTRUCTION = "You match classes between two ontologies of the same domain. For each item, decide whether the source class and the target class denote the same concept: answer yes or no. Synonyms, plural or adjectival forms, and word order do not make two classes different; a more general or more specific class, or a part of the other, is a different concept. Give your confidence from 0 to 1.";
  var status = h("p", { class: "pg-line", id: "ap-status", text: "loading the ontologies…" });
  var input = h("input", { type: "text", id: "ap-source", class: "grow", placeholder: "Type a mouse class, for example: peripheral nerve trunk", autocomplete: "off", "aria-label": "Source class" });
  var sugg = h("div", { class: "sugg", id: "ap-sugg" });
  var out = h("div", { id: "ap-out", "aria-live": "polite" });
  var P = {};
  function slider(id, label, min, max, step, key) {
    var o = h("output", { for: id }), i = h("input", { type: "range", id: id, min: min, max: max, step: step });
    i.addEventListener("input", function () { P[key] = +i.value; o.textContent = (+i.value).toFixed(step < 1 ? 2 : 0); render(); });
    return { box: h("label", { for: id }, label + " ", o, i), set: function (v) { i.value = v; P[key] = v; o.textContent = v.toFixed(step < 1 ? 2 : 0); } };
  }
  var sK = slider("ap-k", "Candidates asked about (k)", 1, 5, 1, "k"), sF = slider("ap-floor", "Floor: below this, no", 0.1, 0.9, 0.01, "floor"),
    sA = slider("ap-accept", "Accept: at or above this, yes", 0.5, 1, 0.01, "accept"), sW = slider("ap-weight", "Weight of the parents' agreement", 0, 0.5, 0.01, "structure_weight");

  function match(q) {
    var n = AO.normalize(q); if (!n) return [];
    var starts = [], has = [];
    world.m.labels.forEach(function (l, i) { var x = AO.normalize(l); if (x.indexOf(n) === 0) starts.push(i); else if (x.indexOf(n) > 0) has.push(i); });
    return starts.concat(has).slice(0, 8);
  }
  function suggest() {
    sugg.replaceChildren.apply(sugg, match(input.value).map(function (i) { return h("button", { type: "button", onclick: function () { pick(i); }, text: world.m.labels[i] }); }));
  }
  function pick(i) { source = i; input.value = world.m.labels[i]; sugg.replaceChildren(); render(); }
  function useText() { source = input.value.trim(); sugg.replaceChildren(); render(); }

  function recordedFor(s, t) {
    var key = AO.normalize(typeof s === "number" ? world.m.labels[s] : s) + "|" + AO.normalize(world.h.labels[t]), r = data.recorded[key];
    return r ? { tier: r[0], answer: r[1], conf: r[2], ok: r[3] } : null;
  }
  async function askModel(s, t, cell) {
    cell.replaceChildren(h("span", { class: "pg-status", text: "asking…" }));
    var src = typeof s === "number" ? AO.describe(world.m, s) : s;
    try {
      var reply = await PG.chat([{ role: "system", content: INSTRUCTION }, { role: "user", content: "source: " + src + "\ntarget: " + AO.describe(world.h, t) + "\nAnswer yes or no, then your confidence from 0 to 1." }]);
      var yn = /\b(yes|no)\b/i.exec(reply), c = /\b(0(?:\.\d+)?|1(?:\.0+)?)\b/.exec(reply);
      cell.replaceChildren(h("span", { class: "rt " + (yn && yn[1].toLowerCase() === "yes" ? "yes" : "no"), text: yn ? yn[1].toLowerCase() : "no answer" }), " ", c ? c[1] : "", h("div", { class: "pg-note", text: reply.trim().slice(0, 160) }));
    } catch (e) { cell.replaceChildren(h("span", { class: "pg-status", role: "alert", text: String(e.message || e).slice(0, 140) })); }
  }
  var ROUTE = { yes: ["yes", "Settled by evidence: yes"], no: ["no", "Settled by evidence: no"], model: ["model", "Not sure: ask a model"] };

  function render() {
    out.replaceChildren(); if (source === null) return;
    var label = typeof source === "number" ? world.m.labels[source] : source, parts = [];
    if (typeof source === "number") {
      var ex = world.exactFor(source);
      if (ex.length) {
        parts.push(h("div", { class: "callout", role: "note" }, h("span", { class: "label", text: "Settled by exact name" }),
          h("p", {}, "“" + label + "” shares a normalized name with " + ex.map(function (e) { return "“" + world.h.labels[e[0]] + "” (confidence " + e[1].toFixed(2) + ")"; }).join(" and ") + ". A class settled this way is never asked about again, so it has no questions.")));
        out.replaceChildren.apply(out, parts); return;
      }
    }
    var qs = world.questions(source, P);
    if (!qs.length) { out.append(h("p", { class: "pg-note", text: "No candidate reaches the floor of " + P.floor.toFixed(2) + ", so no question is asked about this class." })); return; }
    var rows = qs.map(function (q) {
      var rec = recordedFor(source, q.t), route = ROUTE[q.route], cell = h("td", {});
      if (q.route === "model") cell.append(h("button", { type: "button", class: "btn", onclick: function () { askModel(source, q.t, cell); } }, "Ask my model"));
      return h("tr", {}, h("td", { text: world.h.labels[q.t].replace(/_/g, " ") }), h("td", { class: "num", text: q.sim.toFixed(3) }), h("td", { class: "num", text: q.agree ? "yes" : "–" }), h("td", { class: "num", text: q.evidence.toFixed(3) }),
        h("td", {}, h("span", { class: "rt " + route[0], text: route[1] })), cell,
        h("td", {}, rec ? [h("span", { class: "pg-tag " + (rec.ok ? "ok" : "bad"), text: rec.tier + ": " + rec.answer + (rec.ok ? " ✓" : " ✗") })] : h("span", { class: "none", text: "–" })));
    });
    out.append(h("div", { class: "pg-scroll" }, h("table", { class: "pg-table cand" },
      h("thead", {}, h("tr", {}, ["Candidate in the human ontology", "Similarity", "Parent agrees", "Evidence", "Controller", "Model", "In the recorded run"].map(function (t, i) { return h("th", { scope: "col", class: i > 0 && i < 4 ? "num" : "", text: t }); }))),
      h("tbody", {}, rows))),
      h("p", { class: "pg-note", text: "Similarity is the cosine of TF-IDF vectors over character 3- to 5-grams of the names. Evidence is (1 − weight) × similarity + weight × parent agreement, capped at 1. The controller settles a pair by evidence at or above Accept or at or below Floor, and otherwise sends it to a model: first a local one, then an API model. The recorded column shows what the real run did with the same pair." }));
  }

  root.className = "pg";
  var llm = h("div", { id: "ap-llm" });
  root.replaceChildren(
    h("div", { class: "pg-panel" }, h("h3", { text: "1. Pick a class" }), h("p", { class: "pg-sub", text: "A class of the adult mouse anatomy ontology. The playground finds its nearest classes in the human anatomy ontology, as the matching agent does." }),
      h("div", { class: "pg-row" }, input, h("button", { type: "button", class: "btn", id: "ap-use", onclick: useText }, "Use my text as the class"), h("button", { type: "button", class: "btn", id: "ap-random", onclick: function () { var ids = data.fixture.questions.map(function (q) { return q[0]; }); pick(ids[Math.floor(Math.random() * ids.length)]); } }, "A random class")), sugg, status),
    h("div", { class: "pg-panel" }, h("h3", { text: "2. The controller's thresholds" }), h("p", { class: "pg-sub", text: "These are the matching agent's defaults. Move them and see which pairs the evidence tier would settle." }), h("div", { class: "params" }, sK.box, sF.box, sA.box, sW.box),
      h("div", { class: "pg-row" }, h("button", { type: "button", class: "btn", id: "ap-reset", onclick: function () { defaults(); render(); } }, "Reset to the defaults"))),
    h("div", { class: "pg-panel" }, h("h3", { text: "3. The questions it would ask" }), out),
    h("details", { class: "pg-panel" }, h("summary", { text: "Your model, for the pairs the evidence cannot settle" }), h("p", { class: "pg-sub", text: "The Ask my model button sends the controller's instruction and the pair's description (a simplified single-item prompt, not the controller's batch format) to a model you run." }), llm));
  function defaults() { sK.set(data.params.k); sF.set(data.params.floor); sA.set(data.params.accept); sW.set(data.params.structure_weight); }

  data = await fetch("playground-data.json").then(function (r) { return r.json(); });
  world = new AO.World(data);
  status.textContent = world.m.labels.length.toLocaleString() + " mouse and " + world.h.labels.length.toLocaleString() + " human classes loaded; " + world.exact.size.toLocaleString() + " pairs settled by exact name before any question is asked.";
  defaults(); PG.llmPanel(llm);
  input.addEventListener("input", suggest);
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") { var m = match(input.value); if (m.length && AO.normalize(input.value) === AO.normalize(world.m.labels[m[0]])) pick(m[0]); else useText(); } });
  window.__ao = { world: world, data: data }; // for the page's tests
  pick(data.fixture.questions[0][0]);
})();
