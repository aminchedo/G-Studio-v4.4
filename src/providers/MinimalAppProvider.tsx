import React from 'react';
import { AppProvider, AppProviderProps } from '@/components/app/AppProvider';

/**
 * MinimalAppProvider - Lightweight provider for testing
 */
export const MinimalAppProvider: React.FC<AppProviderProps> = ({ children, config }) => {
  return (
    <AppProvider config={{ ...config, enableTelemetry: false, debug: true }}>
      {children}
    </AppProvider>
  );
};