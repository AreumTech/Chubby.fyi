import React, { useEffect } from "react";
import { Input } from "@/components/ui";
import { H3 } from "@/components/ui/Typography";
import { IncomeEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface IncomeEventFormProps {
  formData: Partial<IncomeEvent>;
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

export const IncomeEventForm: React.FC<IncomeEventFormProps> = ({
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
    EventType.INCOME
  );

  // Convert monthly income to annual for form display
  useEffect(() => {
    // If loading a monthly income event, convert amount to annual
    if (formData.frequency === 'monthly' && formData.amount) {
      const annualAmount = formData.amount * 12;
      onChange('amount', annualAmount);
      onChange('frequency', 'annually');
    } else if (!formData.frequency) {
      // Default to annually for new income events
      onChange('frequency', 'annually');
    }
  }, []); // Only run once on mount

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

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Basic Information
        </H3>
        <div className="space-y-4">
          <Input
            label="Job Title"
            value={formData.name || ""}
            onChange={(e) =>
              onChange("name", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Senior Software Engineer"
            error={getFieldError("name") || undefined}
          />
          <Input
            label="Company"
            value={formData.company || ""}
            onChange={(e) =>
              onChange("company", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Meta"
            error={getFieldError("company")}
          />
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
          </div>
        </div>
      </div>
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Compensation
        </H3>
        <div className="space-y-4">
          <Input
            label="W2 Income (Annual)"
            type="text"
            value={formatNumberWithCommas(formData.amount || "")}
            onChange={(e) => {
              const annualAmount = parseFormattedNumber((e.target as HTMLInputElement).value);
              onChange("amount", annualAmount);
              // Always ensure frequency is set to annually for income events
              onChange("frequency", "annually");
            }}
            placeholder="280,000"
            error={getFieldError("amount")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Total annual W2 income - will be converted to monthly for simulation"
          />
          <div className="mt-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.enableYearlyRaises !== false}
                onChange={(e) => onChange("enableYearlyRaises", e.target.checked)}
                className="rounded border-areum-border text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-areum-text-primary">
                Apply yearly raises (income grows with inflation)
              </span>
            </label>
            <p className="mt-1 text-xs text-areum-text-secondary ml-7">
              When enabled, income will automatically increase by the inflation rate each year
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
