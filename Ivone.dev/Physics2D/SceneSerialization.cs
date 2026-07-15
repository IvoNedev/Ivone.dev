using System.Numerics;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Ivone.dev.Physics2D;

public sealed class SceneDto
{
    public int Version { get; init; } = 1;
    public Vector2Dto Gravity { get; init; } = new(0f, 980f);
    public List<BodyDto> Bodies { get; init; } = new();
}

public sealed class BodyDto
{
    public string Id { get; init; } = string.Empty;
    public string Type { get; init; } = "dynamic";
    public Vector2Dto Position { get; init; }
    public Vector2Dto Velocity { get; init; }
    public float Mass { get; init; } = 1f;
    public float Restitution { get; init; } = 0.1f;
    public float StaticFriction { get; init; } = 0.5f;
    public float DynamicFriction { get; init; } = 0.3f;
    public ColliderDto Collider { get; init; } = new();
}

public sealed class ColliderDto
{
    public string Type { get; init; } = "circle";
    public float Radius { get; init; } = 16f;
    public Vector2Dto HalfSize { get; init; } = new(16f, 16f);
}

public readonly record struct Vector2Dto(float X, float Y)
{
    public Vector2 ToVector2() => new(X, Y);
}

public static class SceneLoader
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public static SceneDto Parse(string json)
    {
        return JsonSerializer.Deserialize<SceneDto>(json, JsonOptions) ??
            throw new InvalidOperationException("Scene JSON did not contain a scene.");
    }

    public static void Load(PhysicsWorld world, SceneDto scene)
    {
        world.Clear();
        world.Settings.Gravity = scene.Gravity.ToVector2();

        for (var i = 0; i < scene.Bodies.Count; i++)
        {
            var body = scene.Bodies[i];
            world.CreateBody(new BodyDefinition
            {
                Position = body.Position.ToVector2(),
                Velocity = body.Velocity.ToVector2(),
                IsStatic = string.Equals(body.Type, "static", StringComparison.OrdinalIgnoreCase),
                Mass = body.Mass,
                Restitution = body.Restitution,
                StaticFriction = body.StaticFriction,
                DynamicFriction = body.DynamicFriction,
                Collider = CreateColliderDefinition(body.Collider)
            });
        }
    }

    private static ColliderDefinition CreateColliderDefinition(ColliderDto collider)
    {
        return collider.Type.ToLowerInvariant() switch
        {
            "circle" => ColliderDefinition.CircleCollider(collider.Radius),
            "aabb" => ColliderDefinition.AabbCollider(collider.HalfSize.ToVector2()),
            _ => throw new InvalidOperationException($"Unsupported collider type '{collider.Type}'.")
        };
    }
}
