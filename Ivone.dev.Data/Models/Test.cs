using System.Collections.Generic;

    public class Test
    {
        public int Id { get; set; }
        public string Title { get; set; }
        // e.g., 24 questions per test
        public ICollection<Question> Questions { get; set; }
    }
