import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useFormValidation, commonValidationRules } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface LeveragedInvestmentFormProps {
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
  { value: "tax_deferred", label: "401(k)/403(b) - Tax Deferred" },
  { value: "roth", label: "Roth IRA/401(k) - Tax Free" },
];

const LEVERAGE_MULTIPLIERS = [
  { value: "2", label: "2x Leveraged (2:1)" },
  { value: "3", label: "3x Leveraged (3:1)" },
];

const UNDERLYING_ASSETS = [
  { value: "SPY", label: "SPY - S&P 500 ETF" },
  { value: "QQQ", label: "QQQ - Nasdaq 100 ETF" },
  { value: "IWM", label: "IWM - Russell 2000 ETF" },
  { value: "UPRO", label: "UPRO - 3x S&P 500 ETF" },
  { value: "TQQQ", label: "TQQQ - 3x Nasdaq 100 ETF" },
  { value: "SPXL", label: "SPXL - 3x S&P 500 ETF" },
];

const FREQUENCY_OPTIONS = [
  { value: "once", label: "One-time Investment" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

const REBALANCE_FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
  { value: "threshold", label: "Threshold-based" },
];

const validationRules = {
  description: [
    commonValidationRules.required("Description is required"),
    commonValidationRules.maxLength(100)
  ],
  amount: [
    commonValidationRules.required("Investment amount is required"),
    commonValidationRules.positiveNumber("Amount must be greater than 0"),
    commonValidationRules.reasonableAmount(1000000, "Investment amount seems unusually high for leveraged strategies")
  ],
  leverageMultiplier: [
    commonValidationRules.required("Leverage multiplier is required")
  ],
  underlyingAsset: [
    commonValidationRules.required("Underlying asset is required")
  ],
  targetAccountType: [
    commonValidationRules.required("Account type is required")
  ],
  maxPortfolioAllocation: [
    commonValidationRules.percentage("Portfolio allocation must be between 0% and 100%")
  ],
  stopLossThreshold: [
    commonValidationRules.percentage("Stop loss threshold must be between 0% and 100%")
  ],
  profitTakingThreshold: [
    commonValidationRules.percentage("Profit taking threshold must be between 0% and 100%")
  ],
  expenseRatio: [
    commonValidationRules.nonNegativeNumber("Expense ratio cannot be negative"),
    {
      validate: (value: any) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(num) || num > 5 ? "Expense ratio seems unusually high (over 5%)" : null;
      },
      message: "Expense ratio validation"
    }
  ],
  annualDecayAssumption: [
    commonValidationRules.nonNegativeNumber("Decay assumption cannot be negative"),
    commonValidationRules.percentage("Decay assumption must be between 0% and 100%")
  ],
  rebalanceThreshold: [
    commonValidationRules.percentage("Rebalance threshold must be between 0% and 100%")
  ]
};

