namespace Ivone.dev.Blackjack;

public sealed class Shoe
{
    private readonly List<Card> _cards;
    private readonly List<Card> _discard = [];
    private int _nextIndex;

    public Shoe(List<Card> cards, int cutCardIndex)
    {
        _cards = cards;
        CutCardIndex = cutCardIndex;
    }

    public int CutCardIndex { get; }
    public int TotalCards => _cards.Count;
    public int CardsRemaining => Math.Max(0, _cards.Count - _nextIndex);
    public int CardsDealt => _nextIndex;
    public int DiscardCount => _discard.Count;
    public bool CutCardReached => _nextIndex >= CutCardIndex;
    public decimal DecksRemaining => Math.Max(0.25m, CardsRemaining / 52m);

    public Card Deal()
    {
        if (_nextIndex >= _cards.Count)
        {
            throw new InvalidOperationException("The shoe is empty.");
        }

        var card = _cards[_nextIndex];
        _nextIndex++;
        return card;
    }

    public void BurnTopCards(int burnCount)
    {
        var toBurn = Math.Clamp(burnCount, 0, CardsRemaining);
        for (var i = 0; i < toBurn; i++)
        {
            _discard.Add(Deal());
        }
    }

    public void Discard(IEnumerable<Card> cards)
    {
        _discard.AddRange(cards);
    }
}

public sealed class ShoeService
{
    public Shoe CreateShoe(Rules rules)
    {
        var cards = new List<Card>(rules.DeckCount * 52);
        for (var deck = 0; deck < rules.DeckCount; deck++)
        {
            foreach (Suit suit in Enum.GetValues<Suit>())
            {
                foreach (Rank rank in Enum.GetValues<Rank>())
                {
                    cards.Add(new Card(suit, rank));
                }
            }
        }

        // Fisher-Yates
        for (var i = cards.Count - 1; i > 0; i--)
        {
            var j = Random.Shared.Next(i + 1);
            (cards[i], cards[j]) = (cards[j], cards[i]);
        }

        var penetration = Math.Clamp(rules.PenetrationPercent, 55, 90);
        var cut = (int)Math.Round(cards.Count * (penetration / 100m), MidpointRounding.AwayFromZero);
        cut = Math.Clamp(cut, 1, cards.Count - 1);

        var shoe = new Shoe(cards, cut);
        shoe.BurnTopCards(Math.Clamp(rules.BurnCards, 0, cards.Count - 1));
        return shoe;
    }
}
