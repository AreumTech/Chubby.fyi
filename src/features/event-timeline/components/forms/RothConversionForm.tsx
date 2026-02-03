import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";
import { HelpIcon, LabelWithHelp } from "@/components/HelpTooltip";

interface RothConversionFormProps {
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
  { value: "tax_deferred", label: "Traditional IRA/401(k)" },
  { value: "taxable", label: "Taxable Account" },
];

const TARGET_ACCOUNT_TYPES = [
  { value: "roth", label: "Roth IRA" },
];

export const RothConversionForm: React.FC<RothConversionFormProps> = ({
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
    EventType.ROTH_CONVERSION
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Set default account types
  useEffect(() => {
    if (!formData.accountType) {
      onChange("accountType", "tax_deferred"); // Default source
    }
  }, [formData.accountType, onChange]);

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
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Roth Conversion Details
          <HelpIcon concept="rothConversion" className="ml-2" />
        </H4>
        <div className="space-y-4">
          <Input
            label="Conversion Description"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Annual Roth Conversion, Tax Optimization"
            error={getFieldError("description")}
          />

          <Input
            label="Conversion Date"
            type="month"
            value={`${getYearMonth(formData.monthOffset).year}-${getYearMonth(formData.monthOffset).month}`}
            onChange={(e) => {
              const [year, month] = (e.target as HTMLInputElement).value.split("-");
              handleYearMonthChange("monthOffset", year, month);
            }}
            error={getFieldError("monthOffset")}
            helperText="When to perform the conversion"
          />
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Conversion Amount
        </H4>
        <div className="space-y-4">
          <Input
            label="Conversion Amount"
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
            helperText="Amount to convert from traditional to Roth"
          />
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Account Transfer
        </H4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="From Account"
              options={SOURCE_ACCOUNT_TYPES}
              value={formData.accountType || "tax_deferred"}
              onChange={(value) => onChange("accountType", value)}
              error={getFieldError("accountType")}
              helperText="Source of funds"
            />
            
            <div>
              <label className="input-label">To Account</label>
              <div className="input bg-gray-50 text-gray-600 cursor-not-allowed">
                Roth IRA
              </div>
              <Caption color="tertiary" className="mt-1">Destination is always Roth</Caption>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-600">💡</span>
          </div>
          <div className="ml-3">
            <BodyBase weight="medium" className="text-blue-800">
              Tax Implications
            </BodyBase>
            <BodyBase className="mt-1 text-blue-700">
              Roth conversions are taxable events. The converted amount will be added
              to your taxable income for the year. Consider your tax bracket and timing carefully.
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};