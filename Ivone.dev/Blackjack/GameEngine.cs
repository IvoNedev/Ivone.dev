namespace Ivone.dev.Blackjack;

public sealed class BlackjackGameEngine
{
    private readonly ShoeService _shoeService;
    private readonly StrategyEngine _strategyEngine;
    private readonly ScoringEngine _scoringEngine;

    public BlackjackGameEngine(ShoeService shoeService, StrategyEngine strategyEngine, ScoringEngine scoringEngine)
    {
        _shoeService = shoeService;
        _strategyEngine = strategyEngine;
        _scoringEngine = scoringEngine;
    }

    public GameState CreateState(string gameId, SessionConfig config)
    {
        var normalized = NormalizeConfig(config);
        return new GameState
        {
            GameId = gameId,
            Config = normalized,
            Shoe = _shoeService.CreateShoe(normalized.Rules),
            CountingSystem = new HiLoCountingSystem(),
            Stats = new SessionStats(),
            History = [],
            SyncRoot = new object(),
            BankrollUnits = normalized.StartingBankrollUnits
        };
    }

    public void DealRound(GameState state, int betUnits)
    {
        state.Feedback.Clear();
        betUnits = Math.Clamp(betUnits, 1, state.Config.BetSpread);

        if (state.Round is not null && !state.Round.Completed)
        {
            throw new InvalidOperationException("Finish the current round first.");
        }

        if (state.ReshufflePending || state.Shoe.CardsRemaining < 20)
        {
            Reshuffle(state);
            state.Feedback.Add("Shuffled new shoe.");
        }

        var round = new RoundState
        {
            RoundNumber = state.NextRoundNumber++,
            BetUnits = betUnits,
            Phase = GamePhase.PlayerTurn
        };

        round.Player.Hands.Add(new Hand
        {
            BetUnits = betUnits
        });

        state.Round = round;

        var betFeedback = _scoringEngine.EvaluateBet(state.Stats, state.TrueCountFloor, state.Config.BetSpread, betUnits);
        state.Feedback.Add(betFeedback.Message);
        if (!betFeedback.Correct)
        {
            round.Mistakes.Add(betFeedback.Message);
        }

        DealFaceUpToPlayer(state, round.Player.Hands[0]);
        DealFaceUpToDealer(state, round.Dealer.Hand);
        DealFaceUpToPlayer(state, round.Player.Hands[0]);
        DealFaceDownToDealer(state, round.Dealer.Hand);

        if (ShouldOfferInsurance(state, round))
        {
            round.Phase = GamePhase.OfferInsurance;
            return;
        }

        if (ShouldPeekForDealerBlackjack(round) && DealerHasBlackjackInHole(round))
        {
            RevealDealerHole(state, round);
            round.DealerHasBlackjack = true;
            ResolveRound(state, round);
            return;
        }

        if (round.Player.Hands[0].IsBlackjack)
        {
            ResolveRound(state, round);
            return;
        }

        round.Phase = GamePhase.PlayerTurn;
        round.ActiveHandIndex = 0;
    }

    public void ApplyAction(GameState state, BlackjackAction action)
    {
        state.Feedback.Clear();

        var round = state.Round ?? throw new InvalidOperationException("Start a round first.");
        if (round.Completed)
        {
            throw new InvalidOperationException("Deal a new round to continue.");
        }

        if (round.Phase == GamePhase.OfferInsurance)
        {
            HandleInsuranceAction(state, round, action);
            return;
        }

        if (round.Phase != GamePhase.PlayerTurn)
        {
            throw new InvalidOperationException("No player action is expected right now.");
        }

        var allowed = GetAllowedActions(state, round);
        if (!allowed.Contains(action))
        {
            throw new InvalidOperationException($"Action {action} is not allowed right now.");
        }

        var hand = round.Player.Hands[round.ActiveHandIndex];
        var dealerUp = round.Dealer.Hand.Cards[0];
        var strategy = _strategyEngine.EvaluateHand(
            state.Config.Rules,
            hand,
            dealerUp,
            state.TrueCountFloor,
            canSplit: allowed.Contains(BlackjackAction.Split),
            canDouble: allowed.Contains(BlackjackAction.Double),
            canSurrender: allowed.Contains(BlackjackAction.Surrender));

        var scored = _scoringEngine.EvaluateDecision(state.Stats, strategy, action);
        state.Feedback.Add(scored.Message);
        if (!scored.Correct)
        {
            round.Mistakes.Add(scored.Message);
        }

        switch (action)
        {
            case BlackjackAction.Hit:
                ApplyHit(state, hand);
                break;
            case BlackjackAction.Stand:
                hand.IsCompleted = true;
                break;
            case BlackjackAction.Double:
                ApplyDouble(state, hand);
                break;
            case BlackjackAction.Split:
                ApplySplit(state, round, hand);
                break;
            case BlackjackAction.Surrender:
                hand.IsSurrendered = true;
                hand.IsCompleted = true;
                break;
            default:
                throw new InvalidOperationException($"Unsupported action {action}.");
        }

        AdvanceRoundFlow(state, round);
    }

