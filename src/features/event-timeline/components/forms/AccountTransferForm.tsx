import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H4, BodyBase } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";
import { HelpIcon } from "@/components/HelpTooltip";

// Form data type - uses generic record to allow dynamic property access
type AccountTransferFormData = Record<string, any>;

interface AccountTransferFormProps {
  formData: AccountTransferFormData;
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

const ACCOUNT_TYPES = [
  { value: "tax_deferred", label: "401(k)/403(b)/Traditional IRA - Tax Deferred", helpConcept: "taxDeferred" },
  { value: "roth", label: "Roth IRA/401(k) - Tax Free", helpConcept: "roth" },
  { value: "taxable", label: "Brokerage - Taxable" },
  { value: "hsa", label: "HSA - Health Savings" },
  { value: "cash", label: "Cash/Savings" },
  { value: "five_twenty_nine", label: "529 - Education" },
];

const TRANSFER_TYPES = [
  { 
    value: "direct_rollover", 
    label: "Direct Rollover", 
    description: "Funds move directly between trustees (no tax withholding)" 
  },
  { 
    value: "indirect_rollover", 
    label: "Indirect Rollover", 
    description: "You receive funds and have 60 days to redeposit (20% withholding)" 
  },
  { 
    value: "trustee_to_trustee", 
    label: "Trustee-to-Trustee Transfer", 
    description: "Direct transfer between like accounts (no taxes)" 
  },
  { 
    value: "in_kind_transfer", 
    label: "In-Kind Transfer", 
    description: "Transfer investments without selling (preserves cost basis)" 
  },
  { 
    value: "cash_transfer", 
    label: "Cash Transfer", 
    description: "Liquidate investments before transfer" 
  },
];

const TRANSFER_PURPOSES = [
  { value: "rollover", label: "Job Change Rollover" },
  { value: "optimization", label: "Asset Location Optimization" },
  { value: "consolidation", label: "Account Consolidation" },
  { value: "rebalancing", label: "Portfolio Rebalancing" },
  { value: "other", label: "Other" },
];

export const AccountTransferForm: React.FC<AccountTransferFormProps> = ({
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
    EventType.ACCOUNT_TRANSFER
  );

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Set default values
  useEffect(() => {
    if (!formData.transferType) {
      onChange("transferType", "direct_rollover");
    }
    if (!formData.transferPurpose) {
      onChange("transferPurpose", "rollover");
    }
    if (!formData.sourceAccountType) {
      onChange("sourceAccountType", "tax_deferred");
    }
    if (!formData.targetAccountType) {
      onChange("targetAccountType", "tax_deferred");
    }
  }, [formData.transferType, formData.transferPurpose, formData.sourceAccountType, formData.targetAccountType, onChange]);

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

  const transferType = formData.transferType || "direct_rollover";
  const sourceAccountType = formData.sourceAccountType || "tax_deferred";
  const targetAccountType = formData.targetAccountType || "tax_deferred";
  const transferPurpose = formData.transferPurpose || "rollover";
  
  // Determine if this is a taxable event
  const isCrossingTaxBoundaries = (
    (sourceAccountType === "tax_deferred" && targetAccountType === "roth") ||
    (sourceAccountType === "roth" && targetAccountType === "tax_deferred") ||
    (["tax_deferred", "roth"].includes(sourceAccountType) && targetAccountType === "taxable") ||
    (sourceAccountType === "taxable" && ["tax_deferred", "roth"].includes(targetAccountType))
  );

  const isIndirectRollover = transferType === "indirect_rollover";
  const mayHaveTaxImplications = isCrossingTaxBoundaries || isIndirectRollover;

  return (
    <div className="space-y-6">
      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Transfer Details
          <HelpIcon concept="accountTransfer" className="ml-2" />
        </H4>
        <div className="space-y-4">
          <Input
            label="Transfer Description"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., 401(k) to IRA Rollover, Asset Location Optimization"
            error={getFieldError("description")}
          />
          
          <Select
            label="Transfer Purpose"
            options={TRANSFER_PURPOSES}
            value={transferPurpose}
            onChange={(value) => onChange("transferPurpose", value)}
            error={getFieldError("transferPurpose")}
            helperText="Why are you making this transfer?"
          />

          <Select
            label="Transfer Type"
            options={TRANSFER_TYPES}
            value={transferType}
            onChange={(value) => onChange("transferType", value)}
            error={getFieldError("transferType")}
            helperText="How the transfer will be executed"
          />

          <Input
            label="Transfer Date"
            type="month"
            value={`${getYearMonth(formData.monthOffset).year}-${getYearMonth(formData.monthOffset).month}`}
            onChange={(e) => {
              const [year, month] = (e.target as HTMLInputElement).value.split("-");
              handleYearMonthChange("monthOffset", year, month);
            }}
            error={getFieldError("monthOffset")}
            helperText="When to execute the transfer"
          />
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Account Details
        </H4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="From Account"
              options={ACCOUNT_TYPES}
              value={sourceAccountType}
              onChange={(value) => onChange("sourceAccountType", value)}
              error={getFieldError("sourceAccountType")}
              helperText="Source account"
            />
            
            <Select
              label="To Account"
              options={ACCOUNT_TYPES}
              value={targetAccountType}
              onChange={(value) => onChange("targetAccountType", value)}
              error={getFieldError("targetAccountType")}
              helperText="Destination account"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Transfer Amount"
              type="text"
              value={formatNumberWithCommas(formData.amount || "")}
              onChange={(e) =>
                onChange(
                  "amount",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="100,000"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Amount to transfer"
              error={getFieldError("amount")}
            />

            <Input
              label="Transfer Percentage (Optional)"
              type="number"
              step="0.1"
              value={formData.transferPercentage || ""}
              onChange={(e) =>
                onChange("transferPercentage", parseFloat((e.target as HTMLInputElement).value))
              }
              placeholder="100"
              rightIcon={<span className="text-text-tertiary">%</span>}
              helperText="Percentage of account to transfer"
              error={getFieldError("transferPercentage")}
            />
          </div>
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Transfer Options
        </H4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="liquidateBeforeTransfer"
                checked={formData.liquidateBeforeTransfer || false}
                onChange={(e) => onChange("liquidateBeforeTransfer", e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="liquidateBeforeTransfer" className="text-sm font-medium text-gray-700">
                Liquidate before transfer
              </label>
              <HelpIcon concept="liquidateBeforeTransfer" className="ml-1" />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isDueToJobChange"
                checked={formData.isDueToJobChange || false}
                onChange={(e) => onChange("isDueToJobChange", e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isDueToJobChange" className="text-sm font-medium text-gray-700">
                Due to job change
              </label>
              <HelpIcon concept="jobChangeTransfer" className="ml-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Transfer Fees"
              type="text"
              value={formatNumberWithCommas(formData.transferFees || "")}
              onChange={(e) =>
                onChange(
                  "transferFees",
                  parseFormattedNumber((e.target as HTMLInputElement).value)
                )
              }
              placeholder="0"
              leftIcon={<span className="text-text-tertiary">$</span>}
              helperText="Transfer fees or penalties"
              error={getFieldError("transferFees")}
            />

            <Input
              label="Waiting Period (Days)"
              type="number"
              value={formData.waitingPeriodDays || ""}
              onChange={(e) =>
                onChange("waitingPeriodDays", parseInt((e.target as HTMLInputElement).value))
              }
              placeholder="0"
              helperText="Days before funds are available"
              error={getFieldError("waitingPeriodDays")}
            />
          </div>

          <Input
            label="Transfer Notes (Optional)"
            value={formData.transferNotes || ""}
            onChange={(e) =>
              onChange("transferNotes", (e.target as HTMLInputElement).value)
            }
            placeholder="Any special considerations or restrictions"
            helperText="Notes about transfer restrictions or requirements"
          />
        </div>
      </div>

      {isIndirectRollover && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-600">⚠️</span>
            </div>
            <div className="ml-3">
              <BodyBase weight="medium" className="text-yellow-800">
                Indirect Rollover Requirements
              </BodyBase>
              <BodyBase className="mt-1 text-yellow-700">
                With an indirect rollover, you'll receive the funds with 20% federal tax withholding.
                You have 60 days to deposit the full amount (including the withheld taxes) into the new account
                to avoid taxes and penalties on the distribution.
              </BodyBase>
            </div>
          </div>
        </div>
      )}

      {mayHaveTaxImplications && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-orange-600">💰</span>
            </div>
            <div className="ml-3">
              <BodyBase weight="medium" className="text-orange-800">
                Tax Implications
              </BodyBase>
              <BodyBase className="mt-1 text-orange-700">
                This transfer may have tax consequences because you're moving money between different account types.
                {isCrossingTaxBoundaries && " Moving between tax-deferred, Roth, and taxable accounts can trigger taxable events."}
                {isIndirectRollover && " Indirect rollovers are subject to mandatory 20% withholding."}
                Consider consulting a tax professional before proceeding.
              </BodyBase>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-600">💡</span>
          </div>
          <div className="ml-3">
            <BodyBase weight="medium" className="text-blue-800">
              Transfer Best Practices
            </BodyBase>
            <BodyBase as="ul" className="mt-1 text-blue-700 list-disc list-inside space-y-1">
              <li>Direct rollovers avoid tax withholding and the 60-day rule</li>
              <li>Trustee-to-trustee transfers are the safest for like accounts</li>
              <li>Consider asset location optimization when choosing target accounts</li>
              <li>Account for transfer fees and waiting periods in your planning</li>
              <li>Keep detailed records for tax reporting purposes</li>
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};