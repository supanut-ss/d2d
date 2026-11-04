// What the two candidate guards would have done to the picks already logged (in-sample, so it can only say what they would have removed).
//   node backtest/rules.js            (reads the live pick log from the site)
const MARKET_WEIGHT = .7, MARKET_WEIGHT_MAX = .9, MIN_EV = 2;
const marketWeight = odds => Math.min(MARKET_WEIGHT_MAX, MARKET_WEIGHT + Math.max(0, odds - 2.2) * .1);

(async () => {
  const all = await fetch("https://drivetodev.online/matchdesk/api/picks/all").then(r => r.json());
  const S = all.filter(x => x.status === "settled");
  const sideOf = x => {
    if (x.market === "OU") return /Under|ต่ำ/.test(x.label) ? "under" : "over";
    const m = /([+-]?\d+(?:\.\d+)?)$/.exec(x.label), line = m ? Number(m[1]) : 0;
    return line > 0 ? "take" : line < 0 ? "give" : "level";
  };
  const roi = a => a.length ? a.reduce((t, x) => t + x.units, 0) / a.length * 100 : NaN;
  const hit = a => { const w = a.reduce((t, x) => t + (x.winShare || 0), 0), l = a.reduce((t, x) => t + (x.lossShare || 0), 0); return w + l ? w / (w + l) * 100 : NaN; };
  const f = v => Number.isFinite(v) ? v.toFixed(1) : "-";
  const show = (label, a) => console.log(label.padEnd(44), "n=" + String(a.length).padStart(3), " ROI " + f(roi(a)).padStart(6) + "%  hit " + f(hit(a)).padStart(5) + "%  units " + f(a.reduce((t, x) => t + x.units, 0)).padStart(6));

  // pBlend = w*pMarket + (1-w)*pModel at the price logged: recover pModel, then re-blend with a heavier market weight
  const reblend = (x, w) => {
    const w0 = marketWeight(x.odds), pm = x.marketPct / 100, pb = x.predictedPct / 100;
    const pModel = (pb - w0 * pm) / (1 - w0), p = w * pm + (1 - w) * pModel;
    return (p * x.odds - 1) * 100;
  };

  console.log(`${S.length} settled picks`);
  show("as logged", S);
  for (const cap of [10, 8, 7, 6]) show(`EV <= ${cap}%`, S.filter(x => x.evPct <= cap));
  for (const w of [.8, .9]) show(`take side: market weight ${w}, EV >= ${MIN_EV}%`, S.filter(x => sideOf(x) !== "take" || reblend(x, w) >= MIN_EV));
  for (const w of [.8, .9]) show(`all sides: market weight ${w}, EV >= ${MIN_EV}%`, S.filter(x => reblend(x, w) >= MIN_EV));
  show("EV <= 7% and take side weight 0.9", S.filter(x => x.evPct <= 7 && (sideOf(x) !== "take" || reblend(x, .9) >= MIN_EV)));
  console.log("\nwhat each rule removes:");
  show("removed by EV > 7%", S.filter(x => x.evPct > 7));
  show("removed by take-side weight 0.9", S.filter(x => sideOf(x) === "take" && reblend(x, .9) < MIN_EV));
  show("take side, all", S.filter(x => sideOf(x) === "take"));
  show("give side, all", S.filter(x => sideOf(x) === "give"));
})();
