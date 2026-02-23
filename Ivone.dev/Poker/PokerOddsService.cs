using System.Diagnostics;

namespace Ivone.dev.Poker;

public enum PokerVariant
{
    NLHE
}

public enum PokerSimulationMode
{
    MonteCarlo,
    Exact
}

public sealed class PokerSimulationRequest
{
    public PokerVariant Variant { get; set; } = PokerVariant.NLHE;
    public int PlayerCount { get; set; } = 6;
    public List<string> HeroCards { get; set; } = new();
    public List<string> BoardCards { get; set; } = new();
    public List<string> DeadCards { get; set; } = new();
    public decimal? PotSize { get; set; }
    public decimal? ToCall { get; set; }
    public int Iterations { get; set; } = 50000;
    public PokerSimulationMode Mode { get; set; } = PokerSimulationMode.MonteCarlo;
    public int? Seed { get; set; }
}

public sealed class PokerSimulationResult
{
    public required double WinPct { get; init; }
    public required double TiePct { get; init; }
    public required double LosePct { get; init; }
    public required double EquityPct { get; init; }
    public required double PotOddsPct { get; init; }
    public required decimal EvCall { get; init; }
    public required string MadeHand { get; init; }
    public required int? Outs { get; init; }
    public required double? ImproveByTurnPct { get; init; }
    public required double? ImproveByRiverPct { get; init; }
    public required string Recommendation { get; init; }
    public required string Method { get; init; }
    public required int Iterations { get; init; }
    public required long RuntimeMs { get; init; }
}

internal readonly record struct PokerCard(int Rank, int Suit)
{
    public override string ToString()
    {
        return $"{RankToChar(Rank)}{SuitToChar(Suit)}";
    }

    private static char RankToChar(int rank)
    {
        return rank switch
        {
            14 => 'A',
            13 => 'K',
            12 => 'Q',
            11 => 'J',
            10 => 'T',
            9 => '9',
            8 => '8',
            7 => '7',
            6 => '6',
            5 => '5',
            4 => '4',
            3 => '3',
            2 => '2',
            _ => '?'
        };
    }

    private static char SuitToChar(int suit)
    {
        return suit switch
        {
            0 => 'c',
            1 => 'd',
            2 => 'h',
            3 => 's',
            _ => '?'
        };
    }
}

internal readonly record struct HandValue(int Category, int A, int B, int C, int D, int E) : IComparable<HandValue>
{
    public int CompareTo(HandValue other)
    {
        if (Category != other.Category)
        {
            return Category.CompareTo(other.Category);
        }

        if (A != other.A)
        {
            return A.CompareTo(other.A);
        }

        if (B != other.B)
        {
            return B.CompareTo(other.B);
        }

        if (C != other.C)
        {
            return C.CompareTo(other.C);
        }

        if (D != other.D)
        {
            return D.CompareTo(other.D);
        }

        if (E != other.E)
        {
            return E.CompareTo(other.E);
        }

        return 0;
    }

    public string CategoryName => Category switch
    {
        8 => "Straight Flush",
        7 => "Four of a Kind",
        6 => "Full House",
        5 => "Flush",
        4 => "Straight",
        3 => "Three of a Kind",
        2 => "Two Pair",
        1 => "One Pair",
        _ => "High Card"
    };
}

