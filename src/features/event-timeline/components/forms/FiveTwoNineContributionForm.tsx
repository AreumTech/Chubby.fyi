import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H3, H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface FiveTwoNineContributionFormProps {
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
  { value: "tax_deferred", label: "Traditional IRA/401k" },
  { value: "roth", label: "Roth IRA/401k" },
];

const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
  { value: "one_time", label: "One-time Contribution" },
];

const INVESTMENT_STRATEGY_OPTIONS = [
  { value: "aggressive", label: "Aggressive (Age-based)" },
  { value: "moderate", label: "Moderate (Balanced)" },
  { value: "conservative", label: "Conservative (Bond-heavy)" },
  { value: "target_date", label: "Target Date Fund" },
  { value: "custom", label: "Custom Allocation" },
];

const STATE_TAX_BENEFIT_OPTIONS = [
  { value: "full_deduction", label: "Full State Tax Deduction" },
  { value: "partial_deduction", label: "Partial State Tax Deduction" },
  { value: "tax_credit", label: "State Tax Credit" },
  { value: "no_benefit", label: "No State Tax Benefit" },
];

export const FiveTwoNineContributionForm: React.FC<FiveTwoNineContributionFormProps> = ({
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
    EventType.FIVE_TWO_NINE_CONTRIBUTION
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Set default values
  useEffect(() => {
    if (formData.taxable === undefined) {
      onChange("taxable", false); // 529 contributions are after-tax
    }
    if (!formData.frequency) {
      onChange("frequency", "monthly");
    }
    if (!formData.investmentStrategy) {
      onChange("investmentStrategy", "aggressive");
    }
  }, [formData.taxable, formData.frequency, formData.investmentStrategy, onChange]);

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
  const isOneTime = frequency === "one_time";
  const isAnnual = frequency === "annually";
  const isQuarterly = frequency === "quarterly";

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          529 Education Savings Plan Details
        </H3>
        <div className="space-y-4">
          <Input
            label="529 Plan Name"
            value={formData.planName || ""}
            onChange={(e) =>
              onChange("planName", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., State 529 Plan, Vanguard 529"
            error={getFieldError("planName")}
          />

          <Input
            label="Plan Provider/State"
            value={formData.planProvider || ""}
            onChange={(e) =>
              onChange("planProvider", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Virginia 529, Fidelity, Vanguard"
            error={getFieldError("planProvider")}
          />

          <Input
            label="Beneficiary Name"
            value={formData.beneficiaryName || ""}
            onChange={(e) =>
              onChange("beneficiaryName", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., John Doe Jr., Child 1"
            error={getFieldError("beneficiaryName")}
            helperText="The student who will use these education funds"
          />

          <Input
            label="Account Number (Optional)"
            value={formData.accountNumber || ""}
            onChange={(e) =>
              onChange("accountNumber", (e.target as HTMLInputElement).value)
            }
            placeholder="529 account identifier"
            error={getFieldError("accountNumber")}
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Contribution Details
        </H3>
        <div className="space-y-4">
          <Select
            label="Contribution Frequency"
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={(value) => onChange("frequency", value)}
            error={getFieldError("frequency")}
          />

          <Input
            label={`Contribution Amount (${isOneTime ? "Total" : isAnnual ? "Annual" : isQuarterly ? "Quarterly" : "Monthly"})`}
            type="text"
            value={formatNumberWithCommas(formData.amount || "")}
            onChange={(e) =>
              onChange(
                "amount",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder={isOneTime ? "10,000" : isAnnual ? "6,000" : isQuarterly ? "1,500" : "500"}
            error={getFieldError("amount")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText={`${isOneTime ? "One-time" : isAnnual ? "Annual" : isQuarterly ? "Quarterly" : "Monthly"} contribution to 529 plan`}
          />

          <Select
            label="Source Account"
            options={ACCOUNT_TYPE_OPTIONS}
            value={formData.sourceAccountType || ""}
            onChange={(value) => onChange("sourceAccountType", value)}
            placeholder="Account to contribute from"
            error={getFieldError("sourceAccountType")}
            helperText="Account where contribution funds will come from"
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
          Investment & Growth Options
        </H3>
        <div className="space-y-4">
          <Select
            label="Investment Strategy"
            options={INVESTMENT_STRATEGY_OPTIONS}
            value={formData.investmentStrategy || ""}
            onChange={(value) => onChange("investmentStrategy", value)}
            placeholder="Select investment approach"
            error={getFieldError("investmentStrategy")}
            helperText="How 529 funds will be invested for growth"
          />

          <Input
            label="Expected Annual Growth Rate"
            type="number"
            step="0.1"
            value={formData.expectedGrowthRate || ""}
            onChange={(e) =>
              onChange("expectedGrowthRate", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="6.5"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Expected annual investment return (typically 5-8% for age-based strategies)"
            error={getFieldError("expectedGrowthRate")}
          />

          <Input
            label="Annual Expense Ratio"
            type="number"
            step="0.01"
            value={formData.expenseRatio || ""}
            onChange={(e) =>
              onChange("expenseRatio", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="0.35"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Annual fees charged by the 529 plan (typically 0.2-1.0%)"
            error={getFieldError("expenseRatio")}
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Tax Benefits & Timeline
        </H3>
        <div className="space-y-4">
          <Select
            label="State Tax Benefit"
            options={STATE_TAX_BENEFIT_OPTIONS}
            value={formData.stateTaxBenefit || ""}
            onChange={(value) => onChange("stateTaxBenefit", value)}
            placeholder="Select state tax benefit"
            error={getFieldError("stateTaxBenefit")}
            helperText="Tax benefits from your state of residence"
          />

          <Input
            label="State Tax Benefit Amount (Annual)"
            type="text"
            value={formatNumberWithCommas(formData.stateTaxBenefitAmount || "")}
            onChange={(e) =>
              onChange(
                "stateTaxBenefitAmount",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="500"
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Annual state tax deduction or credit amount"
            error={getFieldError("stateTaxBenefitAmount")}
          />

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
              placeholder="Leave blank for indefinite contributions"
              error={getFieldError("endDateOffset")}
            />
          </div>

          {!isOneTime && (
            <Input
              label="Annual Contribution Growth Rate"
              type="number"
              step="0.01"
              value={formData.annualGrowthRate || ""}
              onChange={(e) =>
                onChange("annualGrowthRate", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="3.0"
              rightIcon={<span className="text-text-tertiary">%</span>}
              helperText="Annual increase in contribution amount (inflation adjustment)"
              error={getFieldError("annualGrowthRate")}
            />
          )}
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
          Education Planning Details
        </H3>
        <div className="space-y-4">
          <Input
            label="Beneficiary Current Age"
            type="number"
            min="0"
            max="25"
            value={formData.beneficiaryAge || ""}
            onChange={(e) =>
              onChange("beneficiaryAge", parseInt((e.target as HTMLInputElement).value))
            }
            placeholder="5"
            helperText="Current age of the student beneficiary"
            error={getFieldError("beneficiaryAge")}
          />

          <Input
            label="Expected College Start Age"
            type="number"
            min="16"
            max="25"
            value={formData.collegeStartAge || ""}
            onChange={(e) =>
              onChange("collegeStartAge", parseInt((e.target as HTMLInputElement).value))
            }
            placeholder="18"
            helperText="Expected age when college expenses begin"
            error={getFieldError("collegeStartAge")}
          />

          <Input
            label="Estimated Annual College Costs (Today's $)"
            type="text"
            value={formatNumberWithCommas(formData.estimatedAnnualCosts || "")}
            onChange={(e) =>
              onChange(
                "estimatedAnnualCosts",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="30,000"
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Current cost of one year of college (will be inflated to future value)"
            error={getFieldError("estimatedAnnualCosts")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="College Duration (Years)"
              type="number"
              min="1"
              max="8"
              value={formData.collegeDurationYears || ""}
              onChange={(e) =>
                onChange("collegeDurationYears", parseInt((e.target as HTMLInputElement).value))
              }
              placeholder="4"
              helperText="Expected years of college"
              error={getFieldError("collegeDurationYears")}
            />
            <Input
              label="College Cost Inflation Rate"
              type="number"
              step="0.1"
              value={formData.collegeInflationRate || ""}
              onChange={(e) =>
                onChange("collegeInflationRate", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="5.0"
              rightIcon={<span className="text-text-tertiary">%</span>}
              helperText="Annual increase in college costs (historically ~5%)"
              error={getFieldError("collegeInflationRate")}
            />
          </div>
        </div>
      </div>

      {/* 529 Plan Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-600">🎓</span>
          </div>
          <div className="ml-3">
            <H4 color="info">
              529 Education Savings Plan Benefits
            </H4>
            <BodyBase color="info" className="mt-1">
              <strong>Tax-Free Growth:</strong> Earnings grow federally tax-free when used for qualified expenses<br />
              <strong>State Benefits:</strong> Many states offer tax deductions or credits for contributions<br />
              <strong>Qualified Expenses:</strong> Tuition, fees, books, supplies, room & board, K-12 tuition up to $10k/year<br />
              <strong>Contribution Limits:</strong> High aggregate limits ($300k+ in most states)
            </BodyBase>
            <p className="mt-2 text-xs text-blue-600">
              2024 gift tax annual exclusion: $18,000 per beneficiary ($36,000 for married couples)
            </p>
          </div>
        </div>
      </div>

      {/* Investment Strategy Information */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-green-600">📈</span>
          </div>
          <div className="ml-3">
            <H4 color="success">
              529 Investment Strategy Guide
            </H4>
            <BodyBase color="success" className="mt-1">
              <strong>Age-Based (Aggressive):</strong> High stock allocation when young, automatically becomes conservative near college<br />
              <strong>Target Date:</strong> Similar to age-based but tied to specific college entry year<br />
              <strong>Static Options:</strong> Fixed allocation (aggressive/moderate/conservative)<br />
              <strong>Expected Returns:</strong> Age-based typically 6-8% long-term, conservative 3-5%
            </BodyBase>
          </div>
        </div>
      </div>

      {/* State Tax Benefit Information */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-amber-600">🏛️</span>
          </div>
          <div className="ml-3">
            <H4 color="warning">
              State Tax Benefit Examples
            </H4>
            <BodyBase color="warning" className="mt-1">
              <strong>Full Deduction:</strong> Virginia ($4k), New York ($10k), Indiana (no limit)<br />
              <strong>Tax Credit:</strong> Indiana (20% credit up to $1,000)<br />
              <strong>Partial Deduction:</strong> Some states have income limits or caps<br />
              <strong>No Benefit:</strong> California, Delaware, Hawaii, Kentucky, Maine, New Jersey, North Carolina, Pennsylvania, Tennessee
            </BodyBase>
            <p className="mt-2 text-xs text-amber-600">
              Check your state's specific 529 plan benefits and any restrictions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
