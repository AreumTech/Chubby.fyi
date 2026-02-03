import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";
import { HelpIcon, LabelWithHelp } from "@/components/HelpTooltip";

interface HomeEquityLoanFormProps {
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

const LOAN_TYPES = [
  { value: "heloc", label: "HELOC (Home Equity Line of Credit)" },
  { value: "home_equity_loan", label: "Home Equity Loan (Fixed Amount)" },
];

const INTENDED_USE_OPTIONS = [
  { value: "home_improvement", label: "Home Improvement/Renovation" },
  { value: "debt_consolidation", label: "Debt Consolidation" },
  { value: "investment", label: "Investment/Real Estate" },
  { value: "education", label: "Education Expenses" },
  { value: "business", label: "Business Investment" },
  { value: "emergency", label: "Emergency Expenses" },
  { value: "other", label: "Other" },
];

const TARGET_ACCOUNT_TYPES = [
  { value: "cash", label: "Cash/Checking Account" },
  { value: "taxable", label: "Investment Account" },
  { value: "tax_deferred", label: "Tax-Deferred Account" },
  { value: "roth", label: "Roth Account" },
];

const SOURCE_ACCOUNT_TYPES = [
  { value: "cash", label: "Cash/Checking Account" },
  { value: "taxable", label: "Taxable Investment Account" },
];

export const HomeEquityLoanForm: React.FC<HomeEquityLoanFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  // Use centralized date settings
  const { startYear, startMonth } = useStartDate();
  
  const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
    EventType.HOME_EQUITY_LOAN
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Set default values
  useEffect(() => {
    if (!formData.loanType) {
      onChange("loanType", "heloc");
    }
    if (!formData.sourceAccountType) {
      onChange("sourceAccountType", "cash");
    }
    if (!formData.targetAccountType) {
      onChange("targetAccountType", "cash");
    }
    if (!formData.intendedUse) {
      onChange("intendedUse", "home_improvement");
    }
  }, [
    formData.loanType,
    formData.sourceAccountType,
    formData.targetAccountType,
    formData.intendedUse,
    onChange
  ]);

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

  const loanType = formData.loanType || "heloc";
  const isHeloc = loanType === "heloc";
  const intendedUse = formData.intendedUse;
  const variableRate = formData.variableRate;

