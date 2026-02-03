import React from 'react';
import { useErrorStore, ErrorNotification } from '@/utils/notifications';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Label, BodyBase, Caption } from '@/components/ui/Typography';

const NotificationIcon: React.FC<{ type: ErrorNotification['type'] }> = ({ type }) => {
  const iconClass = "h-6 w-6";
  
  switch (type) {
    case 'success':
      return <CheckCircleIcon className={`${iconClass} text-green-500`} />;
    case 'warning':
      return <ExclamationTriangleIcon className={`${iconClass} text-yellow-500`} />;
    case 'info':
      return <InformationCircleIcon className={`${iconClass} text-blue-500`} />;
    case 'error':
    default:
      return <XCircleIcon className={`${iconClass} text-red-500`} />;
  }
};

const NotificationItem: React.FC<{ notification: ErrorNotification }> = ({ notification }) => {
  const { removeNotification } = useErrorStore();
  
  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'error':
      default:
        return 'bg-red-50 border-red-200';
    }
  };

  const getTypographyColor = (): 'success' | 'warning' | 'info' | 'danger' => {
    switch (notification.type) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      case 'error':
      default:
        return 'danger';
    }
  };

  return (
    <div
      className={`
        max-w-sm w-full border rounded-lg shadow-lg p-4 mb-4
        ${getBackgroundColor()}
        transform transition-all duration-300 ease-in-out
        animate-slide-in-right
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <NotificationIcon type={notification.type} />
        </div>

        <div className="ml-3 flex-1">
          <Label as="h3" color={getTypographyColor()}>{notification.title}</Label>
          <BodyBase className="mt-1 opacity-90" color={getTypographyColor()}>{notification.message}</BodyBase>
          
          {notification.actions && notification.actions.length > 0 && (
            <div className="mt-3 flex space-x-2">
              {notification.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.action();
                    removeNotification(notification.id);
                  }}
                  className={`
                    px-3 py-1 rounded-md border transition-colors
                    ${notification.type === 'error'
                      ? 'border-red-300 hover:bg-red-100'
                      : notification.type === 'warning'
                      ? 'border-yellow-300 hover:bg-yellow-100'
                      : notification.type === 'success'
                      ? 'border-green-300 hover:bg-green-100'
                      : 'border-blue-300 hover:bg-blue-100'
                    }
                  `}
                >
                  <Caption weight="medium" color={getTypographyColor()}>{action.label}</Caption>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={() => removeNotification(notification.id)}
            className={`
              inline-flex rounded-md p-1.5 hover:bg-black hover:bg-opacity-10 
              focus:outline-none focus:ring-2 focus:ring-offset-2 
              ${notification.type === 'error' 
                ? 'focus:ring-red-500' 
                : notification.type === 'warning'
                ? 'focus:ring-yellow-500'
                : notification.type === 'success'
                ? 'focus:ring-green-500'
                : 'focus:ring-blue-500'
              }
            `}
            aria-label="Dismiss notification"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const ErrorNotificationContainer: React.FC = () => {
  const { notifications, clearAll } = useErrorStore();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div 
      className="fixed top-4 right-4 z-50 max-h-screen overflow-y-auto"
      role="region"
      aria-label="Notifications"
    >
      {/* Clear all button when there are multiple notifications */}
      {notifications.length > 1 && (
        <div className="mb-2">
          <button
            onClick={clearAll}
            className="
              bg-white hover:bg-gray-50 border border-gray-200
              rounded-md px-2 py-1 shadow-sm transition-colors
            "
          >
            <Caption color="secondary" className="hover:text-gray-800">
              Clear all ({notifications.length})
            </Caption>
          </button>
        </div>
      )}
      
      {/* Notifications list */}
      <div className="space-y-2">
        {notifications.map((notification) => (
          <NotificationItem 
            key={notification.id} 
            notification={notification} 
          />
        ))}
      </div>
    </div>
  );
};

// CSS animation classes (add these to your global CSS)
const animationStyles = `
@keyframes slide-in-right {
  0% {
    opacity: 0;
    transform: translateX(100%);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}
`;

// Export styles for global CSS injection
export { animationStyles };

export default ErrorNotificationContainer;