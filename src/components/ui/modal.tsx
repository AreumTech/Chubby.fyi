import React, { useRef, useEffect } from 'react';
import { IconX } from '../icons';
import { Button } from './button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'xlarge';
  showCloseButton?: boolean;
  hideCloseButton?: boolean; // Legacy support
  closeOnOverlayClick?: boolean;
  bodyClassName?: string;
  className?: string;
  customClassName?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  showCloseButton = true,
  hideCloseButton = false,
  closeOnOverlayClick = true,
  bodyClassName = '',
  className = '',
  customClassName = '',
  footer,
  children
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const sizeClasses: Record<'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'xlarge', string> = {
    sm: 'modal--sm',
    md: 'modal--md',
    lg: 'modal--lg',
    xl: 'modal--xl',
    '2xl': 'modal--2xl',
    xlarge: 'modal--xlarge'
  };
  const modalSizeClass = sizeClasses[size] ?? sizeClasses.md;

  return (
    <div className={`modal-backdrop ${customClassName}`} onClick={handleOverlayClick}>
      <div
        ref={modalRef}
        className={`modal ${modalSizeClass} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {(title || subtitle || (showCloseButton && !hideCloseButton)) && (
          <div className="modal-header flex items-center justify-between">
            <div>
              {title && (
                <h2 id="modal-title" className="modal-title">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
              )}
            </div>
            {showCloseButton && !hideCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-2"
                aria-label="Close modal"
              >
                <IconX className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
        <div className={`modal-body ${bodyClassName}`}>
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
