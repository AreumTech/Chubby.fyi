import React, { useEffect } from "react";
import { Input } from "@/components/ui";
import { H3, H4, BodyBase } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface RelocationFormProps {
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

export const RelocationForm: React.FC<RelocationFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
    EventType.RELOCATION
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

  const handleStateTaxChange = (taxType: string, value: number) => {
    const currentTaxImpact = formData.stateTaxImpact || {
      incomeTaxChange: 0,
      salesTaxChange: 0,
      propertyTaxChange: 0,
    };
    
    onChange("stateTaxImpact", {
      ...currentTaxImpact,
      [taxType]: value,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Relocation Details
        </H3>
        <div className="space-y-4">
          <Input
            label="Relocation Description"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Job relocation from California to Texas"
            error={getFieldError("description")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="From State/Location"
              value={formData.fromState || ""}
              onChange={(e) =>
                onChange("fromState", (e.target as HTMLInputElement).value)
              }
              placeholder="e.g., California"
              error={getFieldError("fromState")}
            />
            <Input
              label="To State/Location"
              value={formData.toState || ""}
              onChange={(e) =>
                onChange("toState", (e.target as HTMLInputElement).value)
              }
              placeholder="e.g., Texas"
              error={getFieldError("toState")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Move Date Year"
              type="number"
              value={getYearMonth(formData.effectiveDate).year}
              onChange={(e) =>
                handleYearMonthChange(
                  "effectiveDate",
                  (e.target as HTMLInputElement).value,
                  getYearMonth(formData.effectiveDate).month || "01"
                )
              }
              placeholder="2024"
              error={getFieldError("effectiveDate")}
            />
            <Input
              label="Move Date Month"
              type="number"
              min="1"
              max="12"
              value={getYearMonth(formData.effectiveDate).month}
              onChange={(e) =>
                handleYearMonthChange(
                  "effectiveDate",
                  getYearMonth(formData.effectiveDate).year || "2024",
                  (e.target as HTMLInputElement).value.padStart(2, "0")
                )
              }
              placeholder="01"
              error={getFieldError("effectiveDate")}
            />
          </div>
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Financial Impact
        </H3>
        <div className="space-y-4">
          <Input
            label="One-Time Moving Costs"
            type="text"
            value={formatNumberWithCommas(formData.movingCosts || "")}
            onChange={(e) =>
              onChange(
                "movingCosts",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="15,000"
            error={getFieldError("movingCosts")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Packing, transportation, temporary housing, etc."
          />

          <Input
            label="Cost of Living Change"
            type="number"
            step="0.01"
            value={formData.costOfLivingChange || 0}
            onChange={(e) =>
              onChange("costOfLivingChange", parseFloat((e.target as HTMLInputElement).value) / 100)
            }
            placeholder="0"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Overall change in living expenses (positive = increase, negative = decrease)"
            error={getFieldError("costOfLivingChange")}
          />

          <Input
            label="Housing Cost Change (Optional)"
            type="text"
            value={formatNumberWithCommas(formData.housingCostChange || "")}
            onChange={(e) =>
              onChange(
                "housingCostChange",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="Optional: specific housing change"
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Monthly change in housing costs (overrides cost of living if provided)"
            error={getFieldError("housingCostChange")}
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Tax Impact Changes
        </H3>
        <div className="space-y-4">
          <Input
            label="Income Tax Rate Change"
            type="number"
            step="0.01"
            value={formData.stateTaxImpact?.incomeTaxChange || 0}
            onChange={(e) =>
              handleStateTaxChange("incomeTaxChange", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="0"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Percentage point change in effective income tax rate"
            error={getFieldError("stateTaxImpact.incomeTaxChange")}
          />

          <Input
            label="Sales Tax Rate Change"
            type="number"
            step="0.01"
            value={formData.stateTaxImpact?.salesTaxChange || 0}
            onChange={(e) =>
              handleStateTaxChange("salesTaxChange", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="0"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Percentage point change in sales tax rate"
            error={getFieldError("stateTaxImpact.salesTaxChange")}
          />

          <Input
            label="Property Tax Rate Change"
            type="number"
            step="0.01"
            value={formData.stateTaxImpact?.propertyTaxChange || 0}
            onChange={(e) =>
              handleStateTaxChange("propertyTaxChange", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="0"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Percentage point change in property tax rate"
            error={getFieldError("stateTaxImpact.propertyTaxChange")}
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-600">💡</span>
          </div>
          <div className="ml-3">
            <H4 color="info" className="text-blue-800">
              Relocation Planning Tips
            </H4>
            <BodyBase color="info" className="mt-1 text-blue-700" as="div">
              <ul className="list-disc list-inside space-y-1">
                <li>Research state income tax differences - some states have no income tax</li>
                <li>Consider property tax rates and home values in your new location</li>
                <li>Factor in sales tax differences for major purchases</li>
                <li>Account for cost of living changes in housing, utilities, and everyday expenses</li>
                <li>Don't forget moving expenses like temporary housing and travel costs</li>
              </ul>
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};