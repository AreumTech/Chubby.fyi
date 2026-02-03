import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui";
import { InitialStateEvent, EventType, FilingStatus } from "@/types";
import { useEventFormValidation } from "@/hooks/useFormValidation";
import { useStartDate } from "@/hooks/useDateSettings";
import { parseFormattedNumber } from "@/utils/formatting";
import { BodyBase } from "@/components/ui/Typography";

interface InitialStateFormProps {
  formData: Partial<InitialStateEvent>;
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

export const InitialStateForm: React.FC<InitialStateFormProps> = ({
  formData,
  onChange,
  onDateChange,
  baseYear = new Date().getFullYear(),
  baseMonth = new Date().getMonth() + 1,
  currentAge = 30,
  onValidationChange,
}) => {
  const { hasFieldError, getFieldError, validateForm } = useEventFormValidation(
    EventType.INITIAL_STATE
  );

  const { startYear, startMonth } = useStartDate();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Simple account totals (no complex holdings UI)
  // Note: Cash comes from formData.initialCash, not formData.initialAccounts.cash
  const [cash, setCash] = useState(0);
  const [taxable, setTaxable] = useState(0);
  const [taxDeferred, setTaxDeferred] = useState(0);
  const [roth, setRoth] = useState(0);

  useEffect(() => {
    // Set smart defaults
    if (!formData.startYear) {
      onChange("startYear", startYear);
    }
    if (!formData.initialMonth) {
      onChange("initialMonth", startMonth);
    }
    if (!formData.currentAge) {
      onChange("currentAge", currentAge);
    }
    if (!formData.filingStatus) {
      onChange("filingStatus", FilingStatus.SINGLE);
    }
    if (!formData.numberOfDependents) {
      onChange("numberOfDependents", 0);
    }
    if (formData.initialCash === undefined) {
      onChange("initialCash", 0);
    }
    if (!formData.initialAccounts) {
      onChange("initialAccounts", { cash: 0 });
    }
  }, [startYear, startMonth]);

  useEffect(() => {
    const validation = validateForm(formData);
    onValidationChange?.(validation.isValid, validation.errors);
  }, [formData, validateForm, onValidationChange]);

  // Extract totals from formData when it changes
  useEffect(() => {
    // Cash is stored separately in initialCash field
    if (typeof formData.initialCash === 'number') {
      setCash(formData.initialCash);
    }

    // Investment accounts stored in initialAccounts
    if (formData.initialAccounts) {
      const accounts = formData.initialAccounts as any;

      // Handle cash in initialAccounts (fallback for simple format)
      if (typeof accounts.cash === 'number' && !formData.initialCash) {
        setCash(accounts.cash);
      }

      // Handle taxable - supports both number and object format
      if (typeof accounts.taxable === 'number') {
        setTaxable(accounts.taxable);
      } else if (accounts.taxable?.totalValue) {
        setTaxable(accounts.taxable.totalValue);
      }

      // Handle tax_deferred - supports both number and object format
      if (typeof accounts.tax_deferred === 'number') {
        setTaxDeferred(accounts.tax_deferred);
      } else if (accounts.tax_deferred?.totalValue) {
        setTaxDeferred(accounts.tax_deferred.totalValue);
      }

      // Handle roth - supports both number and object format
      if (typeof accounts.roth === 'number') {
        setRoth(accounts.roth);
      } else if (accounts.roth?.totalValue) {
        setRoth(accounts.roth.totalValue);
      }
    }
  }, [formData.initialCash, formData.initialAccounts]);

  const handleAccountChange = (accountType: string, value: string) => {
    const numericValue = parseFormattedNumber(value);

    // Update local state
    if (accountType === 'cash') {
      setCash(numericValue);
      // Cash is stored separately in initialCash field
      onChange("initialCash", numericValue);
      // Also update in initialAccounts for consistency with simple format
      const accounts = formData.initialAccounts || {};
      onChange("initialAccounts", { ...accounts, cash: numericValue });
    } else {
      // Update local state for display
      switch(accountType) {
        case 'taxable':
          setTaxable(numericValue);
          break;
        case 'tax_deferred':
          setTaxDeferred(numericValue);
          break;
        case 'roth':
          setRoth(numericValue);
          break;
      }

      // Update initialAccounts with consistent format
      // Use simple number format to match persona data structure
      const accounts = formData.initialAccounts || {};
      const updatedAccounts = {
        ...accounts,
        [accountType]: numericValue  // Store as simple number (matches persona format)
      };

      onChange("initialAccounts", updatedAccounts);
    }
  };

  return (
    <div className="space-y-3">
      {/* Context */}
      <BodyBase color="secondary">
        This is your financial snapshot <strong>today</strong>. Enter your current age and account balances.
        The simulation will project forward from here.
      </BodyBase>

      {/* Essential Info */}
      <div className="space-y-2">
        <div className="border-l-2 border-gray-300 pl-2">
          <Input
            label="Your Age"
            type="number"
            value={formData.currentAge?.toString() || ""}
            onChange={(e) => onChange("currentAge", parseInt(e.target.value) || 0)}
            placeholder="30"
            min="18"
            max="100"
            required
            error={hasFieldError("currentAge") ? getFieldError("currentAge") : undefined}
          />
        </div>
      </div>

      {/* Account Balances - Simplified */}
      <div className="space-y-2">
          <div className="border-l-2 border-gray-300 pl-2">
            <Input
              label="💵 Cash & Checking"
              type="text"
              inputMode="numeric"
              value={cash ? `$${cash.toLocaleString('en-US')}` : ''}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, '');
                const amount = digitsOnly ? parseInt(digitsOnly, 10) : 0;
                handleAccountChange('cash', amount.toString());
              }}
              placeholder="$0"
              helperText="Liquid cash, checking, and savings accounts"
            />
          </div>

          <div className="border-l-2 border-gray-300 pl-2">
            <Input
              label="📈 Taxable"
              type="text"
              inputMode="numeric"
              value={taxable ? `$${taxable.toLocaleString('en-US')}` : ''}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, '');
                const amount = digitsOnly ? parseInt(digitsOnly, 10) : 0;
                handleAccountChange('taxable', amount.toString());
              }}
              placeholder="$0"
              helperText="Brokerage, stocks, bonds"
            />
          </div>

          <div className="border-l-2 border-gray-300 pl-2">
            <Input
              label="🏦 Tax-Deferred"
              type="text"
              inputMode="numeric"
              value={taxDeferred ? `$${taxDeferred.toLocaleString('en-US')}` : ''}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, '');
                const amount = digitsOnly ? parseInt(digitsOnly, 10) : 0;
                handleAccountChange('tax_deferred', amount.toString());
              }}
              placeholder="$0"
              helperText="401k, Traditional IRA"
            />
          </div>

          <div className="border-l-2 border-gray-300 pl-2">
            <Input
              label="🎯 Roth"
              type="text"
              inputMode="numeric"
              value={roth ? `$${roth.toLocaleString('en-US')}` : ''}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, '');
                const amount = digitsOnly ? parseInt(digitsOnly, 10) : 0;
                handleAccountChange('roth', amount.toString());
              }}
              placeholder="$0"
              helperText="Roth IRA, Roth 401k"
            />
          </div>
        </div>
    </div>
  );
};
