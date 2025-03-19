using System.Collections.Generic;
using System.Threading.Tasks;

namespace LifeInTheUK.Web.Services.Interfaces
{
    public interface ITestService
    {
        Task<IEnumerable<Test>> GetAllTestsAsync();
        Task<Test> GetTestByIdAsync(int id);
        Task<IEnumerable<Question>> GetEndlessTestAsync();
        Task<IEnumerable<Question>> GetRandomTestAsync();
    }
}
