
using ivone.dev.Data.Contexts;
using ivone.dev.Services;
using ivone.dev.Services.Interfaces;
using Ivone.dev.Areas.Pyt.Auth;
using Ivone.dev.Areas.Pyt.Services;
using Ivone.dev.Blackjack;
using Ivone.dev.Poker;
using Ivone.dev.Timer;
using LifeInTheUK.Web.Services;
using LifeInTheUK.Web.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging;
using QuestPDF.Infrastructure;
using System;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseSetting("UseBrowserLink", "false");
// Add services to the container.
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = PytAuthenticationDefaults.Scheme;
    options.DefaultChallengeScheme = PytAuthenticationDefaults.Scheme;
    options.DefaultSignInScheme = PytAuthenticationDefaults.Scheme;
})
.AddCookie(PytAuthenticationDefaults.Scheme, options =>
{
    options.Cookie.Name = ".ivonedev.pyt.auth";
    options.LoginPath = "/Pyt/Auth/Login";
    options.AccessDeniedPath = "/Pyt/Auth/Login";
    options.SlidingExpiration = true;
    options.ExpireTimeSpan = TimeSpan.FromDays(14);
    options.Events = new CookieAuthenticationEvents
    {
        OnRedirectToLogin = context =>
        {
            if (context.Request.Path.StartsWithSegments("/api/pyt"))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            }

            context.Response.Redirect(context.RedirectUri);
            return Task.CompletedTask;
        },
        OnRedirectToAccessDenied = context =>
        {
            if (context.Request.Path.StartsWithSegments("/api/pyt"))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            }

            context.Response.Redirect(context.RedirectUri);
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddRazorPages(options =>
{
    options.Conventions.AuthorizeAreaFolder("Pyt", "/");
    options.Conventions.AllowAnonymousToAreaPage("Pyt", "/Auth/Login");
    options.Conventions.AllowAnonymousToAreaPage("Pyt", "/Auth/Register");
});
builder.Services.AddRazorComponents();
builder.Services.AddSignalR(); // Add SignalR
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(builder =>
    {
        builder.SetIsOriginAllowed(_ => true) // Allow all origins
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// In Program.cs
builder.Services.AddScoped<IMortgageScenarioService, MortgageScenarioService>();
builder.Services.AddScoped<ITimelineService, TimelineService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ITestService, TestService>();
builder.Services.AddScoped<PytTripService>();
builder.Services.AddScoped<PytExportService>();
builder.Services.AddSingleton<ITimerConfigService, TimerConfigService>();

builder.Services.AddSingleton<ShoeService>();
builder.Services.AddSingleton<StrategyEngine>();
builder.Services.AddSingleton<ScoringEngine>();
builder.Services.AddSingleton<BlackjackGameEngine>();
builder.Services.AddSingleton<BlackjackTrainerService>();
builder.Services.AddSingleton<PokerOddsService>();


var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));
builder.Services.AddHttpClient();
QuestPDF.Settings.License = LicenseType.Community;
var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();

var kopeikInPath = Path.Combine(app.Environment.ContentRootPath, "kopeik.in");
if (!Directory.Exists(kopeikInPath))
{
    kopeikInPath = Path.Combine(app.Environment.ContentRootPath, "..", "kopeik.in");
}

if (Directory.Exists(kopeikInPath))
{
    var kopeikInFileProvider = new PhysicalFileProvider(kopeikInPath);

    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = kopeikInFileProvider,
        RequestPath = "/kopeikin"
    });

    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = kopeikInFileProvider,
        RequestPath = "/kopeikin"
    });
}
else
{
    app.Logger.LogWarning("Kopeik.in folder was not found at path: {KopeikInPath}", kopeikInPath);
}

app.UseStaticFiles();

app.UseRouting();
app.UseCors(); // Enable CORS
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
// Map SignalR Hub
app.MapHub<LiveUpdateHub>("/liveupdate");
app.MapRazorPages();
app.MapFallbackToFile("test-taking-client/dist/index.html");

app.Run();
