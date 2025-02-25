using System.Collections.Generic;
using System.Threading.Tasks;

public interface IMortgageScenarioService
{
    Task<List<MortgageScenario>> GetAllAsync();
    Task<MortgageScenario> GetByIdAsync(int id);
    Task AddAsync(MortgageScenario mortgageScenario);
    Task UpdateAsync(MortgageScenario mortgageScenario);
    Task DeleteAsync(int id);
}
