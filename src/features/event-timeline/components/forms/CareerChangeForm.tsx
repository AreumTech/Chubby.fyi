import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H3, H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface CareerChangeFormProps {
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

const CHANGE_TYPE_OPTIONS = [
  { value: "job-change", label: "Job Change (Same Role)" },
  { value: "promotion", label: "Promotion" },
  { value: "career-switch", label: "Career Switch" },
  { value: "retirement", label: "Retirement" },
  { value: "unemployment", label: "Unemployment" },
  { value: "self-employment", label: "Self-Employment" },
];

const HEALTH_INSURANCE_OPTIONS = [
  { value: "improved", label: "Improved" },
  { value: "downgraded", label: "Downgraded" },
  { value: "lost", label: "Lost" },
  { value: "no-change", label: "No Change" },
];

export const CareerChangeForm: React.FC<CareerChangeFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  const { startYear, startMonth } = useStartDate();
  
  const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
    EventType.CAREER_CHANGE
  );

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

  const handleIncomeChange = (field: string, value: any) => {
    const currentIncomeChange = formData.incomeChange || { currentIncome: 0, newIncome: 0 };
    onChange("incomeChange", { ...currentIncomeChange, [field]: value });
  };

  const handleBenefitsChange = (field: string, value: any) => {
    const currentBenefitsChange = formData.benefitsChange || {};
    onChange("benefitsChange", { ...currentBenefitsChange, [field]: value });
  };

  const handleCostsChange = (field: string, value: any) => {
    const currentCosts = formData.costsAndExpenses || {};
    onChange("costsAndExpenses", { ...currentCosts, [field]: value });
  };

  const changeType = formData.changeType || "job-change";
  const isUnemployment = changeType === "unemployment";
  const isRetirement = changeType === "retirement";

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Career Change Details
        </H3>
        <div className="space-y-4">
          <Input
            label="Career Change Description"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Promotion to Senior Manager, Career Switch to Tech"
            error={getFieldError("description")}
          />
          
          <Select
            label="Change Type"
            options={CHANGE_TYPE_OPTIONS}
            value={changeType}
            onChange={(value) => onChange("changeType", value)}
            error={getFieldError("changeType")}
          />

          <Input
            label="Effective Year"
            type="number"
            value={getYearMonth(formData.effectiveDate).year}
            onChange={(e) =>
              handleYearMonthChange(
                "effectiveDate",
                (e.target as HTMLInputElement).value,
                getYearMonth(formData.effectiveDate).month || "01"
              )
            }
            placeholder="2025"
            error={getFieldError("effectiveDate")}
            helperText="When the career change takes effect"
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Income Impact
        </H3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Current Annual Income"
              type="text"
              value={formatNumberWithCommas(formData.incomeChange?.currentIncome || "")}
              onChange={(e) =>
                handleIncomeChange(
                  "currentIncome",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="80,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              error={getFieldError("incomeChange.currentIncome")}
            />

            <Input
              label={isRetirement ? "Retirement Income" : "New Annual Income"}
              type="text"
              value={formatNumberWithCommas(formData.incomeChange?.newIncome || "")}
              onChange={(e) =>
                handleIncomeChange(
                  "newIncome",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder={isRetirement ? "0" : "95,000"}
              leftIcon={<span className="text-text-tertiary">$</span>}
              error={getFieldError("incomeChange.newIncome")}
            />
          </div>

          <Input
            label="Change Reason (Optional)"
            value={formData.incomeChange?.changeReason || ""}
            onChange={(e) =>
              handleIncomeChange("changeReason", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Market-rate adjustment, Performance bonus"
            error={getFieldError("incomeChange.changeReason")}
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Benefits & Compensation Changes
        </H3>
        <div className="space-y-4">
          <Select
            label="Health Insurance Change"
            options={HEALTH_INSURANCE_OPTIONS}
            value={formData.benefitsChange?.healthInsuranceChange || ""}
            onChange={(value) => handleBenefitsChange("healthInsuranceChange", value)}
            placeholder="Select health insurance impact"
            error={getFieldError("benefitsChange.healthInsuranceChange")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Retirement Match Change"
              type="number"
              step="0.1"
              value={formData.benefitsChange?.retirementMatchChange || ""}
              onChange={(e) =>
                handleBenefitsChange("retirementMatchChange", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="3.0"
              rightIcon={<span className="text-text-tertiary">%</span>}
              error={getFieldError("benefitsChange.retirementMatchChange")}
              helperText="Change in employer 401k match percentage"
            />

            <Input
              label="Stock Options/RSUs Granted"
              type="text"
              value={formatNumberWithCommas(formData.benefitsChange?.stockOptionsGranted || "")}
              onChange={(e) =>
                handleBenefitsChange(
                  "stockOptionsGranted",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="25,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              error={getFieldError("benefitsChange.stockOptionsGranted")}
              helperText="Value of new equity compensation"
            />
          </div>

          <Input
            label="Bonus Structure Change (Optional)"
            value={formData.benefitsChange?.bonusStructureChange || ""}
            onChange={(e) =>
              handleBenefitsChange("bonusStructureChange", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Annual bonus increased from 10% to 15%"
            error={getFieldError("benefitsChange.bonusStructureChange")}
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
          Costs & Transition Expenses
        </H3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Job Search Costs"
              type="text"
              value={formatNumberWithCommas(formData.costsAndExpenses?.jobSearchCosts || "")}
              onChange={(e) =>
                handleCostsChange(
                  "jobSearchCosts",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="2,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              error={getFieldError("costsAndExpenses.jobSearchCosts")}
              helperText="Resume, networking, interview costs"
            />

            <Input
              label="Relocation Costs"
              type="text"
              value={formatNumberWithCommas(formData.costsAndExpenses?.relocationCosts || "")}
              onChange={(e) =>
                handleCostsChange(
                  "relocationCosts",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="15,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              error={getFieldError("costsAndExpenses.relocationCosts")}
              helperText="Moving expenses if applicable"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Education/Training Costs"
              type="text"
              value={formatNumberWithCommas(formData.costsAndExpenses?.educationCosts || "")}
              onChange={(e) =>
                handleCostsChange(
                  "educationCosts",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="5,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              error={getFieldError("costsAndExpenses.educationCosts")}
              helperText="Certification, training, education costs"
            />

            {isUnemployment && (
              <Input
                label="Expected Unemployment Duration"
                type="number"
                value={formData.costsAndExpenses?.unemploymentDuration || ""}
                onChange={(e) =>
                  handleCostsChange("unemploymentDuration", parseInt((e.target as HTMLInputElement).value))
                }
                placeholder="3"
                rightIcon={<span className="text-text-tertiary">months</span>}
                error={getFieldError("costsAndExpenses.unemploymentDuration")}
                helperText="Expected months without income"
              />
            )}
          </div>
        </div>
      </div>

      {/* Career Change Information */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-green-600">💼</span>
          </div>
          <div className="ml-3">
            <H4 color="success">
              Career Change Considerations
            </H4>
            <BodyBase color="success" className="mt-1">
              • Update emergency fund to cover potential income gaps<br />
              • Review and adjust retirement contributions based on new benefits<br />
              • Consider tax implications of income changes and equity compensation<br />
              • Update beneficiaries on new employer retirement accounts<br />
              • Plan for COBRA or health insurance transitions if needed
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};