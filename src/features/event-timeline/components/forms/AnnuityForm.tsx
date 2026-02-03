import React, { useEffect } from "react";
import { Input } from "@/components/ui";
import { H3, H4, BodyBase } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

// Form data type - uses generic record to allow dynamic property access
type AnnuityFormData = Record<string, any>;

interface AnnuityFormProps {
  formData: AnnuityFormData;
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

export const AnnuityForm: React.FC<AnnuityFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
    EventType.ANNUITY_PAYMENT
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
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Annuity Information
        </H3>
        <div className="space-y-4">
          <Input
            label="Annuity Name"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Fixed Annuity Contract, Variable Annuity"
            error={getFieldError("description")}
          />

          <Input
            label="Insurance Company"
            value={formData.source || ""}
            onChange={(e) =>
              onChange("source", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Prudential, MetLife"
            error={getFieldError("source")}
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Payment Schedule
        </H3>
        <div className="space-y-4">
          <Input
            label="Monthly Payment Amount"
            type="text"
            value={formatNumberWithCommas(formData.amount || "")}
            onChange={(e) =>
              onChange(
                "amount",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="3,500"
            error={getFieldError("amount")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Monthly annuity payment"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Payment Year"
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
              label="Last Payment Year (Optional)"
              type="number"
              value={getYearMonth(formData.endDateOffset).year}
              onChange={(e) =>
                handleYearMonthChange(
                  "endDateOffset",
                  (e.target as HTMLInputElement).value,
                  getYearMonth(formData.endDateOffset).month || "01"
                )
              }
              placeholder="Leave blank for lifetime"
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
            placeholder="2.5"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Annual cost of living adjustment (COLA)"
            error={getFieldError("annualGrowthRate")}
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
          Tax Treatment
        </H3>
        <div className="space-y-4">
          <Input
            label="Taxable Portion"
            type="number"
            step="0.01"
            max="1.0"
            min="0.0"
            value={formData.taxablePortion || ""}
            onChange={(e) =>
              onChange("taxablePortion", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="0.85"
            helperText="Portion of payment that is taxable (0.0 = tax-free, 1.0 = fully taxable, 0.85 = 85% taxable)"
            error={getFieldError("taxablePortion")}
          />
        </div>
      </div>
    </div>
  );
};