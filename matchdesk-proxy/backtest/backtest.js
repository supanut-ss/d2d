// Walk-forward backtest of wwwroot/model.js on past results (no odds: it measures how good the goal model's probabilities are).
// Every match is predicted only from matches played before it. Usage: node backtest/fetch-data.js && node backtest/backtest.js
const fs = require("fs"), path = require("path"), vm = require("vm");

// BASE = the settings in model.js now; the sweeps vary one value at a time
const BASE = { DISPERSION: .12, DC_RHO: 0, SHRINK_GAMES: 8, RW: .3, CARRY_WEIGHT: .6, TOTAL_K: .5, STRENGTH_K: 1 };
const MODEL_SRC = fs.readFileSync(path.join(__dirname, "..", "wwwroot", "model.js"), "utf8");

// model.js hard-codes the recent-form weight; expose it as a variable so it can be swept. Fails loudly if model.js changed.
function patched() {
  const swaps = [
    [".7*rate+.3*eq", "(1-RW)*rate+RW*eq"],
    // experiment: sharpen the home/away split of the goals (keeps the total), STRENGTH_K = 1 leaves the model as it is
    [" lh*=totalScale;la*=totalScale;", " lh*=totalScale;la*=totalScale; if(lh>0&&la>0){var rr=Math.pow(lh/la,STRENGTH_K),tt=lh+la;lh=tt*rr/(1+rr);la=tt/(1+rr)}"],
  ];
  let s = MODEL_SRC;
  for (const [a, b] of swaps) { if (!s.includes(a)) throw new Error("model.js changed, update the patch: " + a); s = s.replace(a, b); }
  return s;
}
const SRC = patched();

function loadMatches() {
  const dir = path.join(__dirname, "data"), out = [];
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
    const [season, code] = f.replace(".json", "").split("_");
    for (const m of JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")).matches || []) {
      const ft = m.score && m.score.ft;
      if (!ft) continue;
      out.push({ season, league: code, date: new Date(m.date + "T" + (m.time || "15:00") + ":00Z").getTime(), home: m.team1, away: m.team2, hg: ft[0], ag: ft[1] });
    }
  }
  return out.sort((a, b) => a.date - b.date);
}

// ---- team stats as of a date, in the shape API-Football returns (what model.js reads)
function statsOf(team, league, season, history, before, id) {
  const cur = (history.get(league + "|" + team) || []).filter(g => g.season === season && g.date < before);
  const side = s => {
    const list = s === "total" ? cur : cur.filter(g => g.home === (s === "home")), n = list.length;
    return { n, forAvg: n ? list.reduce((t, g) => t + g.gf, 0) / n : null, againstAvg: n ? list.reduce((t, g) => t + g.ga, 0) / n : null };
  };
  const sides = { home: side("home"), away: side("away"), total: side("total") };
  const fmt = v => v === null ? null : String(v);
  const wins = cur.filter(g => g.gf > g.ga).length, draws = cur.filter(g => g.gf === g.ga).length;
  return {
    league: { id }, team: { id: team },
    fixtures: { played: { home: sides.home.n, away: sides.away.n, total: sides.total.n }, wins: { total: wins }, draws: { total: draws } },
    goals: {
      for: { average: { home: fmt(sides.home.forAvg), away: fmt(sides.away.forAvg), total: fmt(sides.total.forAvg) } },
      against: { average: { home: fmt(sides.home.againstAvg), away: fmt(sides.away.againstAvg), total: fmt(sides.total.againstAvg) } },
    },
    _curPlayed: cur.length,
    _last: (history.get(league + "|" + team) || []).filter(g => g.date < before).slice(-10).reverse(),
  };
}
// recency-weighted goals of the last 10 (newest first), like teamInfoFrom
function recentOf(list) {
  let sw = 0, sf = 0, sa = 0;
  list.forEach((g, k) => { const w = Math.pow(.85, k); sw += w; sf += w * g.gf; sa += w * g.ga; });
  return sw ? { for: sf / sw, against: sa / sw, n: list.length } : null;
}

