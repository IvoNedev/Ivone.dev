using HtmlAgilityPack;
using ivone.dev.Data.Contexts;
using Ivone.dev.Data.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using System.Globalization;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

namespace Ivone.dev.Pages
{

    public class SofiaPropsModel : PageModel
    {
        private readonly ILogger<SofiaPropsModel> _logger;
        private readonly AppDbContext _db;

        public SofiaPropsModel(ILogger<SofiaPropsModel> logger, AppDbContext db)
        {
            _logger = logger;
            _db = db;
        }

        public List<string> AllAreas { get; set; }
        public List<string> AllDates { get; set; }
        public string StatsJson { get; set; }

        public async Task OnGetAsync()
        {
            // 1) Query the DB for every row in RegionStats:
            var stats = await _db.RegionStats
                .AsNoTracking()
                .Select(r => new
                {
                    Area = r.Region,
                    Date = r.StatDate.ToString("d.M.yyyy", CultureInfo.InvariantCulture),
                    Price1 = r.Price1,
                    Price1PerSqm = r.Price1PerSqm,
                    Price2 = r.Price2,
                    Price2PerSqm = r.Price2PerSqm,
                    Price3 = r.Price3,
                    Price3PerSqm = r.Price3PerSqm
                })
                .ToListAsync();

            // 2) Build AllAreas (alphabetical by Bulgarian locale)
            AllAreas = stats
       .Select(s => s.Area)
       .Distinct()
       .OrderBy(a =>
       {
           // put anything that doesn't begin with a Cyrillic letter into “group 1”
           // (Cyrillic letters are in Unicode range U+0400–U+04FF)
           return Regex.IsMatch(a, "^[\u0400-\u04FF]") ? 0 : 1;
       })
       .ThenBy(
           a => a,
           StringComparer.Create(new CultureInfo("bg-BG"), false)
       )
       .ToList();

            // 3) Build AllDates (distinct strings, sorted descending so newest → top of dropdown)
            AllDates = stats
                .Select(s => s.Date)   // e.g. "26.12.2019"
                .Distinct()
                .OrderByDescending(d =>
                {
                    DateTime.TryParseExact(d, "d.M.yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt);
                    return dt;
                })
                .ToList();

            // 4) Serialize the array of all stats into JSON for client‐side
            StatsJson = JsonConvert.SerializeObject(stats);
        }
    }
}




//public async Task SCRAPERDONTRUNITS44ROWS()
//{
//    // 1) All dates from your <option> lists
//    string[] dates = new[]
// {
//                // 2025
//                "29.5.2025","22.5.2025","15.5.2025","8.5.2025","1.5.2025",
//                "24.4.2025","17.4.2025","10.4.2025","3.4.2025","27.3.2025",
//                "20.3.2025","13.3.2025","6.3.2025","27.2.2025","20.2.2025",
//                "13.2.2025","6.2.2025","30.1.2025","23.1.2025","16.1.2025",
//                "9.1.2025","2.1.2025",

//                // 2024
//                "26.12.2024","19.12.2024","12.12.2024","5.12.2024","28.11.2024",
//                "21.11.2024","14.11.2024","7.11.2024","31.10.2024","24.10.2024",
//                "17.10.2024","10.10.2024","3.10.2024","19.9.2024","12.9.2024",
//                "5.9.2024","29.8.2024","22.8.2024","15.8.2024","8.8.2024",
//                "1.8.2024","25.7.2024","18.7.2024","11.7.2024","4.7.2024",
//                "27.6.2024","20.6.2024","13.6.2024","6.6.2024","30.5.2024",
//                "23.5.2024","16.5.2024","9.5.2024","2.5.2024","25.4.2024",
//                "18.4.2024","11.4.2024","4.4.2024","28.3.2024","21.3.2024",
//                "14.3.2024","7.3.2024","29.2.2024","22.2.2024","15.2.2024",
//                "8.2.2024","1.2.2024","25.1.2024","18.1.2024","11.1.2024",
//                "4.1.2024",

//                // 2023
//                "28.12.2023","21.12.2023","14.12.2023","7.12.2023","30.11.2023",
//                "23.11.2023","16.11.2023","9.11.2023","2.11.2023","26.10.2023",
//                "19.10.2023","12.10.2023","5.10.2023","28.9.2023","21.9.2023",
//                "14.9.2023","7.9.2023","31.8.2023","24.8.2023","17.8.2023",
//                "10.8.2023","3.8.2023","27.7.2023","20.7.2023","13.7.2023",
//                "6.7.2023","29.6.2023","22.6.2023","15.6.2023","8.6.2023",
//                "1.6.2023","25.5.2023","18.5.2023","11.5.2023","4.5.2023",
//                "27.4.2023","20.4.2023","13.4.2023","6.4.2023","30.3.2023",
//                "23.3.2023","16.3.2023","9.3.2023","2.3.2023","23.2.2023",
//                "16.2.2023","9.2.2023","2.2.2023","26.1.2023","19.1.2023",
//                "12.1.2023","5.1.2023",

//                // 2022
//                "29.12.2022","22.12.2022","15.12.2022","8.12.2022","1.12.2022",
//                "24.11.2022","17.11.2022","10.11.2022","3.11.2022","27.10.2022",
//                "20.10.2022","13.10.2022","6.10.2022","29.9.2022","22.9.2022",
//                "15.9.2022","8.9.2022","1.9.2022","25.8.2022","18.8.2022",
//                "11.8.2022","4.8.2022","29.7.2022","21.7.2022","14.7.2022",
//                "7.7.2022","30.6.2022","23.6.2022","16.6.2022","9.6.2022",
//                "2.6.2022","26.5.2022","19.5.2022","12.5.2022","5.5.2022",
//                "28.4.2022","21.4.2022","14.4.2022","7.4.2022","31.3.2022",
//                "24.3.2022","17.3.2022","10.3.2022","3.3.2022","24.2.2022",
//                "17.2.2022","10.2.2022","3.2.2022","27.1.2022","20.1.2022",
//                "13.1.2022","6.1.2022",

//                // 2021
//                "30.12.2021","23.12.2021","16.12.2021","9.12.2021","2.12.2021",
//                "25.11.2021","18.11.2021","11.11.2021","4.11.2021","28.10.2021",
//                "21.10.2021","14.10.2021","7.10.2021","30.9.2021","23.9.2021",
//                "16.9.2021","9.9.2021","2.9.2021","26.8.2021","19.8.2021",
//                "12.8.2021","5.8.2021","29.7.2021","22.7.2021","15.7.2021",
//                "8.7.2021","1.7.2021","24.6.2021","17.6.2021","10.6.2021",
//                "3.6.2021","27.5.2021","20.5.2021","13.5.2021","6.5.2021",
//                "29.4.2021","22.4.2021","15.4.2021","8.4.2021","1.4.2021",
//                "25.3.2021","18.3.2021","11.3.2021","4.3.2021","25.2.2021",
//                "18.2.2021","11.2.2021","4.2.2021","28.1.2021","21.1.2021",
//                "14.1.2021","7.1.2021",

//                // 2020
//                "31.12.2020","24.12.2020","17.12.2020","10.12.2020","3.12.2020",
//                "26.11.2020","19.11.2020","12.11.2020","5.11.2020","29.10.2020",
//                "22.10.2020","15.10.2020","8.10.2020","1.10.2020","24.9.2020",
//                "17.9.2020","10.9.2020","3.9.2020","27.8.2020","20.8.2020",
//                "13.8.2020","6.8.2020","30.7.2020","23.7.2020","16.7.2020",
//                "9.7.2020","2.7.2020","25.6.2020","18.6.2020","11.6.2020",
//                "4.6.2020","28.5.2020","21.5.2020","14.5.2020","7.5.2020",
//                "30.4.2020","23.4.2020","16.4.2020","9.4.2020","2.4.2020",
//                "26.3.2020","19.3.2020","12.3.2020","5.3.2020","27.2.2020",
//                "13.2.2020","6.2.2020","30.1.2020","23.1.2020","16.1.2020",
//                "9.1.2020","2.1.2020",

//                // 2019
//                "26.12.2019","19.12.2019","12.12.2019","5.12.2019","28.11.2019",
//                "21.11.2019","14.11.2019","7.11.2019","31.10.2019","24.10.2019",
//                "17.10.2019","10.10.2019","3.10.2019","26.9.2019","19.9.2019",
//                "12.9.2019","5.9.2019","29.8.2019","22.8.2019","15.8.2019",
//                "8.8.2019","1.8.2019","25.7.2019","18.7.2019","11.7.2019",
//                "4.7.2019","27.6.2019","20.6.2019","13.6.2019","6.6.2019",
//                "30.5.2019","23.5.2019","16.5.2019","9.5.2019","2.5.2019",
//                "25.4.2019","18.4.2019","11.4.2019","4.4.2019","28.3.2019",
//                "21.3.2019","14.3.2019","7.3.2019","28.2.2019","21.2.2019",
//                "14.2.2019","7.2.2019","31.1.2019","24.1.2019","17.1.2019",
//                "10.1.2019","3.1.2019"
//            };

//    // 2) URL template (town=София is already URL-encoded)
//    const string baseUrl =
//        "https://www.imot.bg/pcgi/imot.cgi?act=14&pn=0&town=%D1%EE%F4%E8%FF&year={0}&date={1}";

//    var http = _httpFactory.CreateClient();
//    var rng = new Random();

//    foreach (var d in dates)
//    {
//        // Parse "d.M.yyyy" → DateTime
//        if (!DateTime.TryParseExact(
//                d, "d.M.yyyy", CultureInfo.InvariantCulture,
//                DateTimeStyles.None, out var statDate))
//        {
//            _logger.LogWarning("Skipping invalid date format: {Date}", d);
//            continue;
//        }

//        var url = string.Format(baseUrl, statDate.Year, d);
//        string html;



//        using var resp = await http.GetAsync(url);
//        using var stream = await resp.Content.ReadAsStreamAsync();
//        var doc = new HtmlDocument();
//        doc.Load(stream, Encoding.GetEncoding("windows-1251"));

//        // Select <tr> rows that have a <a class="tabStatList"> (region link)
//        var rows = doc
//            .DocumentNode
//            .SelectNodes("//table[@id='tableStats']//tr[td/a[contains(@class,'tabStatList')]]");

//        if (rows == null)
//        {
//            _logger.LogInformation("No rows found for {Date}", d);
//            // random delay before next date
//            await Task.Delay(rng.Next(1000, 3000));
//            continue;
//        }

//        var batch = new List<RegionStat>();

//        foreach (var row in rows)
//        {
//            string TextOrEmpty(string xpath)
//            {
//                return row.SelectSingleNode(xpath)?
//                           .InnerText
//                           .Trim() ?? "";
//            }

//            int? ParseNullableInt(string s)
//            {
//                s = s.Replace("\u00A0", "").Trim(); // remove NBSP
//                if (string.IsNullOrEmpty(s) || s == "-") return null;
//                var digits = new string(s.Where(char.IsDigit).ToArray());
//                return int.TryParse(digits, out var v) ? v : null;
//            }

//            var region = TextOrEmpty("./td[1]/a");
//            var price1 = ParseNullableInt(TextOrEmpty("./td[3]/a"));
//            var price1PerSqm = ParseNullableInt(TextOrEmpty("./td[4]"));
//            var price2 = ParseNullableInt(TextOrEmpty("./td[6]/a"));
//            var price2PerSqm = ParseNullableInt(TextOrEmpty("./td[7]"));
//            var price3 = ParseNullableInt(TextOrEmpty("./td[9]/a"));
//            var price3PerSqm = ParseNullableInt(TextOrEmpty("./td[10]"));
//            var avgPerSqmTxt = TextOrEmpty("./td[12]");
//            var avgPerSqm = ParseNullableInt(avgPerSqmTxt) ?? 0;

//            batch.Add(new RegionStat
//            {
//                StatDate = statDate,
//                Region = region,
//                Price1 = price1,
//                Price1PerSqm = price1PerSqm,
//                Price2 = price2,
//                Price2PerSqm = price2PerSqm,
//                Price3 = price3,
//                Price3PerSqm = price3PerSqm,
//                AvgPerSqm = avgPerSqm
//            });
//        }

//        if (batch.Count > 0)
//        {
//            _db.RegionStats.AddRange(batch);
//            await _db.SaveChangesAsync();
//            _logger.LogInformation("Saved {Count} rows for {Date}", batch.Count, d);
//        }

//        // 3) Random pause between 1 and 3 seconds to avoid IP bans
//        await Task.Delay(rng.Next(1000, 3000));
//    }

//    _logger.LogInformation("Finished scraping all dates.");
//}