using System.Globalization;

namespace Ivone.dev.Blackjack;

public readonly record struct Card(Suit Suit, Rank Rank)
{
    public int PointValue => Rank switch
    {
        Rank.Ace => 11,
        Rank.Jack => 10,
        Rank.Queen => 10,
        Rank.King => 10,
        _ => (int)Rank
    };

    public int HiLoTag => PointValue switch
    {
        >= 2 and <= 6 => 1,
        >= 7 and <= 9 => 0,
        _ => -1
    };

    public string Label
    {
        get
        {
            var rank = Rank switch
            {
                Rank.Ace => "A",
                Rank.King => "K",
                Rank.Queen => "Q",
                Rank.Jack => "J",
                Rank.Ten => "10",
                _ => ((int)Rank).ToString(CultureInfo.InvariantCulture)
            };

            var suit = Suit switch
            {
                Suit.Clubs => "♣",
                Suit.Diamonds => "♦",
                Suit.Hearts => "♥",
                _ => "♠"
            };

            return string.Concat(rank, suit);
        }
    }
}

public sealed class Hand
{
    public List<Card> Cards { get; } = [];
    public int BetUnits { get; set; }
    public bool IsSplitHand { get; set; }
    public bool IsSplitAces { get; set; }
    public bool IsDoubled { get; set; }
    public bool IsCompleted { get; set; }
    public bool IsSurrendered { get; set; }
    public decimal NetUnits { get; set; }
    public string OutcomeLabel { get; set; } = string.Empty;

    public bool CanSplit
    {
        get
        {
            if (Cards.Count != 2)
            {
                return false;
            }

            return SplitValue(Cards[0]) == SplitValue(Cards[1]);
        }
    }

    public bool IsBlackjack => !IsSplitHand && Cards.Count == 2 && BestTotal == 21;
    public bool IsBust => BestTotal > 21;
    public int BestTotal => Evaluate().best;
    public bool IsSoft => Evaluate().soft;
    public int HardTotal => Cards.Sum(static c => c.PointValue == 11 ? 1 : c.PointValue);

    public static int SplitValue(Card card) => card.PointValue == 11 ? 11 : Math.Min(10, card.PointValue);

    public string TotalLabel
    {
        get
        {
            if (Cards.Count == 0)
            {
                return "-";
            }

            if (IsBust)
            {
                return $"{BestTotal} (bust)";
            }

            if (IsSoft)
            {
                return $"{BestTotal} (soft)";
            }

            return BestTotal.ToString(CultureInfo.InvariantCulture);
        }
    }

    private (int best, bool soft) Evaluate()
    {
        var total = Cards.Sum(static c => c.PointValue == 11 ? 1 : c.PointValue);
        var aces = Cards.Count(static c => c.PointValue == 11);
        var soft = false;

        while (aces > 0 && total + 10 <= 21)
        {
            total += 10;
            aces--;
            soft = true;
        }

        return (total, soft);
    }
}

public sealed class Player
{
    public List<Hand> Hands { get; } = [];
}

public sealed class Dealer
{
    public Hand Hand { get; } = new();
    public bool HoleCardRevealed { get; set; }
}

public sealed class RoundState
{
    public int RoundNumber { get; init; }
    public int BetUnits { get; set; }
    public decimal InsuranceBetUnits { get; set; }
    public bool InsuranceTaken { get; set; }
    public bool DealerHasBlackjack { get; set; }
    public int ActiveHandIndex { get; set; }
    public GamePhase Phase { get; set; } = GamePhase.WaitingForBet;
    public decimal NetUnits { get; set; }
    public bool Completed { get; set; }
    public Player Player { get; } = new();
    public Dealer Dealer { get; } = new();
    public List<string> Mistakes { get; } = [];
}

public sealed class SessionStats
{
    public int RoundsPlayed { get; set; }
    public int HandsPlayed { get; set; }
    public int BasicOpportunities { get; set; }
    public int BasicCorrect { get; set; }
    public int BasicErrors { get; set; }
    public int DeviationOpportunities { get; set; }
    public int DeviationCorrect { get; set; }
    public int MissedDeviations { get; set; }
    public int WrongDeviations { get; set; }
    public int BetChecks { get; set; }
    public int BetCorrect { get; set; }
    public int BetOver { get; set; }
    public int BetUnder { get; set; }
    public int RunningCountChecks { get; set; }
    public int RunningCountCorrect { get; set; }
    public int TrueCountChecks { get; set; }
    public int TrueCountCorrect { get; set; }
    public decimal ApproxEvLeakUnits { get; set; }
    public Dictionary<MistakeType, int> MistakeBreakdown { get; } = new();

    public decimal BasicAccuracy => BasicOpportunities == 0 ? 100m : BasicCorrect * 100m / BasicOpportunities;
    public decimal DeviationAccuracy => DeviationOpportunities == 0 ? 100m : DeviationCorrect * 100m / DeviationOpportunities;
    public decimal BetAccuracy => BetChecks == 0 ? 100m : BetCorrect * 100m / BetChecks;
    public decimal RunningCountAccuracy => RunningCountChecks == 0 ? 100m : RunningCountCorrect * 100m / RunningCountChecks;
    public decimal TrueCountAccuracy => TrueCountChecks == 0 ? 100m : TrueCountCorrect * 100m / TrueCountChecks;

    public void RegisterMistake(MistakeType type)
    {
        if (!MistakeBreakdown.TryAdd(type, 1))
        {
            MistakeBreakdown[type]++;
        }
    }
}

public sealed class RoundSummary
{
    public required int RoundNumber { get; init; }
    public required int BetUnits { get; init; }
    public required decimal NetUnits { get; init; }
    public required int RunningCountEnd { get; init; }
    public required decimal TrueCountEnd { get; init; }
    public required string Outcome { get; init; }
    public required IReadOnlyList<string> Mistakes { get; init; }
}

public sealed class GameState
{
    public required string GameId { get; init; }
    public required SessionConfig Config { get; init; }
    public required Shoe Shoe { get; set; }
    public required CountingSystem CountingSystem { get; init; }
    public required SessionStats Stats { get; init; }
    public required List<RoundSummary> History { get; init; }
    public required object SyncRoot { get; init; }

    public int RunningCount { get; set; }
    public decimal BankrollUnits { get; set; }
    public int NextRoundNumber { get; set; } = 1;
    public bool ReshufflePending { get; set; }
    public RoundState? Round { get; set; }
    public List<string> Feedback { get; } = [];

    public decimal TrueCount => CountingSystem.IsBalanced ? RunningCount / Shoe.DecksRemaining : RunningCount;
    public int TrueCountFloor => TrueCount >= 0 ? (int)Math.Floor(TrueCount) : (int)Math.Ceiling(TrueCount);
}
