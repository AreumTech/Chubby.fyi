import React, { useEffect } from "react";
import { Input } from "@/components/ui";
import { H4, BodyBase, Caption } from "@/components/ui/Typography";
import { RentalIncomeEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface RentalIncomeFormProps {
  formData: Partial<RentalIncomeEvent>;
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

export const RentalIncomeForm: React.FC<RentalIncomeFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
    EventType.RENTAL_INCOME
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  const getYearMonth = (offset?: number) => {
    if (offset === undefined) return { year: "", month: "" };
    const result = getCalendarYearAndMonthFromMonthOffset(
      baseYear,
      baseMonth,
      offset,
      currentAge
    );
    return {
      year: result.year.toString(),
      month: result.monthInYear.toString().padStart(2, "0"),
    };
  };

  const startYearMonth = getYearMonth(formData.startDateOffset);
  const endYearMonth = getYearMonth(formData.endDateOffset);

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
      {/* Basic Information */}
      <div className="space-y-4">
        <H4>
          Rental Income Details
        </H4>

        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Property Name/Description"
            type="text"
            value={formData.source || ""}
            onChange={(e) => onChange("source", e.target.value)}
            placeholder="e.g., 'Main Street Duplex', 'Vacation Rental'"
            required
            error={hasFieldError("source") ? getFieldError("source") : undefined}
          />

          <Input
            label="Monthly Rental Income"
            type="text"
            value={formatNumberWithCommas(formData.amount)}
            onChange={(e) => {
              handleAmountChange(e.target.value);
              // Ensure frequency is set to monthly for rental income
              if (!formData.frequency) {
                onChange("frequency", "monthly");
              }
            }}
            placeholder="$2,500"
            required
            error={hasFieldError("amount") ? getFieldError("amount") : undefined}
            helperText="Monthly rental income - will be kept as monthly for simulation"
          />

          <div className="flex items-center space-x-2">
            <input
              id="isNet"
              type="checkbox"
              checked={formData.isNet || false}
              onChange={(e) => onChange("isNet", e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <label htmlFor="isNet" className="text-sm text-gray-700">
              This amount is after all expenses (net income)
            </label>
          </div>
        </div>
      </div>

      {/* Timing */}
      <div className="space-y-4">
        <H4>Income Timeline</H4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={startYearMonth.month}
                onChange={(e) =>
                  onDateChange("startDateOffset", startYearMonth.year, e.target.value)
                }
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Month</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={(i + 1).toString().padStart(2, "0")}>
                    {new Date(2024, i).toLocaleDateString("en-US", {
                      month: "short",
                    })}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={startYearMonth.year}
                onChange={(e) =>
                  onDateChange("startDateOffset", e.target.value, startYearMonth.month)
                }
                placeholder="Year"
                min="2020"
                max="2100"
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date (Optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={endYearMonth.month}
                onChange={(e) =>
                  onDateChange("endDateOffset", endYearMonth.year, e.target.value)
                }
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Month</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={(i + 1).toString().padStart(2, "0")}>
                    {new Date(2024, i).toLocaleDateString("en-US", {
                      month: "short",
                    })}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={endYearMonth.year}
                onChange={(e) =>
                  onDateChange("endDateOffset", e.target.value, endYearMonth.month)
                }
                placeholder="Year"
                min="2020"
                max="2100"
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Growth Settings */}
      <div className="space-y-4">
        <H4>Growth Settings</H4>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <Input
              label="Annual Growth Rate (%)"
              type="number"
              value={((formData.annualGrowthRate || 0) * 100).toString()}
              onChange={(e) => handleGrowthRateChange(e.target.value)}
              placeholder="3.0"
              step="0.1"
            />
            <Caption color="tertiary" className="mt-1">
              Expected annual increase in rental income (e.g., 3% for inflation adjustments)
            </Caption>
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="space-y-4">
        <H4>Additional Details</H4>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={formData.description || ""}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder="Additional notes about this rental property..."
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};