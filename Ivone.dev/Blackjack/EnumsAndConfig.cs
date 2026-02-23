namespace Ivone.dev.Blackjack;

public enum Suit
{
    Clubs,
    Diamonds,
    Hearts,
    Spades
}

public enum Rank
{
    Two = 2,
    Three = 3,
    Four = 4,
    Five = 5,
    Six = 6,
    Seven = 7,
    Eight = 8,
    Nine = 9,
    Ten = 10,
    Jack = 11,
    Queen = 12,
    King = 13,
    Ace = 14
}

public enum TrainingMode
{
    FreePlay,
    Guided,
    CountingOnly,
    DeviationsOnly,
    BetSizingOnly,
    Exam
}

public enum GamePhase
{
    WaitingForBet,
    OfferInsurance,
    PlayerTurn,
    DealerTurn,
    RoundComplete
}

public enum BlackjackAction
{
    Hit,
    Stand,
    Double,
    Split,
    Surrender,
    InsuranceTake,
    InsuranceSkip
}

public enum SurrenderRule
{
    Off,
    Late,
    Early
}

public enum DoubleRule
{
    AnyTwo,
    NineToEleven,
    TenToEleven
}

public enum BlackjackPayoutRule
{
    ThreeToTwo,
    SixToFive
}

public enum MistakeType
{
    BasicStrategyError,
    MissedDeviation,
    WrongDeviation,
    BetSizingError,
    CountError
}

public sealed class Rules
{
    public int DeckCount { get; set; } = 6;
    public bool DealerHitsSoft17 { get; set; } = true;
    public DoubleRule DoubleRule { get; set; } = DoubleRule.AnyTwo;
    public bool DoubleAfterSplit { get; set; } = true;
    public bool ResplitAces { get; set; } = false;
    public int MaxSplits { get; set; } = 3;
    public BlackjackPayoutRule BlackjackPayout { get; set; } = BlackjackPayoutRule.ThreeToTwo;
    public SurrenderRule Surrender { get; set; } = SurrenderRule.Late;
    public bool InsuranceAllowed { get; set; } = true;
    public int PenetrationPercent { get; set; } = 75;
    public int BurnCards { get; set; } = 1;
}

public sealed class UiAids
{
    public bool ShowRunningCount { get; set; } = true;
    public bool ShowTrueCount { get; set; } = true;
    public bool ShowShoeDepth { get; set; } = true;
    public bool ShowHints { get; set; } = true;
}

public sealed class SessionConfig
{
    public TrainingMode Mode { get; set; } = TrainingMode.Guided;
    public Rules Rules { get; set; } = new();
    public UiAids Aids { get; set; } = new();
    public int BetSpread { get; set; } = 8;
    public decimal StartingBankrollUnits { get; set; } = 200m;
}

public abstract class CountingSystem
{
    public abstract string Name { get; }
    public abstract bool IsBalanced { get; }
    public abstract int GetTag(Card card);
}

public sealed class HiLoCountingSystem : CountingSystem
{
    public override string Name => "Hi-Lo";
    public override bool IsBalanced => true;
    public override int GetTag(Card card) => card.HiLoTag;
}
