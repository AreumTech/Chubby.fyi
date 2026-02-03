import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";
import { Button } from "@/components/ui";
import { HelpIcon } from "@/components/HelpTooltip";
import { H3, H4, BodyBase, Caption } from "@/components/ui/Typography";

interface ContributionFormProps {
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
  totalIncome?: number; // Total annual income for percentage calculations
}

const ACCOUNT_TYPES = [
  { value: "tax_deferred", label: "401(k)/403(b) - Tax Deferred", helpConcept: "taxDeferred" },
  { value: "roth", label: "Roth IRA/401(k) - Tax Free", helpConcept: "roth" },
  { value: "taxable", label: "Brokerage - Taxable" },
  { value: "hsa", label: "HSA - Health Savings" },
  { value: "five_twenty_nine", label: "529 - Education" },
];

const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "annually", label: "Annually" },
];

export const ContributionForm: React.FC<ContributionFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
  totalIncome = 0,
}) => {
  // Use centralized date settings
  const { startYear, startMonth } = useStartDate();
  
  const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
    EventType.SCHEDULED_CONTRIBUTION
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
  const accountType = formData.targetAccountType || formData.accountType;
  const isRothAccount = accountType === "roth";
  
  // Contribution limits for 2025
  const getContributionLimits = (accountType: string | undefined, age: number) => {
    const limits = {
      'tax_deferred': {
        standard: 23500,
        catchUp50: 7500, // Additional for age 50+
        catchUp60: 11250 // Additional for ages 60-63 (enhanced catch-up)
      },
      'roth': {
        standard: 7000,
        catchUp50: 1000
      },
      'hsa': {
        standard: 4300, // Individual
        family: 8550
      },
      'five_twenty_nine': {
        standard: 19000 // Annual gift tax exclusion
      }
    };
    
    const accountLimits = limits[accountType as keyof typeof limits];
    if (!accountLimits) return { annual: Infinity, monthly: Infinity };
    
    let annualLimit = accountLimits.standard;
    
    // Add catch-up contributions
    if (age >= 50 && 'catchUp50' in accountLimits) {
      annualLimit += accountLimits.catchUp50;
    }
    
    // Enhanced catch-up for 401k (ages 60-63)
    if (accountType === 'tax_deferred' && age >= 60 && age <= 63) {
      annualLimit = accountLimits.standard + accountLimits.catchUp60;
    }
    
    return {
      annual: annualLimit,
      monthly: Math.round(annualLimit / 12)
    };
  };
  
  const limits = getContributionLimits(accountType, currentAge);
  
  // Quick button handlers
  const handlePercentageOfIncome = (percentage: number) => {
    if (totalIncome > 0) {
      const annualAmount = totalIncome * (percentage / 100);
      const amount = isAnnual ? annualAmount : Math.round(annualAmount / 12);
      onChange("amount", Math.round(amount));
    }
  };
  
  const handleMaxContribution = () => {
    if (limits.annual !== Infinity) {
      const amount = isAnnual ? limits.annual : limits.monthly;
      onChange("amount", amount);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <H3 weight="semibold" className="mb-3 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Contribution Details
        </H3>
        <div className="space-y-4">
          <Input
            label="Description"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., 401(k) Contributions, IRA Contributions"
            error={getFieldError("description")}
          />
          
          <Select
            label="Account Type"
            options={ACCOUNT_TYPES}
            value={formData.targetAccountType || formData.accountType || ""}
            onChange={(value) => onChange("targetAccountType", value)}
            placeholder="Select destination account"
            error={getFieldError("targetAccountType") || getFieldError("accountType")}
            helperText="Where the money will be invested"
          />

          <Select
            label="Frequency"
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={(value) => onChange("frequency", value)}
            error={getFieldError("frequency")}
          />
        </div>
      </div>

      <div>
        <H3 weight="semibold" className="mb-3 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Amount & Timeline
        </H3>
        <div className="space-y-4">
          <div className="space-y-3">
            <Input
              label={`Maximum Contribution (${isAnnual ? "Annual" : "Monthly"})`}
              type="text"
              value={formatNumberWithCommas(formData.amount || "")}
              onChange={(e) =>
                onChange(
                  "amount",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder={isAnnual ? "22,500" : "1,875"}
              error={getFieldError("amount")}
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText={`Maximum ${isAnnual ? "annual" : "monthly"} contribution from excess income (after expenses)`}
            />
            
            {/* Quick Action Buttons - only show if there's content */}
            {(totalIncome > 0 || limits.annual !== Infinity) && (
              <div className="bg-gray-50 rounded-lg p-3">
                <H4 className="mb-2">Quick Actions</H4>

                {totalIncome > 0 && (
                  <div className="mb-3">
                    <Caption color="secondary" className="mb-1.5">Percentage of Income (${formatNumberWithCommas(totalIncome)}/year)</Caption>
                    <div className="flex flex-wrap gap-2">
                      {[10, 15, 20, 25].map(percent => {
                        const annualAmount = totalIncome * (percent / 100);
                        const displayAmount = isAnnual ? annualAmount : annualAmount / 12;
                        return (
                          <Button
                            key={percent}
                            size="sm"
                            variant="secondary"
                            onClick={() => handlePercentageOfIncome(percent)}
                            className="text-xs"
                          >
                            {percent}% (${formatNumberWithCommas(Math.round(displayAmount))})
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {limits.annual !== Infinity && (
                  <div>
                    <Caption color="secondary" className="mb-1.5">Contribution Limits</Caption>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleMaxContribution}
                        className="text-xs"
                      >
                        Max Out (${formatNumberWithCommas(isAnnual ? limits.annual : limits.monthly)})
                      </Button>
                      {accountType === 'tax_deferred' && currentAge < 50 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const catchUpLimit = currentAge >= 60 && currentAge <= 63 ? 34750 : 31000;
                            const amount = isAnnual ? catchUpLimit : Math.round(catchUpLimit / 12);
                            onChange("amount", amount);
                          }}
                          className="text-xs"
                        >
                          Future Max (Age 50+: ${formatNumberWithCommas(isAnnual ? 31000 : Math.round(31000/12))})
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              mode="year"
              label="Start Year"
              value={getYearMonth(formData.startDateOffset).year}
              onYearChange={(year) =>
                handleYearMonthChange(
                  "startDateOffset",
                  year,
                  getYearMonth(formData.startDateOffset).month || "01"
                )
              }
              placeholder="2025"
              error={getFieldError("startDateOffset")}
            />
            <Input
              mode="year"
              label="End Year (Optional)"
              value={getYearMonth(formData.endDateOffset).year}
              onYearChange={(year) =>
                handleYearMonthChange(
                  "endDateOffset",
                  year,
                  getYearMonth(formData.endDateOffset).month || "01"
                )
              }
              placeholder="Leave blank for indefinite"
              error={getFieldError("endDateOffset")}
            />
          </div>

          <Input
            label="Annual Growth Rate"
            type="number"
            step="0.01"
            value={formData.annualGrowthRate || ""}
            onChange={(e) =>
              onChange("annualGrowthRate", parseFloat((e.target as HTMLInputElement).value))
            }
            placeholder="3.0"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Expected annual increase in contribution amount (e.g., salary growth)"
            error={getFieldError("annualGrowthRate")}
          />
        </div>
      </div>

      {/* Contribution Priority Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-600">ℹ️</span>
          </div>
          <div className="ml-2">
            <H4 className="text-blue-800">
              How Contributions Work
            </H4>
            <BodyBase className="mt-0.5 text-blue-700">
              Contributions are made from <strong>excess income after all expenses are paid</strong>.<br />
              <br />
              <strong>Priority Order:</strong><br />
              1️⃣ 401(k)/Tax-Deferred accounts (highest priority)<br />
              2️⃣ Roth IRA/401(k)<br />
              3️⃣ HSA (Health Savings)<br />
              4️⃣ 529 (Education)<br />
              5️⃣ Taxable Brokerage (lowest priority)
            </BodyBase>
            <Caption className="mt-1.5 text-blue-600">
              If you don't have enough excess income, lower-priority contributions may not happen.
            </Caption>
          </div>
        </div>
      </div>

      {/* Roth IRA Income Limit Warning */}
      {isRothAccount && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-amber-600">💰</span>
            </div>
            <div className="ml-2">
              <H4 className="text-amber-800">
                Roth IRA Income Limits
              </H4>
              <BodyBase className="mt-0.5 text-amber-700">
                <strong>2025 Income Limits:</strong><br />
                • Single filers: Full contribution if MAGI is under $150,000<br />
                • Married filing jointly: Full contribution if MAGI is under $236,000<br />
                • Contribution limits may be reduced or eliminated if income exceeds these thresholds.
              </BodyBase>
              <Caption className="mt-1.5 text-amber-600">
                Consider backdoor Roth conversions if you exceed income limits but still want Roth benefits.
              </Caption>
            </div>
          </div>
        </div>
      )}

      {/* 401(k) Contribution Limit Warning */}
      {accountType === "tax_deferred" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-blue-600">📊</span>
            </div>
            <div className="ml-2">
              <H4 className="text-blue-800">
                2025 Contribution Limits
              </H4>
              <BodyBase className="mt-0.5 text-blue-700">
                • Standard limit: $23,500 annually<br />
                • Age 50+ catch-up: Additional $7,500 ($31,000 total)<br />
                • Ages 60-63 enhanced catch-up: Additional $11,250 ($34,750 total)
              </BodyBase>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};