    public void SubmitCountGuess(GameState state, int runningCountGuess, decimal trueCountGuess)
    {
        state.Feedback.Clear();
        var feedback = _scoringEngine.EvaluateCountGuess(state.Stats, state.RunningCount, state.TrueCount, runningCountGuess, trueCountGuess);
        state.Feedback.Add(feedback.Message);
    }

    public GameSnapshot BuildSnapshot(GameState state)
    {
        var round = state.Round;
        var phase = round?.Phase ?? GamePhase.WaitingForBet;
        var showRunning = ShouldShowRunningCount(state);
        var showTrue = ShouldShowTrueCount(state);
        var showShoeDepth = ShouldShowShoeDepth(state);
        var showHints = ShouldShowHints(state);

        var allowed = round is null || round.Completed
            ? []
            : GetAllowedActions(state, round).Select(static action => action.ToString()).ToList();

        StrategyHintView? hint = null;
        if (showHints && round is not null && round.Phase == GamePhase.PlayerTurn && round.Player.Hands.Count > 0)
        {
            var hand = round.Player.Hands[round.ActiveHandIndex];
            var dealerUp = round.Dealer.Hand.Cards[0];
            var allowedActions = GetAllowedActions(state, round);
            var strategy = _strategyEngine.EvaluateHand(
                state.Config.Rules,
                hand,
                dealerUp,
                state.TrueCountFloor,
                canSplit: allowedActions.Contains(BlackjackAction.Split),
                canDouble: allowedActions.Contains(BlackjackAction.Double),
                canSurrender: allowedActions.Contains(BlackjackAction.Surrender));

            hint = new StrategyHintView
            {
                BasicAction = strategy.BasicAction.ToString(),
                RecommendedAction = strategy.RecommendedAction.ToString(),
                Deviation = strategy.DeviationOpportunity,
                Reason = strategy.Reason
            };
        }

        return new GameSnapshot
        {
            GameId = state.GameId,
            Mode = state.Config.Mode,
            Phase = phase,
            Rules = CloneRules(state.Config.Rules),
            BetSpread = state.Config.BetSpread,
            BankrollUnits = state.BankrollUnits,
            RunningCount = state.RunningCount,
            TrueCount = decimal.Round(state.TrueCount, 2),
            TrueCountFloor = state.TrueCountFloor,
            ShowRunningCount = showRunning,
            ShowTrueCount = showTrue,
            ShowShoeDepth = showShoeDepth,
            ShowHints = showHints,
            ReshufflePending = state.ReshufflePending,
            ShoeDepth = new ShoeDepthView
            {
                CardsRemaining = state.Shoe.CardsRemaining,
                CardsDealt = state.Shoe.CardsDealt,
                DiscardCount = state.Shoe.DiscardCount,
                TotalCards = state.Shoe.TotalCards,
                CutCardIndex = state.Shoe.CutCardIndex,
                CutReached = state.Shoe.CutCardReached
            },
            Dealer = BuildDealerView(round),
            PlayerHands = BuildHandViews(round),
            AllowedActions = allowed,
            Hint = hint,
            Feedback = [.. state.Feedback],
            Stats = BuildStatsView(state.Stats),
            History = state.History.TakeLast(12).ToList()
        };
    }

