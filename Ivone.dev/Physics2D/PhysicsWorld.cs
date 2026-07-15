using System.Diagnostics;
using System.Numerics;

namespace Ivone.dev.Physics2D;

public sealed class PhysicsWorld
{
    private readonly List<RigidBody> _bodies = new();
    private readonly List<CollisionManifold> _contacts = new();
    private int _nextBodyId = 1;

    public PhysicsWorld()
        : this(new PhysicsSettings())
    {
    }

    public PhysicsWorld(PhysicsSettings settings)
    {
        Settings = settings;
    }

    public PhysicsSettings Settings { get; }
    public IReadOnlyList<RigidBody> Bodies => _bodies;
    public IReadOnlyList<CollisionManifold> Contacts => _contacts;
    public int LastPairCount { get; private set; }
    public TimeSpan LastStepDuration { get; private set; }

    public RigidBody CreateBody(BodyDefinition definition)
    {
        var body = new RigidBody(_nextBodyId++, definition);
        AddBody(body);
        return body;
    }

    public void AddBody(RigidBody body)
    {
        if (_bodies.Any(existing => existing.Id == body.Id))
        {
            throw new InvalidOperationException($"Body id {body.Id} already exists in this world.");
        }

        _bodies.Add(body);
    }

    public void Clear()
    {
        _bodies.Clear();
        _contacts.Clear();
        _nextBodyId = 1;
        LastPairCount = 0;
        LastStepDuration = TimeSpan.Zero;
    }

    public void Step(float dt)
    {
        if (dt <= 0f || float.IsNaN(dt) || float.IsInfinity(dt))
        {
            throw new ArgumentOutOfRangeException(nameof(dt), "Step delta time must be finite and greater than zero.");
        }

        var stopwatch = Stopwatch.StartNew();

        ApplyForces();
        Integrate(dt);
        DetectCollisions();

        for (var i = 0; i < Settings.VelocityIterations; i++)
        {
            ResolveCollisions();
        }

        for (var i = 0; i < Settings.PositionIterations; i++)
        {
            CorrectPositions();
        }

        ClearForces();

        stopwatch.Stop();
        LastStepDuration = stopwatch.Elapsed;
    }

    public PhysicsDebugSnapshot CreateDebugSnapshot()
    {
        var bodies = new List<DebugBody>(_bodies.Count);
        for (var i = 0; i < _bodies.Count; i++)
        {
            var body = _bodies[i];
            var aabb = body.Collider.GetAabb();
            bodies.Add(new DebugBody(
                body.Id,
                body.Position.X,
                body.Position.Y,
                body.Velocity.X,
                body.Velocity.Y,
                body.IsStatic,
                body.Collider.Type,
                body.Collider is CircleCollider circle ? circle.Radius : 0f,
                body.Collider is AabbCollider box ? box.HalfSize.X : 0f,
                body.Collider is AabbCollider box2 ? box2.HalfSize.Y : 0f,
                aabb.Min.X,
                aabb.Min.Y,
                aabb.Max.X,
                aabb.Max.Y));
        }

        var contacts = new List<DebugContact>(_contacts.Count);
        for (var i = 0; i < _contacts.Count; i++)
        {
            var contact = _contacts[i];
            contacts.Add(new DebugContact(
                contact.ContactPoint.X,
                contact.ContactPoint.Y,
                contact.Normal.X,
                contact.Normal.Y,
                contact.Penetration));
        }

        return new PhysicsDebugSnapshot(bodies, contacts, LastPairCount, LastStepDuration.TotalMilliseconds);
    }

    private void ApplyForces()
    {
        for (var i = 0; i < _bodies.Count; i++)
        {
            var body = _bodies[i];
            if (body.IsStatic || body.IsSleeping)
            {
                continue;
            }

            body.AddForce(Settings.Gravity * body.Mass);
        }
    }

    private void Integrate(float dt)
    {
        for (var i = 0; i < _bodies.Count; i++)
        {
            var body = _bodies[i];
            if (body.IsStatic || body.IsSleeping)
            {
                continue;
            }

            body.PreviousPosition = body.Position;
            var acceleration = body.Force * body.InverseMass;
            body.Velocity += acceleration * dt;
            body.Position += body.Velocity * dt;
            ValidateBody(body);
        }
    }

    private void DetectCollisions()
    {
        _contacts.Clear();
        LastPairCount = 0;

        for (var i = 0; i < _bodies.Count; i++)
        {
            for (var j = i + 1; j < _bodies.Count; j++)
            {
                var a = _bodies[i];
                var b = _bodies[j];

                if (a.IsStatic && b.IsStatic)
                {
                    continue;
                }

                LastPairCount++;

                if (!a.Collider.GetAabb().Intersects(b.Collider.GetAabb()))
                {
                    continue;
                }

                var manifold = CollisionDetector.Test(a.Collider, b.Collider);
                if (manifold.HasCollision)
                {
                    _contacts.Add(manifold);
                }
            }
        }
    }

