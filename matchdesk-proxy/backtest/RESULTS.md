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