    private static SessionConfig NormalizeConfig(SessionConfig config)
    {
        var deckOptions = new[] { 1, 2, 4, 6, 8 };
        var rules = config.Rules ?? new Rules();
        if (!deckOptions.Contains(rules.DeckCount))
        {
            rules.DeckCount = 6;
        }

        rules.MaxSplits = Math.Clamp(rules.MaxSplits, 1, 4);
        rules.PenetrationPercent = Math.Clamp(rules.PenetrationPercent, 55, 90);
        rules.BurnCards = Math.Clamp(rules.BurnCards, 0, 16);

        var aids = config.Aids ?? new UiAids();
        if (config.Mode == TrainingMode.Guided)
        {
            aids.ShowHints = true;
            aids.ShowRunningCount = true;
            aids.ShowTrueCount = true;
        }

        if (config.Mode == TrainingMode.Exam)
        {
            aids.ShowHints = false;
            aids.ShowRunningCount = false;
            aids.ShowTrueCount = false;
            aids.ShowShoeDepth = false;
        }

        return new SessionConfig
        {
            Mode = config.Mode,
            BetSpread = Math.Clamp(config.BetSpread, 2, 20),
            StartingBankrollUnits = Math.Max(10m, config.StartingBankrollUnits),
            Rules = rules,
            Aids = aids
        };
    }

    private void HandleInsuranceAction(GameState state, RoundState round, BlackjackAction action)
    {
        if (action is not (BlackjackAction.InsuranceTake or BlackjackAction.InsuranceSkip))
        {
            throw new InvalidOperationException("Choose insurance take/skip.");
        }

        var insuranceStrategy = _strategyEngine.EvaluateInsurance(state.TrueCountFloor);
        var insuranceFeedback = _scoringEngine.EvaluateDecision(state.Stats, insuranceStrategy, action);
        state.Feedback.Add(insuranceFeedback.Message);
        if (!insuranceFeedback.Correct)
        {
            round.Mistakes.Add(insuranceFeedback.Message);
        }

        if (action == BlackjackAction.InsuranceTake)
        {
            round.InsuranceTaken = true;
            round.InsuranceBetUnits = round.BetUnits / 2m;
        }

        if (DealerHasBlackjackInHole(round))
        {
            RevealDealerHole(state, round);
            round.DealerHasBlackjack = true;
            ResolveRound(state, round);
            return;
        }

        if (round.Player.Hands[0].IsBlackjack)
        {
            ResolveRound(state, round);
            return;
        }

        round.Phase = GamePhase.PlayerTurn;
        round.ActiveHandIndex = 0;
    }

    private void ApplyHit(GameState state, Hand hand)
    {
        DealFaceUpToPlayer(state, hand);
        if (hand.IsBust || (hand.IsSplitAces && hand.Cards.Count >= 2))
        {
            hand.IsCompleted = true;
        }
    }

    private void ApplyDouble(GameState state, Hand hand)
    {
        hand.IsDoubled = true;
        DealFaceUpToPlayer(state, hand);
        hand.IsCompleted = true;
    }

    private void ApplySplit(GameState state, RoundState round, Hand hand)
    {
        var secondCard = hand.Cards[1];
        hand.Cards.RemoveAt(1);

        var splitHand = new Hand
        {
            BetUnits = hand.BetUnits,
            IsSplitHand = true,
            IsSplitAces = Hand.SplitValue(secondCard) == 11
        };

        splitHand.Cards.Add(secondCard);
        hand.IsSplitHand = true;
        hand.IsSplitAces = Hand.SplitValue(hand.Cards[0]) == 11;

        round.Player.Hands.Insert(round.ActiveHandIndex + 1, splitHand);

        DealFaceUpToPlayer(state, hand);
        DealFaceUpToPlayer(state, splitHand);

        if (hand.IsSplitAces)
        {
            hand.IsCompleted = true;
            splitHand.IsCompleted = true;
        }
    }

    private void AdvanceRoundFlow(GameState state, RoundState round)
    {
        if (round.Player.Hands.All(static hand => hand.IsCompleted))
        {
            RunDealerTurn(state, round);
            return;
        }

        while (round.ActiveHandIndex < round.Player.Hands.Count && round.Player.Hands[round.ActiveHandIndex].IsCompleted)
        {
            round.ActiveHandIndex++;
        }

        if (round.ActiveHandIndex >= round.Player.Hands.Count)
        {
            RunDealerTurn(state, round);
        }
    }

