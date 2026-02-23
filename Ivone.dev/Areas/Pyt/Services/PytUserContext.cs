using System;
using System.Security.Claims;
using Ivone.dev.Areas.Pyt.Auth;

namespace Ivone.dev.Areas.Pyt.Services;

public static class PytUserContext
{
    public static int GetRequiredUserId(ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(PytAuthenticationDefaults.UserIdClaimType);
        if (int.TryParse(value, out var userId) && userId > 0)
        {
            return userId;
        }

        throw new InvalidOperationException("Missing authenticated Pyt user context.");
    }
}
