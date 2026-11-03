// Downloads past results (openfootball/football.json on GitHub) into backtest/data. Usage: node backtest/fetch-data.js
const fs = require("fs"), path = require("path");
const LEAGUES = ["en.1", "en.2", "de.1", "de.2", "es.1", "es.2", "it.1", "it.2", "fr.1", "fr.2"];
const SEASONS = ["2021-22", "2022-23", "2023-24", "2024-25", "2025-26"];
const dir = path.join(__dirname, "data");
fs.mkdirSync(dir, { recursive: true });
(async () => {
  for (const season of SEASONS) for (const code of LEAGUES) {
    const file = path.join(dir, `${season}_${code}.json`);
    if (fs.existsSync(file)) continue;
    const url = `https://raw.githubusercontent.com/openfootball/football.json/master/${season}/${code}.json`;
    try {
      const res = await fetch(url);
      if (!res.ok) { console.log(res.status, season, code); continue; }
      fs.writeFileSync(file, await res.text());
      console.log("ok", season, code);
    } catch (e) { console.log("ERR", season, code, e.message); }
  }
})();
