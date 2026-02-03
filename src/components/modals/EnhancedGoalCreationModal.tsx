/**
 * Enhanced Goal Creation Modal
 *
 * Redesigned to match user mental models:
 * - "Save $X in Y account by Z date"
 * - Account-specific targeting
 * - Smart templates and calculations
 */

import React from 'react';
import { Modal } from '@/components/ui';
import { EnhancedGoal, StandardAccountType } from '@/types/enhanced-goal';
import { EnhancedGoalForm, EnhancedGoalFormData } from '@/components/forms/EnhancedGoalForm';

interface EnhancedGoalCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGoal: (goal: Omit<EnhancedGoal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  currentAccounts?: Array<{ type: StandardAccountType; balance: number; name?: string }>;
  annualExpenses?: number; // For calculating emergency fund
}

export const EnhancedGoalCreationModal: React.FC<EnhancedGoalCreationModalProps> = ({
  isOpen,
  onClose,
  onCreateGoal,
  currentAccounts = [],
  annualExpenses = 60000
}) => {
  const handleSubmit = (formData: EnhancedGoalFormData) => {
    // Convert form data to EnhancedGoal format
    // Map numeric priority to string priority
    const priorityMap: Record<number, 'HIGH' | 'MEDIUM' | 'LOW'> = {
      1: 'HIGH',
      2: 'HIGH',
      3: 'MEDIUM',
      4: 'LOW'
    };

    const goalData: Omit<EnhancedGoal, 'id' | 'createdAt' | 'updatedAt'> = {
      name: formData.name,
      description: formData.description,
      targetAmount: formData.targetAmount,
      targetDate: formData.targetDate ? new Date(formData.targetDate) : undefined,
      goalMode: formData.goalMode,
      targetAccount: {
        type: formData.accountType,
        name: formData.accountName || undefined
      },
      category: formData.category,
      priority: priorityMap[formData.priority] || 'MEDIUM',
      isActive: true
    };

    onCreateGoal(goalData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Goal"
    >
      <div className="max-w-4xl max-h-[85vh] overflow-y-auto px-2">
        <EnhancedGoalForm
          currentAccounts={currentAccounts}
          onSubmit={handleSubmit}
          onCancel={onClose}
          submitLabel="Create Goal"
          showTemplateSelection={true}
          annualExpenses={annualExpenses}
        />
      </div>
    </Modal>
  );
};

export default EnhancedGoalCreationModal;