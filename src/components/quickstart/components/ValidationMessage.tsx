/**
 * Validation Message Component
 *
 * Provides consistent validation feedback across the quickstart flow
 */

import React from 'react';
import { Label, BodyBase } from '@/components/ui/Typography';

interface ValidationMessageProps {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  details?: string;
  className?: string;
}

const TYPE_STYLES = {
  error: {
    container: 'bg-red-50 border-red-200 text-red-800',
    icon: '❌',
    titleClass: 'text-red-900'
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-800',
    icon: '⚠️',
    titleClass: 'text-amber-900'
  },
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: 'ℹ️',
    titleClass: 'text-blue-900'
  },
  success: {
    container: 'bg-green-50 border-green-200 text-green-800',
    icon: '✅',
    titleClass: 'text-green-900'
  }
};

export const ValidationMessage: React.FC<ValidationMessageProps> = ({
  type,
  message,
  details,
  className = ''
}) => {
  const styles = TYPE_STYLES[type];

  return (
    <div className={`border rounded-lg p-4 ${styles.container} ${className}`}>
      <div className="flex items-start">
        <span className="text-lg mr-3 flex-shrink-0">{styles.icon}</span>
        <div className="flex-1">
          <Label weight="medium" className={styles.titleClass}>{message}</Label>
          {details && (
            <BodyBase className="mt-1 opacity-90">{details}</BodyBase>
          )}
        </div>
      </div>
    </div>
  );
};

// Specific validation components
export const IncomeValidation: React.FC<{ income: number }> = ({ income }) => {
  if (income === 0) {
    return (
      <ValidationMessage
        type="error"
        message="Income is required"
        details="Please enter your annual income to continue with the FIRE planning."
      />
    );
  }
  
  if (income < 30000) {
    return (
      <ValidationMessage
        type="warning"
        message="Low income detected"
        details="FIRE planning may be challenging with this income level. Consider focusing on increasing income first."
      />
    );
  }
  
  return null;
};

export const ExpenseValidation: React.FC<{ income: number; expenses: number }> = ({ 
  income, 
  expenses 
}) => {
  if (expenses === 0) {
    return (
      <ValidationMessage
        type="error"
        message="Expenses are required"
        details="Please estimate your annual expenses to calculate your savings rate."
      />
    );
  }
  
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
  
  if (expenses >= income) {
    return (
      <ValidationMessage
        type="error"
        message="Expenses exceed income"
        details="You'll need to reduce expenses or increase income before pursuing FIRE."
      />
    );
  }
  
  if (savingsRate < 10) {
    return (
      <ValidationMessage
        type="warning"
        message="Low savings rate"
        details="A savings rate below 10% will make FIRE very difficult. Consider reducing expenses."
      />
    );
  }
  
  if (savingsRate > 70) {
    return (
      <ValidationMessage
        type="warning"
        message="Very high savings rate"
        details="A 70%+ savings rate might be unsustainable. Make sure your expense estimate is realistic."
      />
    );
  }
  
  return null;
};

export const AccountValidation: React.FC<{ 
  accounts: Array<{ name: string; balance: number; type: string }> 
}> = ({ accounts }) => {
  if (accounts.length === 0) {
    return (
      <ValidationMessage
        type="info"
        message="No accounts added"
        details="You can skip this step for now and add accounts later, or use a preset to get started."
      />
    );
  }
  
  const totalAssets = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const cashAccounts = accounts.filter(acc => acc.type === 'cash');
  const totalCash = cashAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  
  if (totalAssets > 0 && totalCash === 0) {
    return (
      <ValidationMessage
        type="warning"
        message="No emergency fund detected"
        details="Consider keeping 3-6 months of expenses in cash for emergencies."
      />
    );
  }
  
  if (totalAssets > 1000000 && accounts.length < 3) {
    return (
      <ValidationMessage
        type="info"
        message="Consider diversification"
        details="With significant assets, you might benefit from multiple account types for tax optimization."
      />
    );
  }
  
  return null;
};