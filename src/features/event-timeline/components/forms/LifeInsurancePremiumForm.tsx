import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H3, H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface LifeInsurancePremiumFormProps {
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

const INSURANCE_TYPE_OPTIONS = [
  { value: "term", label: "Term Life Insurance" },
  { value: "whole", label: "Whole Life Insurance" },
  { value: "universal", label: "Universal Life Insurance" },
  { value: "variable", label: "Variable Life Insurance" },
  { value: "other", label: "Other" },
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

export const LifeInsurancePremiumForm: React.FC<LifeInsurancePremiumFormProps> = ({
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
    EventType.LIFE_INSURANCE_PREMIUM
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

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Life Insurance Policy Details
        </H3>
        <div className="space-y-4">
          <Input
            label="Policy Name"
            value={formData.policyName || ""}
            onChange={(e) =>
              onChange("policyName", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Term Life Policy, Whole Life Policy"
            error={getFieldError("policyName")}
          />

          <Select
            label="Insurance Type"
            options={INSURANCE_TYPE_OPTIONS}
            value={formData.insuranceType || ""}
            onChange={(value) => onChange("insuranceType", value)}
            placeholder="Select insurance type"
            error={getFieldError("insuranceType")}
            helperText="Type of life insurance policy"
          />

          <Input
            label="Insurance Company"
            value={formData.insuranceCompany || ""}
            onChange={(e) =>
              onChange("insuranceCompany", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., State Farm, Prudential, MetLife"
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
            placeholder={isAnnual ? "2,400" : isQuarterly ? "600" : "200"}
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
              placeholder="Leave blank for permanent coverage"
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
            placeholder="2.0"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Expected annual increase in premium (typically 0-3%)"
            error={getFieldError("annualGrowthRate")}
          />

          <Input
            label="Death Benefit Amount"
            type="text"
            value={formatNumberWithCommas(formData.deathBenefit || "")}
            onChange={(e) =>
              onChange(
                "deathBenefit",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="500,000"
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Total death benefit coverage amount"
            error={getFieldError("deathBenefit")}
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Beneficiary Information
        </H3>
        <div className="space-y-4">
          <Input
            label="Primary Beneficiary"
            value={formData.primaryBeneficiary || ""}
            onChange={(e) =>
              onChange("primaryBeneficiary", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Spouse, Children, Estate"
            error={getFieldError("primaryBeneficiary")}
          />

          <Input
            label="Contingent Beneficiary (Optional)"
            value={formData.contingentBeneficiary || ""}
            onChange={(e) =>
              onChange("contingentBeneficiary", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Children, Trust, Charity"
            error={getFieldError("contingentBeneficiary")}
          />
        </div>
      </div>

      {/* Life Insurance Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-600">🛡️</span>
          </div>
          <div className="ml-3">
            <H4 color="info" className="text-blue-800">
              Life Insurance Types
            </H4>
            <BodyBase color="info" className="mt-1 text-blue-700">
              <strong>Term Life:</strong> Lower premiums, temporary coverage (10-30 years)<br />
              <strong>Whole Life:</strong> Higher premiums, permanent coverage with cash value<br />
              <strong>Universal Life:</strong> Flexible premiums and death benefits<br />
              <strong>Variable Life:</strong> Investment options within the policy
            </BodyBase>
            <Caption color="info" className="mt-2 text-blue-600">
              Death benefits are generally income tax-free to beneficiaries.
            </Caption>
          </div>
        </div>
      </div>
    </div>
  );
};