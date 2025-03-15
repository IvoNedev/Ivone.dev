
using Microsoft.EntityFrameworkCore;

namespace ivone.dev.Data.Contexts
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<MortgageScenario> MortgageScenarios { get; set; }
        public DbSet<User> Users { get; set; }

        public DbSet<Timeline> Timelines { get; set; }
        public DbSet<TimelineEvent> TimelineEvents { get; set; }
        public DbSet<UserTimeline> UserTimelines { get; set; }

        public DbSet<Test> Tests { get; set; }
        public DbSet<Question> Questions { get; set; }
        public DbSet<Answer> Answers { get; set; }

    }
}
