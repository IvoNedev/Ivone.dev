using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ivone.dev.Data.Models
{
    public class RegionStat
    {
        public int Id { get; set; }
        public DateTime StatDate { get; set; }
        public string Region { get; set; }
        public int? Price1 { get; set; }
        public int? Price1PerSqm { get; set; }
        public int? Price2 { get; set; }
        public int? Price2PerSqm { get; set; }
        public int? Price3 { get; set; }
        public int? Price3PerSqm { get; set; }
        public int AvgPerSqm { get; set; }
    }
}
