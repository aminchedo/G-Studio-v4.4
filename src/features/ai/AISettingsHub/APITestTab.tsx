/**
 * API Test Tab - Model Discovery and Performance Testing
 *
 * Features:
 * - Discover all available models
 * - Test model response times
 * - Performance benchmarking
 * - Filter and sort results
 */

import React, { useState, useCallback, useEffect } from "react";
import type { AIConfig } from "./types";
import { ModelTestingService } from "@/services/ai/modelTestingService";
import { ModelValidationStore } from "@/services/ai/modelValidationStore";
import { PRIORITY_TEST_MODELS } from "@/services/defaultModels";

const MODELS_TO_SCAN_COUNT = PRIORITY_TEST_MODELS.length;

const PlayIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const XCircleIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="15" x2="9" y1="9" y2="15" />
    <line x1="9" x2="15" y1="9" y2="15" />
  </svg>
);

const ClockIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const LoaderIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="animate-spin"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

interface APITestTabProps {
  config: AIConfig;
  updateConfig: <K extends keyof AIConfig>(key: K, value: AIConfig[K]) => void;
}

interface TestedModel {
  id: string;
  name: string;
  family: "flash" | "pro" | "lite" | "experimental";
  responseTime: number;
  status: "success" | "failed" | "pending";
  error?: string;
}

