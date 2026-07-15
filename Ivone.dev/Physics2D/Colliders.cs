using System.Numerics;

namespace Ivone.dev.Physics2D;

public enum ColliderType
{
    Circle,
    Aabb
}

public abstract class Collider
{
    public RigidBody Body { get; init; } = null!;
    public bool IsSensor { get; init; }
    public abstract ColliderType Type { get; }
    public abstract Aabb GetAabb();
}

public sealed class CircleCollider : Collider
{
    public CircleCollider(float radius)
    {
        if (radius <= 0f)
        {
            throw new ArgumentOutOfRangeException(nameof(radius), "Circle radius must be greater than zero.");
        }

        Radius = radius;
    }

    public float Radius { get; }
    public override ColliderType Type => ColliderType.Circle;

    public override Aabb GetAabb()
    {
        var radius = new Vector2(Radius, Radius);
        return new Aabb(Body.Position - radius, Body.Position + radius);
    }
}

public sealed class AabbCollider : Collider
{
    public AabbCollider(Vector2 halfSize)
    {
        if (halfSize.X <= 0f || halfSize.Y <= 0f)
        {
            throw new ArgumentOutOfRangeException(nameof(halfSize), "AABB half-size components must be greater than zero.");
        }

        HalfSize = halfSize;
    }

    public Vector2 HalfSize { get; }
    public override ColliderType Type => ColliderType.Aabb;

    public override Aabb GetAabb() => new(Body.Position - HalfSize, Body.Position + HalfSize);
}

public abstract record ColliderDefinition
{
    private ColliderDefinition()
    {
    }

    public sealed record Circle(float Radius) : ColliderDefinition;
    public sealed record Aabb(Vector2 HalfSize) : ColliderDefinition;

    public static ColliderDefinition CircleCollider(float radius) => new Circle(radius);
    public static ColliderDefinition AabbCollider(Vector2 halfSize) => new Aabb(halfSize);

    internal Collider Create(RigidBody body)
    {
        return this switch
        {
            Circle circle => new CircleCollider(circle.Radius) { Body = body },
            Aabb aabb => new AabbCollider(aabb.HalfSize) { Body = body },
            _ => throw new InvalidOperationException("Unsupported collider definition.")
        };
    }
}
