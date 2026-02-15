import React from 'react';
import { AppProvider, AppProviderProps } from '@/components/app/AppProvider';

/**
 * DevAppProvider - Development provider with all features
 */
export const DevAppProvider: React.FC<AppProviderProps> = ({ children, config }) => {
  const devConfig = {
    ...config,
    enableTelemetry: true,
    debug: true,
    geminiModel: 'gemini-2.0-flash',
  };

  return <AppProvider config={devConfig}>{children}</AppProvider>;
};