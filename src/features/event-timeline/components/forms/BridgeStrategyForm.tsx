import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H3, H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useFormValidation, commonValidationRules } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

// Form data type - uses generic record to allow dynamic property access
type BridgeStrategyFormData = Record<string, any>;

interface BridgeStrategyFormProps {
  formData: BridgeStrategyFormData;
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

const STRATEGY_TYPES = [
  { value: "roth_ladder", label: "Roth Conversion Ladder" },
  { value: "rule_72t", label: "Rule 72(t) SEPP" },
  { value: "taxable_first", label: "Taxable Account Drawdown" },
  { value: "roth_contributions", label: "Roth Contribution Access" },
  { value: "mixed", label: "Mixed Strategy" },
];

const SEPP_METHODS = [
  { value: "fixed_amortization", label: "Fixed Amortization Method" },
  { value: "fixed_annuitization", label: "Fixed Annuitization Method" },
  { value: "rmd_method", label: "RMD Method (Most Flexible)" },
];

const ACCOUNT_TYPES = [
  { value: "tax_deferred", label: "Traditional IRA/401(k)" },
  { value: "roth", label: "Roth IRA/401(k)" },
  { value: "taxable", label: "Taxable Brokerage" },
];

const CONTINGENCY_PLANS = [
  { value: "return_to_work", label: "Return to Work" },
  { value: "reduce_spending", label: "Reduce Spending" },
  { value: "early_withdrawal_penalty", label: "Accept Early Withdrawal Penalties" },
];

const validationRules = {
  description: [
    commonValidationRules.required("Description is required"),
    commonValidationRules.maxLength(100)
  ],
  strategyType: [
    commonValidationRules.required("Strategy type is required")
  ],
  bridgeStartAge: [
    commonValidationRules.required("Bridge start age is required"),
    commonValidationRules.positiveNumber("Age must be greater than 0"),
    {
      validate: (value: any) => {
        const age = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(age) || age < 35 || age > 65 ? "Bridge start age typically ranges from 35-65" : null;
      },
      message: "Age validation"
    }
  ],
  bridgeEndAge: [
    commonValidationRules.required("Bridge end age is required"),
    {
      validate: (value: any, formData: any) => {
        const endAge = typeof value === 'string' ? parseFloat(value) : value;
        const startAge = typeof formData?.bridgeStartAge === 'string' ? parseFloat(formData.bridgeStartAge) : formData?.bridgeStartAge;
        if (isNaN(endAge) || endAge <= 0) return "Bridge end age must be greater than 0";
        if (!isNaN(startAge) && endAge <= startAge) return "Bridge end age must be after start age";
        if (endAge < 59.5) return "Bridge end age is typically 59.5 (penalty-free access)";
        return null;
      },
      message: "End age validation"
    }
  ],
  rothLadderAmount: [
    commonValidationRules.positiveNumber("Roth ladder amount must be greater than 0"),
    commonValidationRules.reasonableAmount(500000, "Annual Roth conversion amount seems unusually high")
  ],
  seppAmount: [
    commonValidationRules.positiveNumber("SEPP amount must be greater than 0"),
    commonValidationRules.reasonableAmount(200000, "Annual SEPP amount seems unusually high")
  ],
  taxableSpendingAmount: [
    commonValidationRules.positiveNumber("Taxable spending amount must be greater than 0"),
    commonValidationRules.reasonableAmount(300000, "Annual taxable spending seems unusually high")
  ],
  rothContributionAmount: [
    commonValidationRules.positiveNumber("Roth contribution amount must be greater than 0"),
    commonValidationRules.reasonableAmount(100000, "Annual Roth contribution access seems unusually high")
  ],
  emergencyBuffer: [
    commonValidationRules.positiveNumber("Emergency buffer must be greater than 0"),
    {
      validate: (value: any) => {
        const months = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(months) || months > 24 ? "Emergency buffer over 24 months seems excessive" : null;
      },
      message: "Emergency buffer validation"
    }
  ],
  targetTaxBracket: [
    commonValidationRules.nonNegativeNumber("Tax bracket cannot be negative"),
    commonValidationRules.percentage("Tax bracket must be between 0% and 100%")
  ]
};

export const BridgeStrategyForm: React.FC<BridgeStrategyFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  const { startYear, startMonth } = useStartDate();
  
  const { hasFieldError, getFieldError, validateForm } = useFormValidation(validationRules);

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

  const strategyType = formData.strategyType;
  const bridgeYears = formData.bridgeEndAge && formData.bridgeStartAge 
    ? formData.bridgeEndAge - formData.bridgeStartAge 
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Early Retirement Bridge Strategy
        </H3>
        <div className="space-y-4">
          <Input
            label="Strategy Description"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Early Retirement Bridge 55-59.5"
            error={getFieldError("description")}
          />
          
