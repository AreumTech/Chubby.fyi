/**
 * useCommandBus Hook Tests
 * 
 * Tests for the React hook that provides command bus functionality
 * to React components.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCommandBus } from '@/hooks/useCommandBus';
import { CommandBus } from '@/commands';
import { createCommand } from '@/commands/types';
import { logger } from '@/utils/logger';

// Mock the command bus
const mockCommandBusInstance = {
  dispatch: vi.fn(),
  hasHandlers: vi.fn(),
  getCommandHistory: vi.fn(),
  getRegisteredCommandTypes: vi.fn()
};

vi.mock('@/commands', () => ({
  CommandBus: {
    getInstance: vi.fn(() => mockCommandBusInstance)
  }
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    commandLog: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    dataLog: vi.fn()
  }
}));

describe('useCommandBus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('dispatch', () => {
    it('should dispatch commands through the command bus', async () => {
      mockCommandBusInstance.dispatch.mockResolvedValue();

      const { result } = renderHook(() => useCommandBus());
      const command = createCommand.runSimulation(false);

      await act(async () => {
        await result.current.dispatch(command);
      });

      expect(mockCommandBusInstance.dispatch).toHaveBeenCalledWith(command);
    });

    it('should handle and re-throw command dispatch errors', async () => {
      const error = new Error('Dispatch failed');
      mockCommandBusInstance.dispatch.mockRejectedValue(error);

      const { result } = renderHook(() => useCommandBus());
      const command = createCommand.runSimulation(false);

      await act(async () => {
        await expect(result.current.dispatch(command)).rejects.toThrow('Dispatch failed');
      });

      expect(logger.commandLog).toHaveBeenCalledWith(
        expect.stringContaining('Command dispatch failed')
      );
    });
  });

  describe('isHandlerRegistered', () => {
    it('should check if handlers are registered for command type', () => {
      mockCommandBusInstance.hasHandlers.mockReturnValue(true);

      const { result } = renderHook(() => useCommandBus());

      const hasHandlers = result.current.isHandlerRegistered('RUN_SIMULATION');

      expect(mockCommandBusInstance.hasHandlers).toHaveBeenCalledWith('RUN_SIMULATION');
      expect(hasHandlers).toBe(true);
    });

    it('should return false for unregistered command types', () => {
      mockCommandBusInstance.hasHandlers.mockReturnValue(false);

      const { result } = renderHook(() => useCommandBus());

      const hasHandlers = result.current.isHandlerRegistered('UNKNOWN_COMMAND');

      expect(mockCommandBusInstance.hasHandlers).toHaveBeenCalledWith('UNKNOWN_COMMAND');
      expect(hasHandlers).toBe(false);
    });
  });

  describe('getCommandHistory', () => {
    it('should return command history from the bus', () => {
      const mockHistory = [
        { type: 'RUN_SIMULATION', payload: { force: false } },
        { type: 'UPDATE_EVENT', payload: { eventData: {}, runSimulation: true } }
      ];

      mockCommandBusInstance.getCommandHistory.mockReturnValue(mockHistory as any);

      const { result } = renderHook(() => useCommandBus());

      const history = result.current.getCommandHistory();

      expect(mockCommandBusInstance.getCommandHistory).toHaveBeenCalled();
      expect(history).toBe(mockHistory);
    });
  });

  describe('getRegisteredCommandTypes', () => {
    it('should return registered command types from the bus', () => {
      const mockTypes = ['RUN_SIMULATION', 'UPDATE_EVENT', 'CREATE_EVENT'];

      mockCommandBusInstance.getRegisteredCommandTypes.mockReturnValue(mockTypes);

      const { result } = renderHook(() => useCommandBus());

      const types = result.current.getRegisteredCommandTypes();

      expect(mockCommandBusInstance.getRegisteredCommandTypes).toHaveBeenCalled();
      expect(types).toBe(mockTypes);
    });
  });

  describe('hook stability', () => {
    it('should return stable function references', () => {
      const { result, rerender } = renderHook(() => useCommandBus());

      const firstRender = {
        dispatch: result.current.dispatch,
        isHandlerRegistered: result.current.isHandlerRegistered,
        getCommandHistory: result.current.getCommandHistory,
        getRegisteredCommandTypes: result.current.getRegisteredCommandTypes
      };

      rerender();

      const secondRender = {
        dispatch: result.current.dispatch,
        isHandlerRegistered: result.current.isHandlerRegistered,
        getCommandHistory: result.current.getCommandHistory,
        getRegisteredCommandTypes: result.current.getRegisteredCommandTypes
      };

      // All functions should be the same reference across re-renders
      expect(firstRender.dispatch).toBe(secondRender.dispatch);
      expect(firstRender.isHandlerRegistered).toBe(secondRender.isHandlerRegistered);
      expect(firstRender.getCommandHistory).toBe(secondRender.getCommandHistory);
      expect(firstRender.getRegisteredCommandTypes).toBe(secondRender.getRegisteredCommandTypes);
    });
  });
});
