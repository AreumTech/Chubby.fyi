import React, { useEffect } from "react";
import { Input } from "@/components/ui";
import { H4, BodyBase } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface HealthcareFormProps {
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

export const HealthcareForm: React.FC<HealthcareFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
    EventType.HEALTHCARE_COST
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Set default growth rate higher for healthcare costs (medical inflation)
  useEffect(() => {
    if (!formData.annualGrowthRate) {
      onChange("annualGrowthRate", 5.0); // Default to 5% medical inflation
    }
  }, [formData.annualGrowthRate, onChange]);

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
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
          Healthcare Cost Details
        </H4>
        <div className="space-y-4">
          <Input
            label="Healthcare Cost Name"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Health Insurance Premium, Medicare Supplement"
            error={getFieldError("description")}
          />

          <Input
            label="Category"
            value={formData.category || ""}
            onChange={(e) =>
              onChange("category", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Insurance, Medical, Dental, Long-term Care"
            error={getFieldError("category")}
          />
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
          Cost Schedule
        </H4>
        <div className="space-y-4">
          <Input
            label="Monthly Cost"
            type="text"
            value={formatNumberWithCommas(formData.amount || "")}
            onChange={(e) =>
              onChange(
                "amount",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="1,200"
            error={getFieldError("amount")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Monthly healthcare cost"
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
            value={formData.annualGrowthRate || 5.0}
            onChange={(e) =>
              onChange("annualGrowthRate", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="5.0"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Annual medical inflation rate (typically 4-7%)"
            error={getFieldError("annualGrowthRate")}
          />
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-yellow-600">⚠️</span>
          </div>
          <div className="ml-3">
            <BodyBase className="font-medium text-yellow-800">
              Healthcare Inflation
            </BodyBase>
            <BodyBase className="mt-1 text-yellow-700">
              Healthcare costs typically grow faster than general inflation. Consider using
              a higher growth rate (4-7%) compared to other expenses.
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};