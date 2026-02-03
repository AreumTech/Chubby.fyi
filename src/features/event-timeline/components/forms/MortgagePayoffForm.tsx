import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H3, H4, BodyBase } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useFormValidation, commonValidationRules } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface MortgagePayoffFormProps {
  formData: Partial<FinancialEvent>;
  onChange: (field: string, value: any) => void;
  onDateChange: (field: string, year: string, month: string) => void;
  baseYear?: number;
  baseMonth?: number;
  currentAge?: number;
  onValidationChange?: (
    isValid: boolean,
    errors: Record<string, string>
  ) => void;
}

const ACCOUNT_TYPES = [
  { value: "taxable", label: "Taxable Brokerage Account" },
  { value: "tax_deferred", label: "Traditional IRA/401(k)" },
  { value: "roth", label: "Roth IRA/401(k)" },
  { value: "cash", label: "Cash/Savings Account" },
];

const ASSET_CLASSES = [
  { value: "us_stocks_total_market", label: "US Total Stock Market" },
  { value: "us_bonds_total_market", label: "US Total Bond Market" },
  { value: "international_stocks", label: "International Stocks" },
  { value: "cash", label: "Cash/Money Market" },
];

const RISK_LEVELS = [
  { value: "conservative", label: "Conservative (Bonds/Cash)" },
  { value: "moderate", label: "Moderate (Balanced Portfolio)" },
  { value: "aggressive", label: "Aggressive (Stock Heavy)" },
];

const DEBT_AVERSION_SCORES = [
  { value: "1", label: "1 - Love leverage, comfortable with debt" },
  { value: "2", label: "2 - Comfortable with strategic debt" },
  { value: "3", label: "3 - Neutral on debt" },
  { value: "4", label: "4 - Prefer to minimize debt" },
  { value: "5", label: "5 - Hate debt, want it gone ASAP" },
];

const SLEEP_AT_NIGHT_SCORES = [
  { value: "1", label: "1 - High risk tolerance, love volatility" },
  { value: "2", label: "2 - Comfortable with market swings" },
  { value: "3", label: "3 - Moderate risk tolerance" },
  { value: "4", label: "4 - Prefer stability over returns" },
  { value: "5", label: "5 - Need certainty, hate volatility" },
];

const validationRules = {
  description: [
    commonValidationRules.required("Description is required"),
    commonValidationRules.maxLength(100)
  ],
  remainingBalance: [
    commonValidationRules.required("Remaining mortgage balance is required"),
    commonValidationRules.positiveNumber("Balance must be greater than 0"),
    commonValidationRules.reasonableAmount(2000000, "Mortgage balance seems unusually high")
  ],
  interestRate: [
    commonValidationRules.required("Interest rate is required"),
    commonValidationRules.positiveNumber("Interest rate must be greater than 0"),
    commonValidationRules.interestRate("Interest rate must be between 0% and 50%")
  ],
  remainingYears: [
    commonValidationRules.required("Remaining years is required"),
    commonValidationRules.positiveNumber("Remaining years must be greater than 0"),
    {
      validate: (value: any) => {
        const years = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(years) || years > 50 ? "Remaining years seems unusually long (over 50 years)" : null;
      },
      message: "Remaining years validation"
    }
  ],
  currentPayment: [
    commonValidationRules.required("Current monthly payment is required"),
    commonValidationRules.positiveNumber("Payment must be greater than 0"),
    commonValidationRules.reasonableAmount(50000, "Monthly payment seems unusually high")
  ],
  payoffAmount: [
    commonValidationRules.required("Payoff amount is required"),
    commonValidationRules.positiveNumber("Payoff amount must be greater than 0"),
    commonValidationRules.reasonableAmount(2000000, "Payoff amount seems unusually high")
  ],
  sourceAccountType: [
    commonValidationRules.required("Source account is required")
  ],
  effectiveTaxRate: [
    commonValidationRules.nonNegativeNumber("Tax rate cannot be negative"),
    commonValidationRules.percentage("Tax rate must be between 0% and 100%")
  ],
  capitalGainsTaxRate: [
    commonValidationRules.nonNegativeNumber("Capital gains tax rate cannot be negative"),
    commonValidationRules.percentage("Capital gains tax rate must be between 0% and 100%")
  ],
  expectedReturn: [
    commonValidationRules.nonNegativeNumber("Expected return cannot be negative"),
    {
      validate: (value: any) => {
        const rate = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(rate) || rate > 20 ? "Expected return over 20% seems unrealistic" : null;
      },
      message: "Expected return validation"
    }
  ],
  worstCaseMarketReturn: [
    {
      validate: (value: any) => {
        if (value === "" || value === undefined || value === null) return null;
        const rate = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(rate) || rate > 10 ? "Worst case return should typically be negative or very low" : null;
      },
      message: "Worst case return validation"
    }
  ],
  inflationAssumption: [
    commonValidationRules.nonNegativeNumber("Inflation assumption cannot be negative"),
    {
      validate: (value: any) => {
        if (value === "" || value === undefined || value === null) return null;
        const rate = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(rate) || rate > 10 ? "Inflation assumption over 10% seems unusually high" : null;
      },
      message: "Inflation assumption validation"
    }
  ],
  liquidityNeeds: [
    commonValidationRules.nonNegativeNumber("Liquidity needs cannot be negative"),
    {
      validate: (value: any) => {
        if (value === "" || value === undefined || value === null) return null;
        const months = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(months) || months > 24 ? "Emergency fund over 24 months seems excessive" : null;
      },
      message: "Liquidity needs validation"
    }
  ]
};

