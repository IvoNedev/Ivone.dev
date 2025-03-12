using System;
using System.Linq;
using System.Threading.Tasks;
using ivone.dev.Data.Contexts;
using ivone.dev.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ivone.dev.Services
{
    public class UserService : BaseService<User>, IUserService
    {
        private readonly AppDbContext _context;

        public UserService(AppDbContext context) : base(context)
        {
            _context = context;
        }

        // Prevent duplicate users
        public async Task AddAsync(User user)
        {
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == user.Email);

            if (existingUser == null)
            {
                user.HasPaid = false; // Default value
                user.CreatedOn = DateTime.UtcNow;
                await base.AddAsync(user);
            }
        }

        // New method: lookup user by email
        public async Task<User> GetByEmailAsync(string email)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        }
    }
}
