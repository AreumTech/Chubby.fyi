import React from 'react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Recomputing simulation...',
  className = ''
}) => {
  if (!isVisible) return null;

  const overlayStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'all'
  };

  const backdropStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(2px)'
  };

  const contentStyles: React.CSSProperties = {
    position: 'relative',
    background: 'white',
    borderRadius: '12px',
    padding: '24px 32px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    border: '1px solid rgba(0, 0, 0, 0.1)'
  };

  const spinnerStyles: React.CSSProperties = {
    width: '32px',
    height: '32px',
    border: '3px solid #f3f4f6',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  };

  const messageStyles: React.CSSProperties = {
    color: '#374151',
    textAlign: 'center',
    whiteSpace: 'nowrap'
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div className={`loading-overlay ${className}`} style={overlayStyles}>
        <div className="loading-overlay-backdrop" style={backdropStyles} />
        <div className="loading-overlay-content" style={contentStyles}>
          <div className="loading-spinner" style={spinnerStyles} />
          <div className="loading-message text-sm font-medium" style={messageStyles}>{message}</div>
        </div>
      </div>
    </>
  );
};

export default LoadingOverlay;