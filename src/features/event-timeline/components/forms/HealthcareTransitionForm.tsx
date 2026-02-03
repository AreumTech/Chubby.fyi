import React, { useEffect } from "react";
import { Input } from "@/components/ui";
import { H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType, AccountType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface HealthcareTransitionFormProps {
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

export const HealthcareTransitionForm: React.FC<HealthcareTransitionFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
    EventType.HEALTHCARE_TRANSITION
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Set default growth rate for healthcare
  useEffect(() => {
    if (!formData.annualGrowthRate) {
      onChange("annualGrowthRate", 5.0); // Default to 5% medical inflation
    }
  }, [formData.annualGrowthRate, onChange]);

  // Set default bridge costs
  useEffect(() => {
    if (!formData.bridgeCosts) {
      onChange("bridgeCosts", {
        monthlyPremium: 800,
        deductible: 5000,
        maxOutOfPocket: 15000,
      });
    }
  }, [formData.bridgeCosts, onChange]);

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

  const handleBridgeCostsChange = (field: string, value: number) => {
    const currentBridgeCosts = formData.bridgeCosts || {
      monthlyPremium: 800,
      deductible: 5000,
      maxOutOfPocket: 15000,
    };
    
    onChange("bridgeCosts", {
      ...currentBridgeCosts,
      [field]: value,
    });
  };

  const handleCobraDetailsChange = (field: string, value: number) => {
    const currentCobraDetails = formData.cobraDetails || {
      originalPremium: 500,
      employerContribution: 400,
      cobraMultiplier: 1.02,
    };
    
    onChange("cobraDetails", {
      ...currentCobraDetails,
      [field]: value,
    });
  };

  const transitionTypes = [
    { value: 'job-loss-cobra', label: 'Job Loss - COBRA Coverage' },
    { value: 'early-retirement-aca', label: 'Early Retirement - ACA Marketplace' },
    { value: 'medicare-transition', label: 'Medicare Transition' },
    { value: 'spouse-plan-change', label: 'Spouse Plan Change' },
  ];

  const showCobraFields = formData.transitionType === 'job-loss-cobra';
  const showSubsidyField = formData.transitionType === 'early-retirement-aca';

  return (
    <div className="space-y-6">
      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
          Healthcare Transition Details
        </H4>
        <div className="space-y-4">
          <Input
            label="Transition Description"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., COBRA coverage after job loss, ACA plan until Medicare eligibility"
            error={getFieldError("description")}
          />

          <div className="space-y-2">
            <BodyBase as="label" className="block font-medium text-text-primary">
              Transition Type
            </BodyBase>
            <select
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.transitionType || "job-loss-cobra"}
              onChange={(e) => onChange("transitionType", e.target.value)}
            >
              {transitionTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

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
              label="Start Month"
              type="number"
              min="1"
              max="12"
              value={getYearMonth(formData.startDateOffset).month}
              onChange={(e) =>
                handleYearMonthChange(
                  "startDateOffset",
                  getYearMonth(formData.startDateOffset).year || "2024",
                  (e.target as HTMLInputElement).value.padStart(2, "0")
                )
              }
              placeholder="01"
              error={getFieldError("startDateOffset")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="End Year"
              type="number"
              value={getYearMonth(formData.endDateOffset).year}
              onChange={(e) =>
                handleYearMonthChange(
                  "endDateOffset",
                  (e.target as HTMLInputElement).value,
                  getYearMonth(formData.endDateOffset).month || "01"
                )
              }
              placeholder="2026"
              error={getFieldError("endDateOffset")}
            />
            <Input
              label="End Month"
              type="number"
              min="1"
              max="12"
              value={getYearMonth(formData.endDateOffset).month}
              onChange={(e) =>
                handleYearMonthChange(
                  "endDateOffset",
                  getYearMonth(formData.endDateOffset).year || "2026",
                  (e.target as HTMLInputElement).value.padStart(2, "0")
                )
              }
              placeholder="12"
              error={getFieldError("endDateOffset")}
            />
          </div>
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Bridge Coverage Costs
        </H4>
        <div className="space-y-4">
          <Input
            label="Monthly Premium"
            type="text"
            value={formatNumberWithCommas(formData.bridgeCosts?.monthlyPremium || "")}
            onChange={(e) =>
              handleBridgeCostsChange(
                "monthlyPremium",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="800"
            error={getFieldError("bridgeCosts.monthlyPremium")}
            leftIcon={<span className="text-text-tertiary">$</span>}
            helperText="Monthly premium for bridge healthcare coverage"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Annual Deductible"
              type="text"
              value={formatNumberWithCommas(formData.bridgeCosts?.deductible || "")}
              onChange={(e) =>
                handleBridgeCostsChange(
                  "deductible",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="5,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              error={getFieldError("bridgeCosts.deductible")}
            />
            <Input
              label="Max Out-of-Pocket"
              type="text"
              value={formatNumberWithCommas(formData.bridgeCosts?.maxOutOfPocket || "")}
              onChange={(e) =>
                handleBridgeCostsChange(
                  "maxOutOfPocket",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="15,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              error={getFieldError("bridgeCosts.maxOutOfPocket")}
            />
          </div>

          {showSubsidyField && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="subsidyEligible"
                checked={formData.subsidyEligible || false}
                onChange={(e) => onChange("subsidyEligible", e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <BodyBase as="label" htmlFor="subsidyEligible" className="text-text-secondary">
                Eligible for ACA premium subsidies
              </BodyBase>
            </div>
          )}

          <Input
            label="Annual Premium Growth Rate"
            type="number"
            step="0.01"
            value={formData.annualGrowthRate || 5.0}
            onChange={(e) =>
              onChange("annualGrowthRate", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="5.0"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Healthcare premium inflation rate (typically 5-8%)"
            error={getFieldError("annualGrowthRate")}
          />
        </div>
      </div>

      {showCobraFields && (
        <div>
          <H4 className="mb-4 flex items-center">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
            COBRA Details
          </H4>
          <div className="space-y-4">
            <Input
              label="Original Monthly Premium"
              type="text"
              value={formatNumberWithCommas(formData.cobraDetails?.originalPremium || "")}
              onChange={(e) =>
                handleCobraDetailsChange(
                  "originalPremium",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="500"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="What the full premium was while employed"
              error={getFieldError("cobraDetails.originalPremium")}
            />

            <Input
              label="Employer Contribution"
              type="text"
              value={formatNumberWithCommas(formData.cobraDetails?.employerContribution || "")}
              onChange={(e) =>
                handleCobraDetailsChange(
                  "employerContribution",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="400"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="What employer was paying toward premium"
              error={getFieldError("cobraDetails.employerContribution")}
            />

            <Input
              label="COBRA Cost Multiplier"
              type="number"
              step="0.01"
              value={formData.cobraDetails?.cobraMultiplier || 1.02}
              onChange={(e) =>
                handleCobraDetailsChange(
                  "cobraMultiplier",
                  parseFloat((e.target as HTMLInputElement).value)
                )
              }
              placeholder="1.02"
              helperText="COBRA administrative fee (typically 102% of premium)"
              error={getFieldError("cobraDetails.cobraMultiplier")}
            />
          </div>
        </div>
      )}

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Payment Details
        </H4>
        <div className="space-y-4">
          <div className="space-y-2">
            <BodyBase as="label" className="block font-medium text-text-primary">
              Payment Account
            </BodyBase>
            <select
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.paymentAccount || 'cash'}
              onChange={(e) => onChange("paymentAccount", e.target.value as AccountType)}
            >
              <option value="cash">Cash/Checking</option>
              <option value="taxable">Taxable Brokerage</option>
              <option value="hsa">HSA (if eligible)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-red-600">🏥</span>
          </div>
          <div className="ml-3">
            <BodyBase className="font-medium text-red-800">
              Healthcare Transition Guidelines
            </BodyBase>
            <BodyBase as="div" className="mt-1 text-red-700">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>COBRA:</strong> Up to 18 months coverage, 102% of premium cost</li>
                <li><strong>ACA Marketplace:</strong> Subsidies available based on income</li>
                <li><strong>Short-term plans:</strong> Limited coverage, not ACA-compliant</li>
                <li><strong>Spouse coverage:</strong> May have enrollment restrictions</li>
                <li><strong>HSA eligibility:</strong> High-deductible plans maintain HSA access</li>
                <li><strong>Medicare:</strong> Available at 65, earlier with disability</li>
              </ul>
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};