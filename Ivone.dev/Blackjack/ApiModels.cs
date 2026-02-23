namespace Ivone.dev.Blackjack;

public sealed class ShoeDepthView
{
    public required int CardsRemaining { get; init; }
    public required int CardsDealt { get; init; }
    public required int DiscardCount { get; init; }
    public required int TotalCards { get; init; }
    public required int CutCardIndex { get; init; }
    public required bool CutReached { get; init; }
}

public sealed class CardView
{
    public required string Label { get; init; }
    public required bool Hidden { get; init; }
}

public sealed class HandView
{
    public required List<CardView> Cards { get; init; }
    public required string Total { get; init; }
    public required int BetUnits { get; init; }
    public required bool IsActive { get; init; }
    public required bool IsCompleted { get; init; }
    public required bool IsDoubled { get; init; }
    public required bool IsSurrendered { get; init; }
    public required string Outcome { get; init; }
    public required decimal NetUnits { get; init; }
}

public sealed class DealerView
{
    public required List<CardView> Cards { get; init; }
    public required string Total { get; init; }
}

public sealed class StrategyHintView
{
    public required string BasicAction { get; init; }
    public required string RecommendedAction { get; init; }
    public required bool Deviation { get; init; }
    public required string Reason { get; init; }
}

public sealed class SessionStatsView
{
    public required int RoundsPlayed { get; init; }
    public required int HandsPlayed { get; init; }
    public required decimal BasicAccuracy { get; init; }
    public required decimal DeviationAccuracy { get; init; }
    public required decimal BetAccuracy { get; init; }
    public required decimal RunningCountAccuracy { get; init; }
    public required decimal TrueCountAccuracy { get; init; }
    public required decimal ApproxEvLeakUnits { get; init; }
    public required Dictionary<string, int> MistakeBreakdown { get; init; }
}

public sealed class GameSnapshot
{
    public required string GameId { get; init; }
    public required TrainingMode Mode { get; init; }
    public required GamePhase Phase { get; init; }
    public required Rules Rules { get; init; }
    public required int BetSpread { get; init; }
    public required decimal BankrollUnits { get; init; }
    public required int RunningCount { get; init; }
    public required decimal TrueCount { get; init; }
    public required int TrueCountFloor { get; init; }
    public required bool ShowRunningCount { get; init; }
    public required bool ShowTrueCount { get; init; }
    public required bool ShowShoeDepth { get; init; }
    public required bool ShowHints { get; init; }
    public required bool ReshufflePending { get; init; }
    public required ShoeDepthView ShoeDepth { get; init; }
    public required DealerView Dealer { get; init; }
    public required List<HandView> PlayerHands { get; init; }
    public required List<string> AllowedActions { get; init; }
    public required StrategyHintView? Hint { get; init; }
    public required List<string> Feedback { get; init; }
    public required SessionStatsView Stats { get; init; }
    public required List<RoundSummary> History { get; init; }
}
