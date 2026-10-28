// Receipt Shoebox engine — the "AI part".
// Honest note: this is a rule/keyword engine, not a trained model. It reads the
// OCR-like text of a receipt and guesses a category, whether it is billable to a
// client, whether it is a duplicate, and whether a human should look at it.
// An optional LLM hook (llmHook) can be plugged in; it is UNTESTED (no API key).
(function (root) {
  var CATEGORIES = {
    software:       { label: "Software & subscriptions", words: ["hosting","cloud","subscription","license","licence","plan monthly","pro plan","font","image credits","credits","saas","domain","database","vps"] },
    travel:         { label: "Travel & transport", words: ["taxi","cab","fare","ticket","tram","rail","train","bus","air","airline","e-ticket","hotel","inn","room","night","parking","fuel","diesel","unleaded","trip"] },
    meals:          { label: "Meals", words: ["cafe","coffee","latte","cappuccino","flat white","croissant","muffin","lunch","dinner","bakery","noodle","restaurant","tea","lemonade","pie"] },
    office:         { label: "Office & printing", words: ["stationery","office supply","ink","staples","paper","notebook","pens","sticky","print","prints","courier","parcel","postage"] },
    equipment:      { label: "Equipment", words: ["monitor","laptop","webcam","keyboard","mouse","electronics","adapter","hdmi","usb-c","cable"] },
    phone_internet: { label: "Phone & internet", words: ["mobile plan","telecom","internet","mbps","data","gb","bill period"] },
    workspace:      { label: "Workspace", words: ["cowork","desk","membership","office rent"] },
    prof_services:  { label: "Professional services", words: ["legal","contract review","accountant","bookkeeping","translation","translator","proofreading","copy","fee","course"] },
    other:          { label: "Other / personal?", words: ["streaming","shampoo","candy","bouquet","florist","flower","gift","standard monthly","premium monthly"] }
  };
  var PERSONAL_HINTS = ["streaming","flix","bouquet","florist","flower","gift","shampoo","candy","premium monthly","standard monthly","soap","snacks"];

  function norm(s) {
    return String(s || "").toLowerCase()
      .replace(/0/g, "o").replace(/4/g, "a").replace(/3/g, "e").replace(/1/g, "i");
  }
  function has(text, w) {
    // word-ish match so "air" doesn't hit "repair"
    var re = new RegExp("(^|[^a-z])" + w.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "([^a-z]|$)");
    return re.test(text);
  }
  function scoreCategories(text) {
    var scores = {};
    Object.keys(CATEGORIES).forEach(function (k) {
      var s = 0, hits = [];
      CATEGORIES[k].words.forEach(function (w) { if (has(text, w)) { s += 1; hits.push(w); } });
      scores[k] = { score: s, hits: hits };
    });
    return scores;
  }
  function readability(r) {
    var t = String(r.text || "");
    var letters = (t.match(/[a-z]/gi) || []).length;
    var odd = (t.match(/[0-9#*]/g) || []).length;
    return letters === 0 ? 0 : letters / (letters + odd);
  }
  function findClient(note, clients) {
    var n = String(note || "").toLowerCase();
    for (var i = 0; i < clients.length; i++) if (n.indexOf(clients[i].toLowerCase()) >= 0) return clients[i];
    return null;
  }
  function daysBetween(a, b) { return Math.abs((new Date(a) - new Date(b)) / 86400000); }

  // Analyse one receipt. `seen` = receipts already processed (for duplicates & history).
  function analyse(r, opts) {
    opts = opts || {};
    var clients = opts.clients || [];
    var seen = opts.seen || [];
    var text = norm(r.merchant + "\n" + r.text);
    var scores = scoreCategories(text);
    var ranked = Object.keys(scores).sort(function (a, b) { return scores[b].score - scores[a].score; });
    var top = ranked[0], second = ranked[1];
    var topS = scores[top].score, secS = scores[second].score;
    var category = topS === 0 ? "other" : top;
    var confidence = topS === 0 ? 0.2 : Math.min(0.95, 0.5 + 0.15 * (topS - secS) + 0.05 * topS);
    var reasons = [];

    var read = readability(r);
    if (!r.merchant || read < 0.75) { reasons.push("Hard to read (blurry photo?)"); confidence = Math.min(confidence, 0.3); }
    if (topS > 0 && secS > 0 && topS - secS <= 1 && secS >= 2) reasons.push("Mixed items: could be " + CATEGORIES[top].label + " or " + CATEGORIES[second].label);
    if (PERSONAL_HINTS.some(function (w) { return text.indexOf(w) >= 0; })) {
      reasons.push("Looks personal — business expense?");
      if (category === "other") confidence = Math.min(confidence, 0.5);
    }
    if (r.total < 0) reasons.push("Refund — match it to the original purchase");

    // Billable
    var client = findClient(r.note, clients);
    var billable = !!client;
    // History: same merchant was billed to a client before, but this one has no note
    var prevBilled = seen.filter(function (s) { return s.merchant && s.merchant === r.merchant && s.result && s.result.billable; });
    if (!client && !r.note && prevBilled.length && (category === "travel" || category === "meals")) {
      reasons.push("Similar receipt was billed to " + prevBilled[0].result.client + " — this one too?");
    }

    // Duplicates: same merchant + same total + within 2 days + same text
    var dup = null;
    for (var i = 0; i < seen.length; i++) {
      var s = seen[i];
      if (s.merchant === r.merchant && s.total === r.total && daysBetween(s.date, r.date) <= 2 && norm(s.text) === norm(r.text)) { dup = s.id; break; }
    }
    if (dup) {
      reasons.push("Looks like a duplicate of " + dup);
      var orig = seen.filter(function (s) { return s.id === dup; })[0];
      if (orig && orig.result && orig.result.billable) { billable = true; client = orig.result.client; }
    }

    // Ask "what was this for?" when no note and it's a big or ambiguous spend
    var ask = !r.note && (Math.abs(r.total) >= 150 && (category === "travel" || category === "meals" || category === "other"));
    if (ask) reasons.push("Big spend with no note — what was this for?");

    if (confidence < 0.6 && reasons.length === 0) reasons.push("Low confidence category");
    var review = reasons.length > 0;

    var result = {
      category: category, categoryLabel: CATEGORIES[category].label,
      confidence: Math.round(confidence * 100) / 100,
      billable: billable, client: client, duplicate_of: dup,
      review: review, reasons: reasons,
      askNote: !r.note && (review || category === "meals" || category === "travel"),
      evidence: scores[category] ? scores[category].hits : []
    };
    if (typeof opts.llmHook === "function") {
      // UNTESTED: an LLM may refine the result. Must return the same shape.
      try { var refined = opts.llmHook(r, result); if (refined) result = refined; } catch (e) { /* keep rules */ }
    }
    return result;
  }

  function analyseAll(list, opts) {
    opts = opts || {};
    var seen = [];
    return list.map(function (r) {
      var res = analyse(r, { clients: opts.clients, seen: seen, llmHook: opts.llmHook });
      var out = Object.assign({}, r, { result: res });
      seen.push(out);
      return out;
    });
  }

  function toCSV(items) {
    var head = ["id","date","merchant","total","category","billable","client","duplicate_of","needs_review","note"];
    var esc = function (v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var rows = items.map(function (x) {
      var r = x.result;
      return [x.id, x.date, x.merchant, x.total.toFixed(2), r.categoryLabel, r.billable ? "yes" : "no", r.client || "", r.duplicate_of || "", r.review ? "yes" : "no", x.note || ""].map(esc).join(",");
    });
    return head.join(",") + "\n" + rows.join("\n") + "\n";
  }

  function quarterOf(d) { var m = new Date(d).getMonth(); return "Q" + (Math.floor(m / 3) + 1) + " " + new Date(d).getFullYear(); }

  var api = { CATEGORIES: CATEGORIES, analyse: analyse, analyseAll: analyseAll, toCSV: toCSV, quarterOf: quarterOf, norm: norm };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Shoebox = api;
})(this);
