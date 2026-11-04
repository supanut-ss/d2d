// Which conditions at pick time go with good or bad results? Reads the pick log from the site (picks logged before 4 Nov 2026
// have none of these fields and are skipped). Usage: node backtest/features.js [min picks per group, default 1]
const minN = Number(process.argv[2] || 1);
(async () => {
  const all = await fetch("https://drivetodev.online/matchdesk/api/picks/all").then(r => r.json());
  const S = all.filter(x => x.status === "settled" && x.anchor !== undefined && x.anchor !== null);
  console.log(`${all.length} picks, ${all.filter(x => x.status === "settled").length} settled, ${S.length} settled with the extra fields`);
  if (!S.length) return;
  const roi = a => a.reduce((t, x) => t + x.units, 0) / a.length * 100;
  const hit = a => { const w = a.reduce((t, x) => t + (x.winShare || 0), 0), l = a.reduce((t, x) => t + (x.lossShare || 0), 0); return w + l ? w / (w + l) * 100 : NaN; };
  const pred = a => a.reduce((t, x) => t + x.predictedPct, 0) / a.length;
  const f = v => Number.isFinite(v) ? v.toFixed(1) : "-";
  const group = (title, key) => {
    const g = {};
    S.forEach(x => { const k = key(x); if (k !== null) (g[k] = g[k] || []).push(x); });
    console.log("\n" + title);
    Object.keys(g).sort().forEach(k => { const a = g[k]; if (a.length >= minN) console.log("  " + k.padEnd(26), "n=" + String(a.length).padStart(3), " ROI " + f(roi(a)).padStart(6) + "%  hit " + f(hit(a)).padStart(5) + "%  expected " + f(pred(a)).padStart(5) + "%"); });
  };
  const hours = (a, b) => (new Date(a) - new Date(b)) / 36e5;
  group("market move toward (+) or against (-) the pick, points", x => x.move === null || x.move === undefined ? "no history" : x.move >= 1 ? "toward >= +1" : x.move <= -1 ? "against <= -1" : "flat");
  group("lineups", x => x.lineups === true ? "known" : x.lineups === false ? "expected, missing" : "too early");
  group("probability anchor", x => x.anchor);
  group("bookmakers", x => x.books === null ? null : x.books >= 8 ? "8+" : x.books >= 5 ? "5-7" : "3-4");
  group("odds age when logged", x => !x.oddsUpdated || !x.loggedAt ? null : hours(x.loggedAt, x.oddsUpdated) <= 3 ? "<= 3 h" : hours(x.loggedAt, x.oddsUpdated) <= 8 ? "3-8 h" : "> 8 h");
  group("logged before kickoff", x => { const h = hours(x.kickoffUtc, x.loggedAt); return h <= 3 ? "<= 3 h" : h <= 12 ? "3-12 h" : "> 12 h"; });
  group("best price over median", x => x.priceRatio === null ? null : x.priceRatio >= 1.06 ? ">= 1.06" : x.priceRatio >= 1.02 ? "1.02-1.06" : "< 1.02");
  group("Pinnacle vs other books (pts)", x => x.pCons === null ? null : Math.abs(x.marketPct / 100 - x.pCons) >= .02 ? ">= 2" : "< 2");
  group("games this season (smaller team)", x => x.curGames === null ? null : x.curGames >= 15 ? "15+" : x.curGames >= 8 ? "8-14" : "3-7");
})();