function run(matches, params, evalSeasons) {
  const P = Object.assign({}, BASE, params);
  const ctx = vm.createContext({ Math, Date, Map, Set, Number, String, Object, Array, JSON, isFinite, console });
  vm.runInContext(SRC, ctx);
  Object.assign(ctx, { DISPERSION: P.DISPERSION, DC_RHO: P.DC_RHO, SHRINK_GAMES: P.SHRINK_GAMES, RW: P.RW, CARRY_WEIGHT: P.CARRY_WEIGHT, TOTAL_K: P.TOTAL_K, STRENGTH_K: P.STRENGTH_K });
  const seasons = [...new Set(matches.map(m => m.season))].sort();
  const history = new Map(), leagueRows = new Map(), rates = new Map();
  const acc = [];
  const leagueId = c => c.split("").reduce((t, ch) => t * 31 + ch.charCodeAt(0), 7);
  for (const m of matches) {
    const lid = leagueId(m.league), prevSeason = seasons[seasons.indexOf(m.season) - 1];
    const rowsKey = m.league + "|" + m.season, rows = leagueRows.get(rowsKey) || [];
    if (evalSeasons.has(m.season)) {
      // league home/away goals per game so far this season (as the standings table gives them)
      if (rows.length >= 10) {
        const hf = rows.reduce((t, r) => t + r.hg, 0), af = rows.reduce((t, r) => t + r.ag, 0);
        ctx.leagueTable.set(lid, { home: hf / rows.length, away: af / rows.length, teams: 0, fromTable: true });
      } else ctx.leagueTable.set(lid, null);
      const hs = statsOf(m.home, m.league, m.season, history, m.date, lid);
      const as = statsOf(m.away, m.league, m.season, history, m.date, lid);
      // last season's full-season stats, as teams/statistics returns them (null for a promoted team)
      const prevOf = team => { const s = prevSeason && statsOf(team, m.league, prevSeason, history, Infinity, lid); return s && s._curPlayed ? { response: s } : null; };
      const rest = s => { const l = s._last[0]; return l && (m.date - l.date) / 864e5 < 3.5 ? .97 : 1; };
      ctx.__h = { response: hs }; ctx.__a = { response: as };
      ctx.__adj = { homeAtt: rest(hs), awayAtt: rest(as), homeRecent: recentOf(hs._last), awayRecent: recentOf(as._last), homePrev: prevOf(m.home), awayPrev: prevOf(m.away) };
      const model = vm.runInContext("modelFromTeamStats(__h,__a,__adj)", ctx);
      if (model) {
        const over = model.outcomes.reduce((t, o) => t + (o.total >= 3 ? o.p : 0), 0);
        const r = rates.get(rowsKey) || { h: 0, d: 0, a: 0, o: 0, n: 0 };
        acc.push({ m, p: [model.home, model.draw, model.away], over, base: r.n >= 20 ? [r.h / r.n, r.d / r.n, r.a / r.n, r.o / r.n] : null,
          games: model.curGames, lamTotal: model.total });
      }
    }
    // learn from the result
    rows.push(m); leagueRows.set(rowsKey, rows);
    const r = rates.get(rowsKey) || { h: 0, d: 0, a: 0, o: 0, n: 0 };
    r.n++;
    if (m.hg > m.ag) r.h++; else if (m.hg < m.ag) r.a++; else r.d++;
    if (m.hg + m.ag >= 3) r.o++;
    rates.set(rowsKey, r);
    for (const [t, home, gf, ga] of [[m.home, true, m.hg, m.ag], [m.away, false, m.ag, m.hg]]) {
      const k = m.league + "|" + t, list = history.get(k) || [];
      list.push({ date: m.date, season: m.season, home, gf, ga });
      history.set(k, list);
    }
  }
  return acc;
}

