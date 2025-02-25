using Microsoft.EntityFrameworkCore;

namespace ivone.dev.Data.Contexts
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<MortgageScenario> MortgageScenarios { get; set; }
    }
}