export const MortgagePayoffForm: React.FC<MortgagePayoffFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  const { startYear, startMonth } = useStartDate();
  
  const { hasFieldError, getFieldError, validateForm } = useFormValidation(validationRules);

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  const getYearMonth = (offset?: number) => {
    if (offset === undefined) return { year: "", month: "" };
    const result = getCalendarYearAndMonthFromMonthOffset(
      startYear,
      startMonth,
      offset,
      currentAge
    );
    return {
      year: result.year.toString(),
      month: result.monthInYear.toString().padStart(2, "0"),
    };
  };

  const handleYearMonthChange = (
    field: string,
    year: string,
    month: string
  ) => {
    if (year && month) {
      onDateChange(field, year, month);
    }
  };

  const handleAlternativeInvestmentChange = (field: string, value: any) => {
    onChange("alternativeInvestment", {
      ...formData.alternativeInvestment,
      [field]: value
    });
  };

  const handleOtherDebtChange = (index: number, field: string, value: any) => {
    const otherDebts = [...(formData.otherDebts || [])];
    if (!otherDebts[index]) {
      otherDebts[index] = { type: "", balance: 0, rate: 0, minimumPayment: 0 };
    }
    otherDebts[index] = { ...otherDebts[index], [field]: value };
    onChange("otherDebts", otherDebts);
  };

  const addOtherDebt = () => {
    const otherDebts = [...(formData.otherDebts || [])];
    otherDebts.push({ type: "", balance: 0, rate: 0, minimumPayment: 0 });
    onChange("otherDebts", otherDebts);
  };

  const removeOtherDebt = (index: number) => {
    const otherDebts = [...(formData.otherDebts || [])];
    otherDebts.splice(index, 1);
    onChange("otherDebts", otherDebts);
  };

  const monthlyInterestCost = formData.remainingBalance && formData.interestRate 
    ? (formData.remainingBalance * (formData.interestRate / 100) / 12)
    : 0;

  const payoffVsInvestComparison = formData.interestRate && formData.alternativeInvestment?.expectedReturn
    ? formData.alternativeInvestment.expectedReturn - formData.interestRate
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Mortgage Payoff vs Investment Analysis
        </H3>
        <div className="space-y-4">
          <Input
            label="Analysis Description"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Primary Residence Payoff Analysis"
            error={getFieldError("description")}
          />

          <Input
            label="Payoff Date"
            type="number"
            value={getYearMonth(formData.payoffDate).year}
            onChange={(e) =>
              handleYearMonthChange(
                "payoffDate",
                (e.target as HTMLInputElement).value,
                getYearMonth(formData.payoffDate).month || "01"
              )
            }
            placeholder="2025"
            error={getFieldError("payoffDate")}
            helperText="When you plan to make the payoff decision"
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Current Mortgage Details
        </H3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Remaining Balance"
              type="text"
              value={formatNumberWithCommas(formData.remainingBalance || "")}
              onChange={(e) =>
                onChange(
                  "remainingBalance",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="300,000"
              error={getFieldError("remainingBalance")}
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Current mortgage balance"
            />

            <Input
              label="Interest Rate"
              type="number"
              step="0.01"
              value={formData.interestRate || ""}
              onChange={(e) =>
                onChange("interestRate", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="6.5"
              rightIcon={<span className="text-text-tertiary">%</span>}
              error={getFieldError("interestRate")}
              helperText="Current mortgage rate"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Remaining Years"
              type="number"
              step="0.1"
              value={formData.remainingYears || ""}
              onChange={(e) =>
                onChange("remainingYears", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="25"
              error={getFieldError("remainingYears")}
              helperText="Years left on mortgage"
            />

            <Input
              label="Current Monthly Payment"
              type="text"
              value={formatNumberWithCommas(formData.currentPayment || "")}
              onChange={(e) =>
                onChange(
                  "currentPayment",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="2,000"
              error={getFieldError("currentPayment")}
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Current monthly P&I payment"
            />
          </div>

          {monthlyInterestCost > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-sm text-gray-600">
                <strong>Monthly Interest Cost:</strong> ${monthlyInterestCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                <br />
                <strong>Annual Interest Cost:</strong> ${(monthlyInterestCost * 12).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Payoff Funding Details
        </H3>
        <div className="space-y-4">
          <Input
            label="Available Payoff Amount"
            type="text"
            value={formatNumberWithCommas(formData.payoffAmount || "")}
            onChange={(e) =>
              onChange(
                "payoffAmount",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="300,000"
            error={getFieldError("payoffAmount")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Lump sum available for mortgage payoff"
          />

          <Select
            label="Source Account for Payoff"
            options={ACCOUNT_TYPES}
            value={formData.sourceAccountType || ""}
            onChange={(value) => onChange("sourceAccountType", value)}
            placeholder="Select source account"
            error={getFieldError("sourceAccountType")}
            helperText="Where the payoff money would come from"
          />

          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.reinvestSavings || false}
                onChange={(e) => onChange("reinvestSavings", e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                Reinvest monthly payment savings
              </span>
            </label>

            {formData.reinvestSavings && (
              <Select
                label="Reinvestment Account"
                options={ACCOUNT_TYPES}
                value={formData.reinvestmentAccount || ""}
                onChange={(value) => onChange("reinvestmentAccount", value)}
                placeholder="Select reinvestment account"
                error={getFieldError("reinvestmentAccount")}
                helperText="Where to invest the freed-up monthly payments"
              />
            )}
          </div>
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
          Alternative Investment Scenario
        </H3>
        <div className="space-y-4">
          <Select
            label="Target Investment Account"
            options={ACCOUNT_TYPES}
            value={formData.alternativeInvestment?.targetAccountType || ""}
            onChange={(value) => handleAlternativeInvestmentChange("targetAccountType", value)}
            placeholder="Select investment account"
            error={getFieldError("alternativeInvestment.targetAccountType")}
            helperText="Where you would invest instead of paying off mortgage"
          />

          <Select
            label="Asset Class"
            options={ASSET_CLASSES}
            value={formData.alternativeInvestment?.assetClass || ""}
            onChange={(value) => handleAlternativeInvestmentChange("assetClass", value)}
            placeholder="Select asset class"
            error={getFieldError("alternativeInvestment.assetClass")}
            helperText="Type of investment for the payoff amount"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Expected Annual Return"
              type="number"
              step="0.1"
              value={formData.alternativeInvestment?.expectedReturn || ""}
              onChange={(e) =>
                handleAlternativeInvestmentChange("expectedReturn", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="7.0"
              rightIcon={<span className="text-text-tertiary">%</span>}
              error={getFieldError("expectedReturn")}
              helperText="Expected investment return"
            />

            <Select
              label="Risk Level"
              options={RISK_LEVELS}
              value={formData.alternativeInvestment?.riskLevel || ""}
              onChange={(value) => handleAlternativeInvestmentChange("riskLevel", value)}
              placeholder="Select risk level"
              error={getFieldError("alternativeInvestment.riskLevel")}
              helperText="Investment risk profile"
            />
          </div>

          {payoffVsInvestComparison !== 0 && (
            <div className={`p-3 rounded-lg border ${
              payoffVsInvestComparison > 0 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="text-sm">
                <strong>Return Differential:</strong> {payoffVsInvestComparison > 0 ? '+' : ''}{payoffVsInvestComparison.toFixed(1)}%
                <br />
                {payoffVsInvestComparison > 0 
                  ? 'Investing has higher expected returns than mortgage interest'
                  : 'Mortgage payoff has better guaranteed return than expected investment return'
                }
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
          Tax Considerations
        </H3>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.mortgageInterestDeductible || false}
                onChange={(e) => onChange("mortgageInterestDeductible", e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                Mortgage interest is tax deductible
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Effective Tax Rate"
              type="number"
              step="0.1"
              value={formData.effectiveTaxRate || ""}
              onChange={(e) =>
                onChange("effectiveTaxRate", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="24.0"
              rightIcon={<span className="text-text-tertiary">%</span>}
              error={getFieldError("effectiveTaxRate")}
              helperText="Your marginal tax rate"
            />

            <Input
              label="Capital Gains Tax Rate"
              type="number"
              step="0.1"
              value={formData.capitalGainsTaxRate || ""}
              onChange={(e) =>
                onChange("capitalGainsTaxRate", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="15.0"
              rightIcon={<span className="text-text-tertiary">%</span>}
              error={getFieldError("capitalGainsTaxRate")}
              helperText="Tax rate on investment gains"
            />
          </div>
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-gray-500 rounded-full mr-3"></div>
          Personal Preference Factors
        </H3>
        <div className="space-y-4">
          <Select
            label="Debt Aversion Level"
            options={DEBT_AVERSION_SCORES}
            value={formData.debtAversionScore?.toString() || ""}
            onChange={(value) => onChange("debtAversionScore", parseInt(value))}
            placeholder="Select debt comfort level"
            error={getFieldError("debtAversionScore")}
            helperText="How comfortable are you with debt?"
          />

          <Select
            label="Sleep at Night Factor"
            options={SLEEP_AT_NIGHT_SCORES}
            value={formData.sleepAtNightFactor?.toString() || ""}
            onChange={(value) => onChange("sleepAtNightFactor", parseInt(value))}
            placeholder="Select risk tolerance"
            error={getFieldError("sleepAtNightFactor")}
            helperText="How important is certainty vs. returns?"
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
          Scenario Analysis Settings
        </H3>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.runSensitivityAnalysis || false}
                onChange={(e) => onChange("runSensitivityAnalysis", e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                Run sensitivity analysis with multiple scenarios
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Worst Case Market Return"
              type="number"
              step="0.1"
              value={formData.worstCaseMarketReturn || ""}
              onChange={(e) =>
                onChange("worstCaseMarketReturn", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="-10.0"
              rightIcon={<span className="text-text-tertiary">%</span>}
              error={getFieldError("worstCaseMarketReturn")}
              helperText="Bear market scenario return"
            />

            <Input
              label="Inflation Assumption"
              type="number"
              step="0.1"
              value={formData.inflationAssumption || ""}
              onChange={(e) =>
                onChange("inflationAssumption", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="3.0"
              rightIcon={<span className="text-text-tertiary">%</span>}
              error={getFieldError("inflationAssumption")}
              helperText="Expected annual inflation"
            />
          </div>

          <Input
            label="Liquidity Needs (Months of Expenses)"
            type="number"
            step="0.5"
            value={formData.liquidityNeeds || ""}
            onChange={(e) =>
              onChange("liquidityNeeds", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="6"
            error={getFieldError("liquidityNeeds")}
            helperText="Emergency fund to maintain"
          />
        </div>
      </div>

      {/* Other Debts Section */}
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
          Other Debts (Optional)
        </H3>
        <div className="space-y-4">
          {(formData.otherDebts || []).map((debt, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <Input
                  label="Debt Type"
                  value={debt.type || ""}
                  onChange={(e) => handleOtherDebtChange(index, "type", (e.target as HTMLInputElement).value)}
                  placeholder="Credit Card, Auto Loan, etc."
                />
                <Input
                  label="Balance"
                  type="text"
                  value={formatNumberWithCommas(debt.balance || "")}
                  onChange={(e) => handleOtherDebtChange(index, "balance", parseFormattedNumber((e.target as HTMLInputElement).value))}
                  placeholder="25,000"
                  leftIcon={<span className="text-text-tertiary">$</span>}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Interest Rate"
                  type="number"
                  step="0.01"
                  value={debt.rate || ""}
                  onChange={(e) => handleOtherDebtChange(index, "rate", parseFloat((e.target as HTMLInputElement).value))}
                  placeholder="18.5"
                  rightIcon={<span className="text-text-tertiary">%</span>}
                />
                <Input
                  label="Minimum Payment"
                  type="text"
                  value={formatNumberWithCommas(debt.minimumPayment || "")}
                  onChange={(e) => handleOtherDebtChange(index, "minimumPayment", parseFormattedNumber((e.target as HTMLInputElement).value))}
                  placeholder="250"
                  leftIcon={<span className="text-text-tertiary">$</span>}
                />
              </div>
              <button
                type="button"
                onClick={() => removeOtherDebt(index)}
                className="mt-2 text-sm text-red-600 hover:text-red-800"
              >
                Remove debt
              </button>
            </div>
          ))}
          
          <button
            type="button"
            onClick={addOtherDebt}
            className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            + Add another debt
          </button>
        </div>
      </div>

      {/* Decision Framework */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-600">🤔</span>
          </div>
          <div className="ml-3">
            <H4 color="info" className="text-blue-800">
              Mortgage Payoff Decision Framework
            </H4>
            <BodyBase color="info" className="mt-1 text-blue-700">
              <strong>Consider paying off mortgage if:</strong><br />
              • You hate debt and value peace of mind<br />
              • Mortgage rate is higher than expected investment returns<br />
              • You're nearing retirement and want reduced expenses<br />
              • You have high-interest debt to tackle next<br />
              • You have adequate emergency funds after payoff
            </BodyBase>
            <p className="mt-2 text-sm text-blue-700">
              <strong>Consider investing instead if:</strong><br />
              • Expected investment returns exceed mortgage rate<br />
              • You have tax-advantaged space (401k, IRA) to fill<br />
              • Mortgage interest is tax deductible<br />
              • You want to maintain liquidity and flexibility<br />
              • You're comfortable with investment risk
            </p>
          </div>
        </div>
      </div>

      {/* High Interest Rate Warning */}
      {formData.interestRate && formData.interestRate > 7 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-amber-600">💡</span>
            </div>
            <div className="ml-3">
              <H4 color="warning" className="text-amber-800">
                High Interest Rate Mortgage
              </H4>
              <BodyBase color="warning" className="mt-1 text-amber-700">
                With a {formData.interestRate}% mortgage rate, you have a guaranteed {formData.interestRate}% return by paying it off.
                This is higher than many conservative investment options and may favor mortgage payoff,
                especially if you value certainty over potential higher returns.
              </BodyBase>
            </div>
          </div>
        </div>
      )}

      {/* Liquidity Warning */}
      {formData.payoffAmount && formData.remainingBalance && 
       formData.payoffAmount <= formData.remainingBalance * 1.2 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-600">⚠️</span>
            </div>
            <div className="ml-3">
              <H4 color="danger" className="text-red-800">
                Liquidity Concern
              </H4>
              <BodyBase color="danger" className="mt-1 text-red-700">
                Using most of your available funds for mortgage payoff could leave you cash-poor.
                Ensure you maintain adequate emergency funds and liquidity for unexpected expenses.
                Consider a partial payoff instead of full payoff.
              </BodyBase>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};