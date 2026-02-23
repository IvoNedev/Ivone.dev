namespace Ivone.dev.Blackjack;

internal enum DeviationHandKind
{
    Hard,
    Soft,
    Pair,
    Insurance
}

internal sealed record HiLoDeviation(
    DeviationHandKind Kind,
    int PlayerValue,
    int DealerUp,
    int IndexAtOrAbove,
    BlackjackAction Action,
    string Name);

public sealed class StrategyDecision
{
    public required BlackjackAction BasicAction { get; init; }
    public required BlackjackAction RecommendedAction { get; init; }
    public required bool DeviationOpportunity { get; init; }
    public required string Reason { get; init; }
}

public sealed class StrategyEngine
{
    private readonly IReadOnlyList<HiLoDeviation> _hiLoDeviations =
    [
        new(DeviationHandKind.Insurance, 0, 11, 3, BlackjackAction.InsuranceTake, "Insurance +3"),
        new(DeviationHandKind.Hard, 16, 10, 0, BlackjackAction.Stand, "16v10 stand at TC>=0"),
        new(DeviationHandKind.Hard, 15, 10, 4, BlackjackAction.Stand, "15v10 stand at TC>=4"),
        new(DeviationHandKind.Hard, 12, 3, 2, BlackjackAction.Stand, "12v3 stand at TC>=2"),
        new(DeviationHandKind.Hard, 12, 2, 3, BlackjackAction.Stand, "12v2 stand at TC>=3"),
        new(DeviationHandKind.Hard, 10, 10, 4, BlackjackAction.Double, "10v10 double at TC>=4"),
        new(DeviationHandKind.Hard, 10, 11, 4, BlackjackAction.Double, "10vA double at TC>=4"),
        new(DeviationHandKind.Hard, 9, 2, 1, BlackjackAction.Double, "9v2 double at TC>=1"),
        new(DeviationHandKind.Hard, 9, 7, 3, BlackjackAction.Double, "9v7 double at TC>=3"),
        new(DeviationHandKind.Hard, 11, 11, 1, BlackjackAction.Double, "11vA double at TC>=1")
    ];

    public StrategyDecision EvaluateInsurance(int trueCount)
    {
        var basic = BlackjackAction.InsuranceSkip;
        var recommendation = trueCount >= 3 ? BlackjackAction.InsuranceTake : BlackjackAction.InsuranceSkip;

        return new StrategyDecision
        {
            BasicAction = basic,
            RecommendedAction = recommendation,
            DeviationOpportunity = recommendation != basic,
            Reason = recommendation == basic ? "Insurance is negative EV below TC +3." : "Take insurance at TC +3 or above."
        };
    }

    public StrategyDecision EvaluateHand(
        Rules rules,
        Hand hand,
        Card dealerUpCard,
        int trueCount,
        bool canSplit,
        bool canDouble,
        bool canSurrender)
    {
        var basic = GetBasicAction(rules, hand, dealerUpCard, canSplit, canDouble, canSurrender);
        var recommendation = basic;
        var reason = "Basic strategy";

        var deviation = FindDeviation(hand, dealerUpCard, trueCount);
        if (deviation is not null)
        {
            var normalized = NormalizeToAllowed(deviation.Action, canSplit, canDouble, canSurrender);
            if (normalized != basic)
            {
                recommendation = normalized;
                reason = deviation.Name;
            }
        }

        return new StrategyDecision
        {
            BasicAction = basic,
            RecommendedAction = recommendation,
            DeviationOpportunity = recommendation != basic,
            Reason = reason
        };
    }

    private HiLoDeviation? FindDeviation(Hand hand, Card dealerUpCard, int trueCount)
    {
        var dealer = DealerValue(dealerUpCard);
        DeviationHandKind kind;
        int playerValue;

        if (hand.CanSplit)
        {
            kind = DeviationHandKind.Pair;
            playerValue = Hand.SplitValue(hand.Cards[0]);
        }
        else if (hand.IsSoft)
        {
            kind = DeviationHandKind.Soft;
            playerValue = hand.BestTotal;
        }
        else
        {
            kind = DeviationHandKind.Hard;
            playerValue = hand.BestTotal;
        }

        return _hiLoDeviations.FirstOrDefault(d =>
            d.Kind == kind &&
            d.PlayerValue == playerValue &&
            d.DealerUp == dealer &&
            trueCount >= d.IndexAtOrAbove);
    }

