/**
 * Explainability Panel
 * 
 * Shows "Why this answer?" data from context lineage.
 */

import React, { useState, useEffect } from 'react';
import { Info, Database, FileText, Layers } from 'lucide-react';
import { ContextDatabaseBridge } from '@/services/contextDatabaseBridge';

interface ExplainabilityPanelProps {
  responseId?: string;
}

export const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({ responseId }) => {
  const [lineage, setLineage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (responseId) {
      loadLineage(responseId);
    }
  }, [responseId]);

  const loadLineage = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const lineageData = await ContextDatabaseBridge.getLineage(id);
      if (lineageData) {
        setLineage(lineageData);
      } else {
        setError('No lineage data found for this response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lineage');
    } finally {
      setLoading(false);
    }
  };

  if (!responseId) {
    return (
      <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl">
        <p className="text-sm text-slate-400">Select a response to view its explainability data.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl">
        <p className="text-sm text-slate-400">Loading explainability data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!lineage) {
    return (
      <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl">
        <p className="text-sm text-slate-400">No explainability data available for this response.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-slate-200">Why this answer?</h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Database className="w-4 h-4 text-blue-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-slate-400 mb-1">Model & Mode</p>
            <p className="text-sm text-slate-200">
              {lineage.model} ({lineage.mode})
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <FileText className="w-4 h-4 text-green-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-slate-400 mb-1">Context Entries Used</p>
            <p className="text-sm text-slate-200">
              {lineage.contextEntryIds?.length || 0} entries
            </p>
            {lineage.contextEntryIds && lineage.contextEntryIds.length > 0 && (
              <div className="mt-2 space-y-1">
                {lineage.contextEntryIds.slice(0, 5).map((id: string, idx: number) => (
                  <div key={idx} className="text-xs text-slate-500 font-mono">
                    {id.substring(0, 20)}...
                  </div>
                ))}
                {lineage.contextEntryIds.length > 5 && (
                  <div className="text-xs text-slate-500">
                    +{lineage.contextEntryIds.length - 5} more
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {lineage.summaryIds && lineage.summaryIds.length > 0 && (
          <div className="flex items-start gap-3">
            <Layers className="w-4 h-4 text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-1">Summaries Referenced</p>
              <p className="text-sm text-slate-200">
                {lineage.summaryIds.length} summary layer(s)
              </p>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-700/60">
          <p className="text-xs text-slate-500">
            Response ID: <span className="font-mono text-slate-400">{lineage.responseId}</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Generated: {new Date(lineage.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};
