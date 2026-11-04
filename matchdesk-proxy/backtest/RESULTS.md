# Backtest of the goal model (model.js)

Run: `node backtest/fetch-data.js && node backtest/backtest.js && node backtest/compare.js`

Data: openfootball results, 10 leagues (England 1-2, Germany 1-2, Spain 1-2, Italy 1-2, France 1-2), seasons 2022-23 to 2025-26 evaluated (2021-22 only as history), 11,803 matches. Walk-forward: each match is predicted from earlier matches only. Train = 2022-23 and 2023-24, held-out test = 2024-25 and 2025-26.

Limits: league matches only (no cups, no Asia), no odds (so no comparison with the market and no ROI), no injuries, xG or lineups (production adds those). It measures the quality of the model's probabilities, not whether it beats bookmakers.

## What it showed (log loss, lower is better)

| | 1X2 held-out | O/U 2.5 held-out |
|---|---|---|
| naive league rate | 1.0729 | 0.6902 |
| current model.js | 1.0368 | 0.6962 |
| + last season's team stats at weight 0.6 | 1.0237 | 0.6922 |
| + form factor off | 1.0234 | 0.6925 |
| + Dixon-Coles rho 0 | 1.0216 | 0.6925 |
| + shrink games 8 | 1.0219 | 0.6894 |

- The model beats the naive rate on 1X2 and is calibrated between 20% and 50%; above 50% it is a little overconfident (54.4% predicted, 51.9% won).
- **Carrying last season's stats into the current one is the biggest gain** and holds on the held-out seasons. It matters most early in the season (first 3 games: 1.0900 to 1.0493).
- The form factor (recent W/D/L multiplier) does not help.
- **The O/U 2.5 probability has no skill over the league base rate** (0.6962 vs 0.6902). Mixing it 50/50 with the league rate is better than either (0.6836 on all evaluated seasons).
- Dispersion and the recency weight change little.

## Changes made to model.js after this backtest

- Last season's team statistics are blended in at weight 0.6 per game (`withCarry`; the page and the daily job fetch them with `season-1`, `carry=1` keeps the answer 7 days on the server). A team with no last-season data (promoted) is left as before.
- The form factor was removed; `DC_RHO` is 0; `SHRINK_GAMES` is 8.
- The match total goals is pulled halfway to the league total (`TOTAL_K = .5`): over/under 2.5 log loss on the held-out seasons went from 0.6894 to 0.6852 (the league rate alone: 0.6902).
- Ranking rule "early": the less-played team needs 3 games this season (`MIN_CUR_GAMES`) and at least 6 games of data counting the carried-over ones (`MIN_GAMES`).

Held-out seasons after the changes (`node backtest/backtest.js`): 1X2 log loss 1.0219 (naive 1.0729, before 1.0368), O/U 2.5 0.6852.

## Live picks after 58 settled (4 Nov 2026) and a test of "too flat"

- Overall: ROI +0.2% (error +-11.8), win rate 49.5% against 51.6% expected, average CLV -0.12% (52% positive). Not distinguishable from the market yet.
- Handicap 42 picks: ROI -10.5%; picks that receive the handicap (take, underdogs) hit about 33% against about 52% expected (18 picks); picks that give the handicap are fine (+4%, 19 picks). All 16 over/under picks were unders (ROI +28%, 69% hit): too few to trust either way.
- Higher EV did not do better: EV 7-13% hit 17% (5 picks), EV 3.5-5% ROI -23%, EV below 3.5% ROI +16%. The larger the gap to the market, the more it looks like model error.
- Calibration of the 55-65% bucket: expected 57.6%, won 43.5% (14 picks).
- Backtest check (`node backtest/strength.js`): the model is a little too flat at the extremes (a 10-20% side wins 14.1% of the time vs 16.6% predicted; a 70-80% side wins 81.5% vs 73.7%). Sharpening the home/away split by K=1.1 improves log loss only from 1.0216 to 1.0211, K>=1.3 is worse, so a global fix for the flatness is worth almost nothing.

## Guard trial (4 Nov 2026)

`node backtest/rules.js` replays two candidate guards on the 58 settled picks (in-sample: they were chosen after seeing these picks, so this only shows what they remove):

- EV gap to the market at most 7%: removes 5 picks (ROI -41.8%, 1 win in 6 shares).
- Underdog side (receives the handicap) must keep EV >= 2% with the market at 90% of the blend: removes 12 picks (ROI -33.0%).
- Both together keep 41 picks at ROI +15.1% (win rate 59.1%) against +0.2% for all 58. This is selection on the same data and proves nothing by itself.

So the guards are **not applied to what is logged or shown**. `PickLog.PassesGuard` marks every pick instead, and System results shows ROI and win rate of passing and failing picks, split at `PickLog.GuardSinceUtc`: only picks logged after it are an honest test. `GET /api/analysis/lean-stats` reports how often the H/A/O/L letters were right on finished fixtures.

## Time-decayed team ratings (4 Nov 2026)

`node backtest/ratings.js` fits online Poisson attack/defence ratings (one step per match, optional time decay, league home/away means) and compares them with model.js on the same 6,409 held-out matches (2024-25, 2025-26). Step size and decay were tuned on 2022-23 and 2023-24 only; 2021-22 is warm-up.

| Model | 1X2 log loss | O/U 2.5 log loss |
|---|---|---|
| model.js now | 1.0208 | 0.6851 |
| ratings (step .03, no decay) | 1.0114 | 0.6873 |
| 50/50 blend | 1.0132 | 0.6839 |

- Ratings are about 0.009 better on 1X2 and about 0.002 worse on over/under. Time decay did not help: the best setting was no decay (a longer memory is better), and the Dixon-Coles rho changed nothing.
- The 50/50 blend gets most of the 1X2 gain and the best O/U (0.6839), so the two models make different errors.
- The gain is small next to the roughly 0.04 gap to the market, and it is on results only (no odds), so it says nothing yet about picks beating the closing line. Not applied to production.
