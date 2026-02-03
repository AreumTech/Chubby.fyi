import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H3, H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface DisabilityInsurancePremiumFormProps {
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

const DISABILITY_TYPE_OPTIONS = [
  { value: "short_term", label: "Short-term Disability (STD)" },
  { value: "long_term", label: "Long-term Disability (LTD)" },
  { value: "both", label: "Both STD & LTD Coverage" },
];

const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

const ACCOUNT_TYPE_OPTIONS = [
  { value: "cash", label: "Cash/Checking" },
  { value: "taxable", label: "Taxable Investment Account" },
];

const COVERAGE_SOURCE_OPTIONS = [
  { value: "individual", label: "Individual Policy" },
  { value: "employer", label: "Employer-Sponsored" },
  { value: "association", label: "Professional Association" },
  { value: "other", label: "Other" },
];

export const DisabilityInsurancePremiumForm: React.FC<DisabilityInsurancePremiumFormProps> = ({
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
    EventType.DISABILITY_INSURANCE_PREMIUM
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

  const frequency = formData.frequency || "monthly";
  const isAnnual = frequency === "annually";
  const isQuarterly = frequency === "quarterly";
  const disabilityType = formData.disabilityType || "long_term";

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Disability Insurance Policy Details
        </H3>
        <div className="space-y-4">
          <Input
            label="Policy Name"
            value={formData.policyName || ""}
            onChange={(e) =>
              onChange("policyName", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Short-term Disability, Long-term Disability"
            error={getFieldError("policyName")}
          />

          <Select
            label="Disability Type"
            options={DISABILITY_TYPE_OPTIONS}
            value={disabilityType}
            onChange={(value) => onChange("disabilityType", value)}
            placeholder="Select disability coverage type"
            error={getFieldError("disabilityType")}
            helperText="Type of disability insurance coverage"
          />

          <Select
            label="Coverage Source"
            options={COVERAGE_SOURCE_OPTIONS}
            value={formData.coverageSource || ""}
            onChange={(value) => onChange("coverageSource", value)}
            placeholder="Select coverage source"
            error={getFieldError("coverageSource")}
            helperText="How you obtain this coverage"
          />

          <Input
            label="Insurance Company"
            value={formData.insuranceCompany || ""}
            onChange={(e) =>
              onChange("insuranceCompany", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Guardian, Unum, MetLife"
            error={getFieldError("insuranceCompany")}
          />

          <Input
            label="Policy ID (Optional)"
            value={formData.policyId || ""}
            onChange={(e) =>
              onChange("policyId", (e.target as HTMLInputElement).value)
            }
            placeholder="Policy number or identifier"
            error={getFieldError("policyId")}
            helperText="Unique identifier for tracking policy"
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Premium Details
        </H3>
        <div className="space-y-4">
          <Select
            label="Payment Frequency"
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={(value) => onChange("frequency", value)}
            error={getFieldError("frequency")}
          />

          <Input
            label={`Premium Amount (${isAnnual ? "Annual" : isQuarterly ? "Quarterly" : "Monthly"})`}
            type="text"
            value={formatNumberWithCommas(formData.premiumAmount || "")}
            onChange={(e) =>
              onChange(
                "premiumAmount",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder={isAnnual ? "1,800" : isQuarterly ? "450" : "150"}
            error={getFieldError("premiumAmount")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText={`${isAnnual ? "Annual" : isQuarterly ? "Quarterly" : "Monthly"} premium payment`}
          />

          <Select
            label="Payment Source Account"
            options={ACCOUNT_TYPE_OPTIONS}
            value={formData.sourceAccountType || ""}
            onChange={(value) => onChange("sourceAccountType", value)}
            placeholder="Account to pay premiums from"
            error={getFieldError("sourceAccountType")}
            helperText="Account where premium payments will be deducted"
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
          Coverage Details
        </H3>
        <div className="space-y-4">
          <Input
            label="Monthly Benefit Amount"
            type="text"
            value={formatNumberWithCommas(formData.monthlyBenefit || "")}
            onChange={(e) =>
              onChange(
                "monthlyBenefit",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="3,000"
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Monthly disability benefit if claim occurs"
            error={getFieldError("monthlyBenefit")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Benefit Period (Years)"
              type="number"
              value={formData.benefitPeriodYears || ""}
              onChange={(e) =>
                onChange("benefitPeriodYears", parseInt((e.target as HTMLInputElement).value))
              }
              placeholder={disabilityType === "short_term" ? "1" : "10"}
              helperText={disabilityType === "short_term" ? "STD: typically 6 months - 2 years" : "LTD: typically 5 years to age 67"}
              error={getFieldError("benefitPeriodYears")}
            />
            <Input
              label="Elimination Period (Days)"
              type="number"
              value={formData.eliminationPeriodDays || ""}
              onChange={(e) =>
                onChange("eliminationPeriodDays", parseInt((e.target as HTMLInputElement).value))
              }
              placeholder={disabilityType === "short_term" ? "14" : "90"}
              helperText={disabilityType === "short_term" ? "STD: typically 0-14 days" : "LTD: typically 90-180 days"}
              error={getFieldError("eliminationPeriodDays")}
            />
          </div>
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Coverage Timeline
        </H3>
        <div className="space-y-4">
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
              placeholder="Leave blank for coverage until retirement"
              error={getFieldError("endDateOffset")}
            />
          </div>

          <Input
            label="Annual Premium Growth Rate"
            type="number"
            step="0.01"
            value={formData.annualGrowthRate || ""}
            onChange={(e) =>
              onChange("annualGrowthRate", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="3.0"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Expected annual increase in premium (typically 2-4%)"
            error={getFieldError("annualGrowthRate")}
          />
        </div>
      </div>

      {/* Disability Insurance Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-600">🛡️</span>
          </div>
          <div className="ml-3">
            <H4 color="info">
              Disability Insurance Types
            </H4>
            <BodyBase color="info" className="mt-1">
              <strong>Short-term:</strong> Covers initial disability period (weeks to 2 years)<br />
              <strong>Long-term:</strong> Covers extended disabilities (years to retirement age)<br />
              <strong>Coverage Amount:</strong> Typically 60-70% of gross income<br />
              <strong>Tax Treatment:</strong> Benefits taxable if employer pays premiums
            </BodyBase>
            <Caption color="info" className="mt-2">
              Individual policies generally provide tax-free benefits since you pay premiums with after-tax dollars.
            </Caption>
          </div>
        </div>
      </div>

      {/* Coverage Recommendations */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-amber-600">💡</span>
          </div>
          <div className="ml-3">
            <H4 color="warning">
              Coverage Recommendations
            </H4>
            <BodyBase color="warning" className="mt-1">
              • <strong>Coverage Amount:</strong> Aim for 60-70% of gross income replacement<br />
              • <strong>Elimination Period:</strong> Longer periods = lower premiums<br />
              • <strong>Benefit Period:</strong> Consider coverage to age 67 for long-term policies<br />
              • <strong>Riders:</strong> Consider cost-of-living adjustments and residual benefits
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};