export const LeveragedInvestmentForm: React.FC<LeveragedInvestmentFormProps> = ({
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

  const frequency = formData.frequency || "once";
  const leverageMultiplier = formData.leverageMultiplier;
  const rebalanceFrequency = formData.rebalanceFrequency;

  return (
    <div className="space-y-6">
      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
          Leveraged Investment Strategy
        </H4>
        <div className="space-y-4">
          <Input
            label="Strategy Description"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., 3x SPY Leveraged Growth Strategy"
            error={getFieldError("description")}
          />
          
          <Select
            label="Leverage Multiplier"
            options={LEVERAGE_MULTIPLIERS}
            value={formData.leverageMultiplier?.toString() || ""}
            onChange={(value) => onChange("leverageMultiplier", parseInt(value))}
            placeholder="Select leverage level"
            error={getFieldError("leverageMultiplier")}
            helperText="Higher leverage = higher returns AND higher risk"
          />

          <Select
            label="Underlying Asset"
            options={UNDERLYING_ASSETS}
            value={formData.underlyingAsset || ""}
            onChange={(value) => onChange("underlyingAsset", value)}
            placeholder="Select underlying index/ETF"
            error={getFieldError("underlyingAsset")}
            helperText="The index or ETF that will be leveraged"
          />

          <Select
            label="Investment Account"
            options={ACCOUNT_TYPES}
            value={formData.targetAccountType || ""}
            onChange={(value) => onChange("targetAccountType", value)}
            placeholder="Select destination account"
            error={getFieldError("targetAccountType")}
            helperText="Where the leveraged investment will be held"
          />
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Investment Amount & Timeline
        </H4>
        <div className="space-y-4">
          <Input
            label="Investment Amount"
            type="text"
            value={formatNumberWithCommas(formData.amount || "")}
            onChange={(e) =>
              onChange(
                "amount",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="50,000"
            error={getFieldError("amount")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Amount to invest in leveraged strategy"
          />

          <Select
            label="Investment Frequency"
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={(value) => onChange("frequency", value)}
            error={getFieldError("frequency")}
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
            {frequency !== "once" && (
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
            )}
          </div>
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
          Risk Management Settings
        </H4>
        <div className="space-y-4">
          <Input
            label="Maximum Portfolio Allocation"
            type="number"
            step="0.1"
            value={formData.maxPortfolioAllocation || ""}
            onChange={(e) =>
              onChange("maxPortfolioAllocation", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="10.0"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Maximum percentage of total portfolio (recommended: 5-15%)"
            error={getFieldError("maxPortfolioAllocation")}
          />

          <Input
            label="Stop Loss Threshold (Optional)"
            type="number"
            step="0.1"
            value={formData.stopLossThreshold || ""}
            onChange={(e) =>
              onChange("stopLossThreshold", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="30.0"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Percentage loss to trigger automatic exit"
            error={getFieldError("stopLossThreshold")}
          />

          <Input
            label="Profit Taking Threshold (Optional)"
            type="number"
            step="0.1"
            value={formData.profitTakingThreshold || ""}
            onChange={(e) =>
              onChange("profitTakingThreshold", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="100.0"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Percentage gain to trigger partial profit taking"
            error={getFieldError("profitTakingThreshold")}
          />
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Rebalancing & Costs
        </H4>
        <div className="space-y-4">
          <Select
            label="Rebalancing Frequency"
            options={REBALANCE_FREQUENCY_OPTIONS}
            value={rebalanceFrequency || ""}
            onChange={(value) => onChange("rebalanceFrequency", value)}
            placeholder="Select rebalancing schedule"
            error={getFieldError("rebalanceFrequency")}
            helperText="How often to rebalance leveraged allocation"
          />

          {rebalanceFrequency === "threshold" && (
            <Input
              label="Rebalancing Threshold"
              type="number"
              step="0.1"
              value={formData.rebalanceThreshold || ""}
              onChange={(e) =>
                onChange("rebalanceThreshold", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="5.0"
              rightIcon={<span className="text-text-tertiary">%</span>}
              helperText="Percentage deviation to trigger rebalancing"
              error={getFieldError("rebalanceThreshold")}
            />
          )}

          <Input
            label="Expense Ratio"
            type="number"
            step="0.01"
            value={formData.expenseRatio || ""}
            onChange={(e) =>
              onChange("expenseRatio", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="0.95"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Annual expense ratio (typical: 0.95% for 3x ETFs)"
            error={getFieldError("expenseRatio")}
          />

          <Input
            label="Annual Decay Assumption"
            type="number"
            step="0.01"
            value={formData.annualDecayAssumption || ""}
            onChange={(e) =>
              onChange("annualDecayAssumption", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="1.5"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Expected annual decay due to volatility (typical: 1-3%)"
            error={getFieldError("annualDecayAssumption")}
          />
        </div>
      </div>

      {/* High Risk Warning */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-red-600">⚠️</span>
          </div>
          <div className="ml-3">
            <BodyBase className="font-medium text-red-800">
              High Risk Investment Strategy
            </BodyBase>
            <BodyBase className="mt-1 text-red-700">
              <strong>CRITICAL RISKS:</strong><br />
              • <strong>Leveraged ETFs can lose 90%+ in market crashes</strong><br />
              • Daily rebalancing causes volatility decay over time<br />
              • {leverageMultiplier}x leverage means {leverageMultiplier}x the volatility of the underlying asset<br />
              • Not suitable for buy-and-hold strategies over long periods<br />
              • Should be used only as a small portion of your portfolio (5-15%)
            </BodyBase>
            <Caption className="mt-2 text-red-600">
              <strong>Example:</strong> If the S&P 500 drops 33% in one day, a 3x leveraged ETF would lose nearly 100% of its value.
            </Caption>
          </div>
        </div>
      </div>

      {/* Educational Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-600">📚</span>
          </div>
          <div className="ml-3">
            <BodyBase className="font-medium text-blue-800">
              How Leveraged ETFs Work
            </BodyBase>
            <BodyBase className="mt-1 text-blue-700">
              • Use derivatives (swaps, futures) to amplify daily returns<br />
              • Rebalance daily to maintain leverage ratio<br />
              • Best used for short-term tactical positions (weeks to months)<br />
              • Performance diverges from underlying over longer periods due to compounding effects<br />
              • Higher fees due to complexity and daily rebalancing
            </BodyBase>
            <Caption className="mt-2 text-blue-600">
              <strong>Consider alternatives:</strong> Buying on margin, options strategies, or simply increasing allocation to growth assets.
            </Caption>
          </div>
        </div>
      </div>

      {/* Portfolio Allocation Warning */}
      {formData.maxPortfolioAllocation && formData.maxPortfolioAllocation > 20 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-amber-600">💡</span>
            </div>
            <div className="ml-3">
              <BodyBase className="font-medium text-amber-800">
                Portfolio Allocation Warning
              </BodyBase>
              <BodyBase className="mt-1 text-amber-700">
                Allocating more than 20% to leveraged investments is extremely risky. Consider:
                <br />• Most financial advisors recommend max 5-15% allocation
                <br />• Higher allocation increases portfolio volatility dramatically
                <br />• Could jeopardize your long-term financial goals
              </BodyBase>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};