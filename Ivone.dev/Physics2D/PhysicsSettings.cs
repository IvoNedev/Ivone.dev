using System.Numerics;

namespace Ivone.dev.Physics2D;

public sealed class PhysicsSettings
{
    public float FixedDeltaTime { get; set; } = 1f / 60f;
    public int VelocityIterations { get; set; } = 1;
    public int PositionIterations { get; set; } = 1;
    public Vector2 Gravity { get; set; } = new(0f, 980f);
    public float PositionCorrectionPercent { get; set; } = 0.8f;
    public float PositionCorrectionSlop { get; set; } = 0.01f;
}
