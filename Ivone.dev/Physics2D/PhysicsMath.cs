using System.Numerics;

namespace Ivone.dev.Physics2D;

public static class PhysicsMath
{
    public static float Cross(Vector2 a, Vector2 b) => a.X * b.Y - a.Y * b.X;

    public static Vector2 NormalizeSafe(Vector2 value)
    {
        var lengthSquared = value.LengthSquared();
        return lengthSquared <= 0.000001f ? Vector2.Zero : value / MathF.Sqrt(lengthSquared);
    }

    public static Vector2 Clamp(Vector2 value, Vector2 min, Vector2 max)
    {
        return new Vector2(
            Math.Clamp(value.X, min.X, max.X),
            Math.Clamp(value.Y, min.Y, max.Y));
    }
}
