/**
 * SetupFlowForm - Bronze-tier input form for minimal setup
 *
 * Collects 3-4 essential fields needed for Bronze-tier simulation:
 * - Investable assets
 * - Annual spending
 * - Expected income (optional)
 *
 * Each field submission creates a DraftChange for review.
 */

import React, { useState, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { Heading, Text, Meta } from '@/components/ui/Typography';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { formatChangeValue } from '@/features/chat/types/draftChangeSchema';

// =============================================================================
// TYPES
// =============================================================================

interface SetupFlowStep {
  id: string;
  title: string;
  description: string;
  fields: SetupField[];
}

interface SetupField {
  name: string;
  label: string;
  type: 'currency' | 'number' | 'percent' | 'text';
  placeholder?: string;
  required?: boolean;
  helpText?: string;
}

interface SetupFlowFormProps {
  onComplete?: () => void;
}

// =============================================================================
// BRONZE TIER STEPS
// =============================================================================

const BRONZE_STEPS: SetupFlowStep[] = [
  {
    id: 'assets',
    title: 'Assets',
    description: 'Total investable assets across all accounts',
    fields: [
      {
        name: 'investableAssets',
        label: 'Investable Assets',
        type: 'currency',
        placeholder: '500,000',
        required: true,
        helpText: 'Include 401k, IRA, brokerage, savings (exclude home equity)',
      },
    ],
  },
  {
    id: 'spending',
    title: 'Spending',
    description: 'Your current annual spending',
    fields: [
      {
        name: 'annualSpending',
        label: 'Annual Spending',
        type: 'currency',
        placeholder: '60,000',
        required: true,
        helpText: 'Total yearly expenses including housing, food, healthcare',
      },
    ],
  },
  {
    id: 'income',
    title: 'Future Income',
    description: 'Expected income sources after retiring',
    fields: [
      {
        name: 'expectedIncome',
        label: 'Expected Annual Income',
        type: 'currency',
        placeholder: '24,000',
        required: false,
        helpText: 'Social Security, pension, part-time work (leave blank if unsure)',
      },
    ],
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

export const SetupFlowForm: React.FC<SetupFlowFormProps> = ({ onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const proposeDraftChange = useAppStore((s) => s.proposeDraftChange);
  const canAcceptInput = useAppStore((s) => s.canAcceptDraftInput());

  const currentStep = BRONZE_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === BRONZE_STEPS.length - 1;
  const progress = ((currentStepIndex + 1) / BRONZE_STEPS.length) * 100;

  const handleInputChange = useCallback((fieldName: string, value: string) => {
    // Remove non-numeric characters for currency/number inputs
    const field = currentStep.fields.find((f) => f.name === fieldName);
    if (field?.type === 'currency' || field?.type === 'number') {
      value = value.replace(/[^0-9.]/g, '');
    }
    setValues((prev) => ({ ...prev, [fieldName]: value }));
    setErrors((prev) => ({ ...prev, [fieldName]: '' }));
  }, [currentStep]);

  const validateStep = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    for (const field of currentStep.fields) {
      const value = values[field.name]?.trim() || '';

      if (field.required && !value) {
        newErrors[field.name] = 'This field is required';
        isValid = false;
        continue;
      }

      if (value && (field.type === 'currency' || field.type === 'number')) {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
          newErrors[field.name] = 'Please enter a valid number';
          isValid = false;
        }
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [currentStep, values]);

  const handleNext = useCallback(() => {
    if (!validateStep()) return;
    if (!canAcceptInput) return;

    // Create draft changes for each field in the step
    for (const field of currentStep.fields) {
      const value = values[field.name]?.trim();
      if (!value) continue;

      const numValue = parseFloat(value);

      proposeDraftChange({
        entityType: 'BronzeProfile',
        fieldPath: [field.name],
        oldValue: undefined,
        newValue: field.type === 'currency' || field.type === 'number' ? numValue : value,
        unit: field.type === 'currency' ? 'USD' : field.type === 'percent' ? 'percent' : undefined,
        scope: 'baseline_candidate',
        confidence: 1.0, // Manual input = full confidence
        sourceMessageId: `setup-form-${currentStep.id}`,
      });
    }

    if (isLastStep) {
      onComplete?.();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [validateStep, canAcceptInput, currentStep, values, proposeDraftChange, isLastStep, onComplete]);

  const handleBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const handleSkip = useCallback(() => {
    if (isLastStep) {
      onComplete?.();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [isLastStep, onComplete]);

  // Check if current step can be skipped (all fields optional)
  const canSkip = currentStep.fields.every((f) => !f.required);

  return (
    <div className="p-4">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <Meta>Step {currentStepIndex + 1} of {BRONZE_STEPS.length}</Meta>
          <Meta>{Math.round(progress)}% complete</Meta>
        </div>
        <div className="h-1.5 bg-areum-canvas rounded-full overflow-hidden">
          <div
            className="h-full bg-areum-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <Card className="mb-4">
        <div className="mb-4">
          <Heading size="md">{currentStep.title}</Heading>
          <Text size="sm" color="secondary" className="mt-1">
            {currentStep.description}
          </Text>
        </div>

        <div className="space-y-4">
          {currentStep.fields.map((field) => (
            <FormField
              key={field.name}
              field={field}
              value={values[field.name] || ''}
              error={errors[field.name]}
              onChange={(value) => handleInputChange(field.name, value)}
            />
          ))}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-between gap-3">
        <div>
          {currentStepIndex > 0 && (
            <Button variant="ghost" onClick={handleBack}>
              Back
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {canSkip && (
            <Button variant="ghost" onClick={handleSkip}>
              Skip
            </Button>
          )}
          <Button onClick={handleNext} disabled={!canAcceptInput}>
            {isLastStep ? 'Complete' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// FORM FIELD COMPONENT
// =============================================================================

interface FormFieldProps {
  field: SetupField;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

const FormField: React.FC<FormFieldProps> = ({
  field,
  value,
  error,
  onChange,
}) => {
  const inputId = `field-${field.name}`;
  const showCurrencyPrefix = field.type === 'currency';
  const showPercentSuffix = field.type === 'percent';

  // Format display value for currency
  const displayValue = field.type === 'currency' && value
    ? formatNumberWithCommas(value)
    : value;

  return (
    <div>
      <label htmlFor={inputId} className="block mb-1.5">
        <Text size="sm" weight="medium">
          {field.label}
          {field.required && <span className="text-areum-danger ml-0.5">*</span>}
        </Text>
      </label>

      <div className="relative">
        {showCurrencyPrefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-areum-text-tertiary">
            $
          </span>
        )}
        <input
          id={inputId}
          type="text"
          inputMode={field.type === 'currency' || field.type === 'number' ? 'decimal' : 'text'}
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={`w-full h-10 px-3 bg-areum-surface border rounded-md-areum text-base-areum
            transition-colors focus:outline-none focus:ring-2 focus:ring-areum-accent/30
            ${showCurrencyPrefix ? 'pl-7' : ''}
            ${showPercentSuffix ? 'pr-8' : ''}
            ${error ? 'border-areum-danger' : 'border-areum-border focus:border-areum-accent'}
          `}
        />
        {showPercentSuffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-areum-text-tertiary">
            %
          </span>
        )}
      </div>

      {error ? (
        <Text size="xs" className="mt-1 text-areum-danger">
          {error}
        </Text>
      ) : field.helpText ? (
        <Meta className="mt-1">{field.helpText}</Meta>
      ) : null}
    </div>
  );
};

// =============================================================================
// HELPERS
// =============================================================================

function formatNumberWithCommas(value: string): string {
  // Remove existing commas
  const numericValue = value.replace(/,/g, '');

  // Parse and format with commas
  const num = parseFloat(numericValue);
  if (isNaN(num)) return value;

  // Handle decimals
  const parts = numericValue.split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
}

export default SetupFlowForm;