    private void RunDealerTurn(GameState state, RoundState round)
    {
        round.Phase = GamePhase.DealerTurn;
        RevealDealerHole(state, round);

        var liveHands = round.Player.Hands.Any(static hand => !hand.IsBust && !hand.IsSurrendered);
        if (liveHands)
        {
            while (ShouldDealerHit(round.Dealer.Hand, state.Config.Rules.DealerHitsSoft17))
            {
                DealFaceUpToDealer(state, round.Dealer.Hand);
            }
        }

        ResolveRound(state, round);
    }

    private void ResolveRound(GameState state, RoundState round)
    {
        if (round.Completed)
        {
            return;
        }

        round.DealerHasBlackjack = round.Dealer.Hand.IsBlackjack;
        var dealerBust = round.Dealer.Hand.IsBust;
        var dealerTotal = round.Dealer.Hand.BestTotal;
        var payoutRatio = state.Config.Rules.BlackjackPayout == BlackjackPayoutRule.ThreeToTwo ? 1.5m : 1.2m;

        foreach (var hand in round.Player.Hands)
        {
            var wager = hand.BetUnits * (hand.IsDoubled ? 2m : 1m);
            decimal handNet;
            string outcome;

            if (hand.IsSurrendered)
            {
                handNet = -hand.BetUnits / 2m;
                outcome = "Surrender";
            }
            else if (round.DealerHasBlackjack)
            {
                if (hand.IsBlackjack)
                {
                    handNet = 0m;
                    outcome = "Push";
                }
                else
                {
                    handNet = -wager;
                    outcome = "Lose";
                }
            }
            else if (hand.IsBlackjack)
            {
                handNet = hand.BetUnits * payoutRatio;
                outcome = "Blackjack";
            }
            else if (hand.IsBust)
            {
                handNet = -wager;
                outcome = "Bust";
            }
            else if (dealerBust)
            {
                handNet = wager;
                outcome = "Win";
            }
            else
            {
                var playerTotal = hand.BestTotal;
                if (playerTotal > dealerTotal)
                {
                    handNet = wager;
                    outcome = "Win";
                }
                else if (playerTotal < dealerTotal)
                {
                    handNet = -wager;
                    outcome = "Lose";
                }
                else
                {
                    handNet = 0m;
                    outcome = "Push";
                }
            }

            hand.NetUnits = handNet;
            hand.OutcomeLabel = outcome;
            round.NetUnits += handNet;
        }

        if (round.InsuranceTaken)
        {
            round.NetUnits += round.DealerHasBlackjack
                ? round.InsuranceBetUnits * 2m
                : -round.InsuranceBetUnits;
        }

        state.BankrollUnits += round.NetUnits;
        state.Stats.RoundsPlayed++;
        state.Stats.HandsPlayed += round.Player.Hands.Count;

        var outcomeLabel = round.NetUnits switch
        {
            > 0m => "Win",
            < 0m => "Loss",
            _ => "Push"
        };

        state.History.Add(new RoundSummary
        {
            RoundNumber = round.RoundNumber,
            BetUnits = round.BetUnits,
            NetUnits = decimal.Round(round.NetUnits, 2),
            RunningCountEnd = state.RunningCount,
            TrueCountEnd = decimal.Round(state.TrueCount, 2),
            Outcome = outcomeLabel,
            Mistakes = [.. round.Mistakes]
        });

        state.Shoe.Discard(round.Player.Hands.SelectMany(static hand => hand.Cards).Concat(round.Dealer.Hand.Cards));

        round.Phase = GamePhase.RoundComplete;
        round.Completed = true;

        if (state.Shoe.CutCardReached)
        {
            state.ReshufflePending = true;
            state.Feedback.Add("Cut card reached. Shoe will reshuffle after this hand.");
        }

        state.Feedback.Add(round.NetUnits == 0m
            ? "Round result: push."
            : $"Round result: {round.NetUnits:+0.##;-0.##;0}u.");
    }

