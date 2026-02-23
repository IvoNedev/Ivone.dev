using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Ivone.dev.Areas.Pyt.Auth;
using Ivone.dev.Areas.Pyt.Dtos;
using Ivone.dev.Areas.Pyt.Services;
using Ivone.dev.Data.Models.Pyt;
using ivone.dev.Data.Contexts;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ivone.dev.Areas.Pyt.Controllers;

[ApiController]
[Route("api/pyt/auth")]
public class PytAuthController : ControllerBase
{
    private readonly AppDbContext _db;

    public PytAuthController(AppDbContext db)
    {
        _db = db;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<PytAuthUserResponse>> Register([FromBody] PytRegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("Email and password are required.");
        }

        if (request.Password.Length < 6)
        {
            return BadRequest("Password must be at least 6 characters.");
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var exists = await _db.PytUsers.AnyAsync(x => x.Email == email);
        if (exists)
        {
            return Conflict("User already exists.");
        }

        var user = new PytUser
        {
            Email = email,
            PasswordHash = PytPasswordHasher.HashPassword(request.Password),
            OrganizationId = request.OrganizationId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.PytUsers.Add(user);
        await _db.SaveChangesAsync();

        _db.PytUserPreferences.Add(new PytUserPreference
        {
            UserId = user.Id,
            TypicalDistanceKm = 50,
            UpdatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        await SignInAsync(user);

        return Ok(new PytAuthUserResponse
        {
            Id = user.Id,
            Email = user.Email,
            OrganizationId = user.OrganizationId
        });
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<PytAuthUserResponse>> Login([FromBody] PytLoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("Email and password are required.");
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.PytUsers.FirstOrDefaultAsync(x => x.Email == email);
        if (user is null || !user.IsActive)
        {
            return Unauthorized("Invalid credentials.");
        }

        if (!PytPasswordHasher.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized("Invalid credentials.");
        }

        await SignInAsync(user);

        return Ok(new PytAuthUserResponse
        {
            Id = user.Id,
            Email = user.Email,
            OrganizationId = user.OrganizationId
        });
    }

    [Authorize(AuthenticationSchemes = PytAuthenticationDefaults.Scheme)]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(PytAuthenticationDefaults.Scheme);
        return Ok();
    }

    [Authorize(AuthenticationSchemes = PytAuthenticationDefaults.Scheme)]
    [HttpGet("me")]
    public async Task<ActionResult<PytAuthUserResponse>> Me()
    {
        var userId = PytUserContext.GetRequiredUserId(User);
        var user = await _db.PytUsers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null)
        {
            return Unauthorized();
        }

        return Ok(new PytAuthUserResponse
        {
            Id = user.Id,
            Email = user.Email,
            OrganizationId = user.OrganizationId
        });
    }

    private async Task SignInAsync(PytUser user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(PytAuthenticationDefaults.UserIdClaimType, user.Id.ToString()),
            new Claim(PytAuthenticationDefaults.EmailClaimType, user.Email)
        };

        var identity = new ClaimsIdentity(claims, PytAuthenticationDefaults.Scheme);
        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(PytAuthenticationDefaults.Scheme, principal, new AuthenticationProperties
        {
            IsPersistent = true,
            ExpiresUtc = DateTimeOffset.UtcNow.AddDays(14),
            AllowRefresh = true
        });
    }
}