public sealed class PokerOddsService
{
    public PokerSimulationResult Simulate(PokerSimulationRequest request)
    {
        if (request is null)
        {
            throw new ArgumentException("Request is required.");
        }

        if (request.Variant != PokerVariant.NLHE)
        {
            throw new ArgumentException("Only NLHE is supported in this version.");
        }

        if (request.PlayerCount is < 2 or > 10)
        {
            throw new ArgumentException("Player count must be between 2 and 10.");
        }

        if (request.HeroCards is null || request.HeroCards.Count != 2)
        {
            throw new ArgumentException("Exactly 2 hero cards are required.");
        }

        request.BoardCards ??= new List<string>();
        request.DeadCards ??= new List<string>();

        if (!IsValidBoardCount(request.BoardCards.Count))
        {
            throw new ArgumentException("Board cards must be 0, 3, 4, or 5.");
        }

        var heroCards = request.HeroCards.Select(ParseCard).ToList();
        var boardCards = request.BoardCards.Select(ParseCard).ToList();
        var deadCards = request.DeadCards.Select(ParseCard).ToList();

        var allKnown = heroCards.Concat(boardCards).Concat(deadCards).ToList();
        var duplicate = allKnown
            .GroupBy(c => c)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .FirstOrDefault();

        if (allKnown.Count != allKnown.Distinct().Count())
        {
            throw new ArgumentException($"Duplicate card detected: {duplicate}");
        }

        var deck = CreateDeck();
        var knownSet = allKnown.ToHashSet();
        var available = deck.Where(c => !knownSet.Contains(c)).ToArray();

        var opponents = request.PlayerCount - 1;
        var boardCardsNeeded = 5 - boardCards.Count;
        var cardsNeeded = opponents * 2 + boardCardsNeeded;

        if (available.Length < cardsNeeded)
        {
            throw new ArgumentException("Not enough remaining cards for this scenario.");
        }

        var iterations = Math.Clamp(request.Iterations <= 0 ? 50000 : request.Iterations, 1000, 300000);
        var rng = request.Seed.HasValue ? new Random(request.Seed.Value) : new Random();
        var stopwatch = Stopwatch.StartNew();

        var wins = 0;
        var losses = 0;
        var tieRounds = 0;
        double tieShares = 0;

        for (var i = 0; i < iterations; i++)
        {
            var draw = DrawRandomWithoutReplacement(available, cardsNeeded, rng);
            var offset = 0;

            var opponentHoles = new List<PokerCard[]>(opponents);
            for (var p = 0; p < opponents; p++)
            {
                opponentHoles.Add(new[] { draw[offset], draw[offset + 1] });
                offset += 2;
            }

            var completeBoard = new List<PokerCard>(5);
            completeBoard.AddRange(boardCards);
            for (var b = 0; b < boardCardsNeeded; b++)
            {
                completeBoard.Add(draw[offset + b]);
            }

            var heroSeven = new List<PokerCard>(7);
            heroSeven.AddRange(heroCards);
            heroSeven.AddRange(completeBoard);
            var heroValue = EvaluateBest(heroSeven);

            var beaten = false;
            var ties = 0;

            foreach (var hole in opponentHoles)
            {
                var oppSeven = new List<PokerCard>(7);
                oppSeven.AddRange(hole);
                oppSeven.AddRange(completeBoard);
                var oppValue = EvaluateBest(oppSeven);
                var cmp = oppValue.CompareTo(heroValue);

                if (cmp > 0)
                {
                    beaten = true;
                    break;
                }

                if (cmp == 0)
                {
                    ties++;
                }
            }

            if (beaten)
            {
                losses++;
                continue;
            }

            if (ties == 0)
            {
                wins++;
                continue;
            }

            tieRounds++;
            tieShares += 1.0 / (ties + 1);
        }

        stopwatch.Stop();

        var winPct = wins * 100.0 / iterations;
        var tiePct = tieRounds * 100.0 / iterations;
        var losePct = losses * 100.0 / iterations;
        var equityPct = (wins + tieShares) * 100.0 / iterations;

        var potSize = Math.Max(0m, request.PotSize ?? 0m);
        var toCall = Math.Max(0m, request.ToCall ?? 0m);
        var potOddsPct = toCall > 0 ? (double)(toCall / (potSize + toCall) * 100m) : 0d;
        var evCall = toCall > 0 ? (decimal)(equityPct / 100d) * (potSize + toCall) - toCall : 0m;

        var method = request.Mode == PokerSimulationMode.Exact ? "MonteCarlo (exact fallback)" : "MonteCarlo";
        var madeHand = ResolveMadeHandName(heroCards, boardCards);
        var (outs, improveByTurnPct, improveByRiverPct) = ResolveImprovementStats(heroCards, boardCards, deadCards, deck);

        return new PokerSimulationResult
        {
            WinPct = winPct,
            TiePct = tiePct,
            LosePct = losePct,
            EquityPct = equityPct,
            PotOddsPct = potOddsPct,
            EvCall = evCall,
            MadeHand = madeHand,
            Outs = outs,
            ImproveByTurnPct = improveByTurnPct,
            ImproveByRiverPct = improveByRiverPct,
            Recommendation = BuildRecommendation(equityPct, potOddsPct, toCall),
            Method = method,
            Iterations = iterations,
            RuntimeMs = stopwatch.ElapsedMilliseconds
        };
    }

    private static bool IsValidBoardCount(int boardCount)
    {
        return boardCount is 0 or 3 or 4 or 5;
    }

    private static string BuildRecommendation(double equityPct, double potOddsPct, decimal toCall)
    {
        if (toCall <= 0)
        {
            return "No call required. Check available; bet/raise for value when ahead.";
        }

        var edge = equityPct - potOddsPct;
        if (edge >= 5)
        {
            return "Strong +EV call. Raising can be considered based on position and fold equity.";
        }

        if (edge >= 1)
        {
            return "Small +EV call. Proceed with caution on future streets.";
        }

        if (edge > -2)
        {
            return "Marginal spot. Opponent tendencies and implied odds matter.";
        }

        return "Negative EV call by raw odds. Fold is usually better.";
    }

