/**
 * Enhanced Goal Form Component - Dumb Display Architecture
 *
 * Shared form component for both goal creation and editing.
 * Pure UI component that handles form state and validation.
 * All business logic and calculations moved to dataService.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui';
import { Button } from '@/components/ui';
import { HelpTooltip } from '@/components/HelpTooltip';
import { formatCurrency, parseFormattedNumber } from '@/utils/formatting';
import {
  EnhancedGoal,
  StandardAccountType,
  getAccountFriendlyName,
  GOAL_TEMPLATES,
  GoalTemplate,
  GoalMode
} from '@/types/enhanced-goal';
import { dataService } from '@/services/dataService';
import { Heading, Text, Meta, Body, BodyBase, Label, Caption, Mono } from '@/components/ui/Typography';

export interface EnhancedGoalFormData {
  name: string;
  description: string;
  targetAmount: number;
  targetDate: string;
  accountType: StandardAccountType;
  accountName: string;
  priority: number;
  category: 'RETIREMENT' | 'EMERGENCY_FUND' | 'HOUSE_DOWN_PAYMENT' | 'EDUCATION' | 'VACATION' | 'CUSTOM';
  goalMode: GoalMode; // NEW: What question are we answering?
  metadata: Record<string, any>;
}

export interface EnhancedGoalFormProps {
  initialData?: Partial<EnhancedGoalFormData>;
  currentAccounts?: Array<{ type: StandardAccountType; balance: number; name?: string }>;
  onSubmit: (formData: EnhancedGoalFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
  showTemplateSelection?: boolean;
  annualExpenses?: number; // For emergency fund calculations
}

export const EnhancedGoalForm: React.FC<EnhancedGoalFormProps> = ({
  initialData,
  currentAccounts = [],
  onSubmit,
  onCancel,
  submitLabel = 'Save Goal',
  showTemplateSelection = false,
  annualExpenses = 60000
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null);
  const [formData, setFormData] = useState<EnhancedGoalFormData>({
    name: '',
    description: '',
    targetAmount: 0,
    targetDate: '',
    accountType: 'cash',
    accountName: '',
    priority: 3,
    category: 'CUSTOM',
    goalMode: 'SOLVE_FOR_PROBABILITY', // Default mode
    metadata: {},
    ...initialData
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle template selection
  const handleTemplateSelect = useCallback((template: GoalTemplate) => {
    setSelectedTemplate(template);

    // Auto-populate based on template
    const targetDate = new Date();
    const yearsFromNow = Math.ceil(template.suggestedTimeframe / 12); // Convert months to years
    targetDate.setFullYear(targetDate.getFullYear() + yearsFromNow);

    let defaultAmount = template.suggestedAmount || 0;

    // Special handling for emergency fund - use service calculation
    if (template.id === 'emergency_fund') {
      const suggestions = dataService.calculateGoalFormSuggestions(
        template.suggestedAmount || 50000,
        '',
        'cash',
        currentAccounts,
        annualExpenses
      );
      defaultAmount = suggestions.emergencyFundSuggestion || Math.round(annualExpenses * 0.5);
    }

    // Map template category to form category
    const mapCategory = (templateCategory: any): EnhancedGoalFormData['category'] => {
      switch (templateCategory) {
        case 'RETIREMENT':
          return 'RETIREMENT';
        case 'EDUCATION':
          return 'EDUCATION';
        case 'EMERGENCY_FUND':
          return 'EMERGENCY_FUND';
        case 'HOUSE_DOWN_PAYMENT':
          return 'HOUSE_DOWN_PAYMENT';
        case 'VACATION':
          return 'VACATION';
        default:
          return 'CUSTOM';
      }
    };

    setFormData(prev => ({
      ...prev,
      name: template.name,
      description: template.description,
      targetAmount: defaultAmount,
      targetDate: targetDate.toISOString().split('T')[0],
      accountType: template.suggestedAccount || 'cash',
      category: mapCategory(template.category),
      metadata: { ...prev.metadata, templateId: template.id }
    }));
  }, [annualExpenses, currentAccounts]);

  // Get form suggestions from service (moved from client-side business logic)
  const formSuggestions = useMemo(() => {
    if (!formData.targetAmount || !formData.targetDate) {
      return {
        monthlyContributionNeeded: 0,
        isAchievable: true,
        timelineWarning: undefined
      };
    }

    return dataService.calculateGoalFormSuggestions(
      formData.targetAmount,
      formData.targetDate,
      formData.accountType,
      currentAccounts,
      annualExpenses
    );
  }, [formData.targetAmount, formData.targetDate, formData.accountType, currentAccounts, annualExpenses]);

  // Form validation - conditional based on goal mode
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Goal name is required';
    }

    // Mode 1 (SOLVE_FOR_TIME): Require targetAmount, targetDate optional
    // Mode 2 (SOLVE_FOR_PROBABILITY): Require both targetAmount and targetDate
    // Mode 3 (SOLVE_FOR_AMOUNT): Require targetDate, targetAmount optional

    if (formData.goalMode === 'SOLVE_FOR_TIME' || formData.goalMode === 'SOLVE_FOR_PROBABILITY') {
      if (formData.targetAmount <= 0) {
        newErrors.targetAmount = 'Target amount must be greater than 0';
      }
    }

    if (formData.goalMode === 'SOLVE_FOR_AMOUNT' || formData.goalMode === 'SOLVE_FOR_PROBABILITY') {
      if (!formData.targetDate) {
        newErrors.targetDate = 'Target date is required';
      } else {
        const targetDate = new Date(formData.targetDate);
        if (targetDate <= new Date()) {
          newErrors.targetDate = 'Target date must be in the future';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  }, [formData, validateForm, onSubmit]);

  // Handle input changes
  const handleInputChange = useCallback((field: keyof EnhancedGoalFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* Template Selection (if enabled) */}
      {showTemplateSelection && !selectedTemplate && (
        <div>
          <Heading size="md" className="mb-1">What are you saving for?</Heading>
          <Text size="sm" color="secondary" className="mb-4">Choose a template to get started, or create your own custom goal</Text>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {GOAL_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateSelect(template)}
                className="p-3 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 text-left transition-all hover:shadow-md"
              >
                <div className="flex items-start space-x-4">
                  <span className="text-3xl flex-shrink-0">{template.icon}</span>
                  <div className="flex-1">
                    <Text size="base" weight="semibold" className="mb-1">{template.name}</Text>
                    <BodyBase className="block" color="secondary">{template.description}</BodyBase>
                  </div>
                </div>
              </button>
            ))}
            {/* Custom Goal Option */}
            <button
              type="button"
              onClick={() => setSelectedTemplate({ id: 'custom', name: 'Custom Goal', icon: '✨', description: '', category: 'CUSTOM', suggestedAccount: 'cash', suggestedAmount: 0, suggestedTimeframe: 12, tips: [] })}
              className="p-3 border-2 border-gray-300 border-dashed rounded-xl hover:border-blue-400 hover:bg-blue-50 text-left transition-all hover:shadow-md"
            >
              <div className="flex items-start space-x-4">
                <span className="text-3xl flex-shrink-0">✨</span>
                <div className="flex-1">
                  <Text size="base" weight="semibold" className="mb-1">Custom Goal</Text>
                  <BodyBase className="block" color="secondary">Create your own goal from scratch</BodyBase>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Goal Details Form */}
      {(!showTemplateSelection || selectedTemplate) && (
        <>
          {/* Show selected template (if any) */}
          {selectedTemplate && selectedTemplate.id !== 'custom' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{selectedTemplate.icon}</span>
                <div>
                  <Text size="base" weight="medium" className="text-blue-900">{selectedTemplate.name}</Text>
                  <BodyBase className="block text-blue-700">{selectedTemplate.description}</BodyBase>
                </div>
              </div>
            </div>
          )}

          {/* Goal Mode Selector */}
          <div>
            <Label as="label" weight="semibold" color="secondary" className="block mb-3">
              What would you like to know? *
            </Label>
            <div className="grid grid-cols-1 gap-3">
              {/* Mode 1: Solve for Time */}
              <button
                type="button"
                onClick={() => handleInputChange('goalMode', 'SOLVE_FOR_TIME')}
                className={`p-3 border-2 rounded-lg text-left transition-all ${
                  formData.goalMode === 'SOLVE_FOR_TIME'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start">
                  <input
                    type="radio"
                    checked={formData.goalMode === 'SOLVE_FOR_TIME'}
                    onChange={() => handleInputChange('goalMode', 'SOLVE_FOR_TIME')}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <Body weight="semibold" className="block mb-1">⏱️ When will I reach my target?</Body>
                    <BodyBase color="secondary">Set a target amount, see when you'll achieve it</BodyBase>
                  </div>
                </div>
              </button>

              {/* Mode 2: Solve for Probability */}
              <button
                type="button"
                onClick={() => handleInputChange('goalMode', 'SOLVE_FOR_PROBABILITY')}
                className={`p-3 border-2 rounded-lg text-left transition-all ${
                  formData.goalMode === 'SOLVE_FOR_PROBABILITY'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start">
                  <input
                    type="radio"
                    checked={formData.goalMode === 'SOLVE_FOR_PROBABILITY'}
                    onChange={() => handleInputChange('goalMode', 'SOLVE_FOR_PROBABILITY')}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <Body weight="semibold" className="block mb-1">🎯 Will I reach my target by a date?</Body>
                    <BodyBase color="secondary">Set target amount and date, see success probability</BodyBase>
                  </div>
                </div>
              </button>

              {/* Mode 3: Solve for Amount */}
              <button
                type="button"
                onClick={() => handleInputChange('goalMode', 'SOLVE_FOR_AMOUNT')}
                className={`p-3 border-2 rounded-lg text-left transition-all ${
                  formData.goalMode === 'SOLVE_FOR_AMOUNT'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start">
                  <input
                    type="radio"
                    checked={formData.goalMode === 'SOLVE_FOR_AMOUNT'}
                    onChange={() => handleInputChange('goalMode', 'SOLVE_FOR_AMOUNT')}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <Body weight="semibold" className="block mb-1">💰 How much will I have by a date?</Body>
                    <BodyBase color="secondary">Set a target date, see projected account balance</BodyBase>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Goal Name */}
          <div>
            <Label as="label" weight="semibold" color="secondary" className="block mb-2">
              Goal Name *
            </Label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Early Retirement, House Down Payment"
              error={errors.name}
              required
            />
          </div>

          {/* Target Amount & Date - Conditional based on goal mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Target Amount - Required for Mode 1 & 2, Optional for Mode 3 */}
            {formData.goalMode !== 'SOLVE_FOR_AMOUNT' && (
              <div>
                <Label as="label" weight="semibold" color="secondary" className="block mb-2">
                  Target Amount {(formData.goalMode === 'SOLVE_FOR_TIME' || formData.goalMode === 'SOLVE_FOR_PROBABILITY') && '*'}
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={formData.targetAmount ? `$${formData.targetAmount.toLocaleString('en-US')}` : ''}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '');
                    const amount = digitsOnly ? parseInt(digitsOnly, 10) : 0;
                    handleInputChange('targetAmount', amount);
                  }}
                  placeholder="$50,000"
                  error={errors.targetAmount}
                  required={formData.goalMode === 'SOLVE_FOR_TIME' || formData.goalMode === 'SOLVE_FOR_PROBABILITY'}
                />
              </div>
            )}

            {/* Target Date - Required for Mode 2 & 3, Optional for Mode 1 */}
            {formData.goalMode !== 'SOLVE_FOR_TIME' && (
              <div>
                <Label as="label" weight="semibold" color="secondary" className="block mb-2">
                  Target Date {(formData.goalMode === 'SOLVE_FOR_AMOUNT' || formData.goalMode === 'SOLVE_FOR_PROBABILITY') && '*'}
                </Label>
                <Input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => handleInputChange('targetDate', e.target.value)}
                  error={errors.targetDate}
                  required={formData.goalMode === 'SOLVE_FOR_AMOUNT' || formData.goalMode === 'SOLVE_FOR_PROBABILITY'}
                />
              </div>
            )}
          </div>

          {/* Account Type & Priority - Side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label as="label" weight="semibold" color="secondary" className="block mb-2">
                Account Type *
              </Label>
              <select
                value={formData.accountType}
                onChange={(e) => handleInputChange('accountType', e.target.value as StandardAccountType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="cash">Cash/Savings</option>
                <option value="taxable">Taxable Brokerage</option>
                <option value="tax_deferred">401(k)/IRA (Tax Deferred)</option>
                <option value="roth">Roth IRA/401(k)</option>
                <option value="529">529 Education</option>
              </select>
            </div>

            <div>
              <Label as="label" weight="semibold" color="secondary" className="block mb-2">
                Priority
              </Label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1}>🔴 Critical</option>
                <option value={2}>🟠 High</option>
                <option value={3}>🟡 Medium</option>
                <option value={4}>🟢 Low</option>
              </select>
            </div>
          </div>

          {/* Description (Optional) - Moved down */}
          <div>
            <Label as="label" color="secondary" className="block mb-2">
              Notes (Optional)
            </Label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Add any notes about this goal..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Monthly Contribution Display */}
          {formSuggestions.monthlyContributionNeeded > 0 && (
            <div className={`border-2 rounded-xl p-3 ${
              formSuggestions.isAchievable
                ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300'
                : 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className={`mb-1 ${
                    formSuggestions.isAchievable ? 'text-blue-700' : 'text-orange-700'
                  }`}>
                    Monthly Contribution Needed
                  </Label>
                  <div className={`text-3xl font-bold ${
                    formSuggestions.isAchievable ? 'text-blue-900' : 'text-orange-900'
                  }`}>
                    <Mono as="span" weight="bold" className="text-3xl">
                      {formatCurrency(formSuggestions.monthlyContributionNeeded)}
                    </Mono>
                    <Caption as="span" className="text-lg font-normal">/month</Caption>
                  </div>
                </div>
                <div className={`text-5xl ${formSuggestions.isAchievable ? 'text-blue-300' : 'text-orange-300'}`}>
                  {formSuggestions.isAchievable ? '✓' : '⚠️'}
                </div>
              </div>
              {formSuggestions.timelineWarning && (
                <div className="mt-3 pt-3 border-t border-orange-300">
                  <BodyBase weight="medium" className="text-orange-800">
                    {formSuggestions.timelineWarning}
                  </BodyBase>
                </div>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            {showTemplateSelection && selectedTemplate && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplate(null);
                  setFormData({
                    name: '',
                    description: '',
                    targetAmount: 0,
                    targetDate: '',
                    accountType: 'cash',
                    accountName: '',
                    priority: 3,
                    category: 'CUSTOM',
                    goalMode: 'SOLVE_FOR_PROBABILITY',
                    metadata: {}
                  });
                }}
                className="hover:text-gray-700"
              >
                <BodyBase color="tertiary" weight="medium">← Back to templates</BodyBase>
              </button>
            )}
            <div className={`flex space-x-3 ${showTemplateSelection && selectedTemplate ? '' : 'ml-auto'}`}>
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="min-w-[140px]"
              >
                {submitLabel}
              </Button>
            </div>
          </div>
        </>
      )}
    </form>
  );
};

export default EnhancedGoalForm;