import React, { useState } from 'react';

// Helper to format numbers with a thousands separator
const formatNumber = (value) => {
    if (!value) return '';
    return parseFloat(value).toLocaleString('en-US', { maximumFractionDigits: 2 });
};

// Conversion rates (example: 1 EUR = 1.96 BGN)
const EUR_TO_BGN = 1.96;
const BGN_TO_EUR = 1 / EUR_TO_BGN;

export default function BudgetBox({
    budgetDeposit,
    setBudgetDeposit,
    budgetCommission,
    setBudgetCommission,
    budgetMonthlyInstallments,
    setBudgetMonthlyInstallments,
    handleMonthlyBudgetChange
}) {
    const [isBudgetExpanded, setIsBudgetExpanded] = useState(false);
    const [budgetCurrency, setBudgetCurrency] = useState('EUR'); // 'EUR' or 'BGN'
    const [lang, setLang] = useState('bg');                     // 'en' or 'bg'

    // -- translations map --
    const translations = {
        en: {
            budgetHeader: 'Budget',
            depositLabel: 'Deposit',
            commissionLabel: 'Commission',
            monthlyLabel: 'Monthly Instalments',
            depositPlaceholder: 'Enter deposit saved up',
            commissionPlaceholder: 'Enter commission saved up',
            monthlyPlaceholder: 'Enter what you can afford per month',
            budgetText: ({ deposit, commission, monthly }) =>
                `Deposit: ${deposit} | Commission: ${commission} | Monthly Instalments: ${monthly}`
        },
        bg: {
            budgetHeader: 'Бюджет',
            depositLabel: 'Депозит',
            commissionLabel: 'Комисионна',
            monthlyLabel: 'Примерна месечна вноска',
            depositPlaceholder: 'Въведете натрупан депозит',
            commissionPlaceholder: 'Въведете натрупана комисионна',
            monthlyPlaceholder: 'Въведете месечна вноска',
            budgetText: ({ deposit, commission, monthly }) =>
                `Депозит: ${deposit} | Комисионна: ${commission} | Примерна месечна вноска: ${monthly}`
        }
    };

    // -- translation helper --
    const t = (key, params) => {
        const entry = translations[lang][key];
        return typeof entry === 'function' ? entry(params) : entry;
    };

    // -- currency toggle --
    const switchCurrency = () => {
        if (budgetCurrency === 'EUR') {
            setBudgetDeposit(prev => prev ? (parseFloat(prev) * EUR_TO_BGN).toFixed(2) : '');
            setBudgetCommission(prev => prev ? (parseFloat(prev) * EUR_TO_BGN).toFixed(2) : '');
            setBudgetMonthlyInstallments(prev => prev ? (parseFloat(prev) * EUR_TO_BGN).toFixed(2) : '');
            setBudgetCurrency('BGN');
        } else {
            setBudgetDeposit(prev => prev ? (parseFloat(prev) * BGN_TO_EUR).toFixed(2) : '');
            setBudgetCommission(prev => prev ? (parseFloat(prev) * BGN_TO_EUR).toFixed(2) : '');
            setBudgetMonthlyInstallments(prev => prev ? (parseFloat(prev) * BGN_TO_EUR).toFixed(2) : '');
            setBudgetCurrency('EUR');
        }
    };

    // Local aliases
    const savedDeposit = budgetDeposit;
    const savedCommission = budgetCommission;
    const monthlyBudget = budgetMonthlyInstallments;

    return (
        <div className="mb-4 p-4 rounded border border-gray-200 shadow-sm">
            {/* HEADER ROW: title, summary (when collapsed), flags */}
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <h2
                        className="text-xl font-bold cursor-pointer"
                        onClick={() => setIsBudgetExpanded(!isBudgetExpanded)}
                    >
                        {t('budgetHeader')}
                        <span className="text-sm">({budgetCurrency})</span>
                        <span id="budgetToggleArrow">{isBudgetExpanded ? '▲' : '▼'}</span>
                    </h2>

                    {/* summary only when collapsed */}
                    {!isBudgetExpanded && (
                        <p className="text-sm">
                            {t('budgetText', {
                                deposit: formatNumber(savedDeposit) || 'N/A',
                                commission: formatNumber(savedCommission) || 'N/A',
                                monthly: formatNumber(monthlyBudget) || 'N/A'
                            })}
                        </p>
                    )}
                </div>
                {/* flags always visible */}
                <div id="languageToggle" className="flex space-x-2">
                    <button onClick={() => setLang('en')} className="cursor-pointer hover:opacity-80" aria-label="EN">
                        {/* EUR SVG */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" className="w-6 h-6">
                            <path fill="#012169" d="M0 0h640v480H0z" />
                            <path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0z" />
                            <path fill="#C8102E" d="m424 281 216 159v40L369 281zm-184 20 6 35L54 480H0zM640 0v3L391 191l2-44L590 0zM0 0l239 176h-60L0 42z" />
                            <path fill="#FFF" d="M241 0v480h160V0zM0 160v160h640V160z" />
                            <path fill="#C8102E" d="M0 193v96h640v-96zM273 0v480h96V0z" />
                        </svg>
                </button>
                <button onClick={() => setLang('bg')} className="cursor-pointer hover:opacity-80" aria-label="BG">
                    {/* BGN SVG */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" className="w-6 h-6">
                            <path fill="#fff" d="M0 0h640v160H0z" />
                            <path fill="#00966e" d="M0 160h640v160H0z" />
                            <path fill="#d62612" d="M0 320h640v160H0z" />
                        </svg>
            </button>
        </div>
    </div >

        {/* EXPANDED CONTENT */ }
    {
        isBudgetExpanded && (
            <div className="flex flex-col gap-4 mt-4">
                {/* Deposit */}
                <div>
                    <label htmlFor="deposit" className="block mb-1 font-medium">
                        {t('depositLabel')} <span className="text-sm">({budgetCurrency})</span>
                    </label>
                    <input
                        id="deposit"
                        type="text"
                        value={formatNumber(savedDeposit)}
                        onChange={e => setBudgetDeposit(e.target.value.replace(/,/g, ''))}
                        placeholder={t('depositPlaceholder')}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-200"
                    />
                </div>
                {/* Commission */}
                <div>
                    <label htmlFor="commission" className="block mb-1 font-medium">
                        {t('commissionLabel')} <span className="text-sm">({budgetCurrency})</span>
                    </label>
                    <input
                        id="commission"
                        type="text"
                        value={formatNumber(savedCommission)}
                        onChange={e => setBudgetCommission(e.target.value.replace(/,/g, ''))}
                        placeholder={t('commissionPlaceholder')}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-200"
                    />
                </div>
                {/* Monthly Instalments */}
                <div>
                    <label htmlFor="monthly" className="block mb-1 font-medium">
                        {t('monthlyLabel')} <span className="text-sm">({budgetCurrency})</span>
                    </label>
                    <input
                        id="monthly"
                        type="text"
                        value={formatNumber(monthlyBudget)}
                        onChange={e => {
                            setBudgetMonthlyInstallments(e.target.value.replace(/,/g, ''));
                            handleMonthlyBudgetChange(e);
                        }}
                        placeholder={t('monthlyPlaceholder')}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-200"
                    />
                </div>
            </div>
        )
    }
  </div >
);


}
