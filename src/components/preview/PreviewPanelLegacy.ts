// Temporary legacy shim preserved during migration
// This component aliases the canonical PreviewPanel while we reconcile differences.
import React from 'react';
import { PreviewPanel } from '@/components/PreviewPanel';

export type { } from '@/components/PreviewPanel';

const PreviewPanelLegacy: typeof PreviewPanel = PreviewPanel as any;
export default PreviewPanelLegacy;