  // Calculate estimated monthly payment for home equity loan
  const calculateMonthlyPayment = () => {
    if (!formData.amount || !formData.interestRate || !formData.repaymentPeriodYears || isHeloc) {
      return 0;
    }
    
    const principal = formData.amount;
    const monthlyRate = formData.interestRate / 100 / 12;
    const numPayments = formData.repaymentPeriodYears * 12;
    
    if (monthlyRate === 0) return principal / numPayments;
    
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                          (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    return monthlyPayment;
  };

  return (
    <div className="space-y-6">
      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
          Home Equity Financing Details
          <HelpIcon concept="homeEquityLoan" className="ml-2" />
        </H4>
        <div className="space-y-4">
          <Input
            label="Loan Description"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., HELOC for Home Renovation, Debt Consolidation Loan"
            error={getFieldError("description")}
          />

          <Select
            label="Loan Type"
            options={LOAN_TYPES}
            value={loanType}
            onChange={(value) => onChange("loanType", value)}
            error={getFieldError("loanType")}
            helperText={isHeloc ? "Credit line you can draw from as needed" : "Fixed loan amount received upfront"}
          />

          <Input
            label="Loan Date"
            type="month"
            value={`${getYearMonth(formData.monthOffset).year}-${getYearMonth(formData.monthOffset).month}`}
            onChange={(e) => {
              const [year, month] = (e.target as HTMLInputElement).value.split("-");
              handleYearMonthChange("monthOffset", year, month);
            }}
            error={getFieldError("monthOffset")}
            helperText="When the loan/credit line is established"
          />
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Loan Terms
        </H4>
        <div className="space-y-4">
          <Input
            label={isHeloc ? "Credit Line Limit" : "Loan Amount"}
            type="text"
            value={formatNumberWithCommas(formData.amount || "")}
            onChange={(e) =>
              onChange(
                "amount",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="100,000"
            error={getFieldError("amount")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText={isHeloc ? "Maximum amount you can borrow" : "Total loan amount"}
          />

          <Input
            label="Interest Rate"
            type="number"
            step="0.01"
            value={formData.interestRate || ""}
            onChange={(e) =>
              onChange("interestRate", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="7.25"
            rightIcon={<span className="text-text-tertiary">%</span>}
            error={getFieldError("interestRate")}
            helperText="Annual percentage rate (APR)"
          />

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={variableRate || false}
                onChange={(e) => onChange("variableRate", e.target.checked)}
                className="mr-2"
              />
              <BodyBase className="font-medium text-text-primary">
                Variable Interest Rate
              </BodyBase>
            </label>
            <Caption className="mt-1 text-text-tertiary">
              Check if the interest rate can change over time
            </Caption>
          </div>

          {variableRate && (
            <Input
              label="Maximum Rate Cap"
              type="number"
              step="0.01"
              value={formData.rateCap || ""}
              onChange={(e) =>
                onChange("rateCap", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="12.0"
              rightIcon={<span className="text-text-tertiary">%</span>}
              helperText="Maximum rate the loan can reach"
            />
          )}

          {isHeloc && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Draw Period (Years)"
                type="number"
                value={formData.drawPeriodYears || ""}
                onChange={(e) =>
                  onChange("drawPeriodYears", parseInt((e.target as HTMLInputElement).value))
                }
                placeholder="10"
                helperText="Years you can draw funds"
                error={getFieldError("drawPeriodYears")}
              />
              
              <Input
                label="Repayment Period (Years)"
                type="number"
                value={formData.repaymentPeriodYears || ""}
                onChange={(e) =>
                  onChange("repaymentPeriodYears", parseInt((e.target as HTMLInputElement).value))
                }
                placeholder="20"
                helperText="Years to repay after draw period"
                error={getFieldError("repaymentPeriodYears")}
              />
            </div>
          )}

          {!isHeloc && (
            <Input
              label="Loan Term (Years)"
              type="number"
              value={formData.repaymentPeriodYears || ""}
              onChange={(e) =>
                onChange("repaymentPeriodYears", parseInt((e.target as HTMLInputElement).value))
              }
              placeholder="15"
              helperText="Years to repay the loan"
              error={getFieldError("repaymentPeriodYears")}
            />
          )}

          {isHeloc && (
            <Input
              label="Minimum Draw Amount"
              type="text"
              value={formatNumberWithCommas(formData.minimumDrawAmount || "")}
              onChange={(e) =>
                onChange(
                  "minimumDrawAmount",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="10,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Minimum amount per draw (if any)"
            />
          )}

          {!isHeloc && formData.amount && formData.interestRate && formData.repaymentPeriodYears && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-sm text-gray-600">
                <strong>Estimated Monthly Payment:</strong> ${formatNumberWithCommas(Math.round(calculateMonthlyPayment()))}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Principal and interest only (excludes taxes and insurance)
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Costs & Use of Funds
        </H4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Closing Costs"
              type="text"
              value={formatNumberWithCommas(formData.closingCosts || "")}
              onChange={(e) =>
                onChange(
                  "closingCosts",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="2,500"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="One-time costs to establish loan"
            />
            
            <Input
              label="Annual Fee"
              type="text"
              value={formatNumberWithCommas(formData.annualFee || "")}
              onChange={(e) =>
                onChange(
                  "annualFee",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="100"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Annual maintenance fee"
            />
          </div>

          <Select
            label="Intended Use"
            options={INTENDED_USE_OPTIONS}
            value={intendedUse || "home_improvement"}
            onChange={(value) => onChange("intendedUse", value)}
            error={getFieldError("intendedUse")}
            helperText="Primary purpose for the loan proceeds"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Pay Costs From"
              options={SOURCE_ACCOUNT_TYPES}
              value={formData.sourceAccountType || "cash"}
              onChange={(value) => onChange("sourceAccountType", value)}
              error={getFieldError("sourceAccountType")}
              helperText="Account to pay fees from"
            />
            
            <Select
              label="Loan Proceeds To"
              options={TARGET_ACCOUNT_TYPES}
              value={formData.targetAccountType || "cash"}
              onChange={(value) => onChange("targetAccountType", value)}
              error={getFieldError("targetAccountType")}
              helperText="Where to deposit borrowed funds"
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.interestOnlyPeriod || false}
                onChange={(e) => onChange("interestOnlyPeriod", e.target.checked)}
                className="mr-2"
              />
              <BodyBase className="font-medium text-text-primary">
                Interest-Only Period Available
              </BodyBase>
            </label>
            <Caption className="mt-1 text-text-tertiary">
              Check if loan offers interest-only payments initially
            </Caption>
          </div>
        </div>
      </div>

      {/* Tax Deductibility Information */}
      {intendedUse && (
        <div className={`${intendedUse === 'home_improvement' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border rounded-lg p-4`}>
          <div className="flex">
            <div className="flex-shrink-0">
              <span className={intendedUse === 'home_improvement' ? 'text-green-600' : 'text-yellow-600'}>
                {intendedUse === 'home_improvement' ? '💚' : '⚠️'}
              </span>
            </div>
            <div className="ml-3">
              <BodyBase className={`font-medium ${intendedUse === 'home_improvement' ? 'text-green-800' : 'text-yellow-800'}`}>
                Tax Deductibility
              </BodyBase>
              <BodyBase className={`mt-1 ${intendedUse === 'home_improvement' ? 'text-green-700' : 'text-yellow-700'}`}>
                {intendedUse === 'home_improvement' ? (
                  <>
                    <strong>Likely Tax Deductible:</strong><br />
                    • Interest may be deductible if used to buy, build, or improve your home<br />
                    • Subject to $750,000 debt limit for married filing jointly ($375,000 single)<br />
                    • Must itemize deductions to claim
                  </>
                ) : (
                  <>
                    <strong>Likely NOT Tax Deductible:</strong><br />
                    • Interest generally not deductible for non-home purposes<br />
                    • Investment use may qualify under investment interest rules<br />
                    • Business use may be deductible as business expense<br />
                    • Consult a tax professional for your specific situation
                  </>
                )}
              </BodyBase>
            </div>
          </div>
        </div>
      )}

      {/* Risk Warning */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-red-600">⚠️</span>
          </div>
          <div className="ml-3">
            <BodyBase className="font-medium text-red-800">
              Important Risk Considerations
            </BodyBase>
            <BodyBase className="mt-1 text-red-700">
              <strong>Your home is collateral:</strong><br />
              • Failure to repay could result in foreclosure<br />
              • Property values can decline, affecting available equity<br />
              • Variable rates can increase your payment burden<br />
              • Consider your ability to repay under various scenarios
            </BodyBase>
          </div>
        </div>
      </div>

      {/* HELOC Strategy Information */}
      {isHeloc && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-blue-600">💡</span>
            </div>
            <div className="ml-3">
              <BodyBase className="font-medium text-blue-800">
                HELOC Strategy Tips
              </BodyBase>
              <BodyBase className="mt-1 text-blue-700">
                • Use conservatively - don't max out available credit<br />
                • Consider interest rate environment (most HELOCs are variable)<br />
                • Keep some equity buffer for market downturns<br />
                • Have a repayment plan before accessing funds<br />
                • Monitor for payment increases during repayment period
              </BodyBase>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};