    private static (int? Outs, double? ImproveByTurnPct, double? ImproveByRiverPct) ResolveImprovementStats(
        IReadOnlyList<PokerCard> heroCards,
        IReadOnlyList<PokerCard> boardCards,
        IReadOnlyList<PokerCard> deadCards,
        IReadOnlyList<PokerCard> deck)
    {
        if (boardCards.Count is not 3 and not 4)
        {
            return (null, null, null);
        }

        var known = heroCards.Concat(boardCards).Concat(deadCards).ToHashSet();
        var available = deck.Where(c => !known.Contains(c)).ToArray();

        var currentCards = new List<PokerCard>(heroCards.Count + boardCards.Count);
        currentCards.AddRange(heroCards);
        currentCards.AddRange(boardCards);
        var baseline = EvaluateBest(currentCards);

        var outs = 0;
        var improveByTurnPct = (double?)null;
        var improveByRiverPct = (double?)null;

        var improveNextStreetCount = 0;
        for (var i = 0; i < available.Length; i++)
        {
            var trial = new List<PokerCard>(currentCards.Count + 1);
            trial.AddRange(currentCards);
            trial.Add(available[i]);
            var value = EvaluateBest(trial);
            if (value.CompareTo(baseline) > 0)
            {
                improveNextStreetCount++;
            }
        }

        if (available.Length > 0)
        {
            outs = improveNextStreetCount;
            var pct = improveNextStreetCount * 100.0 / available.Length;
            if (boardCards.Count == 3)
            {
                improveByTurnPct = pct;
            }
            else
            {
                improveByRiverPct = pct;
            }
        }

        if (boardCards.Count == 3 && available.Length >= 2)
        {
            var improveByRiverCount = 0;
            var totalCombos = 0;
            for (var i = 0; i < available.Length - 1; i++)
            {
                for (var j = i + 1; j < available.Length; j++)
                {
                    totalCombos++;
                    var trial = new List<PokerCard>(currentCards.Count + 2);
                    trial.AddRange(currentCards);
                    trial.Add(available[i]);
                    trial.Add(available[j]);
                    var value = EvaluateBest(trial);
                    if (value.CompareTo(baseline) > 0)
                    {
                        improveByRiverCount++;
                    }
                }
            }

            if (totalCombos > 0)
            {
                improveByRiverPct = improveByRiverCount * 100.0 / totalCombos;
            }
        }

        return (outs, improveByTurnPct, improveByRiverPct);
    }

    private static string ResolveMadeHandName(IReadOnlyList<PokerCard> heroCards, IReadOnlyList<PokerCard> boardCards)
    {
        var knownCount = heroCards.Count + boardCards.Count;
        if (knownCount < 5)
        {
            return "Preflop (no made hand yet)";
        }

        var known = new List<PokerCard>(knownCount);
        known.AddRange(heroCards);
        known.AddRange(boardCards);
        return EvaluateBest(known).CategoryName;
    }

    private static PokerCard[] DrawRandomWithoutReplacement(PokerCard[] source, int count, Random rng)
    {
        var copy = new PokerCard[source.Length];
        Array.Copy(source, copy, source.Length);

        for (var i = 0; i < count; i++)
        {
            var j = rng.Next(i, copy.Length);
            (copy[i], copy[j]) = (copy[j], copy[i]);
        }

        var result = new PokerCard[count];
        Array.Copy(copy, result, count);
        return result;
    }

    private static PokerCard ParseCard(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            throw new ArgumentException("Card code is required.");
        }

        var text = raw.Trim();
        char rankChar;
        char suitChar;

        if (text.Length == 2)
        {
            rankChar = text[0];
            suitChar = text[1];
        }
        else if (text.Length == 3 && text.StartsWith("10", StringComparison.OrdinalIgnoreCase))
        {
            rankChar = 'T';
            suitChar = text[2];
        }
        else
        {
            throw new ArgumentException($"Invalid card code '{raw}'. Use format like 'As', 'Td', '9h'.");
        }

        var rank = char.ToUpperInvariant(rankChar) switch
        {
            'A' => 14,
            'K' => 13,
            'Q' => 12,
            'J' => 11,
            'T' => 10,
            '9' => 9,
            '8' => 8,
            '7' => 7,
            '6' => 6,
            '5' => 5,
            '4' => 4,
            '3' => 3,
            '2' => 2,
            _ => throw new ArgumentException($"Invalid rank in card '{raw}'.")
        };

        var suit = char.ToLowerInvariant(suitChar) switch
        {
            'c' => 0,
            'd' => 1,
            'h' => 2,
            's' => 3,
            _ => throw new ArgumentException($"Invalid suit in card '{raw}'.")
        };