const ln = p => -Math.log(Math.max(1e-9, p));
const outcomeOf = m => m.hg > m.ag ? 0 : m.hg === m.ag ? 1 : 2;
function score(acc) {
  let n = 0, ll = 0, br = 0, llB = 0, brB = 0, nB = 0, llO = 0, llOB = 0, brO = 0, brOB = 0, goalErr = 0;
  for (const a of acc) {
    const y = outcomeOf(a.m), over = a.m.hg + a.m.ag >= 3 ? 1 : 0;
    n++;
    ll += ln(a.p[y]);
    br += a.p.reduce((t, p, i) => t + (p - (i === y ? 1 : 0)) ** 2, 0);
    llO += ln(over ? a.over : 1 - a.over);
    brO += (a.over - over) ** 2;
    goalErr += Math.abs(a.lamTotal - (a.m.hg + a.m.ag));
    if (a.base) {
      nB++;
      llB += ln(a.base[y]);
      brB += a.base.slice(0, 3).reduce((t, p, i) => t + (p - (i === y ? 1 : 0)) ** 2, 0);
      llOB += ln(over ? a.base[3] : 1 - a.base[3]);
      brOB += (a.base[3] - over) ** 2;
    }
  }
  return { n, ll: ll / n, br: br / n, llOU: llO / n, brOU: brO / n, mae: goalErr / n, nBase: nB, llBase: llB / nB, brBase: brB / nB, llOUBase: llOB / nB, brOUBase: brOB / nB };
}
const f3 = v => v.toFixed(4);
const line = (label, s) => `${label.padEnd(24)} n=${String(s.n).padStart(5)}  1X2 logloss ${f3(s.ll)} brier ${f3(s.br)} | O/U2.5 logloss ${f3(s.llOU)} brier ${f3(s.brOU)} | goals MAE ${s.mae.toFixed(3)}`;

module.exports = { run, score, loadMatches, BASE, line, f3, outcomeOf };

if (require.main === module) {
  const matches = loadMatches();
  console.log(`${matches.length} matches loaded`);
  const TRAIN = new Set(["2022-23", "2023-24"]), TEST = new Set(["2024-25", "2025-26"]), ALL = new Set([...TRAIN, ...TEST]);
  const grid = {
    DISPERSION: [0, .12, .3], DC_RHO: [0, -.05, -.1], SHRINK_GAMES: [5, 8, 12], RW: [0, .3, .5], CARRY_WEIGHT: [0, .3, .6, 1], TOTAL_K: [0, .25, .5, .75, 1],
  };
  const all = run(matches, {}, ALL), base = score(all);
  console.log("\n== current model.js settings, all evaluated seasons");
  console.log(line("model", base));
  console.log(`naive league-rate baseline:  1X2 logloss ${f3(base.llBase)} brier ${f3(base.brBase)} | O/U2.5 logloss ${f3(base.llOUBase)} brier ${f3(base.brOUBase)}  (n=${base.nBase})`);

  console.log("\n== by games played this season (min of the two teams), current settings");
  for (const [lo, hi] of [[0, 3], [3, 6], [6, 10], [10, 20], [20, 99]])
    console.log(line(`games ${lo}-${hi - 1}`, score(all.filter(a => a.games >= lo && a.games < hi))));

  console.log("\n== calibration of home/draw/away probabilities (all evaluated matches)");
  for (let lo = 0; lo < 1; lo += .1) {
    const pts = [];
    for (const a of all) a.p.forEach((p, i) => { if (p >= lo && p < lo + .1) pts.push([p, outcomeOf(a.m) === i ? 1 : 0]); });
    if (pts.length > 50) console.log(`${(lo * 100).toFixed(0).padStart(3)}-${(lo * 100 + 10).toFixed(0)}%  predicted ${(pts.reduce((t, x) => t + x[0], 0) / pts.length * 100).toFixed(1)}%  actual ${(pts.reduce((t, x) => t + x[1], 0) / pts.length * 100).toFixed(1)}%  n=${pts.length}`);
  }

  console.log("\n== one-at-a-time sweep on TRAIN seasons (lower logloss is better)");
  const best = {};
  for (const [name, values] of Object.entries(grid)) {
    let bestV = BASE[name], bestS = Infinity;
    for (const v of values) {
      const s = score(run(matches, { [name]: v }, TRAIN)), tot = s.ll + s.llOU;
      console.log(`${name.padEnd(13)} ${String(v).padEnd(6)} 1X2 ${f3(s.ll)}  O/U ${f3(s.llOU)}  ${v === BASE[name] ? "<- current" : ""}`);
      if (tot < bestS) { bestS = tot; bestV = v; }
    }
    best[name] = bestV;
  }
  console.log("\nbest per parameter on train:", JSON.stringify(best));
  console.log("\n== held-out TEST seasons (never used for choosing)");
  console.log(line("current settings", score(run(matches, {}, TEST))));
  console.log(line("tuned on train", score(run(matches, best, TEST))));
}
