/**
 * Enhanced Goal Commands Hook
 * 
 * Provides command-based operations for Enhanced Goals including
 * creation, editing, and deletion with proper modal management.
 */

import { useCallback } from 'react';
import { useCommandBus } from './useCommandBus';
import { createCommand } from '@/commands/types';
import { EnhancedGoal } from '@/types/enhanced-goal';
import { useAppStore } from '@/store/appStore';
import { logger } from '@/utils/logger';

export const useEnhancedGoalCommands = () => {
  const { dispatch } = useCommandBus();
  
  // State for Enhanced Goal editing modal
  const isEnhancedGoalEditModalOpen = useAppStore(state => state.isEnhancedGoalEditModalOpen);
  const editingEnhancedGoal = useAppStore(state => state.editingEnhancedGoal);
  
  const createEnhancedGoal = useCallback(async (goalData: Omit<EnhancedGoal, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newGoal: EnhancedGoal = {
        ...goalData,
        id: `enhanced-goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await dispatch(createCommand.createEnhancedGoal(newGoal, false));
      logger.commandLog(`Enhanced goal created: ${newGoal.id}`);
      return newGoal;
    } catch (error) {
      logger.error(`Failed to create enhanced goal: ${error}`);
      throw error;
    }
  }, [dispatch]);
  
  const updateEnhancedGoal = useCallback(async (goalData: EnhancedGoal) => {
    try {
      await dispatch(createCommand.updateEnhancedGoal(goalData, false));
      logger.commandLog(`Enhanced goal updated: ${goalData.id}`);
    } catch (error) {
      logger.error(`Failed to update enhanced goal: ${error}`);
      throw error;
    }
  }, [dispatch]);
  
  const deleteEnhancedGoal = useCallback(async (goalId: string) => {
    try {
      await dispatch(createCommand.deleteEnhancedGoal(goalId, false));
      logger.commandLog(`Enhanced goal deleted: ${goalId}`);
    } catch (error) {
      logger.error(`Failed to delete enhanced goal: ${error}`);
      throw error;
    }
  }, [dispatch]);
  
  const openEnhancedGoalEditModal = useCallback(async (goal: EnhancedGoal) => {
    try {
      // Set the editing goal in the store (we'll need to add this to the store)
      useAppStore.setState({ 
        isEnhancedGoalEditModalOpen: true, 
        editingEnhancedGoal: goal 
      });
      logger.debug(`Enhanced goal edit modal opened for: ${goal.id}`, 'UI');
    } catch (error) {
      logger.error(`Failed to open enhanced goal edit modal: ${error}`);
    }
  }, []);
  
  const closeEnhancedGoalEditModal = useCallback(async () => {
    try {
      useAppStore.setState({ 
        isEnhancedGoalEditModalOpen: false, 
        editingEnhancedGoal: null 
      });
      logger.debug('Enhanced goal edit modal closed', 'UI');
    } catch (error) {
      logger.error(`Failed to close enhanced goal edit modal: ${error}`);
    }
  }, []);
  
  return {
    // Enhanced goal operations
    createEnhancedGoal,
    updateEnhancedGoal,
    deleteEnhancedGoal,
    
    // Modal management
    openEnhancedGoalEditModal,
    closeEnhancedGoalEditModal,
    
    // Modal state
    isEnhancedGoalEditModalOpen,
    editingEnhancedGoal
  };
};