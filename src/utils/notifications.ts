import { create } from 'zustand';
import { logger } from '@/utils/logger';

export interface ErrorNotification {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: number;
  duration?: number; // Auto-dismiss after this many ms
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

interface ErrorStore {
  notifications: ErrorNotification[];
  addNotification: (notification: Omit<ErrorNotification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useErrorStore = create<ErrorStore>((set, get) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: ErrorNotification = {
      ...notification,
      id,
      timestamp: Date.now(),
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification]
    }));

    // Auto-dismiss if duration is specified
    if (notification.duration) {
      setTimeout(() => {
        get().removeNotification(id);
      }, notification.duration);
    }
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  }
}));

// Simple utility functions to replace errorService methods
export function showSuccess(title: string, message: string, duration = 3000): void {
  useErrorStore.getState().addNotification({
    type: 'success',
    title,
    message,
    duration
  });
}

export function showInfo(title: string, message: string, duration = 5000): void {
  useErrorStore.getState().addNotification({
    type: 'info',
    title,
    message,
    duration
  });
}

export function showWarning(title: string, message: string, duration = 6000): void {
  useErrorStore.getState().addNotification({
    type: 'warning',
    title,
    message,
    duration
  });
}

export function showError(title: string, message: string, duration = 8000): void {
  useErrorStore.getState().addNotification({
    type: 'error',
    title,
    message,
    duration
  });
}

export function handleError(error: Error | unknown, context?: string, userMessage?: string): void {
  const errorInfo = error instanceof Error ? error : new Error(String(error));

  // Log error details
  logger.error(`Error in ${context}:`, errorInfo);

  // Show user notification
  showError(
    context || 'Application Error',
    userMessage || errorInfo.message
  );
}