import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui";
import { H3, H4, BodyBase, Caption } from "@/components/ui/Typography";
import { FinancialEvent, EventType } from "@/types";
import { getCalendarYearAndMonthFromMonthOffset } from "@/utils/financialCalculations";
import { useEventFormValidation } from "@/hooks/useFormValidation";

interface AssetAllocationFormProps {
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

interface AssetAllocation {
  stocks: number;
  bonds: number;
  international: number;
  reits: number;
  alternatives: number;
}

const DEFAULT_ALLOCATION: AssetAllocation = {
  stocks: 60,
  bonds: 30,
  international: 10,
  reits: 0,
  alternatives: 0,
};

export const AssetAllocationForm: React.FC<AssetAllocationFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = 2024,
  baseMonth = 1,
  currentAge = 30,
  onValidationChange,
}) => {
  const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
    EventType.STRATEGY_ASSET_ALLOCATION_SET
  );

  // Parse allocation from metadata or use defaults
  const currentAllocation = (formData.metadata as any)?.allocation || DEFAULT_ALLOCATION;
  const [allocation, setAllocation] = useState<AssetAllocation>(currentAllocation);

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

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

  const handleAllocationChange = (assetClass: keyof AssetAllocation, value: number) => {
    const newAllocation = {
      ...allocation,
      [assetClass]: Math.max(0, Math.min(100, value)), // Clamp between 0-100
    };
    setAllocation(newAllocation);
    
    // Update form data
    onChange("metadata", { allocation: newAllocation });
  };

  const totalAllocation = Object.values(allocation).reduce((sum, value) => sum + value, 0);
  const isValidAllocation = Math.abs(totalAllocation - 100) < 0.01;

  const remainingAllocation = 100 - totalAllocation;

  return (
    <div className="space-y-6">
      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
          Strategy Details
        </H3>
        <div className="space-y-4">
          <Input
            label="Strategy Name"
            value={formData.description || ""}
            onChange={(e) =>
              onChange("description", (e.target as HTMLInputElement).value)
            }
            placeholder="e.g., Conservative Retirement Allocation, Growth Portfolio"
            error={getFieldError("description")}
          />

          <Input
            label="Effective Date"
            type="month"
            value={`${getYearMonth(formData.monthOffset).year}-${getYearMonth(formData.monthOffset).month}`}
            onChange={(e) => {
              const [year, month] = (e.target as HTMLInputElement).value.split("-");
              handleYearMonthChange("monthOffset", year, month);
            }}
            error={getFieldError("monthOffset")}
            helperText="When this allocation strategy takes effect"
          />
        </div>
      </div>

      <div>
        <H3 className="mb-4 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          Asset Allocation
        </H3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="US Stocks"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={allocation.stocks}
              onChange={(e) =>
                handleAllocationChange("stocks", parseFloat((e.target as HTMLInputElement).value) || 0)
              }
              rightIcon={<span className="text-text-tertiary">%</span>}
            />
            <Input
              label="Bonds"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={allocation.bonds}
              onChange={(e) =>
                handleAllocationChange("bonds", parseFloat((e.target as HTMLInputElement).value) || 0)
              }
              rightIcon={<span className="text-text-tertiary">%</span>}
            />
            <Input
              label="International"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={allocation.international}
              onChange={(e) =>
                handleAllocationChange("international", parseFloat((e.target as HTMLInputElement).value) || 0)
              }
              rightIcon={<span className="text-text-tertiary">%</span>}
            />
            <Input
              label="REITs"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={allocation.reits}
              onChange={(e) =>
                handleAllocationChange("reits", parseFloat((e.target as HTMLInputElement).value) || 0)
              }
              rightIcon={<span className="text-text-tertiary">%</span>}
            />
            <Input
              label="Alternatives"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={allocation.alternatives}
              onChange={(e) =>
                handleAllocationChange("alternatives", parseFloat((e.target as HTMLInputElement).value) || 0)
              }
              rightIcon={<span className="text-text-tertiary">%</span>}
            />
          </div>

          <div className={`p-4 rounded-lg border ${
            isValidAllocation
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <BodyBase weight="medium" color={isValidAllocation ? 'success' : 'danger'}>
                Total Allocation: {totalAllocation.toFixed(1)}%
              </BodyBase>
              {!isValidAllocation && (
                <BodyBase color="danger">
                  {remainingAllocation > 0 ? `${remainingAllocation.toFixed(1)}% remaining` : `${Math.abs(remainingAllocation).toFixed(1)}% over`}
                </BodyBase>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-yellow-600">💡</span>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-yellow-800">
              Asset Allocation Strategy
            </h4>
            <p className="mt-1 text-sm text-yellow-700">
              This sets your target asset allocation for rebalancing. The portfolio will be 
              rebalanced to match these percentages during periodic rebalancing events.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};