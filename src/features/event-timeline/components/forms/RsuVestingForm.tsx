import React, { useEffect, useState } from "react";
import { Input, Select } from "@/components/ui";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation, advancedValidationRules } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";
import { logger } from '@/utils/logger';
import { H3, H4, BodyBase } from "@/components/ui/Typography";

interface RsuVestingFormProps {
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

const FREQUENCY_OPTIONS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUALLY", label: "Annually" },
  { value: "ONE_TIME", label: "One Time" },
];

export const RsuVestingForm: React.FC<RsuVestingFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  const { startYear, startMonth } = useStartDate();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const { hasFieldError, getFieldError, validateForm, hasFieldWarning, getFieldWarning } = useEventFormValidation(
    EventType.RSU_VESTING
  );

  // Enhanced validation with business logic
  useEffect(() => {
    try {
      setIsLoading(true);
      const validation = validateForm(formData);
      
      // Add advanced validations
      const advancedErrors: Record<string, string> = {};
      
      // Check RSU value requirement
      const rsuValidation = advancedValidationRules.rsuValueRequired();
      const rsuError = rsuValidation.validate(null, formData);
      if (rsuError) {
        advancedErrors['rsuValue'] = rsuError;
      }
      
      // Check tax withholding reasonableness
      if (formData.taxWithholdingRate) {
        const taxValidation = advancedValidationRules.reasonableTaxWithholding();
        const taxWarning = taxValidation.validate(formData.taxWithholdingRate, formData);
        if (taxWarning) {
          advancedErrors['taxWithholdingRate'] = taxWarning;
        }
      }
      
      const allErrors = { ...validation.errors, ...advancedErrors };
      setFormErrors(allErrors);
      onValidationChange?.(Object.keys(allErrors).length === 0, allErrors);
      
    } catch (error) {
      logger.error('RSU form validation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      setFormErrors({ general: errorMessage });
      onValidationChange?.(false, { general: errorMessage });
    } finally {
      setIsLoading(false);
    }
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

  const frequency = formData.frequency || "QUARTERLY";
  const isOneTime = frequency === "ONE_TIME";

  return (
    <div className="space-y-6">
      <div>
        <H3 weight="semibold" className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          RSU Vesting Details
        </H3>
        <div className="space-y-4">
          <Input
            label="Description"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., AAPL RSU Quarterly Vesting"
            error={getFieldError("description")}
          />
          
          <Input
            label="Company Symbol"
            value={formData.symbol || ""}
            onChange={(e) =>
              onChange("symbol", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., AAPL, MSFT, GOOGL"
            error={getFieldError("symbol")}
            helperText="Stock ticker symbol"
          />

          <Select
            label="Target Account"
            options={ACCOUNT_TYPES}
            value={formData.targetAccountType || ""}
            onChange={(value) => onChange("targetAccountType", value)}
            placeholder="Select account for vested shares"
            error={getFieldError("targetAccountType")}
            helperText="Account where vested shares will be deposited"
          />

          <Select
            label="Vesting Frequency"
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={(value) => onChange("frequency", value)}
            error={getFieldError("frequency")}
          />
        </div>
      </div>

      <div>
        <H3 weight="semibold" className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Vesting Schedule & Value
        </H3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Number of Shares"
              type="text"
              value={formatNumberWithCommas(formData.shares || "")}
              onChange={(e) =>
                onChange(
                  "shares",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="1,000"
              error={getFieldError("shares")}
              helperText="Shares vesting per period"
            />

            <Input
              label="Share Price (Optional)"
              type="text"
              value={formatNumberWithCommas(formData.sharePrice || "")}
              onChange={(e) =>
                onChange(
                  "sharePrice",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="150.00"
              leftIcon={<span className="text-text-tertiary">$</span>}
              error={getFieldError("sharePrice")}
              helperText="Current/expected share price"
            />
          </div>

          <Input
            label="Total Value (if shares/price not specified)"
            type="text"
            value={formatNumberWithCommas(formData.totalValue || "")}
            onChange={(e) =>
              onChange(
                "totalValue",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="150,000"
            leftIcon={<span className="text-text-tertiary">$</span>}
            error={getFieldError("totalValue")}
            helperText="Total value of vesting if exact shares/price unknown"
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
            {!isOneTime && (
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

          <Input
            label="Tax Withholding Rate"
            type="number"
            step="0.01"
            value={formData.taxWithholdingRate ? (formData.taxWithholdingRate * 100) : ""}
            onChange={(e) =>
              onChange("taxWithholdingRate", parseFloat((e.target as HTMLInputElement).value) / 100)
            }
            placeholder="22"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Percentage of vesting value withheld for taxes"
            error={getFieldError("taxWithholdingRate")}
          />
        </div>
      </div>

      {/* RSU Vesting Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-600">📈</span>
          </div>
          <div className="ml-3">
            <H4 className="text-blue-800">
              RSU Vesting Considerations
            </H4>
            <BodyBase className="mt-1 text-blue-700">
              • RSUs become taxable income at vesting, not when sold<br />
              • Consider tax withholding to avoid underpayment penalties<br />
              • Vested shares can be sold immediately or held for potential appreciation<br />
              • Holding vested shares creates concentration risk in your employer
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};