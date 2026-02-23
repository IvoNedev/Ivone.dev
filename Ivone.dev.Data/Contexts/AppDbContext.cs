
using System;
using Ivone.dev.Data.Models;
using Ivone.dev.Data.Models.Pyt;
using Microsoft.EntityFrameworkCore;
using NPOB.Data.Entities;

namespace ivone.dev.Data.Contexts
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<FinanceCategory> FinanceCategories => Set<FinanceCategory>();
        public DbSet<RegionStat> RegionStats { get; set; }
        public DbSet<MortgageScenario> MortgageScenarios { get; set; }
        public DbSet<User> Users { get; set; }

        public DbSet<Timeline> Timelines { get; set; }
        public DbSet<TimelineEvent> TimelineEvents { get; set; }
        public DbSet<UserTimeline> UserTimelines { get; set; }

        public DbSet<Test> Tests { get; set; }
        public DbSet<Question> Questions { get; set; }
        public DbSet<Answer> Answers { get; set; }
        public DbSet<PytUser> PytUsers => Set<PytUser>();
        public DbSet<PytVehicle> PytVehicles => Set<PytVehicle>();
        public DbSet<PytDriver> PytDrivers => Set<PytDriver>();
        public DbSet<PytLocation> PytLocations => Set<PytLocation>();
        public DbSet<PytTrip> PytTrips => Set<PytTrip>();
        public DbSet<PytUserPreference> PytUserPreferences => Set<PytUserPreference>();

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
            modelBuilder.Entity<FinanceCategory>(entity =>
            {
                entity.ToTable("FinanceCategories", table => table.ExcludeFromMigrations());
                entity.Property(c => c.Name).HasMaxLength(120).IsRequired();
                entity.Property(c => c.IsDefault).HasDefaultValue(false);
               
            });

            modelBuilder.Entity<PytUser>(entity =>
            {
                entity.ToTable("PytUsers");
                entity.Property(x => x.Email).HasMaxLength(256).IsRequired();
                entity.Property(x => x.PasswordHash).HasMaxLength(512).IsRequired();
                entity.HasIndex(x => x.Email).IsUnique();
            });

            modelBuilder.Entity<PytVehicle>(entity =>
            {
                entity.ToTable("PytVehicles");
                entity.Property(x => x.PlateNumber).HasMaxLength(32).IsRequired();
                entity.Property(x => x.MakeModel).HasMaxLength(200).IsRequired();
                entity.Property(x => x.FuelType).HasMaxLength(64).IsRequired();
                entity.Property(x => x.AvgConsumption).HasColumnType("decimal(6,2)");
                entity.HasIndex(x => x.PlateNumber).IsUnique();
            });

            modelBuilder.Entity<PytDriver>(entity =>
            {
                entity.ToTable("PytDrivers");
                entity.Property(x => x.Name).HasMaxLength(200).IsRequired();
                entity.Property(x => x.LicenseNumber).HasMaxLength(64);
            });

            modelBuilder.Entity<PytLocation>(entity =>
            {
                entity.ToTable("PytLocations");
                entity.Property(x => x.Name).HasMaxLength(200).IsRequired();
                entity.Property(x => x.Address).HasMaxLength(300);
            });

            modelBuilder.Entity<PytTrip>(entity =>
            {
                entity.ToTable("PytTrips");
                entity.Property(x => x.Purpose).HasMaxLength(120).IsRequired();
                entity.Property(x => x.Notes).HasMaxLength(1000);
                entity.HasIndex(x => new { x.VehicleId, x.EndDateTime });
                entity.HasIndex(x => new { x.CreatedByUserId, x.CreatedAt });

                entity.HasOne(x => x.Vehicle)
                    .WithMany(x => x.Trips)
                    .HasForeignKey(x => x.VehicleId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.Driver)
                    .WithMany(x => x.Trips)
                    .HasForeignKey(x => x.DriverId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.StartLocation)
                    .WithMany(x => x.StartTrips)
                    .HasForeignKey(x => x.StartLocationId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.EndLocation)
                    .WithMany(x => x.EndTrips)
                    .HasForeignKey(x => x.EndLocationId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.CreatedByUser)
                    .WithMany(x => x.Trips)
                    .HasForeignKey(x => x.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.ToTable(table =>
                {
                    table.HasCheckConstraint("CK_PytTrips_Mileage", "[EndMileage] >= [StartMileage]");
                    table.HasCheckConstraint("CK_PytTrips_Dates", "[EndDateTime] >= [StartDateTime]");
                });
            });

            modelBuilder.Entity<PytUserPreference>(entity =>
            {
                entity.ToTable("PytUserPreferences");
                entity.Property(x => x.LastPurpose).HasMaxLength(120);
                entity.HasIndex(x => x.UserId).IsUnique();

                entity.HasOne(x => x.User)
                    .WithOne(x => x.Preference)
                    .HasForeignKey<PytUserPreference>(x => x.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(x => x.LastVehicle)
                    .WithMany(x => x.PreferredByUsers)
                    .HasForeignKey(x => x.LastVehicleId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(x => x.LastDriver)
                    .WithMany(x => x.PreferredByUsers)
                    .HasForeignKey(x => x.LastDriverId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(x => x.LastStartLocation)
                    .WithMany(x => x.PreferredAsStartByUsers)
                    .HasForeignKey(x => x.LastStartLocationId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(x => x.LastEndLocation)
                    .WithMany(x => x.PreferredAsEndByUsers)
                    .HasForeignKey(x => x.LastEndLocationId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<PytUser>().HasData(
                new PytUser
                {
                    Id = 1,
                    Email = "demo@pyt.local",
                    PasswordHash = "v1$120000$AQIDBAUGBwgJCgsMDQ4PEA==$Wnhu8jmOpth30jheYWyH/50nGyI5gH8bWEe3HsxRujs=",
                    IsActive = true,
                    CreatedAt = new DateTime(2026, 1, 1, 8, 0, 0, DateTimeKind.Utc)
                });

            modelBuilder.Entity<PytVehicle>().HasData(
                new PytVehicle
                {
                    Id = 1,
                    PlateNumber = "CA1234AB",
                    MakeModel = "Skoda Octavia",
                    FuelType = "Diesel",
                    AvgConsumption = 6.20m,
                    LastMileage = 124500,
                    IsActive = true
                },
                new PytVehicle
                {
                    Id = 2,
                    PlateNumber = "CA9876CD",
                    MakeModel = "Renault Kangoo",
                    FuelType = "Petrol",
                    AvgConsumption = 7.80m,
                    LastMileage = 87420,
                    IsActive = true
                });

            modelBuilder.Entity<PytDriver>().HasData(
                new PytDriver
                {
                    Id = 1,
                    Name = "Иван Петров",
                    LicenseNumber = "B1234567",
                    IsActive = true
                },
                new PytDriver
                {
                    Id = 2,
                    Name = "Мария Николова",
                    LicenseNumber = "B9876543",
                    IsActive = true
                });

            modelBuilder.Entity<PytLocation>().HasData(
                new PytLocation
                {
                    Id = 1,
                    Name = "Офис",
                    Address = "София, бул. България 45",
                    IsActive = true,
                    IsFavorite = true
                },
                new PytLocation
                {
                    Id = 2,
                    Name = "Клиент - Пловдив",
                    Address = "Пловдив, ул. Христо Г. Данов 12",
                    IsActive = true,
                    IsFavorite = true
                },
                new PytLocation
                {
                    Id = 3,
                    Name = "Сервиз",
                    Address = "София, ул. Околовръстен път 201",
                    IsActive = true,
                    IsFavorite = false
                });

            modelBuilder.Entity<PytTrip>().HasData(
                new PytTrip
                {
                    Id = 1,
                    VehicleId = 1,
                    DriverId = 1,
                    StartDateTime = new DateTime(2026, 2, 10, 8, 30, 0, DateTimeKind.Utc),
                    EndDateTime = new DateTime(2026, 2, 10, 18, 0, 0, DateTimeKind.Utc),
                    StartLocationId = 1,
                    EndLocationId = 2,
                    StartMileage = 124380,
                    EndMileage = 124500,
                    Purpose = "Office -> Client",
                    Notes = "Демо курс",
                    CreatedAt = new DateTime(2026, 2, 10, 18, 5, 0, DateTimeKind.Utc),
                    CreatedByUserId = 1
                });

            modelBuilder.Entity<PytUserPreference>().HasData(
                new PytUserPreference
                {
                    Id = 1,
                    UserId = 1,
                    LastVehicleId = 1,
                    LastDriverId = 1,
                    LastStartLocationId = 2,
                    LastEndLocationId = 2,
                    LastPurpose = "Office -> Client",
                    TypicalDistanceKm = 120,
                    UpdatedAt = new DateTime(2026, 2, 10, 18, 5, 0, DateTimeKind.Utc)
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
