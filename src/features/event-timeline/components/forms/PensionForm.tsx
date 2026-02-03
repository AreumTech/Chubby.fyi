import React from "react";
import { Input, Select } from "@/components/ui";
import { H3 } from "@/components/ui/Typography";
import { PensionIncomeEvent } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";

interface PensionFormProps {
  formData: Partial<PensionIncomeEvent>;
  onChange: (field: string, value: any) => void;
  onDateChange: (field: string, year: string, month: string) => void;
  baseYear?: number;
  baseMonth?: number;
  currentAge?: number;
}

export const PensionForm: React.FC<PensionFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
}) => {
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
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Pension Details
        </H3>
        <div className="space-y-4">
          <Input
            label="Pension Plan Name"
            value={formData.name || ""}
            onChange={(e) =>
              onChange("name", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., IBM Pension Plan"
          />
          <Input
            label="Source/Organization"
            value={formData.source || ""}
            onChange={(e) =>
              onChange("source", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., State of California Teachers' Retirement"
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
              placeholder="2030"
            />
          </div>
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Benefit Amount
        </H3>
        <div className="space-y-4">
          <Input
            label="Annual Pension Benefit"
            type="number"
            value={String(formData.amount || "")}
            onChange={(e) =>
              onChange(
                "amount",
                parseFloat((e.target as HTMLInputElement).value) || 0
              )
            }
            placeholder="36000"
            min="0"
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Annual pension benefit amount before taxes"
          />
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={formData.isColaAdjusted || false}
              onChange={(e) => onChange("isColaAdjusted", e.target.checked)}
            />
            <span className="text-sm">
              Apply Cost of Living Adjustments (COLA)
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};
