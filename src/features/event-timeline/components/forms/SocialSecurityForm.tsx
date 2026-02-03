import React from "react";
import { Input, Select } from "@/components/ui";
import { H3, BodyBase } from "@/components/ui/Typography";
import { SocialSecurityIncomeEvent } from "@/types";
import {
  getCalendarYearAndMonthFromMonthOffset,
  getMonthOffsetFromCalendarYear,
} from "@/utils/financialCalculations";

interface SocialSecurityFormProps {
  formData: Partial<SocialSecurityIncomeEvent>;
  onChange: (field: string, value: any) => void;
  onDateChange: (field: string, year: string, month: string) => void;
  baseYear?: number;
  baseMonth?: number;
  currentAge?: number;
}

export const SocialSecurityForm: React.FC<SocialSecurityFormProps> = ({
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

  const convertClaimAgeToStartDateOffset = (claimAge: number): number => {
    const birthYear = baseYear - currentAge;
    const claimYear = birthYear + claimAge;
    return getMonthOffsetFromCalendarYear(claimYear, 1, baseYear, baseMonth);
  };

  const handleClaimAgeChange = (claimAge: number) => {
    onChange("claimAge", claimAge);
    const startDateOffset = convertClaimAgeToStartDateOffset(claimAge);
    onChange("startDateOffset", startDateOffset);
  };

  const recommendedClaimAge = currentAge < 50 ? 67 : 70;

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Social Security Benefits
        </H3>
        <div className="space-y-4">
          <Input
            label="Benefit Name"
            value={formData.name || ""}
            onChange={(e) =>
              onChange("name", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Social Security Retirement Benefits"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Claiming Age"
              value={String(formData.claimAge || recommendedClaimAge)}
              onChange={(value) => handleClaimAgeChange(parseInt(value))}
              options={[
                { value: "62", label: "62 (Early Retirement)" },
                { value: "67", label: "67 (Full Retirement Age)" },
                { value: "70", label: "70 (Maximum Benefits)" },
              ]}
              helperText={`Recommended: Age ${recommendedClaimAge}`}
            />
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
            label="Annual Benefit Amount"
            type="number"
            value={String(formData.amount || "")}
            onChange={(e) =>
              onChange(
                "amount",
                parseFloat((e.target as HTMLInputElement).value) || 0
              )
            }
            placeholder="45000"
            min="0"
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Estimated annual benefit at your chosen claiming age"
          />
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={formData.isColaAdjusted || false}
              onChange={(e) => onChange("isColaAdjusted", e.target.checked)}
            />
            <BodyBase>
              Apply Cost of Living Adjustments (COLA)
            </BodyBase>
          </label>
        </div>
      </div>
    </div>
  );
};
