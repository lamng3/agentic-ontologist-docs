// Shows one recorded run of the Agentic Ontologist (demo-data.json, exported by demo_data.py). Nothing is computed here.
(function () {
  var root = document.getElementById("demo");
  if (!root) return;
  var el = function (id) { return document.getElementById(id); };
  var data, task = 0, at = -1;
  var TIERS = [["evidence", "Evidence", "label and synonym scores, no model"], ["local", "Local model", "free, on this machine"], ["api", "API model", "paid, asked last"]];

  function usd(x) { return x ? "$" + x.toFixed(2) : "—"; }

  function renderPolicies() {
    var t = data.tasks[task];
    el("policies").innerHTML = "";
    t.rows.forEach(function (r) {
      var d = document.createElement("div");
      d.className = "bar" + (r.config === "routed" ? " pick" : "");
      d.innerHTML = "<span></span><i></i><b></b><em></em>";
      d.children[0].textContent = r.config;
      d.children[1].style.setProperty("--w", Math.round(r.quality * 100) + "%");
      d.children[2].textContent = r.quality.toFixed(2);
      d.children[3].textContent = usd(r.api_usd);
      el("policies").appendChild(d);
    });
  }

  function ask() {
    at = (at + 1) % data.sample.length;
    var d = data.sample[at];
    var box = el("question");
    var steps = TIERS.map(function (t) {
      var on = t[0] === d.tier;
      return '<div class="step' + (on ? " on" : "") + '"><b>' + t[1] + "</b>" + (on ? "settled it" : t[2]) + "</div>";
    }).join("");
    box.innerHTML =
      '<p class="pair">Is <b></b> the same as <b></b>?</p><div class="steps">' + steps + "</div>" +
      '<p>Evidence score <b></b>, answer <b></b> at confidence <b></b>. <span class="verdict"></span></p>';
    var b = box.querySelectorAll("b");
    b[0].textContent = d.s; b[1].textContent = d.c;
    b[b.length - 3].textContent = d.ev.toFixed(2); b[b.length - 2].textContent = d.ans; b[b.length - 1].textContent = d.conf.toFixed(2);
    var v = box.querySelector(".verdict");
    v.className = "verdict " + (d.ok ? "ok" : "no");
    v.textContent = d.ok ? "Correct." : "Wrong: the reference says otherwise.";
  }

  fetch("demo-data.json").then(function (r) { return r.json(); }).then(function (d) {
    data = d;
    el("track").textContent = d.track;
    d.tasks.forEach(function (t, i) {
      var b = document.createElement("button");
      b.className = "tab"; b.setAttribute("role", "tab"); b.textContent = t.title.replace(/ \(.*\)| and repair/g, "");
      b.setAttribute("aria-selected", i === 0 ? "true" : "false");
      b.onclick = function () {
        task = i;
        Array.prototype.forEach.call(el("tabs").children, function (c, j) { c.setAttribute("aria-selected", j === i ? "true" : "false"); });
        renderPolicies();
      };
      el("tabs").appendChild(b);
    });
    el("ask").onclick = ask;
    renderPolicies();
    ask();
  });
})();
