import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";
import { HelpIcon } from "@/components/HelpTooltip";

interface WithdrawalEventFormProps {
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

const SOURCE_ACCOUNT_TYPES = [
  { value: "tax_deferred", label: "401(k)/403(b)/Traditional IRA - Tax Deferred", helpConcept: "taxDeferred" },
  { value: "roth", label: "Roth IRA/401(k) - Tax Free", helpConcept: "roth" },
  { value: "taxable", label: "Brokerage - Taxable" },
  { value: "hsa", label: "HSA - Health Savings" },
  { value: "cash", label: "Cash/Savings" },
];

const WITHDRAWAL_STRATEGIES = [
  { value: "fixed_amount", label: "Fixed Dollar Amount", description: "Withdraw the same amount each time" },
  { value: "percentage", label: "Percentage of Balance", description: "Withdraw a percentage of current account balance" },
  { value: "inflation_adjusted", label: "Inflation Adjusted", description: "Fixed amount that grows with inflation" },
  { value: "safe_withdrawal_rate", label: "Safe Withdrawal Rate (4%)", description: "Traditional 4% retirement rule" },
];

const FREQUENCY_OPTIONS = [
  { value: "one_time", label: "One-Time Withdrawal" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

export const WithdrawalEventForm: React.FC<WithdrawalEventFormProps> = ({
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
    EventType.WITHDRAWAL
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Set default values
  useEffect(() => {
    if (!formData.withdrawalStrategy) {
      onChange("withdrawalStrategy", "fixed_amount");
    }
    if (!formData.frequency) {
      onChange("frequency", "one_time");
    }
    if (!formData.sourceAccountType) {
      onChange("sourceAccountType", "tax_deferred");
    }
  }, [formData.withdrawalStrategy, formData.frequency, formData.sourceAccountType, onChange]);

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

  const withdrawalStrategy = formData.withdrawalStrategy || "fixed_amount";
  const frequency = formData.frequency || "one_time";
  const isRecurring = frequency !== "one_time";
  const sourceAccountType = formData.sourceAccountType || "tax_deferred";
  const isRetirementAccount = sourceAccountType === "tax_deferred" || sourceAccountType === "roth";
  const mayHavePenalty = isRetirementAccount && currentAge < 59.5;

  return (
    <div className="space-y-6">
      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
          Withdrawal Details
          <HelpIcon concept="withdrawal" className="ml-2" />
        </H4>
        <div className="space-y-4">
          <Input
            label="Withdrawal Description"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Retirement Income, Emergency Fund, Home Purchase"
            error={getFieldError("description")}
          />
          
          <Select
            label="Source Account"
            options={SOURCE_ACCOUNT_TYPES}
            value={sourceAccountType}
            onChange={(value) => onChange("sourceAccountType", value)}
            placeholder="Select account to withdraw from"
            error={getFieldError("sourceAccountType")}
            helperText="Account from which money will be withdrawn"
          />

          <Select
            label="Withdrawal Strategy"
            options={WITHDRAWAL_STRATEGIES}
            value={withdrawalStrategy}
            onChange={(value) => onChange("withdrawalStrategy", value)}
            error={getFieldError("withdrawalStrategy")}
            helperText="How to calculate withdrawal amount"
          />

          <Select
            label="Frequency"
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={(value) => onChange("frequency", value)}
            error={getFieldError("frequency")}
          />
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Amount & Timeline
        </H4>
        <div className="space-y-4">
          {withdrawalStrategy === "fixed_amount" && (
            <Input
              label="Withdrawal Amount"
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
              helperText="Fixed dollar amount to withdraw"
            />
          )}

          {withdrawalStrategy === "percentage" && (
            <>
              <Input
                label="Withdrawal Percentage"
                type="number"
                step="0.1"
                value={formData.withdrawalPercentage || ""}
                onChange={(e) =>
                  onChange("withdrawalPercentage", parseFloat((e.target as HTMLInputElement).value))
                }
                placeholder="5.0"
                rightIcon={<span className="text-text-tertiary">%</span>}
                helperText="Percentage of account balance to withdraw"
                error={getFieldError("withdrawalPercentage")}
              />
              <Input
                label="Base Amount (Optional)"
                type="text"
                value={formatNumberWithCommas(formData.amount || "")}
                onChange={(e) =>
                  onChange(
                    "amount",
                    parseFormattedNumber((e.target as HTMLInputElement).value)
                  )
                }
                placeholder="Leave blank to use current balance"
                leftIcon={<span className="text-text-tertiary">$</span>}
                helperText="Base amount for percentage calculation (optional)"
                error={getFieldError("amount")}
              />
            </>
          )}

          {withdrawalStrategy === "inflation_adjusted" && (
            <>
              <Input
                label="Initial Withdrawal Amount"
                type="text"
                value={formatNumberWithCommas(formData.amount || "")}
                onChange={(e) =>
                  onChange(
                    "amount",
                    parseFormattedNumber((e.target as HTMLInputElement).value)
                  )
                }
                placeholder="50,000"
                leftIcon={<span className="text-text-tertiary">$</span>}
                helperText="Starting amount that will be adjusted for inflation"
                error={getFieldError("amount")}
              />
              <Input
                label="Annual Inflation Rate"
                type="number"
                step="0.01"
                value={formData.annualGrowthRate || ""}
                onChange={(e) =>
                  onChange("annualGrowthRate", parseFloat((e.target as HTMLInputElement).value))
                }
                placeholder="3.0"
                rightIcon={<span className="text-text-tertiary">%</span>}
                helperText="Expected annual inflation rate"
                error={getFieldError("annualGrowthRate")}
              />
            </>
          )}

          {withdrawalStrategy === "safe_withdrawal_rate" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <BodyBase className="text-blue-700">
                <strong>Safe Withdrawal Rate (4% Rule)</strong><br />
                This will withdraw 4% of your account balance annually, adjusted for the frequency you selected.
                The withdrawal amount will be calculated automatically based on your account balance.
              </BodyBase>
            </div>
          )}

          <Input
            label="Start Date"
            type="month"
            value={`${getYearMonth(formData.monthOffset).year}-${getYearMonth(formData.monthOffset).month}`}
            onChange={(e) => {
              const [year, month] = (e.target as HTMLInputElement).value.split("-");
              handleYearMonthChange("monthOffset", year, month);
            }}
            error={getFieldError("monthOffset")}
            helperText="When to start withdrawals"
          />

          {isRecurring && (
            <Input
              label="End Date (Optional)"
              type="month"
              value={`${getYearMonth(formData.endDateOffset).year}-${getYearMonth(formData.endDateOffset).month}`}
              onChange={(e) => {
                const [year, month] = (e.target as HTMLInputElement).value.split("-");
                handleYearMonthChange("endDateOffset", year, month);
              }}
              error={getFieldError("endDateOffset")}
              helperText="When to stop withdrawals (leave blank for indefinite)"
            />
          )}
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Advanced Options
        </H4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isNetOfTaxes"
                checked={formData.isNetOfTaxes || false}
                onChange={(e) => onChange("isNetOfTaxes", e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isNetOfTaxes" className="text-sm font-medium text-gray-700">
                Net of taxes
              </label>
              <HelpIcon concept="netOfTaxes" className="ml-1" />
            </div>

            {isRetirementAccount && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useContributionBasisFirst"
                  checked={formData.useContributionBasisFirst || false}
                  onChange={(e) => onChange("useContributionBasisFirst", e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="useContributionBasisFirst" className="text-sm font-medium text-gray-700">
                  Use contributions first
                </label>
                <HelpIcon concept="contributionBasisFirst" className="ml-1" />
              </div>
            )}
          </div>

          <Input
            label="Tax Withholding Percentage (Optional)"
            type="number"
            step="0.1"
            value={formData.taxWithholdingPercentage || ""}
            onChange={(e) =>
              onChange("taxWithholdingPercentage", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="22.0"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Custom tax withholding rate (overrides default)"
            error={getFieldError("taxWithholdingPercentage")}
          />

          <Input
            label="Purpose (Optional)"
            value={formData.purpose || ""}
            onChange={(e) =>
              onChange("purpose", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Living expenses, Travel, Medical bills"
            helperText="Purpose of withdrawal for tracking and reporting"
          />
        </div>
      </div>

      {mayHavePenalty && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-600">⚠️</span>
            </div>
            <div className="ml-3">
              <BodyBase weight="medium" className="text-yellow-800">
                Early Withdrawal Penalty Warning
              </BodyBase>
              <BodyBase className="mt-1 text-yellow-700">
                Withdrawing from retirement accounts before age 59½ typically incurs a 10% early withdrawal penalty. 
                Consider using contribution basis first (for Roth accounts) or qualifying for hardship exceptions.
              </BodyBase>
            </div>
          </div>
        </div>
      )}

      {/* RMD Warning for users 73+ */}
      {isRetirementAccount && sourceAccountType === "tax_deferred" && currentAge >= 73 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-orange-600">⚠️</span>
            </div>
            <div className="ml-3">
              <BodyBase weight="medium" className="text-orange-800">
                Required Minimum Distribution (RMD) Notice
              </BodyBase>
              <BodyBase className="mt-1 text-orange-700">
                At age {currentAge}, you are required to take minimum distributions from tax-deferred retirement accounts starting at age 73. 
                Make sure your withdrawal amounts meet or exceed your RMD requirements to avoid IRS penalties (50% of the shortfall amount).
              </BodyBase>
            </div>
          </div>
        </div>
      )}

      {/* RMD Warning for users approaching 73 */}
      {isRetirementAccount && sourceAccountType === "tax_deferred" && currentAge >= 70 && currentAge < 73 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-600">📋</span>
            </div>
            <div className="ml-3">
              <BodyBase weight="medium" className="text-yellow-800">
                Upcoming RMD Requirement
              </BodyBase>
              <BodyBase className="mt-1 text-yellow-700">
                At age {currentAge}, you're approaching the RMD requirement age of 73. Consider planning for required minimum distributions 
                from your tax-deferred accounts to avoid penalties and manage your tax liability effectively.
              </BodyBase>
            </div>
          </div>
        </div>
      )}

      {isRetirementAccount && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-blue-600">💡</span>
            </div>
            <div className="ml-3">
              <BodyBase weight="medium" className="text-blue-800">
                Tax Implications for {sourceAccountType === "roth" ? "Roth" : "Traditional"} Accounts
              </BodyBase>
              <BodyBase className="mt-1 text-blue-700">
                {sourceAccountType === "roth" 
                  ? "Roth account withdrawals of contributions are tax and penalty-free. Earnings may be subject to taxes and penalties if withdrawn before age 59½ and the account hasn't been open for 5 years."
                  : "Traditional account withdrawals are generally taxable as ordinary income. Withdrawals before age 59½ may also incur a 10% penalty unless you qualify for an exception."
                }
              </BodyBase>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};