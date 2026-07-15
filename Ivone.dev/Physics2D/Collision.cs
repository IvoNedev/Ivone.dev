using System.Numerics;

namespace Ivone.dev.Physics2D;

public readonly struct CollisionManifold
{
    public CollisionManifold(RigidBody a, RigidBody b, Vector2 normal, float penetration, Vector2 contactPoint)
    {
        A = a;
        B = b;
        Normal = normal;
        Penetration = penetration;
        ContactPoint = contactPoint;
        HasCollision = true;
    }

    public RigidBody? A { get; }
    public RigidBody? B { get; }
    public Vector2 Normal { get; }
    public float Penetration { get; }
    public Vector2 ContactPoint { get; }
    public bool HasCollision { get; }

    public static CollisionManifold None => default;
}

public static class CollisionDetector
{
    public static CollisionManifold Test(Collider a, Collider b)
    {
        return (a.Type, b.Type) switch
        {
            (ColliderType.Circle, ColliderType.Circle) => CircleCircle((CircleCollider)a, (CircleCollider)b),
            (ColliderType.Aabb, ColliderType.Aabb) => AabbAabb((AabbCollider)a, (AabbCollider)b),
            (ColliderType.Circle, ColliderType.Aabb) => CircleAabb((CircleCollider)a, (AabbCollider)b),
            (ColliderType.Aabb, ColliderType.Circle) => Flip(CircleAabb((CircleCollider)b, (AabbCollider)a)),
            _ => CollisionManifold.None
        };
    }

    private static CollisionManifold CircleCircle(CircleCollider a, CircleCollider b)
    {
        var delta = b.Body.Position - a.Body.Position;
        var distanceSquared = delta.LengthSquared();
        var radiusSum = a.Radius + b.Radius;

        if (distanceSquared >= radiusSum * radiusSum)
        {
            return CollisionManifold.None;
        }

        Vector2 normal;
        float distance;

        if (distanceSquared <= 0.000001f)
        {
            normal = Vector2.UnitX;
            distance = 0f;
        }
        else
        {
            distance = MathF.Sqrt(distanceSquared);
            normal = delta / distance;
        }

        var penetration = radiusSum - distance;
        var contact = a.Body.Position + normal * a.Radius;
        return new CollisionManifold(a.Body, b.Body, normal, penetration, contact);
    }

    private static CollisionManifold AabbAabb(AabbCollider a, AabbCollider b)
    {
        var delta = b.Body.Position - a.Body.Position;
        var overlapX = a.HalfSize.X + b.HalfSize.X - MathF.Abs(delta.X);
        var overlapY = a.HalfSize.Y + b.HalfSize.Y - MathF.Abs(delta.Y);

        if (overlapX <= 0f || overlapY <= 0f)
        {
            return CollisionManifold.None;
        }

        Vector2 normal;
        float penetration;

        if (overlapX < overlapY)
        {
            normal = new Vector2(delta.X < 0f ? -1f : 1f, 0f);
            penetration = overlapX;
        }
        else
        {
            normal = new Vector2(0f, delta.Y < 0f ? -1f : 1f);
            penetration = overlapY;
        }

        var contact = (a.Body.Position + b.Body.Position) * 0.5f;
        return new CollisionManifold(a.Body, b.Body, normal, penetration, contact);
    }

    private static CollisionManifold CircleAabb(CircleCollider circle, AabbCollider box)
    {
        var min = box.Body.Position - box.HalfSize;
        var max = box.Body.Position + box.HalfSize;
        var closest = PhysicsMath.Clamp(circle.Body.Position, min, max);
        var delta = circle.Body.Position - closest;
        var distanceSquared = delta.LengthSquared();

        if (distanceSquared > circle.Radius * circle.Radius)
        {
            return CollisionManifold.None;
        }

        Vector2 normal;
        float penetration;

        if (distanceSquared <= 0.000001f)
        {
            var left = MathF.Abs(circle.Body.Position.X - min.X);
            var right = MathF.Abs(max.X - circle.Body.Position.X);
            var top = MathF.Abs(circle.Body.Position.Y - min.Y);
            var bottom = MathF.Abs(max.Y - circle.Body.Position.Y);
            var nearest = MathF.Min(MathF.Min(left, right), MathF.Min(top, bottom));

            if (nearest == left)
            {
                normal = Vector2.UnitX;
                penetration = circle.Radius + left;
                closest = new Vector2(min.X, circle.Body.Position.Y);
            }
            else if (nearest == right)
            {
                normal = -Vector2.UnitX;
                penetration = circle.Radius + right;
                closest = new Vector2(max.X, circle.Body.Position.Y);
            }
            else if (nearest == top)
            {
                normal = Vector2.UnitY;
                penetration = circle.Radius + top;
                closest = new Vector2(circle.Body.Position.X, min.Y);
            }
            else
            {
                normal = -Vector2.UnitY;
                penetration = circle.Radius + bottom;
                closest = new Vector2(circle.Body.Position.X, max.Y);
            }
        }
        else
        {
            var distance = MathF.Sqrt(distanceSquared);
            normal = -delta / distance;
            penetration = circle.Radius - distance;
        }

        return new CollisionManifold(circle.Body, box.Body, normal, penetration, closest);
    }

    private static CollisionManifold Flip(CollisionManifold manifold)
    {
        if (!manifold.HasCollision || manifold.A is null || manifold.B is null)
        {
            return CollisionManifold.None;
        }

        return new CollisionManifold(manifold.B, manifold.A, -manifold.Normal, manifold.Penetration, manifold.ContactPoint);
    }
}
