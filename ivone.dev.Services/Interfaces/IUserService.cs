using System.Collections.Generic;
using System.Threading.Tasks;

namespace ivone.dev.Services.Interfaces
{
    public interface IUserService
    {
        Task<List<User>> GetAllAsync();
        Task<User> GetByIdAsync(int id);
        Task AddAsync(User user);
        Task UpdateAsync(User user);
        Task DeleteAsync(int id);
        // New method to get a user by email
        Task<User> GetByEmailAsync(string email);
    }
}
