import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface WideModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  closeOnOverlayClick?: boolean;
  className?: string;
  bodyClassName?: string;
  contentClassName?: string;
  frameless?: boolean;
  tightEdges?: boolean;
  backdrop?: 'dim' | 'opaque';
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const WideModal: React.FC<WideModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  closeOnOverlayClick = true,
  className = '',
  bodyClassName = '',
  contentClassName = '',
  frameless = false,
  tightEdges = false,
  backdrop = 'dim',
  footer,
  children
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKey);
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!closeOnOverlayClick) return;
    if (e.target === e.currentTarget) onClose();
  };

  const overlayClass = backdrop === 'opaque'
    ? 'bg-black/70'
    : 'bg-black/40 backdrop-blur-sm';

  const node = (
    <div
      className={`fixed inset-0 ${overlayClass} flex items-center justify-center ${tightEdges ? 'p-0' : 'p-1 sm:p-2'} z-[1050]`}
      onClick={onBackdropClick}
      role="presentation"
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'wide-modal-title' : undefined}
        className={[
          // Edge-to-edge wide container constraints
          'relative w-[98vw] sm:w-[96vw] md:w-[94vw] lg:w-[92vw] xl:w-[90vw] max-w-[1280px]',
          tightEdges ? 'max-h-[100dvh]' : 'max-h-[98dvh] sm:max-h-[96dvh] lg:max-h-[94dvh]',
          'flex',
          className
        ].join(' ')}
      >
        <div
          className={[
            'w-full flex flex-col overflow-hidden',
            'rounded-2xl isolate',
            frameless ? 'bg-transparent border-0 shadow-none' : 'bg-white border border-gray-200 shadow-xl',
            contentClassName
          ].join(' ')}
          style={{ backgroundColor: '#ffffff' }}
        >
        {(title || subtitle) && (
          <div className="px-4 pt-3 pb-2 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                {title && (
                  <h2 id="wide-modal-title" className="text-base font-bold text-gray-900">{title}</h2>
                )}
                {subtitle && (
                  <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-xl leading-none"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
          </div>
        )}
        <div className={[
          'flex-1 overflow-y-auto',
          bodyClassName || 'p-6'
        ].join(' ')}>
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
        </div>
      </div>
    </div>
  );

  // Render to document.body to avoid nesting inside other modal containers
  return createPortal(node, document.body);
};
