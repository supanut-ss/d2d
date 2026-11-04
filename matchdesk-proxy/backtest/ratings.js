// Time-decayed team ratings (online Poisson attack/defence, Elo-style) against the current model.js. Same walk-forward rule:
// every match is predicted only from matches before it. Tunes on TRAIN seasons, reports the held-out TEST seasons.
//   node backtest/ratings.js
const { run, score, loadMatches, line, f3 } = require("./backtest");
const matches = loadMatches();
const TRAIN = new Set(["2022-23", "2023-24"]), TEST = new Set(["2024-25", "2025-26"]);
const MAXG = 10;

const pois = (lam) => { const p = [Math.exp(-lam)]; for (let k = 1; k <= MAXG; k++) p.push(p[k - 1] * lam / k); return p; };

// P = { ETA: step size, TAU: days for a rating to halve its distance to 0 (time decay), SEASON: extra pull to 0 at a new season, RHO: Dixon-Coles }
function runRatings(P, evalSeasons) {
  const att = new Map(), def = new Map(), last = new Map(), lg = new Map();
  const acc = [];
  const get = (m, k) => m.get(k) || 0;
  const decay = (team, t, season) => {
    const prev = last.get(team);
    if (prev) {
      const f = Math.pow(.5, (t - prev.t) / 864e5 / P.TAU) * (prev.season !== season ? P.SEASON : 1);
      att.set(team, get(att, team) * f); def.set(team, get(def, team) * f);
    }
    last.set(team, { t, season });
  };
  for (const m of matches) {
    const hk = m.league + "|" + m.home, ak = m.league + "|" + m.away, lk = m.league;
    decay(hk, m.date, m.season); decay(ak, m.date, m.season);
    const L = lg.get(lk) || { h: 0, a: 0, n: 0 };
    const Lh = L.n >= 30 ? L.h / L.n : 1.5, La = L.n >= 30 ? L.a / L.n : 1.2;
    const lh = Lh * Math.exp(get(att, hk) - get(def, ak)), la = La * Math.exp(get(att, ak) - get(def, hk));
    if (evalSeasons.has(m.season) && L.n >= 30) {
      const ph = pois(lh), pa = pois(la);
      let home = 0, draw = 0, away = 0, over = 0, sum = 0;
      for (let i = 0; i <= MAXG; i++) for (let j = 0; j <= MAXG; j++) {
        let p = ph[i] * pa[j];
        if (P.RHO) { if (i === 0 && j === 0) p *= 1 - lh * la * P.RHO; else if (i === 0 && j === 1) p *= 1 + lh * P.RHO; else if (i === 1 && j === 0) p *= 1 + la * P.RHO; else if (i === 1 && j === 1) p *= 1 - P.RHO; }
        sum += p;
        if (i > j) home += p; else if (i === j) draw += p; else away += p;
        if (i + j >= 3) over += p;
      }
      acc.push({ m, p: [home / sum, draw / sum, away / sum], over: over / sum, base: null, games: 0, lamTotal: lh + la });
    }
    // learn
    const eh = m.hg - lh, ea = m.ag - la, k = P.ETA;
    att.set(hk, get(att, hk) + k * eh / Math.max(lh, .5)); def.set(ak, get(def, ak) - k * eh / Math.max(lh, .5));
    att.set(ak, get(att, ak) + k * ea / Math.max(la, .5)); def.set(hk, get(def, hk) - k * ea / Math.max(la, .5));
    L.h += m.hg; L.a += m.ag; L.n++; lg.set(lk, L);
  }
  return acc;
}

// average the two models' probabilities for the same matches
function blend(a, b, w) {
  const bm = new Map(b.map(x => [x.m, x]));
  return a.filter(x => bm.has(x.m)).map(x => {
    const y = bm.get(x.m);
    return { m: x.m, p: x.p.map((v, i) => w * v + (1 - w) * y.p[i]), over: w * x.over + (1 - w) * y.over, base: null, games: 0, lamTotal: w * x.lamTotal + (1 - w) * y.lamTotal };
  });
}
const only = (acc, ref) => { const s = new Set(ref.map(x => x.m)); return acc.filter(x => s.has(x.m)); };

console.log(`${matches.length} matches`);
const grid = [];
for (const ETA of [.01, .015, .02, .03, .05]) for (const TAU of [500, 1000, 1e9]) for (const SEASON of [1, .8]) grid.push({ ETA, TAU, SEASON, RHO: 0 });
let best = null;
for (const P of grid) {
  const s = score(runRatings(P, TRAIN)), tot = s.ll + s.llOU;
  if (!best || tot < best.tot) best = { P, tot, s };
  console.log(`ETA ${P.ETA} TAU ${String(P.TAU).padEnd(6)} SEASON ${P.SEASON}  train 1X2 ${f3(s.ll)}  O/U ${f3(s.llOU)}`);
}
console.log("\nbest on train:", JSON.stringify(best.P));
for (const rho of [0, -.05, -.1]) {
  const s = score(runRatings(Object.assign({}, best.P, { RHO: rho }), TRAIN));
  console.log(`RHO ${rho}  train 1X2 ${f3(s.ll)}  O/U ${f3(s.llOU)}`);
}

console.log("\n== held-out TEST seasons, same matches for every row");
const cur = run(matches, {}, TEST), rat = runRatings(best.P, TEST);
const ref = only(cur, rat), rat2 = only(rat, cur);
console.log(line("current model.js", score(ref)));
console.log(line("ratings model", score(rat2)));
for (const w of [.25, .5, .75]) console.log(line(`blend ${w} ratings`, score(blend(rat2, ref, w))));
