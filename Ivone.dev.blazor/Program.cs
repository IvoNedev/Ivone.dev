

using ivone.dev.Data.Contexts;
using ivone.dev.Services;
using ivone.dev.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseSetting("UseBrowserLink", "false");
// Add services to the container.
builder.Services.AddRazorPages();
builder.Services.AddRazorComponents();
builder.Services.AddSignalR(); // Add SignalR
builder.Services.AddControllers();

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
builder.Services.AddScoped<IUserService, UserService>();


var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();


app.UseCors(); // Enable CORS
app.UseRouting();
app.MapControllers();
app.UseAuthorization();

// Map SignalR Hub
app.MapHub<LiveUpdateHub>("/liveupdate");
app.MapRazorPages();

app.Run();
