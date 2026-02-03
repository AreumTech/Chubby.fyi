import React, { useEffect } from "react";
import { Input, Select, Checkbox } from "@/components/ui";
import { H3, H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface LongTermCarePayoutFormProps {
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

const CARE_SETTING_OPTIONS = [
  { value: "home_care", label: "Home Care Services" },
  { value: "adult_day_care", label: "Adult Day Care" },
  { value: "assisted_living", label: "Assisted Living Facility" },
  { value: "nursing_home", label: "Nursing Home" },
  { value: "memory_care", label: "Memory Care Unit" },
  { value: "family_caregiver", label: "Family Caregiver Support" },
];

const CARE_LEVEL_OPTIONS = [
  { value: "minimal", label: "Minimal Care (1-2 ADLs)" },
  { value: "moderate", label: "Moderate Care (3-4 ADLs)" },
  { value: "extensive", label: "Extensive Care (5-6 ADLs)" },
  { value: "cognitive", label: "Cognitive Impairment" },
];

const BENEFIT_PAYMENT_OPTIONS = [
  { value: "reimbursement", label: "Reimbursement Model" },
  { value: "indemnity", label: "Indemnity/Cash Model" },
  { value: "hybrid", label: "Hybrid Model" },
];

export const LongTermCarePayoutForm: React.FC<LongTermCarePayoutFormProps> = ({
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
    EventType.LONG_TERM_CARE_PAYOUT
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Set default values
  useEffect(() => {
    if (formData.taxable === undefined) {
      onChange("taxable", false); // LTC benefits are typically tax-free
    }
    if (!formData.benefitPaymentType) {
      onChange("benefitPaymentType", "reimbursement");
    }
  }, [formData.taxable, formData.benefitPaymentType, onChange]);

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

  const benefitPaymentType = formData.benefitPaymentType || "reimbursement";
  const isIndemnity = benefitPaymentType === "indemnity";

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Long-Term Care Policy Information
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
            placeholder="e.g., Genworth, John Hancock, Northwestern Mutual"
            error={getFieldError("insuranceCompany")}
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
          Care Need Assessment
        </H3>
        <div className="space-y-4">
          <Select
            label="Care Level Required"
            options={CARE_LEVEL_OPTIONS}
            value={formData.careLevel || ""}
            onChange={(value) => onChange("careLevel", value)}
            placeholder="Select level of care needed"
            error={getFieldError("careLevel")}
            helperText="Level of care based on Activities of Daily Living (ADLs)"
          />

          <Select
            label="Primary Care Setting"
            options={CARE_SETTING_OPTIONS}
            value={formData.careSetting || ""}
            onChange={(value) => onChange("careSetting", value)}
            placeholder="Select primary care setting"
            error={getFieldError("careSetting")}
            helperText="Where care will primarily be received"
          />

          <Input
            label="Care Condition Description"
            value={formData.careCondition || ""}
            onChange={(e) =>
              onChange("careCondition", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Alzheimer's disease, Stroke recovery, Mobility impairment"
            error={getFieldError("careCondition")}
            helperText="Brief description of the condition requiring care"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Elimination Period (Days)"
              type="number"
              value={formData.eliminationPeriodDays || ""}
              onChange={(e) =>
                onChange("eliminationPeriodDays", parseInt((e.target as HTMLInputElement).value))
              }
              placeholder="90"
              helperText="Waiting period before benefits begin"
              error={getFieldError("eliminationPeriodDays")}
            />
            <Input
              label="ADLs Unable to Perform"
              type="number"
              min="0"
              max="6"
              value={formData.adlsImpaired || ""}
              onChange={(e) =>
                onChange("adlsImpaired", parseInt((e.target as HTMLInputElement).value))
              }
              placeholder="3"
              helperText="Number of Activities of Daily Living impaired (0-6)"
              error={getFieldError("adlsImpaired")}
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
            label="Benefit Payment Type"
            options={BENEFIT_PAYMENT_OPTIONS}
            value={benefitPaymentType}
            onChange={(value) => onChange("benefitPaymentType", value)}
            placeholder="How benefits are paid"
            error={getFieldError("benefitPaymentType")}
            helperText="Method of benefit calculation and payment"
          />

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
            error={getFieldError("dailyBenefit")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText={isIndemnity ? "Daily cash payment regardless of actual costs" : "Maximum daily reimbursement amount"}
          />

          <div className="grid grid-cols-2 gap-4">
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
              placeholder="6,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Daily benefit × 30 days"
              error={getFieldError("monthlyBenefit")}
            />
            <Input
              label="Actual Care Costs (Optional)"
              type="text"
              value={formatNumberWithCommas(formData.actualCareCosts || "")}
              onChange={(e) =>
                onChange(
                  "actualCareCosts",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="5,500"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Actual monthly care expenses (for reimbursement model)"
              error={getFieldError("actualCareCosts")}
            />
          </div>

          <Select
            label="Destination Account"
            options={ACCOUNT_TYPE_OPTIONS}
            value={formData.targetAccountType || ""}
            onChange={(value) => onChange("targetAccountType", value)}
            placeholder="Account to receive benefits"
            error={getFieldError("targetAccountType")}
            helperText="Account where benefits will be deposited"
          />

          <Checkbox
            label="Taxable Benefits"
            checked={formData.taxable || false}
            onChange={(checked) => onChange("taxable", checked)}
            helperText="LTC benefits are generally tax-free up to certain limits"
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Benefit Timeline & Limits
        </H3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Care Need Start Year"
              type="number"
              value={getYearMonth(formData.startDateOffset).year}
              onChange={(e) =>
                handleYearMonthChange(
                  "startDateOffset",
                  (e.target as HTMLInputElement).value,
                  getYearMonth(formData.startDateOffset).month || "01"
                )
              }
              placeholder="2050"
              error={getFieldError("startDateOffset")}
              helperText="When long-term care need begins"
            />
            <Input
              label="Care Need Start Month"
              type="number"
              min="1"
              max="12"
              value={getYearMonth(formData.startDateOffset).month}
              onChange={(e) =>
                handleYearMonthChange(
                  "startDateOffset",
                  getYearMonth(formData.startDateOffset).year || "2050",
                  (e.target as HTMLInputElement).value
                )
              }
              placeholder="01"
              error={getFieldError("startDateOffset")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Expected Care Duration (Years)"
              type="number"
              step="0.1"
              value={formData.careDurationYears || ""}
              onChange={(e) =>
                onChange("careDurationYears", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="3.5"
              helperText="Expected duration of care need"
              error={getFieldError("careDurationYears")}
            />
            <Input
              label="Maximum Benefit Period (Years)"
              type="number"
              value={formData.maxBenefitPeriodYears || ""}
              onChange={(e) =>
                onChange("maxBenefitPeriodYears", parseInt((e.target as HTMLInputElement).value))
              }
              placeholder="4"
              helperText="Policy maximum benefit duration"
              error={getFieldError("maxBenefitPeriodYears")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Lifetime Benefit Pool"
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
              helperText="Total lifetime benefit available"
              error={getFieldError("lifetimeBenefit")}
            />
            <Input
              label="Benefits Used to Date"
              type="text"
              value={formatNumberWithCommas(formData.benefitsUsed || "")}
              onChange={(e) =>
                onChange(
                  "benefitsUsed",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="0"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Amount of benefit pool already used"
              error={getFieldError("benefitsUsed")}
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
            placeholder="3.0"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Inflation protection rate for benefits"
            error={getFieldError("annualGrowthRate")}
          />
        </div>
      </div>

      {/* Long-Term Care Benefits Information Panel */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-green-600">🏥</span>
          </div>
          <div className="ml-3">
            <H4 color="success" className="text-green-800">
              Long-Term Care Benefits Information
            </H4>
            <BodyBase color="success" className="mt-1 text-green-700">
              <strong>Tax Treatment:</strong> Benefits generally tax-free up to qualified limits<br />
              <strong>Reimbursement:</strong> Paid based on actual care expenses up to daily limit<br />
              <strong>Indemnity:</strong> Fixed daily payment regardless of actual costs<br />
              <strong>ADL Requirements:</strong> Typically need help with 2-3+ Activities of Daily Living
            </BodyBase>
            <Caption color="success" className="mt-2 text-green-600">
              Average care duration is 2-3 years, but can extend much longer.
            </Caption>
          </div>
        </div>
      </div>

      {/* Care Settings Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-600">🏠</span>
          </div>
          <div className="ml-3">
            <H4 color="info" className="text-blue-800">
              Care Setting Costs (2024 National Averages)
            </H4>
            <BodyBase color="info" className="mt-1 text-blue-700">
              <strong>Home Health Aide:</strong> ~$5,148/month ($169/day)<br />
              <strong>Adult Day Care:</strong> ~$1,755/month ($81/day)<br />
              <strong>Assisted Living:</strong> ~$5,350/month<br />
              <strong>Nursing Home (private):</strong> ~$9,733/month ($319/day)
            </BodyBase>
            <Caption color="info" className="mt-2 text-blue-600">
              Costs vary significantly by geographic location and quality of care.
            </Caption>
          </div>
        </div>
      </div>

      {/* Family Impact Note */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-purple-600">👥</span>
          </div>
          <div className="ml-3">
            <H4 color="accent" className="text-purple-800">
              Family Impact Considerations
            </H4>
            <BodyBase color="accent" className="mt-1 text-purple-700">
              <strong>Family Caregivers:</strong> Some policies pay family members for care<br />
              <strong>Care Coordination:</strong> Benefits may include care management services<br />
              <strong>Respite Care:</strong> Temporary relief for primary caregivers<br />
              <strong>Home Modifications:</strong> Some policies cover accessibility improvements
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
            <H4 color="warning" className="text-amber-800">
              Scenario Planning Note
            </H4>
            <BodyBase color="warning" className="mt-1 text-amber-700">
              This payout event is typically used for "what-if" analysis to model
              the financial impact of long-term care needs. Consider different care
              scenarios (home care vs. facility care) and durations in your planning.
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};