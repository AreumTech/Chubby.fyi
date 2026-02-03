import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H3, H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface LongTermCareInsurancePremiumFormProps {
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

const POLICY_TYPE_OPTIONS = [
  { value: "traditional", label: "Traditional LTC Insurance" },
  { value: "hybrid_life", label: "Hybrid Life/LTC Policy" },
  { value: "hybrid_annuity", label: "Hybrid Annuity/LTC Policy" },
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

const CARE_SETTING_OPTIONS = [
  { value: "comprehensive", label: "Comprehensive (All Settings)" },
  { value: "home_care_only", label: "Home Care Only" },
  { value: "facility_only", label: "Facility Care Only" },
  { value: "adult_day_care", label: "Adult Day Care" },
];

export const LongTermCareInsurancePremiumForm: React.FC<LongTermCareInsurancePremiumFormProps> = ({
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
    EventType.LONG_TERM_CARE_INSURANCE_PREMIUM
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
  const policyType = formData.policyType || "traditional";

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Long-Term Care Insurance Policy Details
        </H3>
        <div className="space-y-4">
          <Input
            label="Policy Name"
            value={formData.policyName || ""}
            onChange={(e) =>
              onChange("policyName", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., LTC Policy, Hybrid Life/LTC Policy"
            error={getFieldError("policyName")}
          />

          <Select
            label="Policy Type"
            options={POLICY_TYPE_OPTIONS}
            value={policyType}
            onChange={(value) => onChange("policyType", value)}
            placeholder="Select policy type"
            error={getFieldError("policyType")}
            helperText="Type of long-term care insurance"
          />

          <Input
            label="Insurance Company"
            value={formData.insuranceCompany || ""}
            onChange={(e) =>
              onChange("insuranceCompany", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Genworth, John Hancock, Northwestern Mutual"
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
            placeholder={isAnnual ? "3,600" : isQuarterly ? "900" : "300"}
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
            label="Daily Benefit Amount"
            type="text"
            value={formatNumberWithCommas(formData.dailyBenefit || "")}
            onChange={(e) =>
              onChange(
                "dailyBenefit",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="200"
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Daily benefit amount for care services"
            error={getFieldError("dailyBenefit")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Benefit Period (Years)"
              type="number"
              value={formData.benefitPeriodYears || ""}
              onChange={(e) =>
                onChange("benefitPeriodYears", parseInt((e.target as HTMLInputElement).value))
              }
              placeholder="4"
              helperText="Maximum years of benefit coverage (typically 2-6 years)"
              error={getFieldError("benefitPeriodYears")}
            />
            <Input
              label="Elimination Period (Days)"
              type="number"
              value={formData.eliminationPeriodDays || ""}
              onChange={(e) =>
                onChange("eliminationPeriodDays", parseInt((e.target as HTMLInputElement).value))
              }
              placeholder="90"
              helperText="Waiting period before benefits begin (typically 30-365 days)"
              error={getFieldError("eliminationPeriodDays")}
            />
          </div>

          <Select
            label="Care Setting Coverage"
            options={CARE_SETTING_OPTIONS}
            value={formData.careSetting || ""}
            onChange={(value) => onChange("careSetting", value)}
            placeholder="Select covered care settings"
            error={getFieldError("careSetting")}
            helperText="Where care benefits can be used"
          />

          <Input
            label="Maximum Lifetime Benefit"
            type="text"
            value={formatNumberWithCommas(formData.lifetimeBenefit || "")}
            onChange={(e) =>
              onChange(
                "lifetimeBenefit",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="300,000"
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Total lifetime benefit pool (Daily Benefit × Days × Years)"
            error={getFieldError("lifetimeBenefit")}
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Policy Riders & Features
        </H3>
        <div className="space-y-4">
          <Input
            label="Inflation Protection Rate"
            type="number"
            step="0.1"
            value={formData.inflationProtectionRate || ""}
            onChange={(e) =>
              onChange("inflationProtectionRate", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="3.0"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Annual increase in benefits (compound or simple)"
            error={getFieldError("inflationProtectionRate")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Return of Premium Percentage"
              type="number"
              min="0"
              max="100"
              value={formData.returnOfPremiumPercentage || ""}
              onChange={(e) =>
                onChange("returnOfPremiumPercentage", parseInt((e.target as HTMLInputElement).value))
              }
              placeholder="100"
              rightIcon={<span className="text-text-tertiary">%</span>}
              helperText="Percentage of premiums returned if not used"
              error={getFieldError("returnOfPremiumPercentage")}
            />
            <Input
              label="Cash Surrender Value"
              type="text"
              value={formatNumberWithCommas(formData.cashSurrenderValue || "")}
              onChange={(e) =>
                onChange(
                  "cashSurrenderValue",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="50,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Cash value if policy is surrendered"
              error={getFieldError("cashSurrenderValue")}
            />
          </div>
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
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
              placeholder="Leave blank for lifetime coverage"
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
            placeholder="0.0"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Expected annual premium increases (many policies have level premiums)"
            error={getFieldError("annualGrowthRate")}
          />
        </div>
      </div>

      {/* Long-Term Care Insurance Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-600">🏥</span>
          </div>
          <div className="ml-3">
            <H4 color="info" className="text-blue-800">
              Long-Term Care Insurance Types
            </H4>
            <BodyBase color="info" className="mt-1 text-blue-700">
              <strong>Traditional LTC:</strong> Pure LTC coverage, use it or lose it<br />
              <strong>Hybrid Life/LTC:</strong> Life insurance with LTC rider, death benefit if unused<br />
              <strong>Hybrid Annuity/LTC:</strong> Annuity with LTC benefits, investment growth<br />
              <strong>Tax Benefits:</strong> Premiums may be tax-deductible, benefits generally tax-free
            </BodyBase>
            <Caption color="info" className="mt-2 text-blue-600">
              Consider purchasing when younger for lower premiums and better health qualification.
            </Caption>
          </div>
        </div>
      </div>

      {/* Care Cost Information */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-amber-600">💰</span>
          </div>
          <div className="ml-3">
            <H4 color="warning" className="text-amber-800">
              Long-Term Care Costs (2024)
            </H4>
            <BodyBase color="warning" className="mt-1 text-amber-700">
              <strong>Home Health Aide:</strong> $61,776/year nationally<br />
              <strong>Adult Day Care:</strong> $21,060/year nationally<br />
              <strong>Assisted Living:</strong> $64,200/year nationally<br />
              <strong>Nursing Home (private room):</strong> $116,800/year nationally
            </BodyBase>
            <Caption color="warning" className="mt-2 text-amber-600">
              Costs vary significantly by location. Plan for 3-5% annual increases.
            </Caption>
          </div>
        </div>
      </div>

      {/* Planning Considerations */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-green-600">💡</span>
          </div>
          <div className="ml-3">
            <H4 color="success" className="text-green-800">
              Planning Considerations
            </H4>
            <BodyBase color="success" className="mt-1 text-green-700">
              • <strong>Age to Purchase:</strong> Optimal age is typically 55-65<br />
              • <strong>Benefit Period:</strong> Consider 3-5 years as average care duration<br />
              • <strong>Inflation Protection:</strong> Essential for long-term planning<br />
              • <strong>Premium Stability:</strong> Look for guaranteed renewable policies
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};