    private List<BlackjackAction> GetAllowedActions(GameState state, RoundState round)
    {
        if (round.Phase == GamePhase.OfferInsurance)
        {
            return [BlackjackAction.InsuranceTake, BlackjackAction.InsuranceSkip];
        }

        if (round.Phase != GamePhase.PlayerTurn)
        {
            return [];
        }

        var hand = round.Player.Hands[round.ActiveHandIndex];
        var actions = new List<BlackjackAction> { BlackjackAction.Stand };
        if (!hand.IsSplitAces)
        {
            actions.Add(BlackjackAction.Hit);
        }

        if (CanDouble(state.Config.Rules, round, hand))
        {
            actions.Add(BlackjackAction.Double);
        }

        if (CanSplit(state.Config.Rules, round, hand))
        {
            actions.Add(BlackjackAction.Split);
        }

        if (CanSurrender(state.Config.Rules, round, hand))
        {
            actions.Add(BlackjackAction.Surrender);
        }

        return actions;
    }

    private static bool CanDouble(Rules rules, RoundState round, Hand hand)
    {
        if (hand.Cards.Count != 2 || hand.IsDoubled || hand.IsSurrendered || hand.IsSplitAces)
        {
            return false;
        }

        if (hand.IsSplitHand && !rules.DoubleAfterSplit)
        {
            return false;
        }

        var hardTotal = hand.HardTotal;
        return rules.DoubleRule switch
        {
            DoubleRule.AnyTwo => true,
            DoubleRule.NineToEleven => hardTotal is >= 9 and <= 11,
            DoubleRule.TenToEleven => hardTotal is 10 or 11,
            _ => true
        };
    }

    private static bool CanSplit(Rules rules, RoundState round, Hand hand)
    {
        if (!hand.CanSplit)
        {
            return false;
        }

        var splitCount = round.Player.Hands.Count - 1;
        if (splitCount >= rules.MaxSplits)
        {
            return false;
        }

        var splittingAces = Hand.SplitValue(hand.Cards[0]) == 11;
        if (splittingAces && hand.IsSplitAces && !rules.ResplitAces)
        {
            return false;
        }

        return true;
    }

    private static bool CanSurrender(Rules rules, RoundState round, Hand hand)
    {
        if (rules.Surrender == SurrenderRule.Off || round.Player.Hands.Count > 1)
        {
            return false;
        }

        return hand.Cards.Count == 2 && !hand.IsSplitHand;
    }

    private static bool ShouldDealerHit(Hand dealerHand, bool hitsSoft17)
    {
        var total = dealerHand.BestTotal;
        if (total < 17)
        {
            return true;
        }

        return hitsSoft17 && total == 17 && dealerHand.IsSoft;
    }

    private static bool ShouldOfferInsurance(GameState state, RoundState round)
    {
        if (!state.Config.Rules.InsuranceAllowed || round.Dealer.Hand.Cards.Count < 2)
        {
            return false;
        }

        return round.Dealer.Hand.Cards[0].PointValue == 11;
    }

    private static bool ShouldPeekForDealerBlackjack(RoundState round)
    {
        var up = round.Dealer.Hand.Cards[0].PointValue;
        return up == 11 || up == 10;
    }

    private static bool DealerHasBlackjackInHole(RoundState round)
    {
        if (round.Dealer.Hand.Cards.Count < 2)
        {
            return false;
        }

        var up = round.Dealer.Hand.Cards[0].PointValue;
        var hole = round.Dealer.Hand.Cards[1].PointValue;
        return up + hole == 21;
    }

    private void DealFaceUpToPlayer(GameState state, Hand hand)
    {
        var card = DrawCard(state);
        hand.Cards.Add(card);
        state.RunningCount += state.CountingSystem.GetTag(card);
    }

    private void DealFaceUpToDealer(GameState state, Hand hand)
    {
        var card = DrawCard(state);
        hand.Cards.Add(card);
        state.RunningCount += state.CountingSystem.GetTag(card);
    }

    private void DealFaceDownToDealer(GameState state, Hand hand)
    {
        hand.Cards.Add(DrawCard(state));
    }

    private void RevealDealerHole(GameState state, RoundState round)
    {
        if (round.Dealer.HoleCardRevealed || round.Dealer.Hand.Cards.Count < 2)
        {
            return;
        }

        round.Dealer.HoleCardRevealed = true;
        state.RunningCount += state.CountingSystem.GetTag(round.Dealer.Hand.Cards[1]);
    }

    private Card DrawCard(GameState state)
    {
        if (state.Shoe.CardsRemaining <= 0)
        {
            Reshuffle(state);
            state.Feedback.Add("Shoe exhausted. Forced reshuffle.");
        }

        return state.Shoe.Deal();
    }

