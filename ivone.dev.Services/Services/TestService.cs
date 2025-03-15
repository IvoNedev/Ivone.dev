using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LifeInTheUK.Web.Services.Interfaces;
using ivone.dev.Data.Contexts;

namespace LifeInTheUK.Web.Services
{
    public class TestService : ITestService
    {
        private readonly AppDbContext _context;

        public TestService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Test>> GetAllTestsAsync()
        {
            return await _context.Tests
                .Include(t => t.Questions)
                    .ThenInclude(q => q.Answers)
                .ToListAsync();
        }

        public async Task<Test> GetTestByIdAsync(int id)
        {
            return await _context.Tests
                .Include(t => t.Questions)
                    .ThenInclude(q => q.Answers)
                .FirstOrDefaultAsync(t => t.Id == id);
        }

        // New method: returns all questions in random order for endless mode.
        public async Task<IEnumerable<Question>> GetEndlessTestAsync()
        {
            return await _context.Questions
                .Include(q => q.Answers)
                .OrderBy(q => Guid.NewGuid()) // Randomizes the order
                .ToListAsync();
        }
    }
}
