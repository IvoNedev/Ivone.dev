using System;
using System.Collections.Generic;
using System.IO;
using ClosedXML.Excel;
using Ivone.dev.Areas.Pyt.Dtos;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Ivone.dev.Areas.Pyt.Services;

public class PytExportService
{
    public byte[] BuildExcel(IReadOnlyList<PytTripDto> trips, DateTime? from, DateTime? to)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Trips");

        ws.Cell(1, 1).Value = "????? ????";
        ws.Cell(2, 1).Value = "??????";
        ws.Cell(2, 2).Value = FormatPeriod(from, to);

        var headers = new[]
        {
            "#",
            "Vehicle",
            "Driver",
            "Start",
            "End",
            "From",
            "To",
            "Start Mileage",
            "End Mileage",
            "Distance",
            "Purpose",
            "Notes"
        };

        for (var i = 0; i < headers.Length; i++)
        {
            ws.Cell(4, i + 1).Value = headers[i];
            ws.Cell(4, i + 1).Style.Font.Bold = true;
            ws.Cell(4, i + 1).Style.Fill.BackgroundColor = XLColor.LightGray;
        }

        var row = 5;
        foreach (var trip in trips)
        {
            ws.Cell(row, 1).Value = trip.Id;
            ws.Cell(row, 2).Value = trip.VehicleLabel;
            ws.Cell(row, 3).Value = trip.DriverName;
            ws.Cell(row, 4).Value = trip.StartDateTime;
            ws.Cell(row, 5).Value = trip.EndDateTime;
            ws.Cell(row, 6).Value = trip.StartLocationName;
            ws.Cell(row, 7).Value = trip.EndLocationName;
            ws.Cell(row, 8).Value = trip.StartMileage;
            ws.Cell(row, 9).Value = trip.EndMileage;
            ws.Cell(row, 10).Value = trip.Distance;
            ws.Cell(row, 11).Value = trip.Purpose;
            ws.Cell(row, 12).Value = trip.Notes;
            row++;
        }

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public byte[] BuildPdf(IReadOnlyList<PytTripDto> trips, DateTime? from, DateTime? to)
    {
        var generatedAt = DateTime.UtcNow;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Margin(24);
                page.Size(PageSizes.A4.Landscape());
                page.DefaultTextStyle(TextStyle.Default.FontFamily("Arial").FontSize(10));

                page.Header().Column(col =>
                {
                    col.Item().Text("????? ????").SemiBold().FontSize(18);
                    col.Item().Text($"??????: {FormatPeriod(from, to)}");
                    col.Item().Text($"????????? ??: {generatedAt:yyyy-MM-dd HH:mm} UTC").FontColor(Colors.Grey.Darken1);
                });

                page.Content().PaddingTop(10).Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.ConstantColumn(35);
                        columns.RelativeColumn(2.0f);
                        columns.RelativeColumn(1.6f);
                        columns.RelativeColumn(1.5f);
                        columns.RelativeColumn(1.5f);
                        columns.RelativeColumn(1.4f);
                        columns.RelativeColumn(1.4f);
                        columns.ConstantColumn(70);
                        columns.ConstantColumn(70);
                        columns.ConstantColumn(60);
                        columns.RelativeColumn(1.4f);
                    });

                    table.Header(header =>
                    {
                        header.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("#").SemiBold();
                        header.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Vehicle").SemiBold();
                        header.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Driver").SemiBold();
                        header.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Start").SemiBold();
                        header.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("End").SemiBold();
                        header.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("From").SemiBold();
                        header.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("To").SemiBold();
                        header.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Start km").SemiBold();
                        header.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("End km").SemiBold();
                        header.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Km").SemiBold();
                        header.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Purpose").SemiBold();
                    });

                    foreach (var trip in trips)
                    {
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(3).Text(trip.Id.ToString());
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(3).Text(trip.VehicleLabel);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(3).Text(trip.DriverName);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(3).Text(trip.StartDateTime.ToString("yyyy-MM-dd HH:mm"));
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(3).Text(trip.EndDateTime.ToString("yyyy-MM-dd HH:mm"));
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(3).Text(trip.StartLocationName);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(3).Text(trip.EndLocationName);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(3).Text(trip.StartMileage.ToString());
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(3).Text(trip.EndMileage.ToString());
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(3).Text(trip.Distance.ToString());
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(3).Text(trip.Purpose);
                    }
                });

                page.Footer().AlignRight().Text(x =>
                {
                    x.Span("????? ???? • ").FontColor(Colors.Grey.Darken1);
                    x.Span($"{trips.Count} ??????").FontColor(Colors.Grey.Darken1);
                });
            });
        });

        return document.GeneratePdf();
    }

    private static string FormatPeriod(DateTime? from, DateTime? to)
    {
        var fromText = from?.ToString("yyyy-MM-dd") ?? "-";
        var toText = to?.ToString("yyyy-MM-dd") ?? "-";
        return $"{fromText} to {toText}";
    }
}