    private void Reshuffle(GameState state)
    {
        state.Shoe = _shoeService.CreateShoe(state.Config.Rules);
        state.RunningCount = 0;
        state.ReshufflePending = false;
    }

    private static Rules CloneRules(Rules rules)
    {
        return new Rules
        {
            DeckCount = rules.DeckCount,
            DealerHitsSoft17 = rules.DealerHitsSoft17,
            DoubleRule = rules.DoubleRule,
            DoubleAfterSplit = rules.DoubleAfterSplit,
            ResplitAces = rules.ResplitAces,
            MaxSplits = rules.MaxSplits,
            BlackjackPayout = rules.BlackjackPayout,
            Surrender = rules.Surrender,
            InsuranceAllowed = rules.InsuranceAllowed,
            PenetrationPercent = rules.PenetrationPercent,
            BurnCards = rules.BurnCards
        };
    }

    private static DealerView BuildDealerView(RoundState? round)
    {
        if (round is null || round.Dealer.Hand.Cards.Count == 0)
        {
            return new DealerView { Cards = [], Total = "-" };
        }

        var cards = new List<CardView>();
        for (var i = 0; i < round.Dealer.Hand.Cards.Count; i++)
        {
            var hidden = i == 1 && !round.Dealer.HoleCardRevealed;
            cards.Add(new CardView
            {
                Hidden = hidden,
                Label = hidden ? "?" : round.Dealer.Hand.Cards[i].Label
            });
        }

        var total = round.Dealer.HoleCardRevealed
            ? round.Dealer.Hand.TotalLabel
            : round.Dealer.Hand.Cards[0].Label;

        return new DealerView { Cards = cards, Total = total };
    }

    private static List<HandView> BuildHandViews(RoundState? round)
    {
        if (round is null)
        {
            return [];
        }

        var result = new List<HandView>(round.Player.Hands.Count);
        for (var i = 0; i < round.Player.Hands.Count; i++)
        {
            var hand = round.Player.Hands[i];
            result.Add(new HandView
            {
                Cards = hand.Cards.Select(c => new CardView
                {
                    Hidden = false,
                    Label = c.Label
                }).ToList(),
                Total = hand.TotalLabel,
                BetUnits = hand.BetUnits,
                IsActive = round.Phase == GamePhase.PlayerTurn && round.ActiveHandIndex == i,
                IsCompleted = hand.IsCompleted,
                IsDoubled = hand.IsDoubled,
                IsSurrendered = hand.IsSurrendered,
                Outcome = hand.OutcomeLabel,
                NetUnits = hand.NetUnits
            });
        }

        return result;
    }

    private static SessionStatsView BuildStatsView(SessionStats stats)
    {
        return new SessionStatsView
        {
            RoundsPlayed = stats.RoundsPlayed,
            HandsPlayed = stats.HandsPlayed,
            BasicAccuracy = decimal.Round(stats.BasicAccuracy, 2),
            DeviationAccuracy = decimal.Round(stats.DeviationAccuracy, 2),
            BetAccuracy = decimal.Round(stats.BetAccuracy, 2),
            RunningCountAccuracy = decimal.Round(stats.RunningCountAccuracy, 2),
            TrueCountAccuracy = decimal.Round(stats.TrueCountAccuracy, 2),
            ApproxEvLeakUnits = decimal.Round(stats.ApproxEvLeakUnits, 2),
            MistakeBreakdown = stats.MistakeBreakdown.ToDictionary(
                static p => p.Key.ToString(),
                static p => p.Value)
        };
    }

    private static bool ShouldShowRunningCount(GameState state) => state.Config.Mode != TrainingMode.Exam && state.Config.Aids.ShowRunningCount;
    private static bool ShouldShowTrueCount(GameState state) => state.Config.Mode != TrainingMode.Exam && state.Config.Aids.ShowTrueCount;
    private static bool ShouldShowShoeDepth(GameState state) => state.Config.Mode != TrainingMode.Exam && state.Config.Aids.ShowShoeDepth;
    private static bool ShouldShowHints(GameState state) => state.Config.Mode != TrainingMode.Exam && state.Config.Aids.ShowHints;
}
