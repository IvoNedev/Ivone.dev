import React, { useState, useEffect } from 'react';
import BudgetBox from '@/components/ui/budget-box';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';

import { sendUpdate, onReceiveUpdate } from '@/components/ui/signalr';
import Table from '@/components/ui/table';
import * as Slider from '@radix-ui/react-slider';

const formatNumber = (num) => {
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
};


export default function MortgageCalculator() {
    const [lang, setLang] = useState('bg');  // 'bg' = Bulgarian, 'en' = English
    const EUR_TO_BGN = 1.96;
    const BGN_TO_EUR = 1 / EUR_TO_BGN;

    // Persisted state hooks:
    const [loanTerm, setLoanTerm] = useState(() => {
        const v = localStorage.getItem('mortgage_loanTerm');
        return v !== null ? parseInt(v, 10) : 30;
    });
    const [deposit, setDeposit] = useState(() => {
        const v = localStorage.getItem('mortgage_deposit');
        return v !== null ? parseFloat(v) : 0.20;
    });
    const [totalCost, setTotalCost] = useState(() => {
        return localStorage.getItem('mortgage_totalCost') || '160000';
    });
    const [parkSpot, setParkSpot] = useState(() => {
        const v = localStorage.getItem('mortgage_parkSpot');
        return v !== null ? parseFloat(v) : 30000;
    });
    const [commissionRate, setCommissionRate] = useState(() => {
        const v = localStorage.getItem('mortgage_commissionRate');
        return v !== null ? parseFloat(v) : 0.036;
    });
    const [lawyerFeeRate, setLawyerFeeRate] = useState(() => {
        const v = localStorage.getItem('mortgage_lawyerFeeRate');
        return v !== null ? parseFloat(v) : 0.04;
    });
    const [vatEnabled, setVatEnabled] = useState(() => {
        const v = localStorage.getItem('mortgage_vatEnabled');
        return v !== null ? (v === 'true') : true;  // default to true when no value stored
    });


    // Static or computed-only hooks:
    const [currency, setCurrency] = useState(() => {
        return localStorage.getItem('mortgage_currency') || 'EUR';
    });
    const [monthlyPayments, setMonthlyPayments] = useState({});
    const [depositAmount, setDepositAmount] = useState(0);
    const [mortgageAmount, setMortgageAmount] = useState(0);
    const [vatAmount, setVatAmount] = useState(0);
    const [grandTotal, setGrandTotal] = useState(0);

    const exchangeRate = 1.96; // 1 EUR = 1.96 BGN



    //API
    const [appData, setAppData] = useState(window.appData || []);
    const [selectedId, setSelectedId] = useState(null);
    const [currentName, setCurrentName] = useState("Mortgage Calculator");
    const [editMode, setEditMode] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    const loadData = (id) => {
        const selectedEntry = appData.find(item => item.id === parseInt(id, 10));
        if (selectedEntry) {
            // Update all the relevant state variables
            setSelectedId(selectedEntry.id);
            setCurrentName(selectedEntry.name);
            setTotalCost(selectedEntry.totalCost.toString());
            setDeposit(selectedEntry.depositPercentage / 100); // Convert to decimal if needed
            setDepositAmount(selectedEntry.depositAmount);
            setMortgageAmount(selectedEntry.mortgageAmount);
            setParkSpot(selectedEntry.parkingSpotCost);
            setCommissionRate(selectedEntry.commissionRate / 100);
            setLawyerFeeRate(selectedEntry.lawyerFeeRate / 100);
            setLoanTerm(selectedEntry.loanTermInYears);
            setCurrency(selectedEntry.currency);
            handleMonthlyBudgetChange();
        }
    };


    //RAG
    // State for the budget inputs
    const [budgetDeposit, setBudgetDeposit] = useState(() => {
         return localStorage.getItem('mortgage_budgetDeposit') || '60000';
        });
     const [budgetCommission, setBudgetCommission] = useState(() => {
          return localStorage.getItem('mortgage_budgetCommission') || '10500';
        });
    const [budgetMonthlyInstallments, setBudgetMonthlyInstallments] = useState(() => {
           return localStorage.getItem('mortgage_budgetMonthlyInstallments') || '1000';
          });

    // after your useState declarations
    const translations = {
        en: {
            vatLabelSimple:'VAT',
            title: 'Mortgage Calculator',
            totalCost: 'Total Cost',
            parkSpot: 'Parking Spot',
            commissionRate: 'Commission Rate (%)',
            lawyerFeeRate: 'Lawyer Fee Rate (%)',
            depositLabel: '% Deposit',
            vatLabel: 'Add 20% VAT',
            loanTermLabel: years => `Loan Term: ${years} Years`,
            breakdownColumns: ['Description', 'EUR 🇪🇺', 'BGN 🇧🇬'],
            paymentColumns: ['Rate (%)', '2.2', '3.0', '3.5', '4.0', '4.5', '5.0'],
            costPerSqm: 'EUR/m²',
            areaHeader: 'Area',
            sqmSizes: [60, 70, 80, 90, 100, 110, 120],
            // descriptions:
            descBase: 'Base Cost + parking spot',
            descVat: 'VAT (20%)',
            descTotalVat: 'Base Cost + parking spot + VAT',
            descDeposit: 'Deposit Amount (% entered above)',
            descCommission: 'Commission (% entered above)',
            descPayNow: budget => `Pay Now (${budget * 100}% deposit + Commission)`,
            descPayLater: deposit => `Pay Later (${100 - deposit * 100}% + Lawyer Fee)`,
            descMortgage: deposit => `Mortgage Amount (${100 - Math.round(deposit * 100)}%)`,
            descLawyer: 'Lawyer Fee (% entered above)',
            descGrandTotal: 'Grand Total (Total Cost + VAT + Parking Spot + Commission + Lawyer Fee)',
            // budget box:
            budgetHeader: 'Available Budget (EUR) ▼',
            budgetText: ({ deposit, commission, monthly }) =>
                `Deposit: ${deposit} | Commission: ${commission} | Estimated monthly installment: ${monthly}`,
        },
        bg: {
            vatLabelSimple: 'ДДС',
            title: 'Ипотечен Кредитен Калкулатор',
            totalCost: 'Обща стойност',
            parkSpot: 'Паркомясто/гараж',
            commissionRate: 'Процент Комисионна (%)',
            lawyerFeeRate: 'Процент Адвокатска Комисионна (%)',
            depositLabel: '% Депозит',
            vatLabel: '+ 20% ДДС',
            loanTermLabel: years => `Ипотека: ${years} Години`,
            breakdownColumns: ['Описание', 'EUR 🇪🇺', 'BGN 🇧🇬'],
            paymentColumns: ['Лихва (%)', '2.2', '3.0', '3.5', '4.0', '4.5', '5.0'],
            costPerSqm: 'EUR/m²',
            areaHeader: 'Площ',
            sqmSizes: [60, 70, 80, 90, 100, 110, 120],
            descBase: 'Базова цена на имота + парко място',
            descVat: 'ДДС (20%)',
            descTotalVat: 'Базова цена на имота + парко място + ДДС',
            descDeposit: 'Депозит (% вписан по-горе)',
            descCommission: 'Комисионна (% вписан по-горе)',
            descPayNow: budget => `Дължими сега (${budget * 100}% депозит + комисионна)`,
            descPayLater: deposit => `Остатачна дължимост (${100 - deposit * 100}% + адвокатска комисионна)`,
            descMortgage: deposit => `Стойност на ипотеката (${100 - Math.round(deposit * 100)}%)`,
            descLawyer: 'Адвокатска комисионна (% вписан по-горе)',
            descGrandTotal: 'Общо всичко (Базова цена на имота + парко място + ДДС + Брокерска Комисионна + Адвокатска Комисионна)',
            budgetHeader: 'Наличен бюджет (EUR) ▼',
            budgetText: ({ deposit, commission, monthly }) =>
                `Депозит: ${deposit} | Комисионна: ${commission} | Примерна месечна вноска: ${monthly}`,
        }
    };
    const t = key => {
        const val = translations[lang][key];
        return typeof val === 'function' ? val : val;
    };



    const getRowStyle = (inputValue, cellValue) => {
        if (inputValue === '') return ''; // Default, no input yet
        const input = parseFloat(inputValue);
        const cell = parseFloat(cellValue.replace(/,/g, '')); // Remove commas

        if (input > cell) {
            return 'bg-yellow-100';
        }
        else return 'bg-red-100';



        return ''; // Default style
    };

    const handleMonthlyBudgetChange = () => {
        const inputElement = document.getElementById('monthly');
        if (!inputElement) {
            console.error("Monthly input not found");
            return;
        }

        const value = inputElement.value.replace(/,/g, '');
        const budget = parseFloat(value);

        if (isNaN(budget)) {
            console.error("Invalid budget value:", value);
            return;
        }

        const table = document.getElementById('paymentTable');
        if (!table) {
            console.error("Payment table not found");
            return;
        }

        const rows = table.querySelectorAll('tr');
        const EUR_TO_BGN = 1.96;

        rows.forEach((row, rowIndex) => {
            if (rowIndex > 0) {
                const cells = row.querySelectorAll('td');
                if (cells.length === 0) {
                    console.warn("No cells found in row", rowIndex);
                    return;
                }

                cells.forEach((cell) => {
                    const cellValue = parseFloat(cell.textContent.replace(/,/g, ''));
                    if (isNaN(cellValue)) {
                        console.warn("Invalid cell value at row", rowIndex, ":", cell.textContent);
                        return;
                    }

                    const isEUR = cell.classList.contains("eur");
                    const isBGN = cell.classList.contains("bgn");
                    const adjustedBudget = isBGN ? budget * EUR_TO_BGN : budget;

                    if (cellValue <= adjustedBudget) {
                        cell.classList.add('bg-yellow-100');
                        cell.classList.remove('bg-red-100');

                        // If this is an EUR cell, look for a sibling BGN cell
                        if (isEUR) {
                            const siblingBGN = Array.from(cells).find(c => c.classList.contains("bgn"));
                            if (siblingBGN) {
                                siblingBGN.classList.add('bg-yellow-100');
                                siblingBGN.classList.remove('bg-red-100');
                            }
                        }
                    } else {
                        cell.classList.add('bg-red-100');
                        cell.classList.remove('bg-yellow-100');
                    }
                });
            }
        });
    };



    const saveData = () => {
        if (!isDirty) return;

        // Prepare the payload using existing variable names
        const dataToSend = {
            id: selectedId || 0,
            name: currentName,
            totalCost: parseFloat(totalCost),  // totalCost is stored as a string, so convert it to a number
            depositPercentage: deposit * 100, // deposit is stored as a decimal (e.g., 0.2 for 20%)
            depositAmount: depositAmount,     // already calculated and stored
            mortgageAmount: mortgageAmount,   // already calculated and stored
            parkingSpotCost: parkSpot,        // pre-set value from your state
            commissionRate: commissionRate * 100, // convert to percentage format (e.g., 3.6 instead of 0.036)
            commissionAmount: (commissionRate * totalCost), // calculate commission amount if needed
            lawyerFeeRate: lawyerFeeRate * 100, // convert to percentage format (e.g., 4 instead of 0.04)
            lawyerFeeAmount: (lawyerFeeRate * totalCost),   // calculate lawyer fee amount if needed
            loanTermInYears: loanTerm,         // directly from your loanTerm state
            currency: currency                 // already stored in state
        };

        if (selectedId) {
            // Update existing entry
            fetch(`/api/mortgages/${selectedId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend),
            }).then(() => {
                setIsDirty(false);
            });
        } else {
            // Add new entry
            fetch('/api/mortgages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend),
            }).then(() => {
                setIsDirty(false);
            });
        }
    };


    const deleteData = () => {
        if (!selectedId) return;
        fetch(`/api/mortgages/${selectedId}`, { method: 'DELETE' })
            .then(() => {
                // Remove the deleted item from appData
                setAppData((prevData) => prevData.filter((item) => item.id !== selectedId));
                // Reset the form state to "New..."
                setSelectedId(null);
                setCurrentName("Mortgage Calculator");
                setTotalCost('200000');
                setDeposit(0.20);
                setDepositAmount(0);
                setMortgageAmount(0);
                setParkSpot(30000);
                setCommissionRate(0.036);
                setLawyerFeeRate(0.04);
                setLoanTerm(30);
                setCurrency("EUR");
            });
    };






    const convertCurrency = (value) => value * exchangeRate;

    const calculateMortgage = (cost, deposit) => {
        const totalWithParking = parseFloat(cost) + parseFloat(parkSpot);

        // 20% VAT calculation
        const vatAmt = vatEnabled ? totalWithParking * 0.20 : 0;
        setVatAmount(vatAmt);

        // apply VAT before splitting
        const totalWithVat = totalWithParking + vatAmt;
        const depositAmount = totalWithVat * deposit;
        const mortgageAmount = totalWithVat - depositAmount;

        // commission & lawyer fees on post-VAT amount
        const commissionAmount = totalWithVat * commissionRate;
        const lawyerFeeAmount = totalWithVat * lawyerFeeRate;

        // grand total
        const grandTotalCalc = totalWithVat + commissionAmount + lawyerFeeAmount;
        setGrandTotal(grandTotalCalc);

        // push updated values to state
        setDepositAmount(depositAmount);
        setMortgageAmount(mortgageAmount);


        const payments = loanTerm * 12;  // Dynamically use the selected loan term
        const interestRates = [0.022, 0.03, 0.035, 0.04, 0.045, 0.05];
        const pmt = (rate, nper, pv) => {
            return (rate * pv) / (1 - Math.pow(1 + rate, -nper));
        };

        const calculatedPayments = {};
        interestRates.forEach(rate => {
            const monthlyRate = rate / 12;
            const payment = pmt(monthlyRate, payments, mortgageAmount);
            calculatedPayments[rate] = Math.round(payment);
        });
        setMonthlyPayments(calculatedPayments);
    };


    const handleCostChange = (e) => {
        const cost = e.target.value;
        setTotalCost(cost);
        sendUpdate('totalCost', cost);
        handleMonthlyBudgetChange();
    };

    const handleDepositChange = (value) => {
        setDeposit(value);
        handleMonthlyBudgetChange();
    };

    const handleParkSpotChange = (e) => {
        const value = e.target.value;
        setParkSpot(value);
        sendUpdate('parkSpot', value);
        handleMonthlyBudgetChange();
    };

    const handleCommissionChange = (e) => {
        const value = (parseFloat(e.target.value) / 100).toFixed(2);
        setCommissionRate(value);
        sendUpdate('commissionRate', value);
    };

    const handleLawyerFeeChange = (e) => {
        const value = (parseFloat(e.target.value) / 100).toFixed(2);
        setLawyerFeeRate(value);
        sendUpdate('lawyerFeeRate', value);
    };

    const handleLoanTermChange = (e) => {
        const value = (parseFloat(e[0])).toFixed(2);
        setLoanTerm(value);
        sendUpdate('loanTerm', value);

        handleMonthlyBudgetChange();
    };


    const commissionAmount = (parseFloat(totalCost) + parseFloat(parkSpot)) * commissionRate;
    const lawyerFeeAmount = (parseFloat(totalCost) + parseFloat(parkSpot)) * lawyerFeeRate;

    const breakdownColumns = t('breakdownColumns');
    const breakdownData = [
        [
            t('descBase'),
            formatNumber(Math.round(parseFloat(totalCost) + parseFloat(parkSpot))),
            formatNumber(Math.round(convertCurrency(parseFloat(totalCost) + parseFloat(parkSpot))))
        ],
        [
            t('descVat'),
            formatNumber(Math.round(vatAmount)),
            formatNumber(Math.round(vatAmount * exchangeRate))
        ],
        [
            t('descTotalVat'),
            formatNumber(Math.round(
                parseFloat(totalCost) +
                parseFloat(parkSpot) +
                vatAmount
            )),
            formatNumber(Math.round(
                convertCurrency(
                    parseFloat(totalCost) +
                    parseFloat(parkSpot) +
                    vatAmount
                )
            ))
        ],
        [
            t('descDeposit'),
            formatNumber(Math.round(depositAmount)),
            formatNumber(Math.round(convertCurrency(depositAmount)))
        ],
        [
            t('descCommission'),
            formatNumber(Math.round(commissionAmount)),
            formatNumber(Math.round(convertCurrency(commissionAmount)))
        ],
        [
            t('descPayNow')(deposit),
            formatNumber(Math.round(depositAmount + commissionAmount)),
            formatNumber(Math.round(convertCurrency(depositAmount + commissionAmount)))
        ],
        [
            t('descPayLater')(deposit),
            formatNumber(Math.round(mortgageAmount + lawyerFeeAmount)),
            formatNumber(Math.round(convertCurrency(mortgageAmount + lawyerFeeAmount)))
        ],
        [
            t('descMortgage')(deposit),
            formatNumber(Math.round(mortgageAmount)),
            formatNumber(Math.round(convertCurrency(mortgageAmount)))
        ],
        [
            t('descLawyer'),
            formatNumber(Math.round(lawyerFeeAmount)),
            formatNumber(Math.round(convertCurrency(lawyerFeeAmount)))
        ],
        [
            t('descGrandTotal'),
            formatNumber(Math.round(grandTotal)),
            formatNumber(Math.round(grandTotal * exchangeRate))
        ],
    ];




    const renderCell = (cell, rowIndex, cellIndex) => {
        // If this is a "group header" (e.g., "Pay Now" or "Pay Later"), style it differently
        const isGroupHeader = breakdownData[rowIndex][1] === "" && breakdownData[rowIndex][2] === "";
        if (isGroupHeader && cellIndex === 0) {
            // Make the first column of group headers bold
            return <strong>{cell}</strong>;
        }
        // Otherwise, just return the cell's value
        return cell;
    };



    const paymentColumns = t('paymentColumns');
    const paymentData = [
        [
            "EUR 🇪🇺",
            ...Object.values(monthlyPayments).map(v =>
                formatNumber(Math.round(v))
            )
        ],
        [
            "BGN 🇧🇬",
            ...Object.values(monthlyPayments).map(v =>
                formatNumber(Math.round(convertCurrency(v)))
            )
        ]
    ];


    // — Add this right after your existing state declarations —
    // m² sizes for the table
    const sqmSizes = [60, 70, 80, 90, 100, 110, 120];




    useEffect(() => {
        const asyncRecalculate = async () => {
            await calculateMortgage(totalCost, deposit);
            handleMonthlyBudgetChange();
        };
        asyncRecalculate();
    }, [totalCost, deposit, parkSpot, commissionRate, lawyerFeeRate, loanTerm, vatEnabled]);

    // SignalR Listener for Real-Time Updates
    useEffect(() => {
        onReceiveUpdate((key, value) => {
            switch (key) {
                case 'totalCost':
                    setTotalCost(value);
                    break;
                case 'deposit':
                    setDeposit(value);
                    break;
                case 'parkSpot':
                    setParkSpot(value);
                    break;
                case 'commissionRate':
                    setCommissionRate(value);
                    break;
                case 'lawyerFeeRate':
                    setLawyerFeeRate(value);
                    break;
                case 'loanTerm':
                    setLoanTerm(value);
                    break;
                case 'savedDeposit':
                    setBudgetDeposit(value);
                    break;
                case 'savedCommission':
                    setBudgetCommission(value);
                    break;
                case 'monthlyBudget':
                    setBudgetMonthlyInstallments(value);
                    break;

                default:
                    break;
            }
        });
    }, []);

    // Persist inputs to localStorage anytime they change:
    useEffect(() => {
        localStorage.setItem('mortgage_loanTerm', loanTerm);
        localStorage.setItem('mortgage_deposit', deposit);
        localStorage.setItem('mortgage_totalCost', totalCost);
        localStorage.setItem('mortgage_parkSpot', parkSpot);
        localStorage.setItem('mortgage_commissionRate', commissionRate);
        localStorage.setItem('mortgage_lawyerFeeRate', lawyerFeeRate);
        localStorage.setItem('mortgage_vatEnabled', vatEnabled);
        localStorage.setItem('mortgage_budgetDeposit', budgetDeposit);
        localStorage.setItem('mortgage_budgetCommission', budgetCommission);
        localStorage.setItem('mortgage_budgetMonthlyInstallments', budgetMonthlyInstallments);
        localStorage.setItem('mortgage_currency', currency);
    }, [
        loanTerm,
        deposit,
        totalCost,
        parkSpot,
        commissionRate,
        lawyerFeeRate,
        vatEnabled,
        budgetDeposit,
        budgetCommission,
        budgetMonthlyInstallments
    ]);

    const costColumns = [t('areaHeader'), ...sqmSizes.map(s => `${s}m²`)];
    const costData = [
        [
            'EUR/m²',
            ...sqmSizes.map(size =>
                formatNumber(
                    Math.round((parseFloat(totalCost) * (vatEnabled ? 1.2 : 1)) / size)
                )
            )
        ],
        // add this extra row only when VAT is turned off
        ...(!vatEnabled
            ? [
                [
                    'EUR/m² + ' + t('vatLabelSimple'),
                    ...sqmSizes.map(size =>
                        formatNumber(
                            Math.round((parseFloat(totalCost) * 1.2) / size)
                        )
                    )
                ]
            ]
            : [])
    ];


    return (
        <Card className="p-6 max-w-4xl mx-auto">
            <CardContent>
                <div id="unique" className="mb-4 p-4 rounded border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        {editMode ? (
                            <input
                                value={currentName}
                                onChange={(e) => {
                                    setCurrentName(e.target.value);
                                    setIsDirty(true);
                                }}
                                onBlur={() => setEditMode(false)}
                                className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-200 w-80" // Increased width
                            />
                        ) : (
                            <h2
                                className="text-xl font-bold cursor-pointer w-80 truncate" // Increased width
                                onClick={() => setEditMode(true)}
                            >
                                {currentName}
                            </h2>
                        )}


                        {appData.length > 0 && (
                            <select
                                onChange={(e) => {
                                    const id = e.target.value;
                                    if (id === "new") {
                                        setSelectedId(null);
                                        setCurrentName("New Mortgage");
                                        setTotalCost('251000');
                                        setDeposit(0.20);
                                        setDepositAmount(0);
                                        setMortgageAmount(0);
                                        setParkSpot(27000);
                                        setCommissionRate(0.036);
                                        setLawyerFeeRate(0.04);
                                        setLoanTerm(30);
                                        setCurrency("EUR");
                                    } else {
                                        loadData(id);
                                    }
                                }}
                                value={selectedId || "new"}
                                className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-indigo-200"
                            >
                                <option value="new">New...</option>
                                {appData.map((entry) => (
                                    <option key={entry.id} value={entry.id}>
                                        {entry.name}
                                    </option>
                                ))}
                            </select>
                        )}

                        {selectedId && (
                            <button
                                onClick={deleteData}
                                className="px-3 py-1 text-white bg-red-500 hover:bg-red-600 rounded focus:outline-none focus:ring focus:ring-red-200"
                            >
                                Delete
                            </button>
                        )}

                        {isDirty && (
                            <button
                                onClick={saveData}
                                className="px-3 py-1 text-white bg-green-500 hover:bg-green-600 rounded focus:outline-none focus:ring focus:ring-green-200"
                            >
                                Save
                            </button>
                        )}
                    </div>
                </div>

                <BudgetBox
                    budgetDeposit={budgetDeposit}
                    setBudgetDeposit={setBudgetDeposit}
                    budgetCommission={budgetCommission}
                    setBudgetCommission={setBudgetCommission}
                    budgetMonthlyInstallments={budgetMonthlyInstallments}
                    setBudgetMonthlyInstallments={setBudgetMonthlyInstallments}
                    handleMonthlyBudgetChange={handleMonthlyBudgetChange}
                    lang={lang}
                    setLang={setLang}
                />



                <div className="flex gap-4">
                    <div className="w-1/2">
                        <label>{t('totalCost')}</label>
                        <Input
                            placeholder={t('totalCost')}
                            value={totalCost}
                            onChange={handleCostChange}
                            className="mb-4 w-full"
                        />
                    </div>
                    <div className="w-1/2">
                        <label>{t('parkSpot')}</label>
                        <Input
                            placeholder="Park Spot"
                            value={parkSpot}
                            onChange={handleParkSpotChange}
                            className="mb-4 w-full"
                        />
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="w-1/2">
                        <label>{t('commissionRate')}</label>
                        <Input
                            type="number"
                            placeholder={t('commissionRate')}
                            value={(commissionRate * 100).toFixed(1)}
                            onChange={handleCommissionChange}
                            className="mb-4 w-full"
                        />
                    </div>
                    <div className="w-1/2">
                        <label>{t('lawyerFeeRate')}</label>
                        <Input
                            type="number"
                            placeholder={t('lawyerFeeRate')}
                            value={(lawyerFeeRate * 100).toFixed(1)}
                            onChange={handleLawyerFeeChange}
                            className="mb-4 w-full"
                        />
                    </div>
                </div>

                <div className="flex gap-4 items-end">
                    <div className="w-2/4">
                        <label>{t('depositLabel')}</label>
                        <Select
                            value={deposit.toFixed(2)}
                            onValueChange={(value) => {
                                const numericValue = parseFloat(value);
                                if (!isNaN(numericValue)) {
                                    handleDepositChange(numericValue);
                                } else {
                                    console.error('Invalid value selected for deposit:', value);
                                }
                            }}

                            defaultValue="0.20" // Explicitly set the default value as string
                            className="w-full"
                        >
                            <SelectTrigger>
                                {(deposit * 100).toFixed(0)}{t('depositLabel')}
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0.00">0%</SelectItem>
                                <SelectItem value="0.05">5%</SelectItem>
                                <SelectItem value="0.10">10%</SelectItem>
                                <SelectItem value="0.20">20%</SelectItem>
                                <SelectItem value="0.30">30%</SelectItem>
                                <SelectItem value="0.40">40%</SelectItem>
                            </SelectContent>
                        </Select>
                       

                    </div>
                    <div class="w-1/4">
                        <input
                            type="checkbox"
                            checked={vatEnabled}
                            onChange={e => setVatEnabled(e.target.checked)}
                            id="vatToggle"
                        />
                        <label htmlFor="vatToggle" className="ml-2">{t('vatLabel')}</label>
                    </div>
                    <div className="w-1/4">
                        <label className="block mb-1">{t('loanTermLabel')(loanTerm)}</label>
                        <Slider.Root
                            id="mortgageSlider"
                            className="relative flex items-center select-none touch-none w-full h-4"
                            value={[loanTerm]}
                            onValueChange={handleLoanTermChange}
                            min={20}
                            max={35}
                            step={1}
                        >
                            <Slider.Track className="bg-gray-300 relative flex-grow rounded-full h-1">
                                <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
                            </Slider.Track>
                            <Slider.Thumb className="block w-4 h-4 bg-white rounded-full shadow-md border border-gray-300 hover:bg-gray-100" />
                        </Slider.Root>
                    </div>
                </div>




                <br />
                <Table
                    columns={breakdownColumns}
                    data={breakdownData}
                    renderCell={renderCell}
                    getRowStyle={(row) => {
                        const desc = row[0];

                        // keep your existing dynamic checks
                        if (desc === t('descDeposit')) {
                            return getRowStyle(budgetDeposit, row[1]);
                        }
                        if (desc === t('descCommission')) {
                            return getRowStyle(budgetCommission, row[1]);
                        }

                        // static gray rows for the three keys
                        if (
                            desc === t('descBase') ||
                            desc === t('descTotalVat') ||
                            desc === t('descGrandTotal')
                        ) {
                            return 'bg-green-100';   // or 'bg-gray-200' for darker
                        }

                        return '';
                    }}
                />


                <br />


                <Table
                    id="paymentTable"
                    columns={paymentColumns}
                    data={paymentData}
                />

                <br/>

                <Table columns={costColumns} data={costData} />







            </CardContent>
        </Card>
    );
}
