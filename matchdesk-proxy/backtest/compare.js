// Candidate settings side by side, on train and held-out seasons. Usage: node backtest/compare.js
const { run, score, loadMatches, line, f3, outcomeOf } = require("./backtest");
const matches = loadMatches();
const TRAIN = new Set(["2022-23", "2023-24"]), TEST = new Set(["2024-25", "2025-26"]);
const candidates = {
  "current": {},
  "carry .6": { CARRY: .6 },
  "carry .6, form off": { CARRY: .6, FORM_K: 0 },
  "carry .6, form off, rho 0": { CARRY: .6, FORM_K: 0, DC_RHO: 0 },
  "...+ shrink 8": { CARRY: .6, FORM_K: 0, DC_RHO: 0, SHRINK_GAMES: 8 },
  "...+ shrink 12": { CARRY: .6, FORM_K: 0, DC_RHO: 0, SHRINK_GAMES: 12 },
  "...+ shrink 8, disp .3": { CARRY: .6, FORM_K: 0, DC_RHO: 0, SHRINK_GAMES: 8, DISPERSION: .3 },
  "...+ shrink 8, disp .5": { CARRY: .6, FORM_K: 0, DC_RHO: 0, SHRINK_GAMES: 8, DISPERSION: .5 },
};
for (const [label, seasons] of [["TRAIN 2022-23..2023-24", TRAIN], ["TEST 2024-25..2025-26 (held out)", TEST]]) {
  console.log("\n== " + label);
  let first = true;
  for (const [name, params] of Object.entries(candidates)) {
    const acc = run(matches, params, seasons), s = score(acc);
    if (first) { console.log(`naive league-rate baseline:  1X2 logloss ${f3(s.llBase)} | O/U2.5 logloss ${f3(s.llOUBase)}`); first = false; }
    console.log(line(name, s));
  }
}
console.log("\n== early season with carry .6 vs current (min games played by the two teams)");
for (const [name, params] of [["current", {}], ["carry .6", { CARRY: .6 }]]) {
  const acc = run(matches, params, new Set([...TRAIN, ...TEST]));
  for (const [lo, hi] of [[0, 3], [3, 6], [6, 10], [10, 99]]) { const s = score(acc.filter(a => a.games >= lo && a.games < hi)); console.log(`${name.padEnd(9)} games ${lo}-${hi - 1}`.padEnd(24), `n=${s.n}  1X2 ${f3(s.ll)}  vs naive ${f3(s.llBase)}   O/U ${f3(s.llOU)} vs naive ${f3(s.llOUBase)}`); }
}
console.log("\n== O/U 2.5: how much of the model's probability helps? p = w*model + (1-w)*league rate (carry .6)");
const acc = run(matches, { CARRY: .6, FORM_K: 0, DC_RHO: 0 }, new Set([...TRAIN, ...TEST])).filter(a => a.base);
for (const w of [0, .25, .5, .75, 1]) {
  const ll = acc.reduce((t, a) => { const p = w * a.over + (1 - w) * a.base[3], o = a.m.hg + a.m.ag >= 3 ? 1 : 0; return t - Math.log(o ? p : 1 - p); }, 0) / acc.length;
  console.log(`w=${w}  logloss ${f3(ll)}`);
}
