
using System.Collections.Generic;
using System.Text.Json.Serialization;

    public class Question
    {
        public int Id { get; set; }
        public string Text { get; set; }
        public string Explanation { get; set; }
        public int TestId { get; set; }
        [JsonIgnore]
        public Test Test { get; set; }
        public ICollection<Answer> Answers { get; set; }
    }
