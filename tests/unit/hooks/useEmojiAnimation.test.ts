import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEmojiAnimation } from '@/hooks/useEmojiAnimation';

// Mock timers
vi.useFakeTimers();

describe('useEmojiAnimation', () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should return rocket emoji when not animating', () => {
    const { result } = renderHook(() => useEmojiAnimation(false));
    expect(result.current).toBe('🚀');
  });

  it('should cycle through emojis when animating', () => {
    const { result } = renderHook(() => useEmojiAnimation(true, 100));
    
    // Initial emoji should be rocket
    expect(result.current).toBe('🚀');
    
    // After advancing timer, should be next emoji
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('⚡');
    
    // After advancing timer again, should be next emoji
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('✨');
  });

  it('should reset to rocket emoji when animation stops', () => {
    const { result, rerender } = renderHook(
      ({ isAnimating }) => useEmojiAnimation(isAnimating, 100),
      { initialProps: { isAnimating: true } }
    );
    
    // Advance time to get a different emoji
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).not.toBe('🚀');
    
    // Stop animation
    rerender({ isAnimating: false });
    expect(result.current).toBe('🚀');
  });

  it('should cycle back to beginning after reaching end of emoji array', () => {
    const { result } = renderHook(() => useEmojiAnimation(true, 100));
    
    // Advance through all 8 emojis
    act(() => {
      vi.advanceTimersByTime(800); // 8 * 100ms
    });
    
    // Should be back to the first emoji (rocket)
    expect(result.current).toBe('🚀');
  });
});
