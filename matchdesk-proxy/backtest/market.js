// Model against the market on what the server has recorded itself (match_history: model and market before kickoff, the last
// tracked price before kickoff as the closing price, and the final score). Usage:
//   curl -H "X-Job-Token: TOKEN" https://drivetodev.online/matchdesk/api/history/export > export.json
//   node backtest/market.js export.json
const fs = require("fs");
const rows = JSON.parse(fs.readFileSync(process.argv[2] || "export.json", "utf8")).filter(r => r.homeGoals !== null && r.model);
const ln = p => -Math.log(Math.max(1e-9, p));
const outcome = r => r.homeGoals > r.awayGoals ? 0 : r.homeGoals === r.awayGoals ? 1 : 2;

// closing 1X2 (de-margined snapshot) when there is one, else the market seen at analysis time
const market = r => {
  const c = r.close;
  if (c && c.h != null && c.d != null && c.a != null) return [c.h, c.d, c.a];
  const x = r.market && r.market.x;
  return x && x.h != null ? [x.h, x.d, x.a] : null;
};
const pairs = rows.map(r => ({ r, m: market(r) })).filter(p => p.m);
console.log(`${rows.length} fixtures with a score and a model, ${pairs.length} also with a 1X2 market`);
if (pairs.length < 200) console.log("(fewer than 200: treat everything below as noise)");
if (!pairs.length) process.exit(0);

const mean = f => pairs.reduce((t, p) => t + f(p), 0) / pairs.length;
const model = p => [p.r.model.home, p.r.model.draw, p.r.model.away];
console.log("\n1X2 log loss (lower is better)");
console.log("  model       ", mean(p => ln(model(p)[outcome(p.r)])).toFixed(4));
console.log("  market      ", mean(p => ln(p.m[outcome(p.r)])).toFixed(4));
console.log("blend w*market + (1-w)*model:");
for (const w of [0, .25, .5, .7, .85, 1])
  console.log(`  w=${w.toFixed(2)}     `, mean(p => ln(w * p.m[outcome(p.r)] + (1 - w) * model(p)[outcome(p.r)])).toFixed(4));

// over/under 2.5 against the closing price
const ou = rows.map(r => ({ r, m: r.close && r.close.o25 != null && r.close.u25 != null ? r.close.o25 / (r.close.o25 + r.close.u25) : null })).filter(p => p.m !== null && p.r.model.over25 != null);
if (ou.length) {
  const over = p => p.r.homeGoals + p.r.awayGoals >= 3 ? 1 : 0;
  const mo = f => ou.reduce((t, p) => t + f(p), 0) / ou.length;
  console.log(`\nO/U 2.5, ${ou.length} fixtures`);
  console.log("  model       ", mo(p => ln(over(p) ? p.r.model.over25 : 1 - p.r.model.over25)).toFixed(4));
  console.log("  market      ", mo(p => ln(over(p) ? p.m : 1 - p.m)).toFixed(4));
}
console.log("\nThe weight with the lowest blended log loss is the share of the market the final probability should carry.");
