import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H3, H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";
import { HelpIcon, LabelWithHelp } from "@/components/HelpTooltip";

interface DividendIncomeFormProps {
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
  { value: "tax_deferred", label: "Tax-Deferred (401k/IRA)" },
  { value: "roth", label: "Roth IRA/401k" },
  { value: "hsa", label: "Health Savings Account" },
];

const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

const INCOME_SOURCES = [
  { value: "stock_dividends", label: "Stock Dividends" },
  { value: "bond_interest", label: "Bond Interest" },
  { value: "reit_dividends", label: "REIT Dividends" },
  { value: "cd_interest", label: "Certificate of Deposit Interest" },
  { value: "money_market", label: "Money Market Interest" },
  { value: "mutual_fund", label: "Mutual Fund Distributions" },
  { value: "etf_dividends", label: "ETF Dividends" },
  { value: "other", label: "Other Investment Income" },
];

export const DividendIncomeForm: React.FC<DividendIncomeFormProps> = ({
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
    EventType.DIVIDEND_INCOME
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Set default values
  useEffect(() => {
    if (!formData.sourceAccountType) {
      onChange("sourceAccountType", "taxable");
    }
    if (!formData.frequency) {
      onChange("frequency", "quarterly");
    }
  }, [formData.sourceAccountType, formData.frequency, onChange]);

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

  const frequency = formData.frequency || "quarterly";
  const isQualified = formData.isQualified;
  const reinvestDividends = formData.reinvestDividends;

  // Calculate annual amount for display
  const calculateAnnualAmount = () => {
    const amount = formData.amount || 0;
    switch (frequency) {
      case "monthly":
        return amount * 12;
      case "quarterly":
        return amount * 4;
      case "annually":
        return amount;
      default:
        return amount;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Dividend & Interest Income Details
          <HelpIcon concept="dividendIncome" className="ml-2" />
        </H3>
        <div className="space-y-4">
          <Input
            label="Income Description"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., VTSAX Dividends, Treasury Bond Interest"
            error={getFieldError("description")}
          />

          <Input
            label="Income Source"
            value={formData.source || ""}
            onChange={(e) =>
              onChange("source", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Vanguard Total Stock Market Index Fund"
            error={getFieldError("source")}
            helperText="Specific investment or fund generating income"
          />

          <Select
            label="Account Type"
            options={ACCOUNT_TYPES}
            value={formData.sourceAccountType || "taxable"}
            onChange={(value) => onChange("sourceAccountType", value)}
            error={getFieldError("sourceAccountType")}
            helperText="Account where dividend income is received"
          />

          <Select
            label="Payment Frequency"
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={(value) => onChange("frequency", value)}
            error={getFieldError("frequency")}
            helperText="How often dividends/interest are paid"
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Income Amount & Timeline
        </H3>
        <div className="space-y-4">
          <Input
            label={`Income Amount (${frequency === "monthly" ? "Monthly" : frequency === "quarterly" ? "Quarterly" : "Annual"})`}
            type="text"
            value={formatNumberWithCommas(formData.amount || "")}
            onChange={(e) =>
              onChange(
                "amount",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder={frequency === "monthly" ? "250" : frequency === "quarterly" ? "750" : "3,000"}
            error={getFieldError("amount")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText={`${frequency === "monthly" ? "Monthly" : frequency === "quarterly" ? "Quarterly" : "Annual"} dividend/interest payment amount`}
          />

          {frequency !== "annually" && formData.amount && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-sm text-gray-600">
                <strong>Estimated Annual Income:</strong> ${formatNumberWithCommas(calculateAnnualAmount())}
              </div>
            </div>
          )}

          <Input
            label="Current Yield Rate (Optional)"
            type="number"
            step="0.01"
            value={formData.yieldRate || ""}
            onChange={(e) =>
              onChange("yieldRate", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="2.5"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Annual yield rate for reference"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Year"
              type="number"
              value={getYearMonth(formData.startDateOffset).year}
              onChange={(e) =>
                handleYearMonthChange(
                  "startDateOffset",
                  (e.target as HTMLInputElement).value,
                  getYearMonth(formData.startDateOffset).month || "01"
                )
              }
              placeholder="2024"
              error={getFieldError("startDateOffset")}
            />
            <Input
              label="End Year (Optional)"
              type="number"
              value={getYearMonth(formData.endDateOffset).year}
              onChange={(e) =>
                handleYearMonthChange(
                  "endDateOffset",
                  (e.target as HTMLInputElement).value,
                  getYearMonth(formData.endDateOffset).month || "01"
                )
              }
              placeholder="Leave blank for indefinite"
              error={getFieldError("endDateOffset")}
            />
          </div>

          <Input
            label="Annual Growth Rate"
            type="number"
            step="0.01"
            value={formData.annualGrowthRate || ""}
            onChange={(e) =>
              onChange("annualGrowthRate", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="3.0"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Expected annual increase in dividend/interest income"
            error={getFieldError("annualGrowthRate")}
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Tax & Investment Options
        </H3>
        <div className="space-y-4">
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isQualified || false}
                onChange={(e) => onChange("isQualified", e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">
                Qualified Dividends
                <HelpIcon concept="qualifiedDividends" className="ml-1" />
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Check if dividends qualify for preferential tax treatment
            </p>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={reinvestDividends || false}
                onChange={(e) => onChange("reinvestDividends", e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">
                Automatic Dividend Reinvestment (DRIP)
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Check if dividends are automatically reinvested
            </p>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isNet || false}
                onChange={(e) => onChange("isNet", e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">
                Amount is After Taxes
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Check if the amount is net of withholding taxes
            </p>
          </div>
        </div>
      </div>

      {/* Tax Treatment Information */}
      {isQualified !== undefined && (
        <div className={`${isQualified ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border rounded-lg p-4`}>
          <div className="flex">
            <div className="flex-shrink-0">
              <span className={isQualified ? 'text-green-600' : 'text-yellow-600'}>
                {isQualified ? '💚' : '⚠️'}
              </span>
            </div>
            <div className="ml-3">
              <H4 className={`text-sm font-medium ${isQualified ? 'text-green-800' : 'text-yellow-800'}`}>
                {isQualified ? 'Qualified Dividends' : 'Ordinary Dividends'}
              </H4>
              <p className={`mt-1 text-sm ${isQualified ? 'text-green-700' : 'text-yellow-700'}`}>
                {isQualified ? (
                  <>
                    <strong>Preferential Tax Treatment:</strong><br />
                    • Taxed at capital gains rates (0%, 15%, or 20%)<br />
                    • Lower tax burden than ordinary income<br />
                    • Most US company dividends qualify
                  </>
                ) : (
                  <>
                    <strong>Ordinary Income Tax Rates:</strong><br />
                    • Taxed at same rate as wages and salary<br />
                    • Rates up to 37% for high earners<br />
                    • REITs and some foreign dividends typically non-qualified
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Account Type Tax Information */}
      {formData.sourceAccountType === "taxable" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-blue-600">💡</span>
            </div>
            <div className="ml-3">
              <H4 color="info">
                Taxable Account Considerations
              </H4>
              <BodyBase color="info" className="mt-1">
                • Dividends and interest are taxable in the year received<br />
                • Consider tax-efficient funds to minimize tax drag<br />
                • Municipal bonds may be tax-free for your tax bracket<br />
                • DRIP purchases may have tax implications for cost basis
              </BodyBase>
            </div>
          </div>
        </div>
      )}

      {formData.sourceAccountType !== "taxable" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-600">✅</span>
            </div>
            <div className="ml-3">
              <H4 color="success">
                Tax-Advantaged Account Benefits
              </H4>
              <BodyBase color="success" className="mt-1">
                • Dividends and interest grow tax-deferred or tax-free<br />
                • No annual tax reporting required for account activity<br />
                • Ideal for high-dividend or high-yield investments<br />
                • Reinvestment occurs without immediate tax consequences
              </BodyBase>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
