/**
 * Expense Breakdown Display Component
 *
 * Shows detailed monthly expense breakdown and allows toggling
 * between breakdown view and summary view.
 */

import React from 'react';
import { Button } from '@/components/ui';
import { BodyBase, H2, Label, Mono } from '@/components/ui/Typography';
import { ExpenseBreakdown } from './expensePresets';

interface ExpenseBreakdownDisplayProps {
  monthlyExpenses: number;
  annualExpenses: number;
  preset: ExpenseBreakdown;
  showBreakdown: boolean;
  onToggleBreakdown: () => void;
}

export const ExpenseBreakdownDisplay: React.FC<ExpenseBreakdownDisplayProps> = ({
  monthlyExpenses,
  annualExpenses,
  preset,
  showBreakdown,
  onToggleBreakdown
}) => {
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
      <div className="flex justify-between items-start mb-3">
        <div>
          <BodyBase className="text-blue-700 mb-1">Estimated Monthly Expenses</BodyBase>
          <H2 weight="bold" className="text-blue-900">
            ${monthlyExpenses.toLocaleString()}/mo
          </H2>
          <BodyBase className="text-blue-600 mt-1">
            ${annualExpenses.toLocaleString()} annually
          </BodyBase>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onToggleBreakdown}
          className="text-xs"
        >
          {showBreakdown ? 'Hide' : 'Show'} Breakdown
        </Button>
      </div>

      {/* Breakdown */}
      {showBreakdown && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-blue-700">
                Housing (Rent/Mortgage + Tax)
              </Label>
              <Mono weight="medium" className="text-blue-900">
                ${preset.housing?.toLocaleString() || 0}
              </Mono>
            </div>
            <div className="flex justify-between">
              <Label className="text-blue-700">Food & Groceries</Label>
              <Mono weight="medium" className="text-blue-900">
                ${preset.food?.toLocaleString() || 0}
              </Mono>
            </div>
            <div className="flex justify-between">
              <Label className="text-blue-700">Transportation</Label>
              <Mono weight="medium" className="text-blue-900">
                ${preset.transport?.toLocaleString() || 0}
              </Mono>
            </div>
            <div className="flex justify-between">
              <Label className="text-blue-700">Utilities</Label>
              <Mono weight="medium" className="text-blue-900">
                ${preset.utilities?.toLocaleString() || 0}
              </Mono>
            </div>
            <div className="flex justify-between">
              <Label className="text-blue-700">Insurance</Label>
              <Mono weight="medium" className="text-blue-900">
                ${preset.insurance?.toLocaleString() || 0}
              </Mono>
            </div>
            <div className="flex justify-between">
              <Label className="text-blue-700">Personal Care</Label>
              <Mono weight="medium" className="text-blue-900">
                ${preset.personal?.toLocaleString() || 0}
              </Mono>
            </div>
            <div className="flex justify-between">
              <Label className="text-blue-700">Entertainment</Label>
              <Mono weight="medium" className="text-blue-900">
                ${preset.entertainment?.toLocaleString() || 0}
              </Mono>
            </div>
            {'childcare' in preset && preset.childcare && (
              <div className="flex justify-between">
                <Label className="text-blue-700">Childcare</Label>
                <Mono weight="medium" className="text-blue-900">
                  ${preset.childcare.toLocaleString()}
                </Mono>
              </div>
            )}
            <div className="flex justify-between">
              <Label className="text-blue-700">Other</Label>
              <Mono weight="medium" className="text-blue-900">
                ${preset.other?.toLocaleString() || 0}
              </Mono>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};