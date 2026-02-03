import React, { Suspense, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ModalProvider } from "@/components/providers/ModalProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import { DebugLogViewer } from "@/components/debug/DebugLogViewer";

// Lazy load heavy components
const DashboardView = React.lazy(() => import("./src/views/DashboardView").then(m => ({ default: m.DashboardView })));
const TestHarnessPage = React.lazy(() => import("./src/pages/TestHarnessPage").then(m => ({ default: m.TestHarnessPage })));
const LandingPage = React.lazy(() => import("./src/pages/LandingPage").then(m => ({ default: m.LandingPage })));
const ChatPage = React.lazy(() => import("./src/features/chat-layout/ChatPage").then(m => ({ default: m.ChatPage })));
import { useCommandBus } from "@/hooks/useCommandBus";
import { createCommand } from "@/commands/types";
import { initializeAppStore } from "@/store/appStore";
import { ErrorNotificationContainer } from "./src/components/ErrorNotificationContainer";
import { handleError } from "@/utils/notifications";
import { isNewUser } from "@/utils/newUserDetection";

const App: React.FC = () => {
  const [showDebugLogs, setShowDebugLogs] = useState(false);


  // Initialize inter-store communication
  React.useEffect(() => {
    initializeAppStore();
  }, []);

  // Custom hooks (command-based)
  const { dispatch } = useCommandBus();

  // Initialize app with command dispatch
  React.useEffect(() => {
    // Dispatch the missing INITIALIZE_APP command
    dispatch(createCommand.initializeApp());
  }, [dispatch]);

  // Auto-open onboarding choice for new users (but not on test harness or landing page)
  React.useEffect(() => {
    // Use a small delay to ensure all stores are initialized
    const timer = setTimeout(() => {
      // Don't show onboarding modal on test harness page or landing page
      if (window.location.pathname !== '/test-harness' &&
          window.location.pathname !== '/' &&
          isNewUser()) {
        // New user detected, opening onboarding choice
        dispatch(createCommand.openModal('onboarding'));
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [dispatch]);

  // Initialize error handling
  React.useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleError(
        new Error(event.reason),
        'Unhandled Promise Rejection',
'An unexpected error occurred'
      );
    };

    // Handle global errors
    const handleGlobalError = (event: ErrorEvent) => {
      handleError(
        new Error(event.message),
        'Global Error',
'An unexpected error occurred'
      );
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  // Debug log keyboard shortcut (Ctrl+Shift+D)
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setShowDebugLogs(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  return (
    <Router>
      <ModalProvider>
        <div data-testid="app-container">
          {/* Global Error Notifications */}
          <ErrorNotificationContainer />
          
          <Routes>
            {/* Landing Page Route */}
            <Route path="/" element={
              <Suspense fallback={<div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
              </div>}>
                <LandingPage />
              </Suspense>
            } />

            {/* Test Harness Route */}
            <Route path="/test-harness" element={
              <Suspense fallback={<div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
              </div>}>
                <TestHarnessPage />
              </Suspense>
            } />

            {/* Main App Route */}
            <Route path="/app" element={
              <Suspense fallback={<div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
              </div>}>
                <DashboardView />
              </Suspense>
            } />

            {/* Chat-based Setup Route */}
            <Route path="/chat" element={
              <Suspense fallback={<div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
              </div>}>
                <AppLayout>
                  <ChatPage />
                </AppLayout>
              </Suspense>
            } />
          </Routes>
          
          {/* Debug Log Viewer (Ctrl+Shift+D to toggle) */}
          <DebugLogViewer 
            isOpen={showDebugLogs} 
            onClose={() => setShowDebugLogs(false)} 
          />
        </div>
      </ModalProvider>
    </Router>
  );
};

export default App;
