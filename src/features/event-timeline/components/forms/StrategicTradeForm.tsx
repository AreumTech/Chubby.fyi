import React, { useEffect } from "react";
import { Input, Select } from "@/components/ui";
import { H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/formatting";

interface StrategicTradeFormProps {
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

const ACCOUNT_TYPES = [
  { value: "cash", label: "Cash/Savings Account" },
  { value: "taxable", label: "Taxable Brokerage Account" },
  { value: "tax_deferred", label: "401(k)/403(b) - Tax Deferred" },
  { value: "roth", label: "Roth IRA/401(k) - Tax Free" },
];

const OPERATION_OPTIONS = [
  { value: "buy", label: "Buy Assets" },
  { value: "sell", label: "Sell Assets" },
];

const REASON_OPTIONS = [
  { value: "rebalancing", label: "Portfolio Rebalancing" },
  { value: "cash_management", label: "Cash Management" },
  { value: "tax_optimization", label: "Tax Optimization" },
  { value: "risk_management", label: "Risk Management" },
];

export const StrategicTradeForm: React.FC<StrategicTradeFormProps> = ({
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
    EventType.STRATEGIC_TRADE
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

  const operation = formData.operation || "sell";
  const isBuyOperation = operation === "buy";

  return (
    <div className="space-y-6">
      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          Strategic Trade Details
        </H4>
        <div className="space-y-4">
          <Input
            label="Description"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Rebalance portfolio by selling bonds"
            error={getFieldError("description")}
          />
          
          <Select
            label="Trade Operation"
            options={OPERATION_OPTIONS}
            value={operation}
            onChange={(value) => onChange("operation", value)}
            error={getFieldError("operation")}
            helperText="Whether to buy or sell assets"
          />

          <Input
            label="Trade Amount"
            type="text"
            value={formatNumberWithCommas(formData.amount || "")}
            onChange={(e) =>
              onChange(
                "amount",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="10,000"
            leftIcon={<span className="text-text-tertiary">$</span>}
            error={getFieldError("amount")}
            helperText={isBuyOperation ? "Amount to invest in assets" : "Value of assets to sell"}
          />

          <Select
            label="Strategic Reason"
            options={REASON_OPTIONS}
            value={formData.reason || ""}
            onChange={(value) => onChange("reason", value)}
            placeholder="Select reason for trade"
            error={getFieldError("reason")}
            helperText="Strategic context for this trade"
          />
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Account & Asset Details
        </H4>
        <div className="space-y-4">
          {isBuyOperation ? (
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Source Account (Cash)"
                options={ACCOUNT_TYPES}
                value={formData.sourceAccountType || ""}
                onChange={(value) => onChange("sourceAccountType", value)}
                placeholder="Account to use cash from"
                error={getFieldError("sourceAccountType")}
                helperText="Account providing cash for purchase"
              />
              
              <Select
                label="Target Account (Assets)"
                options={ACCOUNT_TYPES}
                value={formData.targetAccountType || ""}
                onChange={(value) => onChange("targetAccountType", value)}
                placeholder="Account to buy assets in"
                error={getFieldError("targetAccountType")}
                helperText="Account where assets will be purchased"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Source Account (Assets)"
                options={ACCOUNT_TYPES}
                value={formData.sourceAccountType || ""}
                onChange={(value) => onChange("sourceAccountType", value)}
                placeholder="Account to sell assets from"
                error={getFieldError("sourceAccountType")}
                helperText="Account holding assets to sell"
              />
              
              <Select
                label="Target Account (Cash)"
                options={ACCOUNT_TYPES}
                value={formData.targetAccountType || ""}
                onChange={(value) => onChange("targetAccountType", value)}
                placeholder="Account for sale proceeds"
                error={getFieldError("targetAccountType")}
                helperText="Account where cash proceeds will go"
              />
            </div>
          )}

          <Input
            label="Asset Identifier (Optional)"
            value={formData.assetId || ""}
            onChange={(e) =>
              onChange("assetId", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., VTI, VTIAX, BONDS"
            error={getFieldError("assetId")}
            helperText="Specific asset or asset class to trade"
          />

          <Input
            label="Trade Date"
            type="number"
            value={getYearMonth(formData.monthOffset).year}
            onChange={(e) =>
              handleYearMonthChange(
                "monthOffset",
                (e.target as HTMLInputElement).value,
                getYearMonth(formData.monthOffset).month || "01"
              )
            }
            placeholder="2024"
            error={getFieldError("monthOffset")}
            helperText="Year when trade should execute"
          />
        </div>
      </div>

      <div>
        <H4 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Trade Execution Settings
        </H4>
        <div className="space-y-4">
          <Input
            label="Minimum Trade Size (Optional)"
            type="text"
            value={formatNumberWithCommas(formData.minimumTradeSize || "")}
            onChange={(e) =>
              onChange(
                "minimumTradeSize",
                parseFormattedNumber((e.target as HTMLInputElement).value)
              )
            }
            placeholder="1,000"
            leftIcon={<span className="text-text-tertiary">$</span>}
            error={getFieldError("minimumTradeSize")}
            helperText="Don't execute trades below this amount"
          />

          <Input
            label="Maximum Slippage (Optional)"
            type="number"
            step="0.01"
            value={formData.maxSlippage ? (formData.maxSlippage * 100) : ""}
            onChange={(e) =>
              onChange("maxSlippage", parseFloat((e.target as HTMLInputElement).value) / 100)
            }
            placeholder="0.5"
            rightIcon={<span className="text-text-tertiary">%</span>}
            helperText="Maximum acceptable price deviation"
            error={getFieldError("maxSlippage")}
          />
        </div>
      </div>

      {/* Strategic Trade Information */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-purple-600">⚡</span>
          </div>
          <div className="ml-3">
            <BodyBase weight="medium" className="text-purple-800">
              Strategic Trade Considerations
            </BodyBase>
            <BodyBase className="mt-1 text-purple-700">
              • {isBuyOperation ? "Buy operations" : "Sell operations"} should align with your overall portfolio strategy<br />
              • Consider tax implications of selling appreciated assets<br />
              • Set appropriate slippage limits for volatile markets<br />
              • Minimum trade sizes help avoid excessive transaction costs<br />
              • Review account priorities to optimize tax efficiency
            </BodyBase>
          </div>
        </div>
      </div>
    </div>
  );
};