    private void ResolveCollisions()
    {
        for (var i = 0; i < _contacts.Count; i++)
        {
            var contact = _contacts[i];
            if (contact.A is null || contact.B is null)
            {
                continue;
            }

            if (contact.A.Collider.IsSensor || contact.B.Collider.IsSensor)
            {
                continue;
            }

            ResolveContact(contact);
        }
    }

    private static void ResolveContact(CollisionManifold contact)
    {
        var a = contact.A!;
        var b = contact.B!;
        var inverseMassSum = a.InverseMass + b.InverseMass;

        if (inverseMassSum <= 0f)
        {
            return;
        }

        var relativeVelocity = b.Velocity - a.Velocity;
        var velocityAlongNormal = Vector2.Dot(relativeVelocity, contact.Normal);

        if (velocityAlongNormal > 0f)
        {
            return;
        }

        var restitution = MathF.Min(a.Restitution, b.Restitution);
        var impulseMagnitude = -(1f + restitution) * velocityAlongNormal;
        impulseMagnitude /= inverseMassSum;

        var impulse = impulseMagnitude * contact.Normal;
        a.Velocity -= impulse * a.InverseMass;
        b.Velocity += impulse * b.InverseMass;

        relativeVelocity = b.Velocity - a.Velocity;
        var tangent = relativeVelocity - Vector2.Dot(relativeVelocity, contact.Normal) * contact.Normal;
        tangent = PhysicsMath.NormalizeSafe(tangent);

        if (tangent == Vector2.Zero)
        {
            return;
        }

        var tangentMagnitude = -Vector2.Dot(relativeVelocity, tangent);
        tangentMagnitude /= inverseMassSum;

        var staticFriction = MathF.Sqrt(a.StaticFriction * b.StaticFriction);
        Vector2 frictionImpulse;

        if (MathF.Abs(tangentMagnitude) < impulseMagnitude * staticFriction)
        {
            frictionImpulse = tangentMagnitude * tangent;
        }
        else
        {
            var dynamicFriction = MathF.Sqrt(a.DynamicFriction * b.DynamicFriction);
            frictionImpulse = -impulseMagnitude * tangent * dynamicFriction;
        }

        a.Velocity -= frictionImpulse * a.InverseMass;
        b.Velocity += frictionImpulse * b.InverseMass;
    }

    private void CorrectPositions()
    {
        for (var i = 0; i < _contacts.Count; i++)
        {
            var contact = _contacts[i];
            if (contact.A is null || contact.B is null)
            {
                continue;
            }

            if (contact.A.Collider.IsSensor || contact.B.Collider.IsSensor)
            {
                continue;
            }

            var inverseMassSum = contact.A.InverseMass + contact.B.InverseMass;
            if (inverseMassSum <= 0f)
            {
                continue;
            }

            var correctionMagnitude = MathF.Max(contact.Penetration - Settings.PositionCorrectionSlop, 0f) /
                inverseMassSum *
                Settings.PositionCorrectionPercent;
            var correction = correctionMagnitude * contact.Normal;

            contact.A.Position -= correction * contact.A.InverseMass;
            contact.B.Position += correction * contact.B.InverseMass;
        }
    }

    private void ClearForces()
    {
        for (var i = 0; i < _bodies.Count; i++)
        {
            _bodies[i].Force = Vector2.Zero;
            _bodies[i].Torque = 0f;
        }
    }

    private static void ValidateBody(RigidBody body)
    {
        if (float.IsNaN(body.Position.X) || float.IsNaN(body.Position.Y) ||
            float.IsInfinity(body.Position.X) || float.IsInfinity(body.Position.Y))
        {
            throw new InvalidOperationException($"Body {body.Id} position became invalid.");
        }

        if (float.IsNaN(body.Velocity.X) || float.IsNaN(body.Velocity.Y) ||
            float.IsInfinity(body.Velocity.X) || float.IsInfinity(body.Velocity.Y))
        {
            throw new InvalidOperationException($"Body {body.Id} velocity became invalid.");
        }
    }
}

public sealed record PhysicsDebugSnapshot(
    IReadOnlyList<DebugBody> Bodies,
    IReadOnlyList<DebugContact> Contacts,
    int PairCount,
    double StepMilliseconds);

public sealed record DebugBody(
    int Id,
    float X,
    float Y,
    float VelocityX,
    float VelocityY,
    bool IsStatic,
    ColliderType ShapeType,
    float Radius,
    float HalfWidth,
    float HalfHeight,
    float AabbMinX,
    float AabbMinY,
    float AabbMaxX,
    float AabbMaxY);

public sealed record DebugContact(float X, float Y, float NormalX, float NormalY, float Penetration);
