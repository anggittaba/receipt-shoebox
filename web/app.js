// Receipt Shoebox UI. Plain JS, no build step.
(function () {
  var E = window.Shoebox, CATS = E.CATEGORIES;
  var state = { items: [], filter: "all", view: "inbox" };
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var money = function (n) { return (n < 0 ? "-$" : "$") + Math.abs(n).toFixed(2); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var CAT_SVG = '<svg class="cat-doodle" viewBox="0 0 50 44" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M10 38c-3-8-1-16 4-20l-1-8 6 5c3-1 7-1 10 0l6-5-1 8c5 4 6 12 3 20"/><path d="M10 38h27"/><circle cx="19" cy="25" r="1.1" fill="currentColor"/><circle cx="28" cy="25" r="1.1" fill="currentColor"/>' +
    '<path d="M22 29l1.5 1 1.5-1"/><path d="M14 28h-5M14 30.5l-4 1.5M33 28h5M33 30.5l4 1.5"/><path d="M37 37c4 0 7-2 6-6"/>' +
    '<path d="M41 6c0-2.5 4-2.5 4 0 0 2-2 2-2 4M43 13.2v.2"/></svg>';

  // ---------- theme ----------
  var saved = localStorage.getItem("shoebox-theme");
  if (saved) document.documentElement.setAttribute("data-bs-theme", saved);
  $("#themeBtn").addEventListener("click", function () {
    var t = document.documentElement.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-bs-theme", t); localStorage.setItem("shoebox-theme", t); if (state.view === "summary") renderSummary();
  });

  // ---------- navigation ----------
  var TITLES = { inbox: "Receipt inbox", board: "Category board", review: "Review queue", summary: "Quarterly summary", about: "How it works" };
  function show(view) {
    state.view = view;
    $$(".view").forEach(function (v) { v.classList.toggle("d-none", v.id !== "view-" + view); });
    $$(".sidebar-menu .nav-link").forEach(function (a) { a.classList.toggle("active", a.dataset.view === view); });
    $("#pageTitle").textContent = TITLES[view];
    if (view === "board") renderBoard(); if (view === "review") renderReview(); if (view === "summary") renderSummary();
    if (window.innerWidth < 992) document.body.classList.remove("sidebar-open");
    window.scrollTo(0, 0);
  }
  $$("[data-view]").forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); show(a.dataset.view); }); });
  window.shoeboxShow = show;

  function toast(msg) {
    var t = document.createElement("div"); t.className = "tst"; t.innerHTML = msg;
    $("#toasts").appendChild(t); setTimeout(function () { t.remove(); }, 2300);
  }

  // ---------- receipt card ----------
  function receiptHTML(x, opts) {
    opts = opts || {};
    var r = x.result, lines = x.text.split("\n").slice(1).filter(function (l) { return !/^(sub)?total|^tot |^amount due|^fare /i.test(l); });
    var ai = !r ? '<div class="r-ai">AI part is reading…</div>' :
      '<div class="r-ai"><span class="ai-tag">AI</span><span class="chip">' + esc(r.categoryLabel) + '</span>' +
      (r.billable ? '<span class="chip bill">Bill ' + esc(r.client) + '</span>' : '') +
      (r.duplicate_of ? '<span class="chip dup">Duplicate?</span>' : '') +
      (r.review && !x.resolved ? '<span class="chip rev">Needs a look</span>' : '') +
      '<div class="conf' + (r.confidence < 0.6 ? " low" : "") + '" title="Confidence ' + Math.round(r.confidence * 100) + '%"><i style="width:' + Math.round(r.confidence * 100) + '%"></i></div></div>';
    return '<div class="receipt-wrap' + (r ? "" : " r-reading") + '" data-id="' + x.id + '"><div class="receipt">' +
      '<div class="r-head"><span>' + x.id + '</span><span>' + x.date + '</span></div>' +
      '<div class="r-shop">' + esc(x.merchant || x.text.split("\n")[0]) + '</div>' +
      '<div class="r-mono">' + esc(lines.join("\n")) + '</div>' +
      '<div class="r-total"><span>TOTAL</span><span>' + money(x.total) + '</span></div>' +
      (x.note ? '<div class="r-note">“' + esc(x.note) + '”</div>' : '') + (opts.noAi ? "" : ai) +
      '</div>' + (r && r.review && !x.resolved && !opts.noCat ? CAT_SVG : "") + '</div>';
  }

  function renderInbox() {
    var has = state.items.length > 0;
    $("#emptyInbox").classList.toggle("d-none", has); $("#inboxBar").classList.toggle("d-none", !has);
    var list = state.items.filter(function (x) {
      if (state.filter === "billable") return x.result && x.result.billable;
      if (state.filter === "review") return x.result && x.result.review && !x.resolved;
      return true;
    });
    $("#inboxGrid").innerHTML = list.map(function (x) { return receiptHTML(x); }).join("");
    updateBadges();
  }
  function updateBadges() {
    $("#bInbox").textContent = state.items.length;
    $("#bReview").textContent = state.items.filter(function (x) { return x.result && x.result.review && !x.resolved; }).length;
  }
  $$("[data-filter]").forEach(function (b) { b.addEventListener("click", function () {
    state.filter = b.dataset.filter; $$("[data-filter]").forEach(function (o) { o.classList.toggle("active", o === b); }); renderInbox(); }); });

  // ---------- run demo ----------
  var running = false;
  function runDemo() {
    if (running) return; running = true; show("inbox");
    var analysed = E.analyseAll(window.DEMO_RECEIPTS, { clients: window.CLIENTS });
    state.items = []; state.filter = "all"; $$("[data-filter]").forEach(function (o) { o.classList.toggle("active", o.dataset.filter === "all"); });
    var i = 0;
    (function next() {
      if (i >= analysed.length) { running = false; toast("✓ " + analysed.length + " receipts read · " + $("#bReview").textContent + " need a look"); return; }
      var a = analysed[i++], pending = Object.assign({}, a, { result: null });
      state.items.push(pending); renderInbox();
      setTimeout(function () { pending.result = a.result; renderInbox(); next(); }, 140);
    })();
  }
  $("#runBtn").addEventListener("click", runDemo); $$("[data-run]").forEach(function (b) { b.addEventListener("click", runDemo); });
  window.shoeboxRun = runDemo;

  $("#pasteForm").addEventListener("submit", function (e) {
    e.preventDefault(); var f = e.target;
    var r = { id: "U" + String(state.items.length + 1).padStart(2, "0"), merchant: f.merchant.value.trim(), date: f.date.value, total: parseFloat(f.total.value),
      text: f.merchant.value.toUpperCase() + "\n" + f.text.value, note: f.note.value.trim() };
    r.result = E.analyse(r, { clients: window.CLIENTS, seen: state.items });
    state.items.unshift(r); renderInbox(); f.reset(); f.closest("details").open = false; toast("Read: " + esc(r.result.categoryLabel));
  });

  // ---------- board with pointer drag (mouse + touch) ----------
  function renderBoard() {
    var html = Object.keys(CATS).map(function (k) {
      var inBox = state.items.filter(function (x) { return x.result && x.result.category === k && !x.discarded; });
      var sum = inBox.reduce(function (s, x) { return s + x.total; }, 0);
      return '<div class="box" data-cat="' + k + '"><div class="box-lid"><span class="box-label">' + CATS[k].label + '</span><small>' + inBox.length + ' · ' + money(sum) + '</small></div><div class="box-body">' +
        inBox.map(function (x) {
          return '<div class="slip' + (x.result.billable ? " bill" : "") + (x.result.review && !x.resolved ? " rev" : "") + '" data-id="' + x.id + '"><span class="s-name">' + esc(x.merchant || "(unreadable)") + (x.userFiled ? ' <span class="you-tag">YOU</span>' : '') + '</span><span class="s-amt">' + money(x.total) + '</span></div>';
        }).join("") + '</div></div>';
    }).join("");
    $("#board").innerHTML = state.items.length ? html : '<div class="empty-state">Nothing to sort yet. <button class="btn btn-run btn-sm ms-2" onclick="shoeboxRun()">▶ Run demo</button></div>';
  }
  var drag = null;
  document.addEventListener("pointerdown", function (e) {
    var slip = e.target.closest(".slip"); if (!slip) return;
    e.preventDefault();
    var rect = slip.getBoundingClientRect(), clone = slip.cloneNode(true);
    clone.classList.add("drag-clone"); clone.style.width = rect.width + "px"; document.body.appendChild(clone);
    drag = { id: slip.dataset.id, slip: slip, clone: clone, dx: e.clientX - rect.left, dy: e.clientY - rect.top, over: null };
    slip.classList.add("ghost"); moveClone(e);
  });
  function moveClone(e) {
    drag.clone.style.left = (e.clientX - drag.dx) + "px"; drag.clone.style.top = (e.clientY - drag.dy) + "px";
    var el = document.elementFromPoint(e.clientX, e.clientY), box = el && el.closest(".box");
    if (drag.over && drag.over !== box) drag.over.classList.remove("over");
    if (box) box.classList.add("over"); drag.over = box;
  }
  document.addEventListener("pointermove", function (e) {
    if (!drag) return; e.preventDefault(); moveClone(e);
    // auto-scroll near the screen edge so long boards work on phones too
    var edge = 60, h = window.innerHeight;
    if (e.clientY > h - edge) window.scrollBy(0, 12); else if (e.clientY < edge + 50) window.scrollBy(0, -12);
  }, { passive: false });
  document.addEventListener("pointerup", function () {
    if (!drag) return; var d = drag; drag = null; d.clone.remove(); d.slip.classList.remove("ghost");
    if (!d.over) return; d.over.classList.remove("over");
    var cat = d.over.dataset.cat, x = state.items.filter(function (i) { return i.id === d.id; })[0];
    if (!x || x.result.category === cat) return;
    fileAs(x, cat);
    renderBoard();
    var box = $('.box[data-cat="' + cat + '"]'); box.classList.add("bump");
    var s = $('.slip[data-id="' + x.id + '"]'); if (s) s.classList.add("moved");
    toast("📥 filed! " + esc(x.merchant || x.id) + " → " + CATS[cat].label);
  });
  function fileAs(x, cat) { x.result = Object.assign({}, x.result, { category: cat, categoryLabel: CATS[cat].label }); x.userFiled = true; x.resolved = true; updateBadges(); }
  window.shoeboxFile = function (id, cat) { var x = state.items.filter(function (i) { return i.id === id; })[0]; fileAs(x, cat); renderBoard(); };

  // ---------- review queue ----------
  function renderReview() {
    var q = state.items.filter(function (x) { return x.result && x.result.review && !x.resolved; });
    if (!state.items.length) { $("#reviewList").innerHTML = '<div class="all-clear">Run the demo first. <button class="btn btn-run btn-sm ms-2" onclick="shoeboxRun()">▶ Run demo</button></div>'; return; }
    if (!q.length) { $("#reviewList").innerHTML = '<div class="all-clear"><svg width="60" height="54" viewBox="0 0 50 44" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M10 38c-3-8-1-16 4-20l-1-8 6 5c3-1 7-1 10 0l6-5-1 8c5 4 6 12 3 20"/><path d="M10 38h27"/><path d="M17 25q2-2 4 0M26 25q2-2 4 0"/><path d="M21 30q2.5 2 5 0"/></svg><p class="mt-2 mb-0">All clear. Every receipt is filed.</p></div>'; return; }
    $("#reviewList").innerHTML = q.map(function (x) {
      var r = x.result, opts = Object.keys(CATS).map(function (k) { return '<option value="' + k + '"' + (k === r.category ? " selected" : "") + '>' + CATS[k].label + '</option>'; }).join("");
      var clientOpts = '<option value="">Not billable (my own cost)</option>' + window.CLIENTS.map(function (c) { return '<option' + (c === r.client ? " selected" : "") + '>' + esc(c) + '</option>'; }).join("");
      return '<div class="rv" data-id="' + x.id + '">' + receiptHTML(x, { noCat: true }) +
        '<div><div class="rv-q">' + CAT_SVG.replace('class="cat-doodle"', 'class="cat-doodle sm"') + '<div><h3>' + (r.duplicate_of ? "Is this the same receipt twice?" : "What was this for?") + '</h3>' +
        '<ul class="rv-reasons">' + r.reasons.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + '</ul></div></div>' +
        '<div class="row g-2"><div class="col-sm-6"><label class="form-label small mb-1">Category</label><select class="form-select form-select-sm" data-f="cat">' + opts + '</select></div>' +
        '<div class="col-sm-6"><label class="form-label small mb-1">Bill to client?</label><select class="form-select form-select-sm" data-f="client">' + clientOpts + '</select></div>' +
        '<div class="col-12"><input class="form-control form-control-sm" data-f="note" placeholder="Quick note, e.g. train to client workshop" value="' + esc(x.note) + '"></div></div>' +
        '<div class="d-flex flex-wrap gap-2 mt-2"><button class="btn btn-sm btn-run" data-act="file">File it</button>' +
        (r.duplicate_of ? '<button class="btn btn-sm btn-outline-danger" data-act="discard">Yes, duplicate — remove</button>' : '') + '</div></div></div>';
    }).join("");
  }
  $("#reviewList").addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var card = b.closest(".rv"), x = state.items.filter(function (i) { return i.id === card.dataset.id; })[0];
    if (b.dataset.act === "discard") { x.discarded = true; x.resolved = true; toast("🗑 duplicate removed"); }
    else {
      var cat = $('[data-f="cat"]', card).value, client = $('[data-f="client"]', card).value;
      x.note = $('[data-f="note"]', card).value; x.resolved = true;
      x.result = Object.assign({}, x.result, { category: cat, categoryLabel: CATS[cat].label, billable: !!client, client: client || null });
      toast("📥 filed! " + esc(x.merchant || x.id));
    }
    card.classList.add("done"); updateBadges(); setTimeout(renderReview, 380);
  });

  // ---------- summary ----------
  var charts = {};
  function live() { return state.items.filter(function (x) { return x.result && !x.discarded; }); }
  function renderSummary() {
    var L = live(), total = 0, bill = 0, byCat = {}, byClient = {}, months = ["2026-01", "2026-02", "2026-03"], mB = [0, 0, 0], mO = [0, 0, 0];
    L.forEach(function (x) {
      total += x.total; byCat[x.result.category] = (byCat[x.result.category] || 0) + x.total;
      var mi = months.indexOf(x.date.slice(0, 7));
      if (x.result.billable) { bill += x.total; byClient[x.result.client] = byClient[x.result.client] || { n: 0, sum: 0 }; byClient[x.result.client].n++; byClient[x.result.client].sum += x.total; if (mi >= 0) mB[mi] += x.total; }
      else if (mi >= 0) mO[mi] += x.total;
    });
    var open = state.items.filter(function (x) { return x.result && x.result.review && !x.resolved; }).length;
    var dups = state.items.filter(function (x) { return x.result && x.result.duplicate_of; }).length;
    $("#kpis").innerHTML = [["", money(total), "Total spend (" + L.length + " receipts)"], ["k-bill", money(bill), "Billable to clients"], ["k-rev", open, "Still in Review queue"], ["k-dup", dups, "Possible duplicates found"]]
      .map(function (k) { return '<div class="col-6 col-lg-3"><div class="kpi ' + k[0] + '"><div class="v">' + k[1] + '</div><div class="l">' + k[2] + '</div></div></div>'; }).join("");
    var clientRows = Object.keys(byClient).map(function (c) { return "<tr><td>" + esc(c) + '</td><td class="num">' + byClient[c].n + '</td><td class="num">' + money(byClient[c].sum) + "</td></tr>"; }).join("");
    $("#clientTable").innerHTML = '<thead><tr><th>Client</th><th class="num">Receipts</th><th class="num">Amount to re-bill</th></tr></thead><tbody>' + (clientRows || '<tr><td colspan="3" class="text-body-secondary">Run the demo to see billable receipts.</td></tr>') + "</tbody>";
    var dark = document.documentElement.getAttribute("data-bs-theme") === "dark", ink = dark ? "#efe3cf" : "#3b2f22", grid = dark ? "rgba(239,227,207,.1)" : "rgba(59,47,34,.1)";
    var pal = ["#b4532a", "#4f7a3a", "#c58b16", "#5b7fa6", "#8a5a9e", "#3f8f8a", "#a0764a", "#6d6d6d", "#d48a9a"];
    var keys = Object.keys(CATS).filter(function (k) { return byCat[k] > 0; });
    Chart.defaults.color = ink; Chart.defaults.font.family = "system-ui, sans-serif";
    Object.keys(charts).forEach(function (k) { charts[k].destroy(); });
    charts.cat = new Chart($("#chCat"), { type: "doughnut", data: { labels: keys.map(function (k) { return CATS[k].label; }), datasets: [{ data: keys.map(function (k) { return +byCat[k].toFixed(2); }), backgroundColor: keys.map(function (k) { return pal[Object.keys(CATS).indexOf(k)]; }), borderColor: dark ? "#2c251d" : "#fffaf0", borderWidth: 2 }] },
      options: { maintainAspectRatio: false, cutout: "58%", plugins: { legend: { position: window.innerWidth < 576 ? "bottom" : "right", labels: { boxWidth: 10, font: { size: 11 } } } } } });
    charts.month = new Chart($("#chMonth"), { type: "bar", data: { labels: ["Jan", "Feb", "Mar"], datasets: [{ label: "Billable to clients", data: mB, backgroundColor: "#4f7a3a", borderRadius: 4 }, { label: "Own business costs", data: mO, backgroundColor: dark ? "#8a6a45" : "#c9a574", borderRadius: 4 }] },
      options: { maintainAspectRatio: false, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: grid }, ticks: { callback: function (v) { return "$" + v; } } } }, plugins: { legend: { position: "bottom", labels: { boxWidth: 10 } } } } });
  }
  function download(name, text) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  $("#csvAll").addEventListener("click", function () { download("receipts-q1-2026.csv", E.toCSV(live())); toast("⬇ CSV exported"); });
  $("#csvBill").addEventListener("click", function () { download("billable-q1-2026.csv", E.toCSV(live().filter(function (x) { return x.result.billable; }))); toast("⬇ Billable CSV exported"); });

  renderInbox();
})();
