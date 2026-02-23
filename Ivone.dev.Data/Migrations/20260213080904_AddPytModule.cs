using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Ivone.dev.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPytModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PytDrivers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    LicenseNumber = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PytDrivers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PytLocations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsFavorite = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PytLocations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PytUsers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    OrganizationId = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PytUsers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PytVehicles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PlateNumber = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    MakeModel = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    FuelType = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    AvgConsumption = table.Column<decimal>(type: "decimal(6,2)", nullable: true),
                    LastMileage = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PytVehicles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PytTrips",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    VehicleId = table.Column<int>(type: "int", nullable: false),
                    DriverId = table.Column<int>(type: "int", nullable: false),
                    StartDateTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDateTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    StartLocationId = table.Column<int>(type: "int", nullable: false),
                    EndLocationId = table.Column<int>(type: "int", nullable: false),
                    StartMileage = table.Column<int>(type: "int", nullable: false),
                    EndMileage = table.Column<int>(type: "int", nullable: false),
                    Purpose = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PytTrips", x => x.Id);
                    table.CheckConstraint("CK_PytTrips_Dates", "[EndDateTime] >= [StartDateTime]");
                    table.CheckConstraint("CK_PytTrips_Mileage", "[EndMileage] >= [StartMileage]");
                    table.ForeignKey(
                        name: "FK_PytTrips_PytDrivers_DriverId",
                        column: x => x.DriverId,
                        principalTable: "PytDrivers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PytTrips_PytLocations_EndLocationId",
                        column: x => x.EndLocationId,
                        principalTable: "PytLocations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PytTrips_PytLocations_StartLocationId",
                        column: x => x.StartLocationId,
                        principalTable: "PytLocations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PytTrips_PytUsers_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "PytUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PytTrips_PytVehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "PytVehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PytUserPreferences",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    LastVehicleId = table.Column<int>(type: "int", nullable: true),
                    LastDriverId = table.Column<int>(type: "int", nullable: true),
                    LastStartLocationId = table.Column<int>(type: "int", nullable: true),
                    LastEndLocationId = table.Column<int>(type: "int", nullable: true),
                    LastPurpose = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    TypicalDistanceKm = table.Column<int>(type: "int", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PytUserPreferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PytUserPreferences_PytDrivers_LastDriverId",
                        column: x => x.LastDriverId,
                        principalTable: "PytDrivers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PytUserPreferences_PytLocations_LastEndLocationId",
                        column: x => x.LastEndLocationId,
                        principalTable: "PytLocations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PytUserPreferences_PytLocations_LastStartLocationId",
                        column: x => x.LastStartLocationId,
                        principalTable: "PytLocations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PytUserPreferences_PytUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "PytUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PytUserPreferences_PytVehicles_LastVehicleId",
                        column: x => x.LastVehicleId,
                        principalTable: "PytVehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.InsertData(
                table: "PytDrivers",
                columns: new[] { "Id", "IsActive", "LicenseNumber", "Name" },
                values: new object[,]
                {
                    { 1, true, "B1234567", "Иван Петров" },
                    { 2, true, "B9876543", "Мария Николова" }
                });

            migrationBuilder.InsertData(
                table: "PytLocations",
                columns: new[] { "Id", "Address", "IsActive", "IsFavorite", "Name" },
                values: new object[,]
                {
                    { 1, "София, бул. България 45", true, true, "Офис" },
                    { 2, "Пловдив, ул. Христо Г. Данов 12", true, true, "Клиент - Пловдив" },
                    { 3, "София, ул. Околовръстен път 201", true, false, "Сервиз" }
                });

            migrationBuilder.InsertData(
                table: "PytUsers",
                columns: new[] { "Id", "CreatedAt", "Email", "IsActive", "OrganizationId", "PasswordHash" },
                values: new object[] { 1, new DateTime(2026, 1, 1, 8, 0, 0, 0, DateTimeKind.Utc), "demo@pyt.local", true, null, "v1$120000$AQIDBAUGBwgJCgsMDQ4PEA==$Wnhu8jmOpth30jheYWyH/50nGyI5gH8bWEe3HsxRujs=" });

            migrationBuilder.InsertData(
                table: "PytVehicles",
                columns: new[] { "Id", "AvgConsumption", "FuelType", "IsActive", "LastMileage", "MakeModel", "PlateNumber" },
                values: new object[,]
                {
                    { 1, 6.20m, "Diesel", true, 124500, "Skoda Octavia", "CA1234AB" },
                    { 2, 7.80m, "Petrol", true, 87420, "Renault Kangoo", "CA9876CD" }
                });

            migrationBuilder.InsertData(
                table: "PytTrips",
                columns: new[] { "Id", "CreatedAt", "CreatedByUserId", "DriverId", "EndDateTime", "EndLocationId", "EndMileage", "Notes", "Purpose", "StartDateTime", "StartLocationId", "StartMileage", "VehicleId" },
                values: new object[] { 1, new DateTime(2026, 2, 10, 18, 5, 0, 0, DateTimeKind.Utc), 1, 1, new DateTime(2026, 2, 10, 18, 0, 0, 0, DateTimeKind.Utc), 2, 124500, "Демо курс", "Office -> Client", new DateTime(2026, 2, 10, 8, 30, 0, 0, DateTimeKind.Utc), 1, 124380, 1 });

            migrationBuilder.InsertData(
                table: "PytUserPreferences",
                columns: new[] { "Id", "LastDriverId", "LastEndLocationId", "LastPurpose", "LastStartLocationId", "LastVehicleId", "TypicalDistanceKm", "UpdatedAt", "UserId" },
                values: new object[] { 1, 1, 2, "Office -> Client", 2, 1, 120, new DateTime(2026, 2, 10, 18, 5, 0, 0, DateTimeKind.Utc), 1 });

            migrationBuilder.CreateIndex(
                name: "IX_PytTrips_CreatedByUserId_CreatedAt",
                table: "PytTrips",
                columns: new[] { "CreatedByUserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PytTrips_DriverId",
                table: "PytTrips",
                column: "DriverId");

            migrationBuilder.CreateIndex(
                name: "IX_PytTrips_EndLocationId",
                table: "PytTrips",
                column: "EndLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_PytTrips_StartLocationId",
                table: "PytTrips",
                column: "StartLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_PytTrips_VehicleId_EndDateTime",
                table: "PytTrips",
                columns: new[] { "VehicleId", "EndDateTime" });

            migrationBuilder.CreateIndex(
                name: "IX_PytUserPreferences_LastDriverId",
                table: "PytUserPreferences",
                column: "LastDriverId");

            migrationBuilder.CreateIndex(
                name: "IX_PytUserPreferences_LastEndLocationId",
                table: "PytUserPreferences",
                column: "LastEndLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_PytUserPreferences_LastStartLocationId",
                table: "PytUserPreferences",
                column: "LastStartLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_PytUserPreferences_LastVehicleId",
                table: "PytUserPreferences",
                column: "LastVehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_PytUserPreferences_UserId",
                table: "PytUserPreferences",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PytUsers_Email",
                table: "PytUsers",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PytVehicles_PlateNumber",
                table: "PytVehicles",
                column: "PlateNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PytTrips");

            migrationBuilder.DropTable(
                name: "PytUserPreferences");

            migrationBuilder.DropTable(
                name: "PytDrivers");

            migrationBuilder.DropTable(
                name: "PytLocations");

            migrationBuilder.DropTable(
                name: "PytUsers");

            migrationBuilder.DropTable(
                name: "PytVehicles");
        }
    }
}
