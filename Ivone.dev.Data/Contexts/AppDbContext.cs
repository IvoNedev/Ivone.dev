
using System;
using Ivone.dev.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace ivone.dev.Data.Contexts
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }


        public DbSet<RegionStat> RegionStats { get; set; }
        public DbSet<MortgageScenario> MortgageScenarios { get; set; }
        public DbSet<User> Users { get; set; }

        public DbSet<Timeline> Timelines { get; set; }
        public DbSet<TimelineEvent> TimelineEvents { get; set; }
        public DbSet<UserTimeline> UserTimelines { get; set; }

        public DbSet<Test> Tests { get; set; }
        public DbSet<Question> Questions { get; set; }
        public DbSet<Answer> Answers { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<MortgageScenario>(entity =>
            {
                entity.Property(p => p.TotalCost).HasColumnType("decimal(18,2)");
                entity.Property(p => p.DepositPercentage).HasColumnType("decimal(18,2)");
                entity.Property(p => p.DepositAmount).HasColumnType("decimal(18,2)");
                entity.Property(p => p.MortgageAmount).HasColumnType("decimal(18,2)");
                entity.Property(p => p.ParkingSpotCost).HasColumnType("decimal(18,2)");
                entity.Property(p => p.CommissionRate).HasColumnType("decimal(18,2)");
                entity.Property(p => p.CommissionAmount).HasColumnType("decimal(18,2)");
                entity.Property(p => p.LawyerFeeRate).HasColumnType("decimal(18,2)");
                entity.Property(p => p.LawyerFeeAmount).HasColumnType("decimal(18,2)");
            });

            modelBuilder.Entity<MortgageScenario>().HasData(
                new MortgageScenario
                {
                    Id = 1,
                    Name = "Two Bedroom • City Center",
                    TotalCost = 285000m,
                    DepositPercentage = 20m,
                    DepositAmount = 57000m,
                    MortgageAmount = 228000m,
                    ParkingSpotCost = 20000m,
                    CommissionRate = 3m,
                    CommissionAmount = 8550m,
                    LawyerFeeRate = 1.2m,
                    LawyerFeeAmount = 3420m,
                    LoanTermInYears = 30,
                    Currency = "EUR"
                },
                new MortgageScenario
                {
                    Id = 2,
                    Name = "Starter Flat • Sofia South",
                    TotalCost = 165000m,
                    DepositPercentage = 15m,
                    DepositAmount = 24750m,
                    MortgageAmount = 140250m,
                    ParkingSpotCost = 12000m,
                    CommissionRate = 2.5m,
                    CommissionAmount = 4125m,
                    LawyerFeeRate = 1m,
                    LawyerFeeAmount = 1650m,
                    LoanTermInYears = 25,
                    Currency = "EUR"
                },
                new MortgageScenario
                {
                    Id = 3,
                    Name = "House + Parking • Suburbs",
                    TotalCost = 315000m,
                    DepositPercentage = 25m,
                    DepositAmount = 78750m,
                    MortgageAmount = 236250m,
                    ParkingSpotCost = 15000m,
                    CommissionRate = 2.8m,
                    CommissionAmount = 8820m,
                    LawyerFeeRate = 1.3m,
                    LawyerFeeAmount = 4095m,
                    LoanTermInYears = 30,
                    Currency = "EUR"
                }
            );

            modelBuilder.Entity<RegionStat>().HasData(
                new RegionStat
                {
                    Id = 1,
                    StatDate = new DateTime(2025, 5, 29),
                    Region = "Sofia Center",
                    Price1 = 310000,
                    Price1PerSqm = 3000,
                    Price2 = 285000,
                    Price2PerSqm = 2780,
                    Price3 = 255000,
                    Price3PerSqm = 2600,
                    AvgPerSqm = 2790
                },
                new RegionStat
                {
                    Id = 2,
                    StatDate = new DateTime(2025, 5, 29),
                    Region = "Sofia South",
                    Price1 = 235000,
                    Price1PerSqm = 2350,
                    Price2 = 210000,
                    Price2PerSqm = 2200,
                    Price3 = 190000,
                    Price3PerSqm = 2050,
                    AvgPerSqm = 2200
                },
                new RegionStat
                {
                    Id = 3,
                    StatDate = new DateTime(2025, 5, 22),
                    Region = "Studentski Grad",
                    Price1 = 185000,
                    Price1PerSqm = 2150,
                    Price2 = 165000,
                    Price2PerSqm = 1950,
                    Price3 = 150000,
                    Price3PerSqm = 1820,
                    AvgPerSqm = 1970
                }
            );

            modelBuilder.Entity<User>().HasData(
                new User
                {
                    Id = 1,
                    Email = "demo@ivone.dev",
                    IsGoogle = false,
                    IsFacebook = false,
                    IsLinkedIn = false,
                    IsLocal = true,
                    HasPaid = false,
                    CreatedOn = new DateTime(2024, 1, 15, 0, 0, 0, DateTimeKind.Utc)
                },
                new User
                {
                    Id = 2,
                    Email = "shared@ivone.dev",
                    IsGoogle = true,
                    IsFacebook = false,
                    IsLinkedIn = true,
                    IsLocal = false,
                    HasPaid = true,
                    CreatedOn = new DateTime(2024, 6, 1, 0, 0, 0, DateTimeKind.Utc)
                }
            );

            modelBuilder.Entity<Timeline>().HasData(
                new Timeline
                {
                    Id = 1,
                    Name = "Home Purchase Journey",
                    OwnerId = 1,
                    CreatedOn = new DateTime(2024, 6, 5, 0, 0, 0, DateTimeKind.Utc)
                });

            modelBuilder.Entity<TimelineEvent>().HasData(
                new TimelineEvent
                {
                    Id = 1,
                    TimelineId = 1,
                    Title = "Research neighborhoods",
                    Notes = "Compare average price per sqm across districts.",
                    Address = "Online + site visits",
                    Date = new DateTime(2024, 6, 10)
                },
                new TimelineEvent
                {
                    Id = 2,
                    TimelineId = 1,
                    Title = "Bank pre-approval meeting",
                    Notes = "Prepare proof of income and savings statements.",
                    Address = "Local bank branch",
                    Date = new DateTime(2024, 7, 3)
                },
                new TimelineEvent
                {
                    Id = 3,
                    TimelineId = 1,
                    Title = "First developer visit",
                    Notes = "Tour sample apartment and parking layout.",
                    Address = "Sofia South complex",
                    Date = new DateTime(2024, 7, 20)
                }
            );

            modelBuilder.Entity<UserTimeline>().HasData(
                new UserTimeline
                {
                    Id = 1,
                    UserId = 1,
                    TimelineId = 1
                },
                new UserTimeline
                {
                    Id = 2,
                    UserId = 2,
                    TimelineId = 1
                }
            );

            modelBuilder.Entity<Test>().HasData(
                new Test { Id = 1, Title = "Life in the UK • Core Facts" },
                new Test { Id = 2, Title = "Life in the UK • Traditions" }
            );

            modelBuilder.Entity<Question>().HasData(
                new Question
                {
                    Id = 1,
                    TestId = 1,
                    Text = "What is the capital city of the United Kingdom?",
                    Explanation = "London is the UK capital and seat of government."
                },
                new Question
                {
                    Id = 2,
                    TestId = 1,
                    Text = "What is the minimum age for voting in UK general elections?",
                    Explanation = "All UK citizens aged 18 or over can vote."
                },
                new Question
                {
                    Id = 3,
                    TestId = 1,
                    Text = "Which flower is the national emblem of Wales?",
                    Explanation = "The daffodil is widely used as the Welsh emblem."
                },
                new Question
                {
                    Id = 4,
                    TestId = 2,
                    Text = "Who ordered the construction of the Tower of London?",
                    Explanation = "William the Conqueror began building the Tower in the 11th century."
                },
                new Question
                {
                    Id = 5,
                    TestId = 2,
                    Text = "When is Bonfire Night celebrated in the UK?",
                    Explanation = "Bonfire Night, or Guy Fawkes Night, is on 5 November."
                },
                new Question
                {
                    Id = 6,
                    TestId = 2,
                    Text = "What is the official currency of the United Kingdom?",
                    Explanation = "The UK uses the pound sterling (GBP)."
                }
            );

            modelBuilder.Entity<Answer>().HasData(
                // Question 1
                new Answer { Id = 1, QuestionId = 1, Text = "London", IsCorrect = true },
                new Answer { Id = 2, QuestionId = 1, Text = "Manchester", IsCorrect = false },
                new Answer { Id = 3, QuestionId = 1, Text = "Belfast", IsCorrect = false },
                new Answer { Id = 4, QuestionId = 1, Text = "Cardiff", IsCorrect = false },
                // Question 2
                new Answer { Id = 5, QuestionId = 2, Text = "16", IsCorrect = false },
                new Answer { Id = 6, QuestionId = 2, Text = "17", IsCorrect = false },
                new Answer { Id = 7, QuestionId = 2, Text = "18", IsCorrect = true },
                new Answer { Id = 8, QuestionId = 2, Text = "21", IsCorrect = false },
                // Question 3
                new Answer { Id = 9, QuestionId = 3, Text = "Rose", IsCorrect = false },
                new Answer { Id = 10, QuestionId = 3, Text = "Thistle", IsCorrect = false },
                new Answer { Id = 11, QuestionId = 3, Text = "Daffodil", IsCorrect = true },
                new Answer { Id = 12, QuestionId = 3, Text = "Shamrock", IsCorrect = false },
                // Question 4
                new Answer { Id = 13, QuestionId = 4, Text = "William the Conqueror", IsCorrect = true },
                new Answer { Id = 14, QuestionId = 4, Text = "Henry VIII", IsCorrect = false },
                new Answer { Id = 15, QuestionId = 4, Text = "Elizabeth I", IsCorrect = false },
                new Answer { Id = 16, QuestionId = 4, Text = "Queen Victoria", IsCorrect = false },
                // Question 5
                new Answer { Id = 17, QuestionId = 5, Text = "1 January", IsCorrect = false },
                new Answer { Id = 18, QuestionId = 5, Text = "14 February", IsCorrect = false },
                new Answer { Id = 19, QuestionId = 5, Text = "5 November", IsCorrect = true },
                new Answer { Id = 20, QuestionId = 5, Text = "25 December", IsCorrect = false },
                // Question 6
                new Answer { Id = 21, QuestionId = 6, Text = "Euro", IsCorrect = false },
                new Answer { Id = 22, QuestionId = 6, Text = "US Dollar", IsCorrect = false },
                new Answer { Id = 23, QuestionId = 6, Text = "Pound sterling", IsCorrect = true },
                new Answer { Id = 24, QuestionId = 6, Text = "Swiss franc", IsCorrect = false }
            );
        }

    }
}
