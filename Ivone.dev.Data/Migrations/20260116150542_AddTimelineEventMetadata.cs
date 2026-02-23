using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ivone.dev.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTimelineEventMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DatePrecision",
                table: "TimelineEvents",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MediaUrls",
                table: "TimelineEvents",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Url",
                table: "TimelineEvents",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "TimelineEvents",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "DatePrecision", "MediaUrls", "Url" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "TimelineEvents",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "DatePrecision", "MediaUrls", "Url" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "TimelineEvents",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "DatePrecision", "MediaUrls", "Url" },
                values: new object[] { null, null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DatePrecision",
                table: "TimelineEvents");

            migrationBuilder.DropColumn(
                name: "MediaUrls",
                table: "TimelineEvents");

            migrationBuilder.DropColumn(
                name: "Url",
                table: "TimelineEvents");
        }
    }
}
