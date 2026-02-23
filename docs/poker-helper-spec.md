# Poker Helper + Odds Simulator Spec

## 1. Overview

Build a Poker Helper module for Texas Hold'em (No-Limit Hold'em first) that:

1. Gives practical decision support (preflop and postflop context hints).
2. Calculates odds/equity from known cards.
3. Includes a simulator where the user selects:
   - number of players in the hand,
   - hero cards,
   - board cards (flop/turn/river),
   and receives odds immediately.

## 2. Goals

1. Fast, usable hand analysis in under 1 second for typical scenarios.
2. Clear odds output: win %, tie %, lose %, equity %, pot-odds comparison.
3. Reliable card-state validation (no duplicates, valid street state).
4. Extensible foundation for later range-based and solver-style upgrades.

## 3. Non-Goals (V1)

1. Full GTO solver recommendations.
2. Real-time HUD integration with poker clients.
3. Multi-variant support (Omaha, Stud, etc.).
4. Opponent profiling/ML.

## 4. User Stories

1. As a player, I select hero hole cards and board cards and instantly see my odds.
2. As a player, I input player count and see how odds change with more opponents.
3. As a player, I compare equity to pot odds to decide call/fold quickly.
4. As a learner, I get plain-language hints on how to think about the spot.

## 5. Core Features

### 5.1 Poker Helper Panel

1. Game type selector (`NLHE` only in V1, future-proof for more).
2. Street awareness:
   - Preflop (0 board cards),
   - Flop (3),
   - Turn (4),
   - River (5).
3. Practical guidance block:
   - Equity summary,
   - Pot odds summary,
   - Break-even threshold,
   - Suggested action label (`Fold`, `Call`, `Raise`) based on simple rule thresholds.

### 5.2 Odds Simulator Panel

#### Inputs

1. `playerCount` (int, min 2, max 10).
2. Hero hole cards (2 required cards).
3. Community cards:
   - Flop card 1-3 (optional until set),
   - Turn (optional),
   - River (optional).
4. Optional betting context:
   - `potSize`,
   - `toCall`,
   - `expectedRaiseSize` (optional).
5. Optional dead cards (future toggle; V1 optional field hidden/advanced).

#### Input Rules

1. No duplicate cards across hole/board/dead.
2. Board card count must be 0, 3, 4, or 5.
3. Player count must be >=2.

#### Output

1. Hero:
   - Win %,
   - Tie %,
   - Lose %,
   - Equity %.
2. Pot-odds block:
   - Pot odds % = `toCall / (potSize + toCall)`,
   - EV threshold comparison: equity vs pot odds.
3. Improvement odds:
   - Chance to improve by turn/river (if applicable),
   - Outs estimate (when meaningful).
4. Hand-strength readout:
   - Current made hand class (`Pair`, `Two Pair`, `Set`, etc.),
   - Best 5-card hand at showdown simulation.
5. Confidence metadata:
   - Simulation method (`MonteCarlo` or `Exact`),
   - Iteration count / sample count,
   - Runtime in ms.

## 6. Calculation Engine

### 6.1 Strategy

1. V1 default: Monte Carlo simulation.
2. Optional exact enumeration path for low-complexity scenarios.
3. Opponent hands in V1: uniformly random valid combos from remaining deck.
4. Future: weighted opponent ranges.

### 6.2 Monte Carlo Requirements

1. Default iterations: `50,000`.
2. Fast mode: `10,000`.
3. Deep mode: `200,000`.
4. Early-stop optional if confidence interval stabilizes.
5. Deterministic test mode with fixed seed.

### 6.3 Hand Evaluation

1. Use 7-card evaluator for showdown ranking.
2. Compare hero vs each opponent, count:
   - outright wins,
   - ties (split pots),
   - losses.
3. Equity formula:
   - `equity = winRate + tieRate * tieShare`.

## 7. API Contract (Server)

### 7.1 Endpoint

`POST /api/poker/simulate`

### 7.2 Request (example)

```json
{
  "variant": "NLHE",
  "playerCount": 6,
  "heroCards": ["As", "Kd"],
  "boardCards": ["Jh", "Tc", "2d"],
  "deadCards": [],
  "potSize": 120.0,
  "toCall": 40.0,
  "iterations": 50000,
  "mode": "MonteCarlo"
}
```

### 7.3 Response (example)

```json
{
  "winPct": 31.42,
  "tiePct": 4.19,
  "losePct": 64.39,
  "equityPct": 33.51,
  "potOddsPct": 25.00,
  "evCall": 10.73,
  "madeHand": "HighCard",
  "improveByTurnPct": 24.70,
  "improveByRiverPct": 43.15,
  "outs": 12,
  "method": "MonteCarlo",
  "iterations": 50000,
  "runtimeMs": 182
}
```

## 8. UI/UX Spec

### 8.1 Layout

1. `Poker Helper` top panel: quick interpretation + decision cue.
2. `Odds Simulator` main panel:
   - player count control,
   - hero cards picker,
   - board card slots,
   - optional pot/to-call fields,
   - run/auto-run toggle.
3. `Results` panel:
   - win/tie/lose/equity cards,
   - odds bar visualization,
   - pot-odds comparison badge (`+EV` / `-EV`).

### 8.2 Card Picker

1. 52-card grid grouped by suit.
2. Click to assign selected slot.
3. Used cards become disabled.
4. Clear/reset controls per slot and full reset.

### 8.3 Visual Cues

1. Green = favorable (`+EV`, strong equity edge).
2. Yellow = marginal.
3. Red = unfavorable.
4. Show stale-state warning when inputs changed but simulation not rerun (if auto-run off).

## 9. Error Handling

1. Duplicate card selection -> inline error.
2. Invalid board count -> inline error.
3. Missing hero cards -> disable simulate button.
4. API timeout/failure -> keep last result and show error banner.

## 10. Performance Targets

1. P50 response < 300ms for 2-6 players at 50k iterations.
2. P95 response < 1000ms for 2-9 players at 50k iterations.
3. UI remains responsive while simulation runs.

## 11. Security & Integrity

1. Server validates all card inputs (never trust client state).
2. Rate limit simulation endpoint per session/user.
3. No external poker client scraping in V1.

## 12. Analytics (Optional)

1. Track anonymized usage:
   - simulation count,
   - average player count,
   - most analyzed streets.
2. No storage of personally identifying poker history in V1.

## 13. Test Plan

1. Unit tests:
   - deck generation,
   - card parser,
   - duplicate detection,
   - hand evaluator ranking correctness,
   - equity math and tie handling.
2. Deterministic sim tests with fixed seed.
3. Regression test scenarios with known benchmark equities.
4. API contract tests for request/response validation.
5. UI tests:
   - card selection flows,
   - validation states,
   - result rendering.

## 14. Rollout Plan

### Phase 1 (MVP)

1. NLHE simulator with random opponent model.
2. Hero + board + player count + pot odds.
3. Basic practical guidance.

### Phase 2

1. Opponent range presets (`Tight`, `Loose`, `Aggressive`).
2. Side-by-side comparison mode (e.g., 3 players vs 6 players).
3. Saved scenarios.

### Phase 3

1. Advanced postflop heuristics by position and stack depth.
2. Range editor and weighted combos.
3. Solver import hooks (if desired later).

## 15. Open Decisions

1. Should V1 default to auto-run on any card change?
2. Should exact enumeration be exposed as a toggle or internal optimization only?
3. Should multi-way tie equity be shown as split-adjusted value only, or both raw tie% and share%?
4. Should suggestions remain purely math-based or include conservative bankroll heuristics?