          <Select
            label="Bridge Strategy Type"
            options={STRATEGY_TYPES}
            value={formData.strategyType || ""}
            onChange={(value) => onChange("strategyType", value)}
            placeholder="Select bridge strategy"
            error={getFieldError("strategyType")}
            helperText="Method to access funds before age 59.5"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Bridge Start Age"
              type="number"
              step="0.5"
              value={formData.bridgeStartAge || ""}
              onChange={(e) =>
                onChange("bridgeStartAge", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="55"
              error={getFieldError("bridgeStartAge")}
              helperText="When early retirement begins"
            />
            <Input
              label="Bridge End Age"
              type="number"
              step="0.5"
              value={formData.bridgeEndAge || ""}
              onChange={(e) =>
                onChange("bridgeEndAge", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="59.5"
              error={getFieldError("bridgeEndAge")}
              helperText="When penalty-free access starts"
            />
          </div>

          <Input
            label="Strategy Start Year"
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
            helperText="When to start implementing this strategy"
          />
        </div>
      </div>

      {/* Roth Ladder Settings */}
      {(strategyType === "roth_ladder" || strategyType === "mixed") && (
        <div>
          <H3 className="mb-4 flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
            Roth Conversion Ladder
          </H3>
          <div className="space-y-4">
            <Input
              label="Annual Roth Conversion Amount"
              type="text"
              value={formatNumberWithCommas(formData.rothLadderAmount || "")}
              onChange={(e) =>
                onChange(
                  "rothLadderAmount",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="50,000"
              error={getFieldError("rothLadderAmount")}
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Amount to convert each year (accessible after 5 years)"
            />

            <Input
              label="Years of Conversions"
              type="number"
              value={formData.rothLadderYears || ""}
              onChange={(e) =>
                onChange("rothLadderYears", parseInt((e.target as HTMLInputElement).value))
              }
              placeholder={bridgeYears > 0 ? bridgeYears.toString() : "5"}
              error={getFieldError("rothLadderYears")}
              helperText="How many years to perform conversions"
            />
          </div>
        </div>
      )}

      {/* Rule 72(t) SEPP Settings */}
      {(strategyType === "rule_72t" || strategyType === "mixed") && (
        <div>
          <H3 className="mb-4 flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
            Rule 72(t) SEPP (Substantially Equal Periodic Payments)
          </H3>
          <div className="space-y-4">
            <Input
              label="Annual SEPP Amount"
              type="text"
              value={formatNumberWithCommas(formData.seppAmount || "")}
              onChange={(e) =>
                onChange(
                  "seppAmount",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="40,000"
              error={getFieldError("seppAmount")}
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Annual withdrawal amount (must be consistent)"
            />

            <Select
              label="SEPP Calculation Method"
              options={SEPP_METHODS}
              value={formData.seppMethod || ""}
              onChange={(value) => onChange("seppMethod", value)}
              placeholder="Select calculation method"
              error={getFieldError("seppMethod")}
              helperText="Method to calculate required distribution"
            />

            <Select
              label="Source Account"
              options={ACCOUNT_TYPES.filter(acc => acc.value === "tax_deferred")}
              value={formData.seppSourceAccount || ""}
              onChange={(value) => onChange("seppSourceAccount", value)}
              placeholder="Select IRA/401(k) account"
              error={getFieldError("seppSourceAccount")}
              helperText="Which retirement account to draw from"
            />
          </div>
        </div>
      )}

      {/* Taxable Account Settings */}
      {(strategyType === "taxable_first" || strategyType === "mixed") && (
        <div>
          <H3 className="mb-4 flex items-center">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
            Taxable Account Strategy
          </H3>
          <div className="space-y-4">
            <Input
              label="Annual Taxable Spending"
              type="text"
              value={formatNumberWithCommas(formData.taxableSpendingAmount || "")}
              onChange={(e) =>
                onChange(
                  "taxableSpendingAmount",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="60,000"
              error={getFieldError("taxableSpendingAmount")}
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Annual spending from taxable accounts"
            />

            <Input
              label="Cash Reserve to Preserve"
              type="text"
              value={formatNumberWithCommas(formData.preserveCashReserve || "")}
              onChange={(e) =>
                onChange(
                  "preserveCashReserve",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="50,000"
              error={getFieldError("preserveCashReserve")}
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Minimum cash to maintain for emergencies"
            />
          </div>
        </div>
      )}

      {/* Roth Contribution Access */}
      {(strategyType === "roth_contributions" || strategyType === "mixed") && (
        <div>
          <H3 className="mb-4 flex items-center">
            <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
            Roth Contribution Access
          </H3>
          <div className="space-y-4">
            <Input
              label="Annual Roth Contribution Access"
              type="text"
              value={formatNumberWithCommas(formData.rothContributionAmount || "")}
              onChange={(e) =>
                onChange(
                  "rothContributionAmount",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="25,000"
              error={getFieldError("rothContributionAmount")}
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Annual access to Roth contributions (penalty-free)"
            />

            <Input
              label="Years of Contribution History"
              type="number"
              value={formData.rothContributionYears || ""}
              onChange={(e) =>
                onChange("rothContributionYears", parseInt((e.target as HTMLInputElement).value))
              }
              placeholder="15"
              error={getFieldError("rothContributionYears")}
              helperText="How many years of Roth contributions to access"
            />
          </div>
        </div>
      )}

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
          Risk Management & Tax Planning
        </H3>
        <div className="space-y-4">
          <Input
            label="Emergency Buffer (Months)"
            type="number"
            step="0.5"
            value={formData.emergencyBuffer || ""}
            onChange={(e) =>
              onChange("emergencyBuffer", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="12"
            error={getFieldError("emergencyBuffer")}
            helperText="Additional months of expenses to maintain"
          />

          <Select
            label="Contingency Plan"
            options={CONTINGENCY_PLANS}
            value={formData.contingencyPlan || ""}
            onChange={(value) => onChange("contingencyPlan", value)}
            placeholder="Select backup plan"
            error={getFieldError("contingencyPlan")}
            helperText="What to do if the bridge strategy fails"
          />

          <Input
            label="Target Tax Bracket"
            type="number"
            step="0.1"
            value={formData.targetTaxBracket || ""}
            onChange={(e) =>
              onChange("targetTaxBracket", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="12.0"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Target marginal tax rate for conversions"
            error={getFieldError("targetTaxBracket")}
          />

          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.inflationProtection || false}
                onChange={(e) => onChange("inflationProtection", e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                Adjust amounts for inflation
              </span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.stateResidencyChange || false}
                onChange={(e) => onChange("stateResidencyChange", e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                Planning to move to lower tax state
              </span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.harvestLossesFirst || false}
                onChange={(e) => onChange("harvestLossesFirst", e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                Use tax loss harvesting before conversions
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Bridge Strategy Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-amber-600">⚠️</span>
          </div>
          <div className="ml-3">
            <H4 color="warning">
              Early Retirement Bridge Strategy Risks
            </H4>
            <BodyBase color="warning" className="mt-1">
              <strong>Key Considerations:</strong><br />
              • Bridge strategies require careful tax planning and timing<br />
              • Market downturns can derail early retirement plans<br />
              • Healthcare costs before Medicare eligibility (age 65)<br />
              • Loss of employer benefits (health insurance, life insurance)<br />
              • Rule 72(t) payments must continue for 5 years or until age 59.5 (whichever is longer)
            </BodyBase>
          </div>
        </div>
      </div>

      {/* Roth Ladder Education */}
      {(strategyType === "roth_ladder" || strategyType === "mixed") && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-600">📚</span>
            </div>
            <div className="ml-3">
              <H4 color="success">
                Roth Conversion Ladder Strategy
              </H4>
              <BodyBase color="success" className="mt-1">
                • Convert traditional IRA/401(k) funds to Roth IRA annually<br />
                • Wait 5 years before accessing converted amounts penalty-free<br />
                • Start conversions 5+ years before needing the funds<br />
                • Pay taxes on conversions in the year of conversion<br />
                • Ideal for maintaining low tax brackets during early retirement
              </BodyBase>
              <Caption color="success" className="mt-2">
                <strong>Pro tip:</strong> Start conversions while still working if in lower tax bracket during early retirement.
              </Caption>
            </div>
          </div>
        </div>
      )}

      {/* Rule 72(t) Education */}
      {(strategyType === "rule_72t" || strategyType === "mixed") && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-blue-600">📊</span>
            </div>
            <div className="ml-3">
              <H4 color="info">
                Rule 72(t) SEPP Requirements
              </H4>
              <BodyBase color="info" className="mt-1">
                • Must take substantially equal payments for 5 years OR until age 59.5 (whichever is longer)<br />
                • Cannot modify payment amount once started (limited exceptions)<br />
                • Violating the schedule triggers penalties on all previous payments<br />
                • RMD method allows one modification to fixed amortization or annuitization<br />
                • Requires separate IRA account for SEPP payments
              </BodyBase>
              <Caption color="info" className="mt-2">
                <strong>Warning:</strong> This strategy lacks flexibility. Consider carefully before implementing.
              </Caption>
            </div>
          </div>
        </div>
      )}

      {/* Bridge Duration Info */}
      {bridgeYears > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-gray-600">⏱️</span>
            </div>
            <div className="ml-3">
              <H4 color="primary">
                Bridge Period: {bridgeYears} Years
              </H4>
              <BodyBase color="secondary" className="mt-1">
                You'll need to fund {bridgeYears} years between early retirement and penalty-free access.
                {bridgeYears > 10 && (
                  <span className="text-amber-700"> This is a long bridge period - ensure adequate planning.</span>
                )}
              </BodyBase>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};