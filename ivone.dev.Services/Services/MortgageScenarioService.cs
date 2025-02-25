using ivone.dev.Data.Contexts;
using Microsoft.EntityFrameworkCore;

public class MortgageScenarioService : BaseService<MortgageScenario>, IMortgageScenarioService
{
    public MortgageScenarioService(AppDbContext context) : base(context)
    {
    }
}

