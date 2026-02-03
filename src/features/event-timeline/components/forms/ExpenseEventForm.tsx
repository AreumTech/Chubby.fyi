import React from "react";
import { Input, Select } from "@/components/ui";
import { H3 } from "@/components/ui/Typography";
import { RecurringExpenseEvent, OneTimeEvent } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface ExpenseEventFormProps {
  formData: Partial<RecurringExpenseEvent | OneTimeEvent>;
  onChange: (field: string, value: any) => void;
  onDateChange: (field: string, year: string, month: string) => void;
  isRecurring: boolean;
  baseYear?: number;
  baseMonth?: number;
  currentAge?: number;
  onValidationChange?: (
    isValid: boolean,
    errors: Record<string, string>
  ) => void;
}

export const ExpenseEventForm: React.FC<ExpenseEventFormProps> = ({
  formData,
  onChange,
  onDateChange,
  isRecurring,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  // Use centralized date settings
  const { startYear, startMonth } = useStartDate();
  
  // Validation only runs on save, not while typing

  const frequencyOptions = [
    { value: "monthly", label: "Monthly" },
    { value: "annually", label: "Annually" },
  ];

  const expenseCategories = [
    { value: "housing", label: "Housing & Utilities" },
    { value: "transportation", label: "Transportation" },
    { value: "food", label: "Food & Dining" },
    { value: "healthcare", label: "Healthcare & Medical" },
    { value: "insurance", label: "Insurance" },
    { value: "personal", label: "Personal & Family" },
    { value: "entertainment", label: "Entertainment & Recreation" },
    { value: "education", label: "Education" },
    { value: "travel", label: "Travel & Vacation" },
    { value: "charitable", label: "Charitable Giving" },
    { value: "taxes", label: "Taxes" },
    { value: "business", label: "Business Expenses" },
    { value: "other", label: "Other" },
  ];

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
    } else if (!year) {
      // Clear the field if year is empty
      onChange(field, undefined);
    }
  };

  const handleAmountChange = (value: string) => {
    const numericValue = parseFormattedNumber(value);
    onChange("amount", numericValue);
  };

  const handleGrowthRateChange = (value: string) => {
    const numericValue = parseFloat(value) / 100;
    onChange("annualGrowthRate", isNaN(numericValue) ? 0 : numericValue);
  };

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
          Expense Details
        </H3>
        <div className="space-y-4">
          <Input
            label="Description"
            value={formData.name || ""}
            onChange={(e) =>
              onChange("name", (e.target as HTMLInputElement).value)
            }
            placeholder={
              isRecurring ? "Monthly Living Expenses" : "One-time Purchase"
            }
          />
          <div className="grid grid-cols-2 gap-4">
            {isRecurring && (
              <Select
                label="Frequency"
                options={frequencyOptions}
                value={formData.frequency || "monthly"}
                onChange={(value) => onChange("frequency", value)}
              />
            )}
            <Input
              label={isRecurring ? `Amount (${formData.frequency === 'annually' ? 'Annual' : 'Monthly'})` : "Amount"}
              type="text"
              value={formatNumberWithCommas(formData.amount || "")}
              onChange={(e) => {
                const value = (e.target as HTMLInputElement).value;
                onChange("amount", parseFormattedNumber(value));
              }}
              placeholder={isRecurring ? (formData.frequency === 'annually' ? "42,000" : "3,500") : "50,000"}
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText={isRecurring ? `Enter the ${formData.frequency === 'annually' ? 'yearly' : 'monthly'} amount for this expense` : "One-time expense amount"}
            />
          </div>
          {isRecurring && (
            <Input
              label="Annual Growth Rate (%)"
              type="number"
              step="0.1"
              value={formData.annualGrowthRate !== undefined ? (formData.annualGrowthRate * 100).toFixed(1) : "3.0"}
              onChange={(e) => handleGrowthRateChange((e.target as HTMLInputElement).value)}
              placeholder="3.0"
              helperText="Rate at which this expense increases each year (default: 3% for inflation)"
            />
          )}
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Timeline
        </H3>
        <div className="space-y-4">
          {isRecurring ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  mode="year"
                  label="Start Year"
                  value={getYearMonth(formData.startDateOffset).year}
                  onYearChange={(year) =>
                    handleYearMonthChange(
                      "startDateOffset",
                      year,
                      getYearMonth(formData.startDateOffset).month || "01"
                    )
                  }
                  placeholder="2025"
                />
                <div>
                  <Input
                    mode="year"
                    label="End Year (Optional)"
                    value={getYearMonth(formData.endDateOffset).year}
                    onYearChange={(year) =>
                      handleYearMonthChange(
                        "endDateOffset",
                        year,
                        getYearMonth(formData.endDateOffset).month || "01"
                      )
                    }
                    placeholder="Leave blank for indefinite"
                  />
                  {formData.endDateOffset !== undefined && (
                    <button
                      type="button"
                      onClick={() => onChange("endDateOffset", undefined)}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Make indefinite
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <Input
              mode="year"
              label="Date (Year)"
              value={getYearMonth(formData.monthOffset).year}
              onYearChange={(year) =>
                handleYearMonthChange(
                  "monthOffset",
                  year,
                  getYearMonth(formData.monthOffset).month || "01"
                )
              }
              placeholder="2025"
            />
          )}
        </div>
      </div>
    </div>
  );
};