    private static BlackjackAction GetBasicAction(
        Rules rules,
        Hand hand,
        Card dealerUpCard,
        bool canSplit,
        bool canDouble,
        bool canSurrender)
    {
        var dealer = DealerValue(dealerUpCard);
        var hardTotal = hand.HardTotal;
        var softTotal = hand.BestTotal;

        if (canSurrender && hand.Cards.Count == 2 && !hand.IsSplitHand && rules.Surrender != SurrenderRule.Off)
        {
            if (hardTotal == 16 && dealer >= 9)
            {
                return BlackjackAction.Surrender;
            }

            if (hardTotal == 15 && (dealer == 10 || (dealer == 11 && rules.DealerHitsSoft17)))
            {
                return BlackjackAction.Surrender;
            }
        }

        if (canSplit && hand.CanSplit)
        {
            var pair = Hand.SplitValue(hand.Cards[0]);
            return pair switch
            {
                11 => BlackjackAction.Split,
                10 => BlackjackAction.Stand,
                9 => dealer is >= 2 and <= 6 or 8 or 9 ? BlackjackAction.Split : BlackjackAction.Stand,
                8 => BlackjackAction.Split,
                7 => dealer is >= 2 and <= 7 ? BlackjackAction.Split : BlackjackAction.Hit,
                6 => dealer is >= 3 and <= 6 ? BlackjackAction.Split : BlackjackAction.Hit,
                5 => SelectHardDouble(10, dealer, canDouble),
                4 => rules.DoubleAfterSplit && dealer is 5 or 6 ? BlackjackAction.Split : BlackjackAction.Hit,
                3 => PairTwoThreeAction(rules, dealer),
                2 => PairTwoThreeAction(rules, dealer),
                _ => BlackjackAction.Hit
            };
        }

        if (hand.IsSoft && hand.Cards.Count >= 2)
        {
            return softTotal switch
            {
                >= 20 => BlackjackAction.Stand,
                19 => dealer == 6 && canDouble && rules.DealerHitsSoft17 ? BlackjackAction.Double : BlackjackAction.Stand,
                18 => dealer switch
                {
                    >= 3 and <= 6 when canDouble => BlackjackAction.Double,
                    >= 2 and <= 8 => BlackjackAction.Stand,
                    _ => BlackjackAction.Hit
                },
                17 => dealer is >= 3 and <= 6 && canDouble ? BlackjackAction.Double : BlackjackAction.Hit,
                16 => dealer is >= 4 and <= 6 && canDouble ? BlackjackAction.Double : BlackjackAction.Hit,
                15 => dealer is >= 4 and <= 6 && canDouble ? BlackjackAction.Double : BlackjackAction.Hit,
                14 => dealer is 5 or 6 && canDouble ? BlackjackAction.Double : BlackjackAction.Hit,
                13 => dealer is 5 or 6 && canDouble ? BlackjackAction.Double : BlackjackAction.Hit,
                _ => BlackjackAction.Hit
            };
        }

        if (hardTotal >= 17)
        {
            return BlackjackAction.Stand;
        }

        if (hardTotal is >= 13 and <= 16)
        {
            return dealer <= 6 ? BlackjackAction.Stand : BlackjackAction.Hit;
        }

        if (hardTotal == 12)
        {
            if (rules.DeckCount == 1 && dealer == 2)
            {
                return BlackjackAction.Stand;
            }

            return dealer is >= 4 and <= 6 ? BlackjackAction.Stand : BlackjackAction.Hit;
        }

        if (hardTotal == 11)
        {
            return canDouble && IsDoubleAllowed(rules, hardTotal) ? BlackjackAction.Double : BlackjackAction.Hit;
        }

        if (hardTotal == 10)
        {
            return dealer <= 9 && canDouble && IsDoubleAllowed(rules, hardTotal)
                ? BlackjackAction.Double
                : BlackjackAction.Hit;
        }

        if (hardTotal == 9)
        {
            var canCoreDouble = dealer is >= 3 and <= 6;
            if (rules.DeckCount == 1 && dealer == 2)
            {
                canCoreDouble = true;
            }

            return canCoreDouble && canDouble && IsDoubleAllowed(rules, hardTotal)
                ? BlackjackAction.Double
                : BlackjackAction.Hit;
        }

        return BlackjackAction.Hit;
    }

    private static BlackjackAction PairTwoThreeAction(Rules rules, int dealer)
    {
        if (rules.DoubleAfterSplit)
        {
            return dealer is >= 2 and <= 7 ? BlackjackAction.Split : BlackjackAction.Hit;
        }

        return dealer is >= 4 and <= 7 ? BlackjackAction.Split : BlackjackAction.Hit;
    }

    private static BlackjackAction SelectHardDouble(int hardTotal, int dealer, bool canDouble)
    {
        if (!canDouble)
        {
            return BlackjackAction.Hit;
        }

        if (hardTotal == 10 && dealer is >= 2 and <= 9)
        {
            return BlackjackAction.Double;
        }

        return BlackjackAction.Hit;
    }

    private static bool IsDoubleAllowed(Rules rules, int hardTotal)
    {
        return rules.DoubleRule switch
        {
            DoubleRule.AnyTwo => true,
            DoubleRule.NineToEleven => hardTotal is >= 9 and <= 11,
            DoubleRule.TenToEleven => hardTotal is 10 or 11,
            _ => true
        };
    }

    public static BlackjackAction NormalizeToAllowed(BlackjackAction action, bool canSplit, bool canDouble, bool canSurrender)
    {
        if (action == BlackjackAction.Split && !canSplit)
        {
            return BlackjackAction.Hit;
        }

        if (action == BlackjackAction.Double && !canDouble)
        {
            return BlackjackAction.Hit;
        }

        if (action == BlackjackAction.Surrender && !canSurrender)
        {
            return BlackjackAction.Hit;
        }

        return action;
    }

    private static int DealerValue(Card dealerUpCard) => dealerUpCard.PointValue == 11 ? 11 : Math.Min(10, dealerUpCard.PointValue);
}
