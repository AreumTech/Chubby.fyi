/**
 * Hook for cycling through emoji animations during simulation
 */
import { useState, useEffect, useRef } from 'react';

const EMOJI_CYCLE = ['🚀', '⚡', '✨', '🎯', '📊', '💫', '🔥', '⭐'];

export const useEmojiAnimation = (isAnimating: boolean, interval: number = 300) => {
  const [currentEmojiIndex, setCurrentEmojiIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isAnimating) {
      intervalRef.current = window.setInterval(() => {
        setCurrentEmojiIndex((prev) => (prev + 1) % EMOJI_CYCLE.length);
      }, interval);
    } else {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Reset to rocket emoji when not animating
      setCurrentEmojiIndex(0);
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [isAnimating, interval]);

  return EMOJI_CYCLE[currentEmojiIndex];
};