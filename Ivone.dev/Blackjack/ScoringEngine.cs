namespace Ivone.dev.Blackjack;

public sealed class BetSizingFeedback
{
    public required bool Correct { get; init; }
    public required string Message { get; init; }
    public required int ExpectedUnits { get; init; }
}

public sealed class DecisionFeedback
{
    public required bool Correct { get; init; }
    public required string Message { get; init; }
    public required MistakeType? MistakeType { get; init; }
}

public sealed class CountGuessFeedback
{
    public required bool RunningCorrect { get; init; }
    public required bool TrueCorrect { get; init; }
    public required string Message { get; init; }
}

public sealed class ScoringEngine
{
    public int ExpectedBetUnits(int trueCountFloor, int spread)
    {
        var maxSpread = Math.Clamp(spread, 2, 20);
        if (trueCountFloor <= 0)
        {
            return 1;
        }

        if (trueCountFloor == 1)
        {
            return Math.Min(2, maxSpread);
        }

        if (trueCountFloor == 2)
        {
            return Math.Min(4, maxSpread);
        }

        if (trueCountFloor == 3)
        {
            return Math.Min(6, maxSpread);
        }

        return maxSpread;
    }

    public BetSizingFeedback EvaluateBet(SessionStats stats, int trueCountFloor, int spread, int actualUnits)
    {
        var expected = ExpectedBetUnits(trueCountFloor, spread);
        stats.BetChecks++;

        if (actualUnits == expected)
        {
            stats.BetCorrect++;
            return new BetSizingFeedback
            {
                Correct = true,
                Message = $"Bet sizing is correct ({actualUnits}u at TC {trueCountFloor:+#;-#;0}).",
                ExpectedUnits = expected
            };
        }

        if (actualUnits > expected)
        {
            stats.BetOver++;
        }
        else
        {
            stats.BetUnder++;
        }

        stats.RegisterMistake(MistakeType.BetSizingError);
        stats.ApproxEvLeakUnits += Math.Abs(actualUnits - expected) * 0.02m;
        var side = actualUnits > expected ? "overbet" : "underbet";

        return new BetSizingFeedback
        {
            Correct = false,
            Message = $"Bet sizing error: {side}. Expected {expected}u at TC {trueCountFloor:+#;-#;0}, got {actualUnits}u.",
            ExpectedUnits = expected
        };
    }

    public DecisionFeedback EvaluateDecision(SessionStats stats, StrategyDecision strategy, BlackjackAction actualAction)
    {
        if (strategy.DeviationOpportunity)
        {
            stats.DeviationOpportunities++;

            if (actualAction == strategy.RecommendedAction)
            {
                stats.DeviationCorrect++;
                return new DecisionFeedback
                {
                    Correct = true,
                    Message = $"Deviation correct: {strategy.Reason}.",
                    MistakeType = null
                };
            }

            if (actualAction == strategy.BasicAction)
            {
                stats.MissedDeviations++;
                stats.RegisterMistake(MistakeType.MissedDeviation);
                stats.ApproxEvLeakUnits += 0.025m;
                return new DecisionFeedback
                {
                    Correct = false,
                    Message = $"Missed deviation: {strategy.Reason}.",
                    MistakeType = MistakeType.MissedDeviation
                };
            }

            stats.WrongDeviations++;
            stats.RegisterMistake(MistakeType.WrongDeviation);
            stats.ApproxEvLeakUnits += 0.04m;
            return new DecisionFeedback
            {
                Correct = false,
                Message = $"Wrong deviation: expected {strategy.RecommendedAction}, got {actualAction}.",
                MistakeType = MistakeType.WrongDeviation
            };
        }

        stats.BasicOpportunities++;
        if (actualAction == strategy.BasicAction)
        {
            stats.BasicCorrect++;
            return new DecisionFeedback
            {
                Correct = true,
                Message = "Basic strategy correct.",
                MistakeType = null
            };
        }

        stats.BasicErrors++;
        stats.RegisterMistake(MistakeType.BasicStrategyError);
        stats.ApproxEvLeakUnits += 0.05m;
        return new DecisionFeedback
        {
            Correct = false,
            Message = $"Basic strategy error: expected {strategy.BasicAction}, got {actualAction}.",
            MistakeType = MistakeType.BasicStrategyError
        };
    }

    public CountGuessFeedback EvaluateCountGuess(SessionStats stats, int actualRunning, decimal actualTrue, int guessedRunning, decimal guessedTrue)
    {
        stats.RunningCountChecks++;
        stats.TrueCountChecks++;

        var runningCorrect = guessedRunning == actualRunning;
        var trueCorrect = Math.Abs(guessedTrue - actualTrue) <= 0.5m;

        if (runningCorrect)
        {
            stats.RunningCountCorrect++;
        }

        if (trueCorrect)
        {
            stats.TrueCountCorrect++;
        }

        if (!runningCorrect || !trueCorrect)
        {
            stats.RegisterMistake(MistakeType.CountError);
            stats.ApproxEvLeakUnits += 0.01m;
        }

        return new CountGuessFeedback
        {
            RunningCorrect = runningCorrect,
            TrueCorrect = trueCorrect,
            Message =
                $"Count check -> RC: {(runningCorrect ? "correct" : $"wrong ({guessedRunning} vs {actualRunning})")}, " +
                $"TC: {(trueCorrect ? "correct" : $"wrong ({guessedTrue:0.0} vs {actualTrue:0.0})")}."
        };
    }
}
