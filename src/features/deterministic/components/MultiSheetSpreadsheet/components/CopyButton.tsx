import React, { useState, useCallback } from 'react';

interface CopyButtonProps {
  onCopy: () => string;
  label?: string;
  className?: string;
}

/**
 * CopyButton: Button to copy data to clipboard
 * Shows feedback on successful copy
 */
export const CopyButton: React.FC<CopyButtonProps> = ({
  onCopy,
  label = 'Copy',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(async () => {
    try {
      const text = onCopy();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, [onCopy]);

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5
        text-xs-areum font-medium
        rounded-sm-areum
        transition-colors duration-150
        ${copied
          ? 'bg-areum-success-bg text-areum-success border border-areum-success/30'
          : 'bg-areum-surface text-areum-text-secondary border border-areum-border hover:bg-areum-canvas hover:text-areum-text-primary'
        }
        ${className}
      `}
      aria-label={copied ? 'Copied!' : label}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
};

export default CopyButton;
