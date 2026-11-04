// Does the model under-rate favourites and over-rate underdogs? Sharpen the home/away split (STRENGTH_K) and look at calibration and log loss.
const { run, score, loadMatches, outcomeOf, f3 } = require("./backtest");
const matches = loadMatches();
const TRAIN = new Set(["2022-23", "2023-24"]), TEST = new Set(["2024-25", "2025-26"]);
const bucket = (acc, lo, hi) => {
  const pts = [];
  for (const a of acc) a.p.forEach((p, i) => { if (p >= lo && p < hi) pts.push([p, outcomeOf(a.m) === i ? 1 : 0]); });
  return pts.length ? `${(pts.reduce((t, x) => t + x[0], 0) / pts.length * 100).toFixed(1)}->${(pts.reduce((t, x) => t + x[1], 0) / pts.length * 100).toFixed(1)}` : "-";
};
for (const k of [1, 1.1, 1.2, 1.3, 1.4, 1.6]) {
  const tr = score(run(matches, { STRENGTH_K: k }, TRAIN)), accTe = run(matches, { STRENGTH_K: k }, TEST), te = score(accTe);
  console.log(`K=${k}  train 1X2 ${f3(tr.ll)}  test 1X2 ${f3(te.ll)} brier ${f3(te.br)} O/U ${f3(te.llOU)} | test pred->actual: 10-20% ${bucket(accTe, .1, .2)}  60-70% ${bucket(accTe, .6, .7)}  70-80% ${bucket(accTe, .7, .8)}`);
}
