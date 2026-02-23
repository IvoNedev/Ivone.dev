using System.Collections.Concurrent;

namespace Ivone.dev.Blackjack;

public sealed class BlackjackTrainerService
{
    private readonly ConcurrentDictionary<string, GameState> _sessions = new();
    private readonly BlackjackGameEngine _engine;

    public BlackjackTrainerService(BlackjackGameEngine engine)
    {
        _engine = engine;
    }

    public GameSnapshot CreateSession(SessionConfig config)
    {
        var gameId = Guid.NewGuid().ToString("N")[..12];
        var state = _engine.CreateState(gameId, config);
        _sessions[gameId] = state;
        return _engine.BuildSnapshot(state);
    }

    public GameSnapshot GetSnapshot(string gameId)
    {
        var state = GetState(gameId);
        lock (state.SyncRoot)
        {
            return _engine.BuildSnapshot(state);
        }
    }

    public GameSnapshot DealRound(string gameId, int betUnits)
    {
        var state = GetState(gameId);
        lock (state.SyncRoot)
        {
            _engine.DealRound(state, betUnits);
            return _engine.BuildSnapshot(state);
        }
    }

    public GameSnapshot ApplyAction(string gameId, BlackjackAction action)
    {
        var state = GetState(gameId);
        lock (state.SyncRoot)
        {
            _engine.ApplyAction(state, action);
            return _engine.BuildSnapshot(state);
        }
    }

    public GameSnapshot SubmitCountGuess(string gameId, int runningGuess, decimal trueGuess)
    {
        var state = GetState(gameId);
        lock (state.SyncRoot)
        {
            _engine.SubmitCountGuess(state, runningGuess, trueGuess);
            return _engine.BuildSnapshot(state);
        }
    }

    private GameState GetState(string gameId)
    {
        if (_sessions.TryGetValue(gameId, out var state))
        {
            return state;
        }

        throw new KeyNotFoundException($"Blackjack session '{gameId}' was not found.");
    }
}
