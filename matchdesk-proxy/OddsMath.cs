using System.Globalization;
using System.Text.Json;

namespace Matchdesk.Proxy;

/// <summary>
/// Market probabilities per line from an API-Football /odds item. Each line is anchored on Pinnacle when it quotes it
/// (the sharpest book), otherwise on the average of the books that do.
/// </summary>
public static class OddsMath
{
    public sealed record Ladders(Dictionary<string, double> Ah, Dictionary<string, double> Ou, int Books);

    public static string Key(double line)
    {
        var v = Math.Round(line, 2);
        if (v == 0) v = 0;   // no "-0"
        return v.ToString("0.##", CultureInfo.InvariantCulture);
    }

    private static bool TryOdd(JsonElement v, out double odd) =>
        double.TryParse(v.GetProperty("odd").GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out odd) && odd > 1;

    public static Ladders Parse(JsonElement item)
    {
        // line -> (isPinnacle, probability) per bookmaker
        var ah = new Dictionary<string, List<(bool Pin, double P)>>();
        var ou = new Dictionary<string, List<(bool Pin, double P)>>();
        var books = 0;

        foreach (var book in item.GetProperty("bookmakers").EnumerateArray())
        {
            var pin = (book.GetProperty("name").GetString() ?? "").Contains("Pinnacle", StringComparison.OrdinalIgnoreCase);
            var counted = false;
            foreach (var bet in book.GetProperty("bets").EnumerateArray())
            {
                var name = (bet.GetProperty("name").GetString() ?? "").Trim();
                if (name.Equals("Asian Handicap", StringComparison.OrdinalIgnoreCase))
                {
                    counted |= AddAsianHandicap(bet, pin, ah);
                }
                else if (name.Equals("Goals Over/Under", StringComparison.OrdinalIgnoreCase))
                {
                    counted |= AddOverUnder(bet, pin, ou);
                }
            }
            if (counted) books++;
        }
        return new Ladders(Anchor(ah), Anchor(ou), books);
    }

    private static Dictionary<string, double> Anchor(Dictionary<string, List<(bool Pin, double P)>> lines)
    {
        var result = new Dictionary<string, double>();
        foreach (var (line, list) in lines)
        {
            var pins = list.Where(x => x.Pin).ToList();
            result[line] = Math.Round(pins.Count > 0 ? pins.Average(x => x.P) : list.Average(x => x.P), 4);
        }
        return result;
    }

    private static bool AddOverUnder(JsonElement bet, bool pin, Dictionary<string, List<(bool Pin, double P)>> into)
    {
        var over = new Dictionary<string, double>();
        var under = new Dictionary<string, double>();
        foreach (var v in bet.GetProperty("values").EnumerateArray())
        {
            if (!TryOdd(v, out var odd)) continue;
            var label = v.GetProperty("value").ToString().Trim();
            var parts = label.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length != 2 || !double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var line)) continue;
            if (parts[0].Equals("Over", StringComparison.OrdinalIgnoreCase)) over[Key(line)] = odd;
            else if (parts[0].Equals("Under", StringComparison.OrdinalIgnoreCase)) under[Key(line)] = odd;
        }
        var any = false;
        foreach (var (line, o) in over)
        {
            if (!under.TryGetValue(line, out var u)) continue;
            var s = 1 / o + 1 / u;
            if (s < 1 || s > 1.15) continue;
            if (!into.TryGetValue(line, out var list)) into[line] = list = [];
            list.Add((pin, 1 / o / s));
            any = true;
        }
        return any;
    }

    /// <summary>
    /// Bookmakers label the away side either with the home line ("Away -0.5" = away +0.5) or with its own line.
    /// Per bookmaker, keep the pairing whose two prices form a sane two-way market (overround 0-15%).
    /// </summary>
    private static bool AddAsianHandicap(JsonElement bet, bool pin, Dictionary<string, List<(bool Pin, double P)>> into)
    {
        var home = new Dictionary<string, double>();
        var away = new Dictionary<string, double>();
        foreach (var v in bet.GetProperty("values").EnumerateArray())
        {
            if (!TryOdd(v, out var odd)) continue;
            var label = v.GetProperty("value").ToString().Trim();
            var parts = label.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length != 2 || !double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var line)) continue;
            if (parts[0].Equals("Home", StringComparison.OrdinalIgnoreCase)) home[Key(line)] = odd;
            else if (parts[0].Equals("Away", StringComparison.OrdinalIgnoreCase)) away[Key(line)] = odd;
        }

        List<(string Line, double H, double A)> Pair(bool sameLabel)
        {
            var res = new List<(string, double, double)>();
            foreach (var (k, h) in home)
            {
                var ak = sameLabel ? k : Key(-double.Parse(k, CultureInfo.InvariantCulture));
                if (!away.TryGetValue(ak, out var a)) continue;
                var s = 1 / h + 1 / a;
                if (s >= 1 && s <= 1.15) res.Add((k, h, a));
            }
            return res;
        }

        var same = Pair(true);
        var own = Pair(false);
        var chosen = same.Count > own.Count ? same : own;
        foreach (var (line, h, a) in chosen)
        {
            var s = 1 / h + 1 / a;
            if (!into.TryGetValue(line, out var list)) into[line] = list = [];
            list.Add((pin, 1 / h / s));
        }
        return chosen.Count > 0;
    }
}
