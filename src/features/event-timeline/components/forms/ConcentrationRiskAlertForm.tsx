import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H3, H4, BodyBase } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface ConcentrationRiskAlertFormProps {
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

const RISK_TYPE_OPTIONS = [
  { value: "SINGLE_STOCK", label: "Single Stock" },
  { value: "SECTOR", label: "Sector Concentration" },
  { value: "ASSET_CLASS", label: "Asset Class" },
  { value: "GEOGRAPHIC", label: "Geographic Region" },
  { value: "CUSTOM", label: "Custom Risk" },
];

const ALERT_ACTION_OPTIONS = [
  { value: "NOTIFY_ONLY", label: "Notify Only" },
  { value: "SUGGEST_REBALANCE", label: "Suggest Rebalancing" },
  { value: "AUTO_REBALANCE", label: "Auto-Rebalance" },
];

const ACCOUNT_TYPES = [
  { value: "cash", label: "Cash/Savings Account" },
  { value: "taxable", label: "Taxable Brokerage Account" },
  { value: "tax_deferred", label: "401(k)/403(b) - Tax Deferred" },
  { value: "roth", label: "Roth IRA/401(k) - Tax Free" },
];

const CHECK_FREQUENCY_OPTIONS = [
  { value: "1", label: "Monthly" },
  { value: "3", label: "Quarterly" },
  { value: "6", label: "Semi-Annually" },
  { value: "12", label: "Annually" },
];

export const ConcentrationRiskAlertForm: React.FC<ConcentrationRiskAlertFormProps> = ({
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
    EventType.CONCENTRATION_RISK_ALERT
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

  const includeAllAccounts = formData.includeAllAccounts ?? true;
  const alertAction = formData.alertAction || "NOTIFY_ONLY";
  const showRebalanceTarget = alertAction === "SUGGEST_REBALANCE" || alertAction === "AUTO_REBALANCE";

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
          Risk Monitoring Setup
        </H3>
        <div className="space-y-4">
          <Input
            label="Alert Name"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., AAPL Stock Concentration Alert"
            error={getFieldError("description")}
          />
          
          <Select
            label="Risk Type"
            options={RISK_TYPE_OPTIONS}
            value={formData.riskType || ""}
            onChange={(value) => onChange("riskType", value)}
            placeholder="Select risk type to monitor"
            error={getFieldError("riskType")}
          />

          <Input
            label="Asset Identifier"
            value={formData.assetIdentifier || ""}
            onChange={(e) =>
              onChange("assetIdentifier", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., AAPL, Technology, US Stocks"
            error={getFieldError("assetIdentifier")}
            helperText="Stock symbol, sector name, or asset class to monitor"
          />

          <Input
            label="Threshold Percentage"
            type="number"
            step="0.1"
            value={formData.thresholdPercentage ? (formData.thresholdPercentage * 100) : ""}
            onChange={(e) =>
              onChange("thresholdPercentage", parseFloat((e.target as HTMLInputElement).value) / 100)
            }
            placeholder="20"
            rightIcon={<span className="text-text-tertiary">%</span>}
            error={getFieldError("thresholdPercentage")}
            helperText="Alert when asset exceeds this percentage of portfolio"
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Monitoring Scope & Frequency
        </H3>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeAllAccounts"
              checked={includeAllAccounts}
              onChange={(e) => onChange("includeAllAccounts", e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="includeAllAccounts" className="text-sm text-gray-700">
              Monitor across all accounts
            </label>
          </div>

          {!includeAllAccounts && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Specific Accounts to Monitor
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ACCOUNT_TYPES.map((account) => (
                  <div key={account.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={account.value}
                      checked={(formData.accountTypes || []).includes(account.value)}
                      onChange={(e) => {
                        const currentTypes = formData.accountTypes || [];
                        const newTypes = e.target.checked
                          ? [...currentTypes, account.value]
                          : currentTypes.filter(type => type !== account.value);
                        onChange("accountTypes", newTypes);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor={account.value} className="text-sm text-gray-700">
                      {account.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Select
            label="Check Frequency"
            options={CHECK_FREQUENCY_OPTIONS}
            value={(formData.checkFrequencyMonths || 3).toString()}
            onChange={(value) => onChange("checkFrequencyMonths", parseInt(value))}
            error={getFieldError("checkFrequencyMonths")}
            helperText="How often to check for concentration risk"
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
              helperText="When to start monitoring"
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
              placeholder="Leave blank for indefinite"
              error={getFieldError("endDateOffset")}
              helperText="When to stop monitoring"
            />
          </div>
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
          Alert Actions
        </H3>
        <div className="space-y-4">
          <Select
            label="Alert Action"
            options={ALERT_ACTION_OPTIONS}
            value={alertAction}
            onChange={(value) => onChange("alertAction", value)}
            error={getFieldError("alertAction")}
            helperText="What to do when threshold is breached"
          />

          {showRebalanceTarget && (
            <Input
              label="Target Percentage After Rebalancing"
              type="number"
              step="0.1"
              value={formData.targetPercentageAfterRebalance ? (formData.targetPercentageAfterRebalance * 100) : ""}
              onChange={(e) =>
                onChange("targetPercentageAfterRebalance", parseFloat((e.target as HTMLInputElement).value) / 100)
              }
              placeholder="15"
              rightIcon={<span className="text-text-tertiary">%</span>}
              error={getFieldError("targetPercentageAfterRebalance")}
              helperText="Target allocation after rebalancing"
            />
          )}

          <Input
            label="Custom Alert Message (Optional)"
            value={formData.customMessage || ""}
            onChange={(e) =>
              onChange("customMessage", (e.target as HTMLInputElement).value)
            }
            placeholder="Custom message to display when alert triggers"
            error={getFieldError("customMessage")}
            helperText="Additional context for the alert"
          />
        </div>
      </div>

      {/* Concentration Risk Information */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-red-600">⚠️</span>
          </div>
          <div className="ml-3">
            <H4 color="danger">
              Concentration Risk Guidelines
            </H4>
            <BodyBase color="danger" className="mt-1">
              • Single stock: Generally limit to 5-10% of portfolio<br />
              • Employer stock: Be especially cautious (career + investments)<br />
              • Sector concentration: Avoid &gt;20-25% in any single sector<br />
              • Geographic: Consider global diversification<br />
              • Regular monitoring helps maintain balanced risk exposure
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};