import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H3, H4, BodyBase } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface DisabilityInsurancePayoutFormProps {
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

const ACCOUNT_TYPE_OPTIONS = [
  { value: "cash", label: "Cash/Checking" },
  { value: "taxable", label: "Taxable Investment Account" },
];

const DISABILITY_SEVERITY_OPTIONS = [
  { value: "partial", label: "Partial Disability" },
  { value: "total", label: "Total Disability" },
  { value: "residual", label: "Residual Disability" },
];

const BENEFIT_TYPE_OPTIONS = [
  { value: "fixed", label: "Fixed Monthly Amount" },
  { value: "percentage", label: "Percentage of Income" },
  { value: "cost_of_living", label: "With Cost of Living Adjustments" },
];

export const DisabilityInsurancePayoutForm: React.FC<DisabilityInsurancePayoutFormProps> = ({
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
    EventType.DISABILITY_INSURANCE_PAYOUT
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Set default values based on typical disability insurance characteristics
  useEffect(() => {
    if (formData.taxable === undefined) {
      onChange("taxable", true); // Benefits typically taxable if employer paid premiums
    }
    if (!formData.benefitType) {
      onChange("benefitType", "fixed");
    }
    if (!formData.disabilitySeverity) {
      onChange("disabilitySeverity", "total");
    }
  }, [formData.taxable, formData.benefitType, formData.disabilitySeverity, onChange]);

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

  const benefitType = formData.benefitType || "fixed";
  const isPercentageBenefit = benefitType === "percentage";

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Disability Insurance Policy Information
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

          <Input
            label="Policy ID (Optional)"
            value={formData.policyId || ""}
            onChange={(e) =>
              onChange("policyId", (e.target as HTMLInputElement).value)
            }
            placeholder="Policy number linking to premium policy"
            error={getFieldError("policyId")}
            helperText="Should match the Policy ID from the premium event"
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
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
          Disability Details
        </H3>
        <div className="space-y-4">
          <Select
            label="Disability Severity"
            options={DISABILITY_SEVERITY_OPTIONS}
            value={formData.disabilitySeverity || ""}
            onChange={(value) => onChange("disabilitySeverity", value)}
            placeholder="Select disability type"
            error={getFieldError("disabilitySeverity")}
            helperText="Level of disability affecting work capacity"
          />

          <Input
            label="Disability Description"
            value={formData.disabilityDescription || ""}
            onChange={(e) =>
              onChange("disabilityDescription", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Back injury, Chronic illness, Mental health condition"
            error={getFieldError("disabilityDescription")}
            helperText="Brief description of the disability condition"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Elimination Period (Months)"
              type="number"
              step="0.1"
              value={formData.eliminationPeriodMonths || ""}
              onChange={(e) =>
                onChange("eliminationPeriodMonths", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="3"
              helperText="Waiting period before benefits begin"
              error={getFieldError("eliminationPeriodMonths")}
            />
            <Input
              label="Work Capacity Percentage"
              type="number"
              min="0"
              max="100"
              value={formData.workCapacityPercentage || ""}
              onChange={(e) =>
                onChange("workCapacityPercentage", parseInt((e.target as HTMLInputElement).value))
              }
              placeholder="0"
              rightIcon={<span className="text-text-tertiary">%</span>}
              helperText="Remaining work capacity (0% = total disability)"
              error={getFieldError("workCapacityPercentage")}
            />
          </div>
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Benefit Details
        </H3>
        <div className="space-y-4">
          <Select
            label="Benefit Type"
            options={BENEFIT_TYPE_OPTIONS}
            value={benefitType}
            onChange={(value) => onChange("benefitType", value)}
            placeholder="How benefits are calculated"
            error={getFieldError("benefitType")}
            helperText="Method of benefit calculation"
          />

          {isPercentageBenefit ? (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Pre-Disability Income"
                type="text"
                value={formatNumberWithCommas(formData.preDisabilityIncome || "")}
                onChange={(e) =>
                  onChange(
                    "preDisabilityIncome",
                    parseFormattedNumber((e.target as HTMLInputElement).value)
                  )
                }
                placeholder="60,000"
                leftIcon={<span className="text-text-tertiary">$</span>}
                helperText="Annual income before disability"
                error={getFieldError("preDisabilityIncome")}
              />
              <Input
                label="Benefit Percentage"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.benefitPercentage || ""}
                onChange={(e) =>
                  onChange("benefitPercentage", parseFloat((e.target as HTMLInputElement).value))
                }
                placeholder="60"
                rightIcon={<span className="text-text-tertiary">%</span>}
                helperText="Percentage of income replaced"
                error={getFieldError("benefitPercentage")}
              />
            </div>
          ) : (
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
              error={getFieldError("monthlyBenefit")}
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Fixed monthly disability benefit"
            />
          )}

          <Select
            label="Destination Account"
            options={ACCOUNT_TYPE_OPTIONS}
            value={formData.targetAccountType || ""}
            onChange={(value) => onChange("targetAccountType", value)}
            placeholder="Account to receive benefits"
            error={getFieldError("targetAccountType")}
            helperText="Account where benefits will be deposited"
          />

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.taxable || false}
                onChange={(e) => onChange("taxable", e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">
                Taxable Benefits
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Benefits are taxable if employer paid premiums, tax-free if you paid with after-tax dollars
            </p>
          </div>
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Benefit Timeline
        </H3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Disability Start Year"
              type="number"
              value={getYearMonth(formData.startDateOffset).year}
              onChange={(e) =>
                handleYearMonthChange(
                  "startDateOffset",
                  (e.target as HTMLInputElement).value,
                  getYearMonth(formData.startDateOffset).month || "01"
                )
              }
              placeholder="2030"
              error={getFieldError("startDateOffset")}
              helperText="When disability occurs"
            />
            <Input
              label="Disability Start Month"
              type="number"
              min="1"
              max="12"
              value={getYearMonth(formData.startDateOffset).month}
              onChange={(e) =>
                handleYearMonthChange(
                  "startDateOffset",
                  getYearMonth(formData.startDateOffset).year || "2030",
                  (e.target as HTMLInputElement).value
                )
              }
              placeholder="01"
              error={getFieldError("startDateOffset")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Benefit End Year (Optional)"
              type="number"
              value={getYearMonth(formData.endDateOffset).year}
              onChange={(e) =>
                handleYearMonthChange(
                  "endDateOffset",
                  (e.target as HTMLInputElement).value,
                  getYearMonth(formData.endDateOffset).month || "01"
                )
              }
              placeholder="Leave blank for benefits to retirement"
              error={getFieldError("endDateOffset")}
            />
            <Input
              label="Maximum Benefit Period (Years)"
              type="number"
              value={formData.maxBenefitPeriodYears || ""}
              onChange={(e) =>
                onChange("maxBenefitPeriodYears", parseInt((e.target as HTMLInputElement).value))
              }
              placeholder="10"
              helperText="Policy maximum benefit duration"
              error={getFieldError("maxBenefitPeriodYears")}
            />
          </div>

          <Input
            label="Annual Benefit Growth Rate (Optional)"
            type="number"
            step="0.01"
            value={formData.annualGrowthRate || ""}
            onChange={(e) =>
              onChange("annualGrowthRate", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="2.5"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Cost of living adjustments, if applicable"
            error={getFieldError("annualGrowthRate")}
          />
        </div>
      </div>

      {/* Disability Benefits Information Panel */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-orange-600">💡</span>
          </div>
          <div className="ml-3">
            <H4 color="warning">
              Disability Benefits Information
            </H4>
            <BodyBase color="warning" className="mt-1">
              <strong>Tax Treatment:</strong> Benefits taxable if employer paid premiums, tax-free if you paid<br />
              <strong>Benefit Amount:</strong> Typically 60-70% of pre-disability income<br />
              <strong>Elimination Period:</strong> Waiting time before benefits begin (0 days - 2 years)<br />
              <strong>Benefit Period:</strong> How long benefits continue (2 years to age 67)
            </BodyBase>
            <BodyBase color="warning" className="mt-2">
              Consider coordination with Social Security Disability and other benefits.
            </BodyBase>
          </div>
        </div>
      </div>

      {/* Return to Work Considerations */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-green-600">🔄</span>
          </div>
          <div className="ml-3">
            <H4 color="success">
              Return to Work & Recovery
            </H4>
            <BodyBase color="success" className="mt-1">
              <strong>Partial Benefits:</strong> May receive reduced benefits if returning to work part-time<br />
              <strong>Rehabilitation Benefits:</strong> Many policies include vocational rehabilitation<br />
              <strong>Recovery Scenarios:</strong> Benefits may decrease as work capacity improves
            </BodyBase>
          </div>
        </div>
      </div>

      {/* Scenario Planning Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-amber-600">⚠️</span>
          </div>
          <div className="ml-3">
            <H4 color="warning">
              Scenario Planning Note
            </H4>
            <BodyBase color="warning" className="mt-1">
              This payout event is typically used for "what-if" analysis to model
              the financial impact of a disability. Consider different disability
              scenarios (temporary vs. permanent) and their impact on your financial plan.
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};