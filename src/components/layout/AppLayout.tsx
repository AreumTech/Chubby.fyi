import React from "react";
import { AppHeader } from "./AppHeader";

interface AppLayoutProps {
  children: React.ReactNode;

  /** Dashboard-specific header props */
  onMobileSidebarToggle?: () => void;
  isMobileSidebarOpen?: boolean;
  onRunSimulation?: () => void;
  isSimulating?: boolean;
  animatedEmoji?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  onMobileSidebarToggle,
  isMobileSidebarOpen,
  onRunSimulation,
  isSimulating,
  animatedEmoji
}) => {
  return (
    <div className="h-screen bg-areum-canvas flex flex-col">
      {/* Unified Header */}
      <AppHeader
        variant="app"
        onMobileSidebarToggle={onMobileSidebarToggle}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onRunSimulation={onRunSimulation}
        isSimulating={isSimulating}
        animatedEmoji={animatedEmoji}
      />

      {/* Main Content - Full Width, no max-width constraint */}
      <main className="flex-1 w-full overflow-hidden">{children}</main>
    </div>
  );
};