        return new PokerCard(rank, suit);
    }

    private static List<PokerCard> CreateDeck()
    {
        var cards = new List<PokerCard>(52);
        for (var suit = 0; suit < 4; suit++)
        {
            for (var rank = 2; rank <= 14; rank++)
            {
                cards.Add(new PokerCard(rank, suit));
            }
        }

        return cards;
    }

    private static HandValue EvaluateBest(IReadOnlyList<PokerCard> cards)
    {
        if (cards.Count < 5)
        {
            throw new ArgumentException("At least 5 cards are required for evaluation.");
        }

        var best = new HandValue(-1, 0, 0, 0, 0, 0);
        for (var i = 0; i < cards.Count - 4; i++)
        {
            for (var j = i + 1; j < cards.Count - 3; j++)
            {
                for (var k = j + 1; k < cards.Count - 2; k++)
                {
                    for (var l = k + 1; l < cards.Count - 1; l++)
                    {
                        for (var m = l + 1; m < cards.Count; m++)
                        {
                            var value = EvaluateFive(cards[i], cards[j], cards[k], cards[l], cards[m]);
                            if (value.CompareTo(best) > 0)
                            {
                                best = value;
                            }
                        }
                    }
                }
            }
        }

        return best;
    }

    private static HandValue EvaluateFive(PokerCard c1, PokerCard c2, PokerCard c3, PokerCard c4, PokerCard c5)
    {
        Span<int> rankCounts = stackalloc int[15];
        Span<int> suitCounts = stackalloc int[4];

        rankCounts[c1.Rank]++;
        rankCounts[c2.Rank]++;
        rankCounts[c3.Rank]++;
        rankCounts[c4.Rank]++;
        rankCounts[c5.Rank]++;

        suitCounts[c1.Suit]++;
        suitCounts[c2.Suit]++;
        suitCounts[c3.Suit]++;
        suitCounts[c4.Suit]++;
        suitCounts[c5.Suit]++;

        var isFlush = suitCounts[0] == 5 || suitCounts[1] == 5 || suitCounts[2] == 5 || suitCounts[3] == 5;
        var straightHigh = GetStraightHigh(rankCounts);

        if (isFlush && straightHigh > 0)
        {
            return new HandValue(8, straightHigh, 0, 0, 0, 0);
        }

        var four = 0;
        var trip1 = 0;
        var trip2 = 0;
        var pair1 = 0;
        var pair2 = 0;
        Span<int> singles = stackalloc int[3];
        var singleCount = 0;

        for (var rank = 14; rank >= 2; rank--)
        {
            switch (rankCounts[rank])
            {
                case 4:
                    four = rank;
                    break;
                case 3:
                    if (trip1 == 0)
                    {
                        trip1 = rank;
                    }
                    else
                    {
                        trip2 = rank;
                    }

                    break;
                case 2:
                    if (pair1 == 0)
                    {
                        pair1 = rank;
                    }
                    else
                    {
                        pair2 = rank;
                    }

                    break;
                case 1:
                    singles[singleCount++] = rank;
                    break;
            }
        }

        if (four > 0)
        {
            return new HandValue(7, four, singles[0], 0, 0, 0);
        }

        if (trip1 > 0 && (trip2 > 0 || pair1 > 0))
        {
            var pair = trip2 > 0 ? trip2 : pair1;
            return new HandValue(6, trip1, pair, 0, 0, 0);
        }

        if (isFlush)
        {
            Span<int> flushRanks = stackalloc int[5] { c1.Rank, c2.Rank, c3.Rank, c4.Rank, c5.Rank };
            flushRanks.Sort();
            return new HandValue(5, flushRanks[4], flushRanks[3], flushRanks[2], flushRanks[1], flushRanks[0]);
        }

        if (straightHigh > 0)
        {
            return new HandValue(4, straightHigh, 0, 0, 0, 0);
        }

        if (trip1 > 0)
        {
            return new HandValue(3, trip1, singles[0], singles[1], 0, 0);
        }

        if (pair1 > 0 && pair2 > 0)
        {
            return new HandValue(2, pair1, pair2, singles[0], 0, 0);
        }

        if (pair1 > 0)
        {
            return new HandValue(1, pair1, singles[0], singles[1], singles[2], 0);
        }

        Span<int> high = stackalloc int[5] { c1.Rank, c2.Rank, c3.Rank, c4.Rank, c5.Rank };
        high.Sort();
        return new HandValue(0, high[4], high[3], high[2], high[1], high[0]);
    }

    private static int GetStraightHigh(ReadOnlySpan<int> rankCounts)
    {
        for (var high = 14; high >= 5; high--)
        {
            if (rankCounts[high] > 0 &&
                rankCounts[high - 1] > 0 &&
                rankCounts[high - 2] > 0 &&
                rankCounts[high - 3] > 0 &&
                rankCounts[high - 4] > 0)
            {
                return high;
            }
        }

        if (rankCounts[14] > 0 &&
            rankCounts[5] > 0 &&
            rankCounts[4] > 0 &&
            rankCounts[3] > 0 &&
            rankCounts[2] > 0)
        {
            return 5;
        }

        return 0;
    }
}
