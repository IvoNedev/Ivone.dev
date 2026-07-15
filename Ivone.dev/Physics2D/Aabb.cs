using System.Numerics;

namespace Ivone.dev.Physics2D;

public readonly struct Aabb
{
    public Aabb(Vector2 min, Vector2 max)
    {
        Min = min;
        Max = max;
    }

    public Vector2 Min { get; }
    public Vector2 Max { get; }

    public bool Intersects(Aabb other)
    {
        return Min.X <= other.Max.X &&
               Max.X >= other.Min.X &&
               Min.Y <= other.Max.Y &&
               Max.Y >= other.Min.Y;
    }
}
