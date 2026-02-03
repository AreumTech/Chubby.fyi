import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  type?: 'info' | 'help' | 'warning' | 'definition';
  showIcon?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
  delay?: number;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  text, 
  children, 
  className = '', 
  position = 'top',
  type = 'info',
  showIcon = false,
  maxWidth = 'xs',
  delay = 0,
  disabled = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2', 
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2', 
    left: 'right-full top-1/2 -translate-y-1/2 mr-2', 
    right: 'left-full top-1/2 -translate-y-1/2 ml-2', 
  };

  const maxWidthClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm', 
    md: 'max-w-md',
    lg: 'max-w-lg'
  };

  const typeStyles = {
    info: 'bg-slate-800 text-white border-slate-700',
    help: 'bg-blue-50 text-blue-900 border-blue-200',
    warning: 'bg-amber-50 text-amber-900 border-amber-200',
    definition: 'bg-purple-50 text-purple-900 border-purple-200'
  };

  const typeIcons = {
    info: 'ℹ️',
    help: '❓',
    warning: '⚠️',
    definition: '📖'
  };

  const arrowStyles = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent'
  };

  const handleMouseEnter = () => {
    if (delay > 0) {
      const id = setTimeout(() => setIsVisible(true), delay);
      setTimeoutId(id);
    } else {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(false);
  };

  const handleFocus = () => {
    setIsVisible(true);
  };

  const handleBlur = () => {
    setIsVisible(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsVisible(false);
    }
  };

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible]);

  // Early return after all hooks are defined
  if (!text || disabled) return <>{children}</>;

  return (
    <div 
      ref={triggerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          aria-live="polite"
          className={`absolute ${positionClasses[position]} ${maxWidthClasses[maxWidth]} p-3 text-sm ${typeStyles[type]} rounded-lg border shadow-lg z-[var(--z-tooltip)] pointer-events-none`}
          style={{ zIndex: 1070 }}
        >
          {/* Arrow */}
          <div 
            className={`absolute w-0 h-0 border-4 ${arrowStyles[position]}`}
            style={{
              borderTopColor: type === 'info' ? '#1e293b' : 
                           type === 'help' ? '#dbeafe' :
                           type === 'warning' ? '#fef3c7' : '#f3e8ff',
              borderBottomColor: type === 'info' ? '#1e293b' : 
                             type === 'help' ? '#dbeafe' :
                             type === 'warning' ? '#fef3c7' : '#f3e8ff',
              borderLeftColor: type === 'info' ? '#1e293b' : 
                            type === 'help' ? '#dbeafe' :
                            type === 'warning' ? '#fef3c7' : '#f3e8ff',
              borderRightColor: type === 'info' ? '#1e293b' : 
                             type === 'help' ? '#dbeafe' :
                             type === 'warning' ? '#fef3c7' : '#f3e8ff',
            }}
          />
          
          <div className="flex items-start gap-2">
            {showIcon && (
              <span className="flex-shrink-0 text-base" aria-hidden="true">
                {typeIcons[type]}
              </span>
            )}
            <div className="leading-relaxed whitespace-pre-wrap">
              {text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};