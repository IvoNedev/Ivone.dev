import { useState } from 'react';

// Helper to format numbers with a thousands separator
const formatNumber = (value) => {
    if (!value) return '';
    return parseFloat(value).toLocaleString('en-US', { maximumFractionDigits: 2 });
};

// Conversion rates (example: 1 EUR = 1.96 BGN)
const EUR_TO_BGN = 1.96;
const BGN_TO_EUR = 1 / EUR_TO_BGN;

const BudgetBox = ({
    budgetDeposit,
    setBudgetDeposit,
    budgetCommission,
    setBudgetCommission,
    budgetMonthlyInstallments,
    setBudgetMonthlyInstallments, 
    handleMonthlyBudgetChange
}) => {
    const [isBudgetExpanded, setIsBudgetExpanded] = useState(false);

    // The rest of your component can now use these props directly
    const savedDeposit = budgetDeposit;
    const setSavedDeposit = setBudgetDeposit;
    const savedCommission = budgetCommission;
    const setSavedCommission = setBudgetCommission;
    const monthlyBudget = budgetMonthlyInstallments;
    const setMonthlyBudget = setBudgetMonthlyInstallments;
    const [budgetCurrency, setBudgetCurrency] = useState('EUR'); // Default currency

    // Toggles currency and recalculates all amounts
    const switchCurrency = () => {
        if (budgetCurrency === 'EUR') {
            // Convert all values from EUR to BGN
            setSavedDeposit((prev) => (prev ? (parseFloat(prev) * EUR_TO_BGN).toFixed(2) : ''));
            setSavedCommission((prev) => (prev ? (parseFloat(prev) * EUR_TO_BGN).toFixed(2) : ''));
            setMonthlyBudget((prev) => (prev ? (parseFloat(prev) * EUR_TO_BGN).toFixed(2) : ''));
            setBudgetCurrency('BGN');
        } else {
            // Convert all values from BGN to EUR
            setSavedDeposit((prev) => (prev ? (parseFloat(prev) * BGN_TO_EUR).toFixed(2) : ''));
            setSavedCommission((prev) => (prev ? (parseFloat(prev) * BGN_TO_EUR).toFixed(2) : ''));
            setMonthlyBudget((prev) => (prev ? (parseFloat(prev) * BGN_TO_EUR).toFixed(2) : ''));
            setBudgetCurrency('EUR');
        }
    };
    

    return (
        <div className="mb-4 p-4 rounded border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center">
                <h2
                    className="text-xl font-bold cursor-pointer"
                    onClick={() => setIsBudgetExpanded(!isBudgetExpanded)}
                >
                    Budget <span className="text-sm">({budgetCurrency})</span> {isBudgetExpanded ? '▲' : '▼'}
                </h2>
              
            </div>

            {isBudgetExpanded ? (
                <div className="flex flex-col gap-4">
                    <div>
                        <label htmlFor="deposit" className="block mb-1 font-medium">Deposit  <span className="text-sm">({budgetCurrency})</span></label>
                        <input
                            id="deposit"
                            type="text"
                            value={formatNumber(savedDeposit)}
                            onChange={(e) => setSavedDeposit(e.target.value.replace(/,/g, ''))}
                            placeholder="Enter deposit saved up"
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-200"
                        />
                    </div>
                    <div>
                        <label htmlFor="commission" className="block mb-1 font-medium">Commission  <span className="text-sm">({budgetCurrency})</span></label>
                        <input
                            id="commission"
                            type="text"
                            value={formatNumber(savedCommission)}
                            onChange={(e) => setSavedCommission(e.target.value.replace(/,/g, ''))}
                            placeholder="Enter commission saved up"
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-200"
                        />
                    </div>
                    <div>
                        <label htmlFor="monthly" className="block mb-1 font-medium">Monthly Instalments  <span className="text-sm">({budgetCurrency})</span></label>
                        <input
                            id="monthly"
                            type="text"
                            value={formatNumber(monthlyBudget)}
                            onChange={(e) => {
                                setMonthlyBudget(e.target.value.replace(/,/g, ''));
                                handleMonthlyBudgetChange(e);
                            }}
                            placeholder="Enter what you can afford per month"
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-200"
                        />
                    </div>
                </div>
            ) : (
                <p className="text-sm">
                    Deposit: {formatNumber(savedDeposit) || 'N/A'} | Commission: {formatNumber(savedCommission) || 'N/A'} | Monthly Instalments: {formatNumber(monthlyBudget) || 'N/A'}
                </p>
            )}
        </div>
    );
};

export default BudgetBox;
