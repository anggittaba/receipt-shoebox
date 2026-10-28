// Measures the engine. Usage: node scripts/evaluate.js [dev|heldout]
const E = require("../web/engine.js");
const D = require("../web/demo_receipts.js");
const fs = require("fs");
const which = process.argv[2] || "heldout";
let receipts, clients;
if (which === "heldout") { receipts = JSON.parse(fs.readFileSync(__dirname + "/../data/heldout.json")).receipts; clients = ["Northwind Studio", "Bluefin Labs"]; }
else { receipts = JSON.parse(fs.readFileSync(__dirname + "/../data/dev_gold.json")).map((g) => Object.assign({}, D.DEMO_RECEIPTS.find((r) => r.id === g.id), { gold: g })); clients = D.CLIENTS; }
const out = E.analyseAll(receipts, { clients });
const n = out.length; let cat = 0, bill = 0, rev = 0, all = 0; const miss = [];
let dupTP = 0, dupFP = 0, dupFN = 0, revTP = 0, revFP = 0, revFN = 0;
for (const x of out) {
  const g = x.gold, r = x.result;
  const c = r.category === g.category, b = r.billable === g.billable, v = r.review === g.review;
  cat += c; bill += b; rev += v; all += c && b && v && (r.duplicate_of === g.duplicate_of);
  if (g.duplicate_of && r.duplicate_of === g.duplicate_of) dupTP++; else if (g.duplicate_of) dupFN++; else if (r.duplicate_of) dupFP++;
  if (g.review && r.review) revTP++; else if (g.review) revFN++; else if (r.review) revFP++;
  if (!(c && b && v)) miss.push(`${x.id} ${x.merchant || "(blank)"}: ` + [!c && `cat ${r.category}≠${g.category}`, !b && `billable ${r.billable}≠${g.billable}`, !v && `review ${r.review}≠${g.review} [${r.reasons.join("; ")}]`].filter(Boolean).join(", "));
}
const res = { set: which, n, category: cat, billable: bill, review_routing: rev, all_correct: all,
  duplicates: { caught: dupTP, missed: dupFN, false_flags: dupFP }, review: { caught: revTP, missed: revFN, unnecessary: revFP } };
console.log(JSON.stringify(res, null, 1)); console.log("Misses:\n " + miss.join("\n "));
if (process.argv[3] === "--json") fs.writeFileSync(__dirname + `/../docs/results-${which}.json`, JSON.stringify(res, null, 1) + "\n");
