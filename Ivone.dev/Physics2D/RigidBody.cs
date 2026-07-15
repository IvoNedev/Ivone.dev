using System.Numerics;

namespace Ivone.dev.Physics2D;

public sealed class BodyDefinition
{
    public Vector2 Position { get; init; }
    public Vector2 Velocity { get; init; }
    public float Mass { get; init; } = 1f;
    public bool IsStatic { get; init; }
    public ColliderDefinition Collider { get; init; } = null!;
    public float Restitution { get; init; } = 0.1f;
    public float StaticFriction { get; init; } = 0.5f;
    public float DynamicFriction { get; init; } = 0.3f;
}

public sealed class RigidBody
{
    internal RigidBody(int id, BodyDefinition definition)
    {
        if (definition.Collider is null)
        {
            throw new ArgumentException("Body definition must include a collider.", nameof(definition));
        }

        if (!definition.IsStatic && definition.Mass <= 0f)
        {
            throw new ArgumentOutOfRangeException(nameof(definition), "Dynamic body mass must be greater than zero.");
        }

        Id = id;
        Position = definition.Position;
        PreviousPosition = definition.Position;
        Velocity = definition.Velocity;
        Mass = definition.IsStatic ? float.PositiveInfinity : definition.Mass;
        InverseMass = definition.IsStatic ? 0f : 1f / definition.Mass;
        Restitution = Math.Clamp(definition.Restitution, 0f, 1f);
        StaticFriction = Math.Max(0f, definition.StaticFriction);
        DynamicFriction = Math.Max(0f, definition.DynamicFriction);
        IsStatic = definition.IsStatic;
        Collider = definition.Collider.Create(this);
    }

    public int Id { get; }
    public Vector2 Position;
    public Vector2 PreviousPosition;
    public Vector2 Velocity;
    public Vector2 Force;
    public float Rotation;
    public float AngularVelocity;
    public float Torque;
    public float Mass { get; }
    public float InverseMass { get; }
    public float Restitution { get; set; }
    public float StaticFriction { get; set; }
    public float DynamicFriction { get; set; }
    public bool IsStatic { get; }
    public bool IsSleeping { get; set; }
    public Collider Collider { get; }

    public void AddForce(Vector2 force)
    {
        if (IsStatic)
        {
            return;
        }

        Force += force;
        IsSleeping = false;
    }

    public void ApplyImpulse(Vector2 impulse)
    {
        if (IsStatic)
        {
            return;
        }

        Velocity += impulse * InverseMass;
        IsSleeping = false;
    }
}
