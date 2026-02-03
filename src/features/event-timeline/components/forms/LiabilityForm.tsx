import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H4, BodyBase } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface LiabilityFormProps {
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

const LIABILITY_TYPES = [
  { value: "MORTGAGE", label: "Mortgage" },
  { value: "STUDENT_LOAN", label: "Student Loan" },
  { value: "AUTO_LOAN", label: "Auto Loan" },
  { value: "PERSONAL_LOAN", label: "Personal Loan" },
];

export const LiabilityForm: React.FC<LiabilityFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
    EventType.LIABILITY_ADD
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

  const handleLiabilityDetailChange = (field: string, value: any) => {
    const currentDetails = formData.liabilityDetails || {};
    onChange("liabilityDetails", {
      ...currentDetails,
      [field]: value,
    });
  };

  const liabilityDetails = formData.liabilityDetails || {};
  const selectedType = liabilityDetails.type;
  const isTaxDeductibleRelevant = selectedType === "MORTGAGE";

  return (
    <div className="space-y-6">
      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
          Liability Information
        </H4>
        <div className="space-y-4">
          <Input
            label="Liability Name"
            value={liabilityDetails.name || ""}
            onChange={(e) =>
              handleLiabilityDetailChange("name", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Primary Mortgage, Student Loan"
            error={getFieldError("liabilityDetails.name")}
          />
          
          <Select
            label="Liability Type"
            options={LIABILITY_TYPES}
            value={liabilityDetails.type || ""}
            onChange={(value) => handleLiabilityDetailChange("type", value)}
            placeholder="Select liability type"
            error={getFieldError("liabilityDetails.type")}
          />

          <Input
            label="Origination Date"
            type="month"
            value={`${getYearMonth(formData.monthOffset).year}-${getYearMonth(formData.monthOffset).month}`}
            onChange={(e) => {
              const [year, month] = (e.target as HTMLInputElement).value.split("-");
              handleYearMonthChange("monthOffset", year, month);
            }}
            error={getFieldError("monthOffset")}
            helperText="When you will take on this debt"
          />
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
          Loan Terms
        </H4>
        <div className="space-y-4">
          <Input
            label="Initial Principal"
            type="text"
            value={formatNumberWithCommas(liabilityDetails.initialPrincipal || "")}
            onChange={(e) =>
              handleLiabilityDetailChange(
                "initialPrincipal",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="750,000"
            error={getFieldError("liabilityDetails.initialPrincipal")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Original loan amount"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Interest Rate"
              type="number"
              step="0.01"
              value={liabilityDetails.interestRate || ""}
              onChange={(e) =>
                handleLiabilityDetailChange("interestRate", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="6.5"
              error={getFieldError("liabilityDetails.interestRate")}
              rightIcon={<span className="text-text-tertiary">%</span>}
              helperText="Annual interest rate"
            />

            <Input
              label="Term (Years)"
              type="number"
              value={liabilityDetails.termMonths ? Math.round(liabilityDetails.termMonths / 12) : ""}
              onChange={(e) =>
                handleLiabilityDetailChange("termMonths", parseInt((e.target as HTMLInputElement).value) * 12)
              }
              placeholder="30"
              error={getFieldError("liabilityDetails.termMonths")}
              helperText="Loan term in years"
            />
          </div>

          {isTaxDeductibleRelevant && (
            <div className="flex items-center space-x-3">
              <input
                id="taxDeductible"
                type="checkbox"
                checked={liabilityDetails.isTaxDeductible || false}
                onChange={(e) =>
                  handleLiabilityDetailChange("isTaxDeductible", e.target.checked)
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <BodyBase as="label" htmlFor="taxDeductible" className="text-text-secondary">
                Interest is tax deductible (mortgage interest deduction)
              </BodyBase>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};