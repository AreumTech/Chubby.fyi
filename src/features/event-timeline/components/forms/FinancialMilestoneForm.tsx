import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H3, H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface FinancialMilestoneFormProps {
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

const MILESTONE_TYPE_OPTIONS = [
  { value: "NET_WORTH_CHECK", label: "Net Worth Check" },
  { value: "RETIREMENT_READINESS", label: "Retirement Readiness" },
  { value: "DEBT_PAYOFF", label: "Debt Payoff" },
  { value: "SAVINGS_RATE", label: "Savings Rate" },
  { value: "CUSTOM", label: "Custom Milestone" },
];

const COMPARISON_METRIC_OPTIONS = [
  { value: "NET_WORTH", label: "Net Worth" },
  { value: "PORTFOLIO_VALUE", label: "Portfolio Value" },
  { value: "LIQUID_ASSETS", label: "Liquid Assets" },
  { value: "DEBT_BALANCE", label: "Debt Balance" },
  { value: "ANNUAL_INCOME", label: "Annual Income" },
];

const MISSED_ACTION_OPTIONS = [
  { value: "NOTIFY_ONLY", label: "Notify Only" },
  { value: "ADJUST_PLAN", label: "Adjust Plan" },
  { value: "INCREASE_SAVINGS", label: "Increase Savings" },
  { value: "EXTEND_TIMELINE", label: "Extend Timeline" },
];

const ACCOUNT_TYPES = [
  { value: "cash", label: "Cash/Savings Account" },
  { value: "taxable", label: "Taxable Brokerage Account" },
  { value: "tax_deferred", label: "401(k)/403(b) - Tax Deferred" },
  { value: "roth", label: "Roth IRA/401(k) - Tax Free" },
];

export const FinancialMilestoneForm: React.FC<FinancialMilestoneFormProps> = ({
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
    EventType.FINANCIAL_MILESTONE
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

  const milestoneType = formData.milestoneType || "NET_WORTH_CHECK";
  const comparisonMetric = formData.comparisonMetric || "NET_WORTH";
  const includeSpecificAccounts = formData.accountTypes && formData.accountTypes.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Milestone Definition
        </H3>
        <div className="space-y-4">
          <Input
            label="Milestone Name"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., $1M Net Worth Check, Retirement Readiness at 60"
            error={getFieldError("description")}
          />
          
          <Select
            label="Milestone Type"
            options={MILESTONE_TYPE_OPTIONS}
            value={milestoneType}
            onChange={(value) => onChange("milestoneType", value)}
            error={getFieldError("milestoneType")}
            helperText="Type of financial milestone to track"
          />

          <Select
            label="Comparison Metric"
            options={COMPARISON_METRIC_OPTIONS}
            value={comparisonMetric}
            onChange={(value) => onChange("comparisonMetric", value)}
            error={getFieldError("comparisonMetric")}
            helperText="What to measure for this milestone"
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Target & Timeline
        </H3>
        <div className="space-y-4">
          <Input
            label="Target Value"
            type="text"
            value={formatNumberWithCommas(formData.targetValue || "")}
            onChange={(e) =>
              onChange(
                "targetValue",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="1,000,000"
            leftIcon={<span className="text-text-tertiary">$</span>}
            error={getFieldError("targetValue")}
            helperText="Target amount for this milestone"
          />

          <Input
            label="Evaluation Year"
            type="number"
            value={getYearMonth(formData.evaluationDateOffset).year}
            onChange={(e) =>
              handleYearMonthChange(
                "evaluationDateOffset",
                (e.target as HTMLInputElement).value,
                getYearMonth(formData.evaluationDateOffset).month || "01"
              )
            }
            placeholder="2035"
            error={getFieldError("evaluationDateOffset")}
            helperText="When to check if milestone is achieved"
          />

          <Input
            label="Tolerance Percentage (Optional)"
            type="number"
            step="0.1"
            value={formData.tolerancePercentage ? (formData.tolerancePercentage * 100) : ""}
            onChange={(e) =>
              onChange("tolerancePercentage", parseFloat((e.target as HTMLInputElement).value) / 100)
            }
            placeholder="5"
            rightIcon={<span className="text-text-tertiary">%</span>}
            error={getFieldError("tolerancePercentage")}
            helperText="Acceptable range below target (e.g., 95% of target)"
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Scope & Actions
        </H3>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeSpecificAccounts"
              checked={includeSpecificAccounts}
              onChange={(e) => {
                if (!e.target.checked) {
                  onChange("accountTypes", []);
                }
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="includeSpecificAccounts" className="text-sm text-gray-700">
              Limit to specific accounts (otherwise uses all accounts)
            </label>
          </div>

          {includeSpecificAccounts && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Accounts to Include in Calculation
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ACCOUNT_TYPES.map((account) => (
                  <div key={account.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={account.value}
                      checked={(formData.accountTypes || []).includes(account.value)}
                      onChange={(e) => {
                        const currentTypes = formData.accountTypes || [];
                        const newTypes = e.target.checked
                          ? [...currentTypes, account.value]
                          : currentTypes.filter(type => type !== account.value);
                        onChange("accountTypes", newTypes);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor={account.value} className="text-sm text-gray-700">
                      {account.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Select
            label="Action if Milestone Not Met"
            options={MISSED_ACTION_OPTIONS}
            value={formData.missedMilestoneAction || ""}
            onChange={(value) => onChange("missedMilestoneAction", value)}
            placeholder="Select action for missed milestone"
            error={getFieldError("missedMilestoneAction")}
            helperText="What to do if milestone is not achieved"
          />
        </div>
      </div>

      {/* Financial Milestone Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-600">🏆</span>
          </div>
          <div className="ml-3">
            <H4 color="info">
              Financial Milestone Best Practices
            </H4>
            <BodyBase color="info" className="mt-1">
              • Set milestones at key life stages (age 30, 40, 50, etc.)<br />
              • Use milestones to track progress toward major goals<br />
              • Include tolerance to account for market volatility<br />
              • Review and adjust milestones as circumstances change<br />
              • Celebrate achievements to maintain motivation
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};