export const APITestTab: React.FC<APITestTabProps> = ({
  config,
  updateConfig,
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testProgress, setTestProgress] = useState({ current: 0, total: 0 });
  const [testedModels, setTestedModels] = useState<TestedModel[]>([]);
  const [filterFamily, setFilterFamily] = useState<
    "all" | "flash" | "pro" | "lite"
  >("all");
  const [sortBy, setSortBy] = useState<"name" | "speed" | "family">("speed");

  // Load cached results
  useEffect(() => {
    const cached = localStorage.getItem("model_test_results");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setTestedModels(parsed);
      } catch (e) {
        console.error("Failed to parse cached results");
      }
    }
  }, []);

  // Detect model family from ID
  const detectFamily = (
    modelId: string,
  ): "flash" | "pro" | "lite" | "experimental" => {
    if (modelId.includes("flash-lite") || modelId.includes("lite"))
      return "lite";
    if (modelId.includes("flash")) return "flash";
    if (modelId.includes("pro")) return "pro";
    return "experimental";
  };

  // Format model name
  const formatModelName = (modelId: string): string => {
    return modelId
      .replace("models/", "")
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Run model discovery and testing
  const runTest = useCallback(async () => {
    if (!config.apiKey || isTesting) return;

    setIsTesting(true);
    setTestedModels([]);
    setTestProgress({ current: 0, total: 0 });

    try {
      const apiKey = config.apiKey.trim();
      const candidateModels =
        await ModelTestingService.getCandidateModels(apiKey);

      setTestProgress({ current: 0, total: candidateModels.length });

      const output = await ModelTestingService.testAllModels(
        apiKey,
        candidateModels,
        (current, total) => setTestProgress({ current, total }),
      );

      // Build a UI-friendly list from store + rejected list
      const validatedInfos =
        ModelValidationStore.getValidatedModelInfos(apiKey);
      const validatedMap = new Map(validatedInfos.map((m) => [m.id, m]));

      const results: TestedModel[] = [];
      for (const modelId of output.usableModels) {
        const info = validatedMap.get(modelId);
        results.push({
          id: modelId,
          name: formatModelName(modelId),
          family: detectFamily(modelId),
          responseTime: info?.responseTime || info?.avgResponseTime || 0,
          status: "success",
        });
      }

      for (const rej of output.rejectedModels) {
        if (validatedMap.has(rej.modelId)) continue;
        results.push({
          id: rej.modelId,
          name: formatModelName(rej.modelId),
          family: detectFamily(rej.modelId),
          responseTime: 0,
          status: "failed",
          error: rej.reason,
        });
      }

      // Update UI
      setTestedModels(results);

      // Save results to localStorage (UI cache)
      localStorage.setItem("model_test_results", JSON.stringify(results));
      localStorage.setItem("model_test_timestamp", Date.now().toString());
    } catch (error: any) {
      console.error("Model testing failed:", error);
    } finally {
      setIsTesting(false);
    }
  }, [config.apiKey, isTesting]);

  // Filter and sort models
  const filteredModels = testedModels
    .filter((m) => filterFamily === "all" || m.family === filterFamily)
    .filter((m) => m.status === "success")
    .sort((a, b) => {
      if (sortBy === "speed") return a.responseTime - b.responseTime;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return a.family.localeCompare(b.family);
    });

  const successCount = testedModels.filter(
    (m) => m.status === "success",
  ).length;
  const failedCount = testedModels.filter((m) => m.status === "failed").length;
  const avgResponseTime =
    successCount > 0
      ? Math.round(
          filteredModels.reduce((a, b) => a + b.responseTime, 0) / successCount,
        )
      : 0;

  // Get family color
  const getFamilyColor = (family: string) => {
    switch (family) {
      case "flash":
        return "bg-blue-500/20 text-blue-400";
      case "pro":
        return "bg-purple-500/20 text-purple-400";
      case "lite":
        return "bg-emerald-500/20 text-emerald-400";
      default:
        return "bg-amber-500/20 text-amber-400";
    }
  };

  if (!config.apiKey) {
    return (
      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
        <span className="text-amber-400 text-xs">API key required.</span>
        <span className="text-[10px] text-amber-400/80">
          Set it in the Connection tab.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* One compact section: run + inline stats + list */}
      <section className="bg-slate-800/40 rounded-lg border border-slate-700/60 overflow-hidden">
        <div className="px-2.5 py-1.5 border-b border-slate-700/60 flex items-center justify-between flex-wrap gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-white">
              API Test
            </span>
            {!isTesting && testedModels.length === 0 && (
              <span className="text-[9px] text-slate-400">
                Scans {MODELS_TO_SCAN_COUNT} models
              </span>
            )}
            {isTesting && testProgress.total > 0 && (
              <span className="text-[9px] text-slate-400">
                {testProgress.current}/{testProgress.total}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <select
              value={filterFamily}
              onChange={(e) => setFilterFamily(e.target.value as any)}
              className="bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 text-[9px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="all">All</option>
              <option value="flash">Flash</option>
              <option value="pro">Pro</option>
              <option value="lite">Lite</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 text-[9px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="speed">Speed</option>
              <option value="name">Name</option>
              <option value="family">Family</option>
            </select>
            <button
              onClick={isTesting ? undefined : runTest}
              disabled={isTesting}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium ${isTesting ? "bg-slate-700 text-slate-500 cursor-not-allowed" : "bg-violet-600 text-white hover:bg-violet-500"}`}
            >
              {isTesting ? <LoaderIcon /> : <PlayIcon />}
              {isTesting ? "Testing…" : "Run test"}
            </button>
          </div>
        </div>

        {isTesting && testProgress.total > 0 && (
          <div className="px-2.5 py-1">
            <div className="w-full bg-slate-700 rounded-full h-1 overflow-hidden">
              <div
                className="bg-violet-500 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(testProgress.current / testProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Compact inline stats (not big cards) */}
        {testedModels.length > 0 && !isTesting && (
          <div className="px-2.5 py-1.5 flex items-center gap-4 border-t border-slate-700/50">
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <CheckCircleIcon /> {successCount} OK
            </span>
            <span className="flex items-center gap-1 text-[10px] text-red-400">
              <XCircleIcon /> {failedCount} failed
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <ClockIcon /> Avg {avgResponseTime}ms
            </span>
          </div>
        )}

        {/* Model list below status */}
        {testedModels.length > 0 && (
          <div className="px-2.5 py-1.5 border-t border-slate-700/50">
            <div
              className="grid grid-cols-2 gap-x-2 gap-y-0.5 max-h-32 overflow-y-auto"
              style={{ scrollbarWidth: "thin" }}
            >
              {filteredModels.map((model) => (
                <div
                  key={model.id}
                  className="flex items-center justify-between gap-1 py-0.5 border-b border-slate-700/30 last:border-0"
                >
                  <span className="text-[10px] text-slate-200 truncate">
                    {model.name}
                  </span>
                  <span className="text-[9px] text-emerald-400 shrink-0">
                    {model.responseTime}ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {testedModels.length === 0 && !isTesting && (
          <div className="px-2.5 py-3 text-center">
            <p className="text-[10px] text-slate-400 mb-2">
              Run test to discover and benchmark {MODELS_TO_SCAN_COUNT} models.
            </p>
            <button
              onClick={runTest}
              className="px-2.5 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded text-[10px] font-medium"
            >
              Run test
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
