/**
 * Goal Edit Modal
 *
 * Modal for editing existing Enhanced Goals using the shared form component.
 */

import React from 'react';
import { Modal } from '@/components/ui';
import { EnhancedGoal, StandardAccountType, getGoalMode } from '@/types/enhanced-goal';
import { EnhancedGoalForm, EnhancedGoalFormData } from '@/components/forms/EnhancedGoalForm';
import { logger } from '@/utils/logger';
import { useCommandBus } from '@/hooks/useCommandBus';
import { createCommand } from '@/commands/types';
import { dataService } from '@/services/dataService';

interface GoalEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalToEdit: EnhancedGoal;
  currentAccounts?: Array<{ type: StandardAccountType; balance: number; name?: string }>;
}

export const GoalEditModal: React.FC<GoalEditModalProps> = ({
  isOpen,
  onClose,
  goalToEdit,
  currentAccounts
}) => {
  const { dispatch } = useCommandBus();

  // Get current account balances if not provided
  const getAccountBalances = (): Array<{ type: StandardAccountType; balance: number; name?: string }> => {
    if (currentAccounts && currentAccounts.length > 0) {
      return currentAccounts;
    }

    try {
      if (dataService.hasData()) {
        const balances = dataService.getAccountBalances();
        return [
          { type: 'cash', balance: balances.cash || 0 },
          { type: 'taxable', balance: balances.taxable || 0 },
          { type: 'tax_deferred', balance: balances.taxDeferred || 0 },
          { type: 'roth', balance: balances.roth || 0 },
          { type: '529', balance: balances.education || 0 },
        ];
      }
    } catch (error) {
      logger.warn('Failed to get account balances:', error);
    }

    return [];
  };

  const accountBalances = getAccountBalances();

  // Convert EnhancedGoal to form data format
  const initialFormData: Partial<EnhancedGoalFormData> = {
    name: goalToEdit.name,
    description: goalToEdit.description || '',
    targetAmount: goalToEdit.targetAmount,
    targetDate: goalToEdit.targetDate ?
      (goalToEdit.targetDate instanceof Date ? goalToEdit.targetDate.toISOString().split('T')[0] : new Date(goalToEdit.targetDate).toISOString().split('T')[0]) : '',
    accountType: goalToEdit.accountType,
    accountName: goalToEdit.accountName || '',
    priority: goalToEdit.priority === 'HIGH' ? 1 : goalToEdit.priority === 'MEDIUM' ? 2 : 3,
    category: goalToEdit.category,
    goalMode: goalToEdit.goalMode || getGoalMode({ targetAmount: goalToEdit.targetAmount, targetDate: goalToEdit.targetDate }),
    metadata: goalToEdit.metadata || {}
  };

  const handleSubmit = async (formData: EnhancedGoalFormData) => {
    try {
      // Convert form data back to EnhancedGoal format
      const updatedGoal: EnhancedGoal = {
        ...goalToEdit,
        name: formData.name,
        description: formData.description,
        targetAmount: formData.targetAmount,
        targetDate: formData.targetDate ? new Date(formData.targetDate) : undefined,
        accountType: formData.accountType,
        accountName: formData.accountName,
        priority: formData.priority === 1 ? 'HIGH' : formData.priority === 2 ? 'MEDIUM' : 'LOW',
        category: formData.category,
        goalMode: formData.goalMode,
        metadata: formData.metadata,
        updatedAt: new Date()
      };

      await dispatch(createCommand.updateEnhancedGoal(updatedGoal, true));
      onClose();
    } catch (error) {
      logger.error('Failed to update goal:', error);
      // Error handling would be handled by the command bus
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Goal"
    >
      <div className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <EnhancedGoalForm
          initialData={initialFormData}
          currentAccounts={accountBalances}
          onSubmit={handleSubmit}
          onCancel={onClose}
          submitLabel="Update Goal"
          showTemplateSelection={false} // No templates when editing
        />
      </div>
    </Modal>
  );
};

export default GoalEditModal;