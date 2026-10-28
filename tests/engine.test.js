const test = require("node:test"), assert = require("node:assert");
const fs = require("fs"), path = require("path"), cp = require("child_process");
const E = require("../web/engine.js"), D = require("../web/demo_receipts.js");
const ROOT = path.join(__dirname, "..");

test("demo: 28 receipts, each gets a category and a confidence", () => {
  const out = E.analyseAll(D.DEMO_RECEIPTS, { clients: D.CLIENTS });
  assert.strictEqual(out.length, 28);
  for (const x of out) { assert.ok(E.CATEGORIES[x.result.category]); assert.ok(x.result.confidence > 0 && x.result.confidence <= 1); }
});
test("billable only when the note names a client", () => {
  const r = E.analyse({ id: "T", merchant: "Blue Door Cafe", date: "2026-01-01", total: 9, text: "BLUE DOOR CAFE\nlunch", note: "lunch with Orbit Kitchen" }, { clients: D.CLIENTS });
  assert.strictEqual(r.billable, true); assert.strictEqual(r.client, "Orbit Kitchen");
  const r2 = E.analyse({ id: "T", merchant: "Blue Door Cafe", date: "2026-01-01", total: 9, text: "BLUE DOOR CAFE\nlunch", note: "" }, { clients: D.CLIENTS });
  assert.strictEqual(r2.billable, false);
});
test("duplicate photo is flagged and sent to review", () => {
  const out = E.analyseAll(D.DEMO_RECEIPTS, { clients: D.CLIENTS });
  const d = out.find((x) => x.id === "D11");
  assert.strictEqual(d.result.duplicate_of, "D10"); assert.strictEqual(d.result.review, true);
  assert.strictEqual(out.filter((x) => x.result.duplicate_of).length, 1);
});
test("unreadable receipt goes to review with low confidence", () => {
  const out = E.analyseAll(D.DEMO_RECEIPTS, { clients: D.CLIENTS });
  const d = out.find((x) => x.id === "D14");
  assert.ok(d.result.review); assert.ok(d.result.confidence <= 0.3);
});
test("'air' does not match inside other words", () => {
  const r = E.analyse({ id: "T", merchant: "Fix-It", date: "2026-01-01", total: 50, text: "FIX-IT\nchair repair", note: "" }, {});
  assert.notStrictEqual(r.category, "travel");
});
test("LLM hook is optional and a failing hook falls back to rules", () => {
  const r = E.analyse({ id: "T", merchant: "Volt", date: "2026-01-01", total: 10, text: "laptop", note: "" }, { llmHook: () => { throw new Error("no key"); } });
  assert.strictEqual(r.category, "equipment");
});
test("CSV export escapes commas and quotes", () => {
  const out = E.analyseAll([{ id: "X", merchant: 'Shop, "Best"', date: "2026-01-01", total: 1, text: "x", note: "" }], {});
  const csv = E.toCSV(out);
  assert.match(csv, /"Shop, ""Best"""/); assert.strictEqual(csv.trim().split("\n").length, 2);
});
test("published held-out numbers match a fresh evaluation", () => {
  const fresh = JSON.parse(cp.execFileSync("node", [path.join(ROOT, "scripts/evaluate.js"), "heldout"]).toString().split("\nMisses")[0]);
  const saved = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/results-heldout.json")));
  assert.deepStrictEqual(fresh, saved);
});
test("vendored libraries ship with their MIT licences", () => {
  for (const f of ["LICENSE-adminlte.txt", "LICENSE-bootstrap.txt", "LICENSE-chartjs.txt"]) assert.match(fs.readFileSync(path.join(ROOT, "web/vendor", f), "utf8"), /MIT|Permission is hereby granted/);
});
test("no private or brand names anywhere in the repo", () => {
  // stored reversed so the words themselves never appear in the repo
  const banned = ["teramodni", "tramafla", "ohsie", "sisaw", "gnalam", "kabel", "tnellecxe ecivres"].map((s) => s.split("").reverse().join(""));
  const files = cp.execFileSync("git", ["ls-files", "-co", "--exclude-standard"], { cwd: ROOT }).toString().split("\n").filter((f) => f && !f.startsWith("web/vendor/"));
  for (const f of files) { const t = fs.readFileSync(path.join(ROOT, f), "utf8").toLowerCase(); for (const b of banned) assert.ok(!t.includes(b), `${b} in ${f}`); }
});
