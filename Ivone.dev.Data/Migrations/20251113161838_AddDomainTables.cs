using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Ivone.dev.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDomainTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RegionStats",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StatDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Region = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Price1 = table.Column<int>(type: "int", nullable: true),
                    Price1PerSqm = table.Column<int>(type: "int", nullable: true),
                    Price2 = table.Column<int>(type: "int", nullable: true),
                    Price2PerSqm = table.Column<int>(type: "int", nullable: true),
                    Price3 = table.Column<int>(type: "int", nullable: true),
                    Price3PerSqm = table.Column<int>(type: "int", nullable: true),
                    AvgPerSqm = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RegionStats", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Tests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Timelines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OwnerId = table.Column<int>(type: "int", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Timelines", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsGoogle = table.Column<bool>(type: "bit", nullable: false),
                    IsFacebook = table.Column<bool>(type: "bit", nullable: false),
                    IsLinkedIn = table.Column<bool>(type: "bit", nullable: false),
                    IsLocal = table.Column<bool>(type: "bit", nullable: false),
                    HasPaid = table.Column<bool>(type: "bit", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Questions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Text = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Explanation = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TestId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Questions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Questions_Tests_TestId",
                        column: x => x.TestId,
                        principalTable: "Tests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TimelineEvents",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Address = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TimelineId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimelineEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimelineEvents_Timelines_TimelineId",
                        column: x => x.TimelineId,
                        principalTable: "Timelines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserTimelines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    TimelineId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserTimelines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserTimelines_Timelines_TimelineId",
                        column: x => x.TimelineId,
                        principalTable: "Timelines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserTimelines_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Answers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Text = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsCorrect = table.Column<bool>(type: "bit", nullable: false),
                    QuestionId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Answers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Answers_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "Questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "MortgageScenarios",
                columns: new[] { "Id", "CommissionAmount", "CommissionRate", "Currency", "DepositAmount", "DepositPercentage", "LawyerFeeAmount", "LawyerFeeRate", "LoanTermInYears", "MortgageAmount", "Name", "ParkingSpotCost", "TotalCost" },
                values: new object[,]
                {
                    { 1, 8550m, 3m, "EUR", 57000m, 20m, 3420m, 1.2m, 30, 228000m, "Two Bedroom • City Center", 20000m, 285000m },
                    { 2, 4125m, 2.5m, "EUR", 24750m, 15m, 1650m, 1m, 25, 140250m, "Starter Flat • Sofia South", 12000m, 165000m },
                    { 3, 8820m, 2.8m, "EUR", 78750m, 25m, 4095m, 1.3m, 30, 236250m, "House + Parking • Suburbs", 15000m, 315000m }
                });

            migrationBuilder.InsertData(
                table: "RegionStats",
                columns: new[] { "Id", "AvgPerSqm", "Price1", "Price1PerSqm", "Price2", "Price2PerSqm", "Price3", "Price3PerSqm", "Region", "StatDate" },
                values: new object[,]
                {
                    { 1, 2790, 310000, 3000, 285000, 2780, 255000, 2600, "Sofia Center", new DateTime(2025, 5, 29, 0, 0, 0, 0, DateTimeKind.Unspecified) },
                    { 2, 2200, 235000, 2350, 210000, 2200, 190000, 2050, "Sofia South", new DateTime(2025, 5, 29, 0, 0, 0, 0, DateTimeKind.Unspecified) },
                    { 3, 1970, 185000, 2150, 165000, 1950, 150000, 1820, "Studentski Grad", new DateTime(2025, 5, 22, 0, 0, 0, 0, DateTimeKind.Unspecified) }
                });

            migrationBuilder.InsertData(
                table: "Tests",
                columns: new[] { "Id", "Title" },
                values: new object[,]
                {
                    { 1, "Life in the UK • Core Facts" },
                    { 2, "Life in the UK • Traditions" }
                });

            migrationBuilder.InsertData(
                table: "Timelines",
                columns: new[] { "Id", "CreatedOn", "Name", "OwnerId" },
                values: new object[] { 1, new DateTime(2024, 6, 5, 0, 0, 0, 0, DateTimeKind.Utc), "Home Purchase Journey", 1 });

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "CreatedOn", "Email", "HasPaid", "IsFacebook", "IsGoogle", "IsLinkedIn", "IsLocal" },
                values: new object[,]
                {
                    { 1, new DateTime(2024, 1, 15, 0, 0, 0, 0, DateTimeKind.Utc), "demo@ivone.dev", false, false, false, false, true },
                    { 2, new DateTime(2024, 6, 1, 0, 0, 0, 0, DateTimeKind.Utc), "shared@ivone.dev", true, false, true, true, false }
                });

            migrationBuilder.InsertData(
                table: "Questions",
                columns: new[] { "Id", "Explanation", "TestId", "Text" },
                values: new object[,]
                {
                    { 1, "London is the UK capital and seat of government.", 1, "What is the capital city of the United Kingdom?" },
                    { 2, "All UK citizens aged 18 or over can vote.", 1, "What is the minimum age for voting in UK general elections?" },
                    { 3, "The daffodil is widely used as the Welsh emblem.", 1, "Which flower is the national emblem of Wales?" },
                    { 4, "William the Conqueror began building the Tower in the 11th century.", 2, "Who ordered the construction of the Tower of London?" },
                    { 5, "Bonfire Night, or Guy Fawkes Night, is on 5 November.", 2, "When is Bonfire Night celebrated in the UK?" },
                    { 6, "The UK uses the pound sterling (GBP).", 2, "What is the official currency of the United Kingdom?" }
                });

            migrationBuilder.InsertData(
                table: "TimelineEvents",
                columns: new[] { "Id", "Address", "Date", "Notes", "TimelineId", "Title" },
                values: new object[,]
                {
                    { 1, "Online + site visits", new DateTime(2024, 6, 10, 0, 0, 0, 0, DateTimeKind.Unspecified), "Compare average price per sqm across districts.", 1, "Research neighborhoods" },
                    { 2, "Local bank branch", new DateTime(2024, 7, 3, 0, 0, 0, 0, DateTimeKind.Unspecified), "Prepare proof of income and savings statements.", 1, "Bank pre-approval meeting" },
                    { 3, "Sofia South complex", new DateTime(2024, 7, 20, 0, 0, 0, 0, DateTimeKind.Unspecified), "Tour sample apartment and parking layout.", 1, "First developer visit" }
                });

            migrationBuilder.InsertData(
                table: "UserTimelines",
                columns: new[] { "Id", "TimelineId", "UserId" },
                values: new object[,]
                {
                    { 1, 1, 1 },
                    { 2, 1, 2 }
                });

            migrationBuilder.InsertData(
                table: "Answers",
                columns: new[] { "Id", "IsCorrect", "QuestionId", "Text" },
                values: new object[,]
                {
                    { 1, true, 1, "London" },
                    { 2, false, 1, "Manchester" },
                    { 3, false, 1, "Belfast" },
                    { 4, false, 1, "Cardiff" },
                    { 5, false, 2, "16" },
                    { 6, false, 2, "17" },
                    { 7, true, 2, "18" },
                    { 8, false, 2, "21" },
                    { 9, false, 3, "Rose" },
                    { 10, false, 3, "Thistle" },
                    { 11, true, 3, "Daffodil" },
                    { 12, false, 3, "Shamrock" },
                    { 13, true, 4, "William the Conqueror" },
                    { 14, false, 4, "Henry VIII" },
                    { 15, false, 4, "Elizabeth I" },
                    { 16, false, 4, "Queen Victoria" },
                    { 17, false, 5, "1 January" },
                    { 18, false, 5, "14 February" },
                    { 19, true, 5, "5 November" },
                    { 20, false, 5, "25 December" },
                    { 21, false, 6, "Euro" },
                    { 22, false, 6, "US Dollar" },
                    { 23, true, 6, "Pound sterling" },
                    { 24, false, 6, "Swiss franc" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Answers_QuestionId",
                table: "Answers",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_Questions_TestId",
                table: "Questions",
                column: "TestId");

            migrationBuilder.CreateIndex(
                name: "IX_TimelineEvents_TimelineId",
                table: "TimelineEvents",
                column: "TimelineId");

            migrationBuilder.CreateIndex(
                name: "IX_UserTimelines_TimelineId",
                table: "UserTimelines",
                column: "TimelineId");

            migrationBuilder.CreateIndex(
                name: "IX_UserTimelines_UserId",
                table: "UserTimelines",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Answers");

            migrationBuilder.DropTable(
                name: "RegionStats");

            migrationBuilder.DropTable(
                name: "TimelineEvents");

            migrationBuilder.DropTable(
                name: "UserTimelines");

            migrationBuilder.DropTable(
                name: "Questions");

            migrationBuilder.DropTable(
                name: "Timelines");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Tests");

            migrationBuilder.DeleteData(
                table: "MortgageScenarios",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "MortgageScenarios",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "MortgageScenarios",
                keyColumn: "Id",
                keyValue: 3);
        }
    }
}
