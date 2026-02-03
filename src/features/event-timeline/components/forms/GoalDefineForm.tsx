import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface GoalDefineFormProps {
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

const GOAL_TYPE_OPTIONS = [
  { value: "RETIREMENT", label: "Retirement" },
  { value: "MAJOR_PURCHASE", label: "Major Purchase" },
  { value: "EDUCATION", label: "Education" },
  { value: "EMERGENCY_FUND", label: "Emergency Fund" },
  { value: "CUSTOM", label: "Custom Goal" },
];

const PRIORITY_OPTIONS = [
  { value: "HIGH", label: "High Priority" },
  { value: "MEDIUM", label: "Medium Priority" },
  { value: "LOW", label: "Low Priority" },
];

const FUNDING_STRATEGY_OPTIONS = [
  { value: "deplete_specific_account", label: "Deplete Specific Account" },
  { value: "proportional_withdrawal", label: "Proportional Withdrawal" },
  { value: "cash_flow_priority", label: "Cash Flow Priority" },
  { value: "custom", label: "Custom Strategy" },
];

const ACCOUNT_TYPES = [
  { value: "cash", label: "Cash/Savings Account" },
  { value: "taxable", label: "Taxable Brokerage Account" },
  { value: "tax_deferred", label: "401(k)/403(b) - Tax Deferred" },
  { value: "roth", label: "Roth IRA/401(k) - Tax Free" },
];

export const GoalDefineForm: React.FC<GoalDefineFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  const { startYear, startMonth } = useStartDate();
  
  const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
    EventType.GOAL_DEFINE
  );

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

  const isFlexible = formData.isFlexible || false;
  const adjustForInflation = formData.adjustForInflation || false;

  return (
    <div className="space-y-6">
      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Goal Definition
        </H4>
        <div className="space-y-4">
          <Input
            label="Goal Name"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Retirement at 65, Buy House, Kids' College"
            error={getFieldError("description")}
          />
          
          <Select
            label="Goal Type"
            options={GOAL_TYPE_OPTIONS}
            value={formData.goalType || ""}
            onChange={(value) => onChange("goalType", value)}
            placeholder="Select goal type"
            error={getFieldError("goalType")}
          />

          <Select
            label="Goal Priority"
            options={PRIORITY_OPTIONS}
            value={formData.goalPriority || ""}
            onChange={(value) => onChange("goalPriority", value)}
            placeholder="Select priority level"
            error={getFieldError("goalPriority")}
            helperText="Priority affects funding order when resources are limited"
          />

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isFlexible"
              checked={isFlexible}
              onChange={(e) => onChange("isFlexible", e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <BodyBase as="label" htmlFor="isFlexible" className="text-text-secondary">
              This goal is flexible in timing and amount
            </BodyBase>
          </div>
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Target Amount & Timeline
        </H4>
        <div className="space-y-4">
          <Input
            label="Target Amount"
            type="text"
            value={formatNumberWithCommas(formData.targetAmount || "")}
            onChange={(e) =>
              onChange(
                "targetAmount",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="1,000,000"
            leftIcon={<span className="text-text-tertiary">$</span>}
            error={getFieldError("targetAmount")}
            helperText="Amount needed to achieve the goal"
          />

          <Input
            mode="year"
            label="Target Year"
            value={getYearMonth(formData.targetMonthOffset).year}
            onYearChange={(year) =>
              handleYearMonthChange(
                "targetMonthOffset",
                year,
                getYearMonth(formData.targetMonthOffset).month || "01"
              )
            }
            placeholder="2050"
            error={getFieldError("targetMonthOffset")}
            helperText="When you want to achieve this goal"
          />

          {isFlexible && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Minimum Amount"
                type="text"
                value={formatNumberWithCommas(formData.minimumAmount || "")}
                onChange={(e) =>
                  onChange(
                    "minimumAmount",
                    parseFormattedNumber((e.target as HTMLInputElement).value)
                  )
                }
                placeholder="750,000"
                leftIcon={<span className="text-text-tertiary">$</span>}
                error={getFieldError("minimumAmount")}
                helperText="Minimum acceptable amount"
              />

              <Input
                label="Maximum Amount"
                type="text"
                value={formatNumberWithCommas(formData.maximumAmount || "")}
                onChange={(e) =>
                  onChange(
                    "maximumAmount",
                    parseFormattedNumber((e.target as HTMLInputElement).value)
                  )
                }
                placeholder="1,500,000"
                leftIcon={<span className="text-text-tertiary">$</span>}
                error={getFieldError("maximumAmount")}
                helperText="Maximum desirable amount"
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="adjustForInflation"
              checked={adjustForInflation}
              onChange={(e) => onChange("adjustForInflation", e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <BodyBase as="label" htmlFor="adjustForInflation" className="text-text-secondary">
              Adjust target amount for inflation
            </BodyBase>
          </div>

          {adjustForInflation && (
            <Input
              label="Custom Inflation Rate (Optional)"
              type="number"
              step="0.01"
              value={formData.customInflationRate ? (formData.customInflationRate * 100) : ""}
              onChange={(e) =>
                onChange("customInflationRate", parseFloat((e.target as HTMLInputElement).value) / 100)
              }
              placeholder="3.0"
              rightIcon={<span className="text-text-tertiary">%</span>}
              helperText="Leave blank to use default inflation rate"
              error={getFieldError("customInflationRate")}
            />
          )}
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Funding Strategy
        </H4>
        <div className="space-y-4">
          <Select
            label="Funding Strategy"
            options={FUNDING_STRATEGY_OPTIONS}
            value={formData.fundingStrategy || ""}
            onChange={(value) => onChange("fundingStrategy", value)}
            placeholder="Select funding approach"
            error={getFieldError("fundingStrategy")}
            helperText="How this goal should be funded"
          />

          <Select
            label="Primary Source Account (Optional)"
            options={ACCOUNT_TYPES}
            value={formData.sourceAccountType || ""}
            onChange={(value) => onChange("sourceAccountType", value)}
            placeholder="Select primary funding account"
            error={getFieldError("sourceAccountType")}
            helperText="Main account to fund this goal from"
          />
        </div>
      </div>

      {/* Goal Planning Information */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-green-600">🎯</span>
          </div>
          <div className="ml-3">
            <BodyBase className="font-medium text-green-800">
              Goal Planning Best Practices
            </BodyBase>
            <BodyBase className="mt-1 text-green-700">
              • Set specific, measurable, and time-bound goals<br />
              • Consider inflation impact for long-term goals<br />
              • Prioritize goals to guide funding decisions<br />
              • Review and adjust goals as circumstances change<br />
              • Build flexibility into goals to adapt to market conditions
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};