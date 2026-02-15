/**
 * Behavior Tab - Modern & Colorful
 * AI Persona and Response Style Configuration
 */

import React from "react";
import {
  AIConfig,
  PersonaType,
  ResponseStyleType,
  CodeStyleType,
} from "@/types";

// SVG Icons
const BrainIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.54Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.54Z" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const SmileIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" x2="9.01" y1="9" y2="9" />
    <line x1="15" x2="15.01" y1="9" y2="9" />
  </svg>
);

const ZapIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const SparklesIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </svg>
);

const FileTextIcon = () => (
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
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
  </svg>
);

const ListIcon = () => (
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
    <line x1="8" x2="21" y1="6" y2="6" />
    <line x1="8" x2="21" y1="12" y2="12" />
    <line x1="8" x2="21" y1="18" y2="18" />
    <line x1="3" x2="3.01" y1="6" y2="6" />
    <line x1="3" x2="3.01" y1="12" y2="12" />
    <line x1="3" x2="3.01" y1="18" y2="18" />
  </svg>
);

const MessageSquareIcon = () => (
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
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const CodeIcon = () => (
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
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const CheckIcon = () => (
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
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const WandIcon = () => (
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
    <path d="M15 4V2" />
    <path d="M15 16v-2" />
    <path d="M8 9h2" />
    <path d="M20 9h2" />
    <path d="M17.8 11.8 19 13" />
    <path d="M15 9h0" />
    <path d="M17.8 6.2 19 5" />
    <path d="m3 21 9-9" />
    <path d="M12.2 6.2 11 5" />
  </svg>
);

const BellIcon = () => (
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
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

interface BehaviorTabProps {
  config: AIConfig;
  updateConfig: <K extends keyof AIConfig>(key: K, value: AIConfig[K]) => void;
}

const PERSONAS: Array<{
  id: PersonaType;
  name: string;
  description: string;
  icon: React.FC;
  gradient: string;
  color: string;
}> = [
  {
    id: "professional",
    name: "Professional",
    description: "Formal and business-like",
    icon: BriefcaseIcon,
    gradient: "from-blue-500 to-indigo-600",
    color: "blue",
  },
  {
    id: "friendly" as PersonaType,
    name: "Friendly",
    description: "Warm and approachable",
    icon: SmileIcon,
    gradient: "from-emerald-500 to-teal-600",
    color: "emerald",
  },
  {
    id: "concise",
    name: "Concise",
    description: "Direct and to the point",
    icon: ZapIcon,
    gradient: "from-amber-500 to-orange-600",
    color: "amber",
  },
  {
    id: "creative",
    name: "Creative",
    description: "Imaginative and expressive",
    icon: SparklesIcon,
    gradient: "from-rose-500 to-pink-600",
    color: "rose",
  },
];

const RESPONSE_STYLES: Array<{
  id: ResponseStyleType;
  name: string;
  description: string;
  icon: React.FC;
}> = [
  {
    id: "detailed",
    name: "Detailed",
    description: "Comprehensive explanations",
    icon: FileTextIcon,
  },
  {
    id: "concise",
    name: "Concise",
    description: "Brief and focused",
    icon: ZapIcon,
  },
  {
    id: "step-by-step" as ResponseStyleType,
    name: "Step by Step",
    description: "Numbered instructions",
    icon: ListIcon,
  },
  {
    id: "conversational",
    name: "Conversational",
    description: "Natural dialogue",
    icon: MessageSquareIcon,
  },
];

const CODE_STYLES: Array<{
  id: CodeStyleType;
  name: string;
  description: string;
}> = [
  {
    id: "modern" as CodeStyleType,
    name: "Modern ES6+",
    description: "Arrow functions, destructuring, async/await",
  },
  {
    id: "typescript" as CodeStyleType,
    name: "TypeScript",
    description: "Strongly typed with interfaces",
  },
  { id: "clean", name: "Clean Code", description: "Readable, well-documented" },
  {
    id: "functional" as CodeStyleType,
    name: "Functional",
    description: "Pure functions, immutability",
  },
];

export const BehaviorTab: React.FC<BehaviorTabProps> = ({
  config,
  updateConfig,
}) => {
  return (
    <div className="space-y-2">
      <section className="bg-slate-800/40 rounded-lg border border-slate-700/60 overflow-hidden">
        <div className="px-2.5 py-1.5 border-b border-slate-700/60">
          <h3 className="text-[10px] font-semibold text-white">Persona</h3>
        </div>
        <div className="p-2 grid grid-cols-2 gap-1.5">
          {PERSONAS.map((persona) => {
            const isSelected = config.persona === persona.id;
            return (
              <button
                key={persona.id}
                onClick={() => updateConfig("persona", persona.id)}
                className={`flex items-center gap-1.5 p-2 rounded-lg border text-left transition-all ${
                  isSelected
                    ? "bg-violet-500/20 border-violet-500/40"
                    : "bg-slate-800/60 border-slate-600/50 hover:border-slate-500"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center shrink-0 bg-gradient-to-br ${persona.gradient} text-white`}
                >
                  <persona.icon />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-medium text-slate-200">
                    {persona.name}
                  </div>
                  <div className="text-[9px] text-slate-500 truncate">
                    {persona.description}
                  </div>
                </div>
                {isSelected && (
                  <div className="w-3.5 h-3.5 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                    <CheckIcon />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-slate-800/40 rounded-lg border border-slate-700/60 overflow-hidden">
        <div className="px-2.5 py-1.5 border-b border-slate-700/60">
          <h3 className="text-[10px] font-semibold text-white">
            Response style
          </h3>
        </div>
        <div className="p-2 grid grid-cols-2 gap-1.5">
          {RESPONSE_STYLES.map((style) => {
            const isSelected = config.responseStyle === style.id;
            return (
              <button
                key={style.id}
                onClick={() => updateConfig("responseStyle", style.id)}
                className={`flex items-center gap-1.5 p-2 rounded-lg border transition-all ${
                  isSelected
                    ? "bg-violet-500/20 border-violet-500/40"
                    : "bg-slate-800/60 border-slate-600/50 hover:border-slate-500"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${isSelected ? "bg-violet-500 text-white" : "bg-slate-700 text-slate-400"}`}
                >
                  <style.icon />
                </div>
                <div className="min-w-0 text-[10px] font-medium text-slate-200">
                  {style.name}
                </div>
                {isSelected && (
                  <div className="w-3.5 h-3.5 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                    <CheckIcon />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-slate-800/40 rounded-lg border border-slate-700/60 overflow-hidden">
        <div className="px-2.5 py-1.5 border-b border-slate-700/60">
          <h3 className="text-[10px] font-semibold text-white">Code style</h3>
        </div>
        <div className="p-2 flex flex-wrap gap-1">
          {CODE_STYLES.map((style) => {
            const isSelected = config.codeStyle === style.id;
            return (
              <button
                key={style.id}
                onClick={() => updateConfig("codeStyle", style.id)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                  isSelected
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "bg-slate-800/60 text-slate-400 border border-slate-600/50 hover:border-slate-500"
                }`}
              >
                {style.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-slate-800/40 rounded-lg border border-slate-700/60 overflow-hidden">
        <div className="px-2.5 py-1.5 border-b border-slate-700/60">
          <h3 className="text-[10px] font-semibold text-white">Options</h3>
        </div>
        <div className="p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-300">Auto format code</span>
            <button
              onClick={() => updateConfig("autoFormat", !config.autoFormat)}
              className={`relative w-7 h-3.5 rounded-full transition-all ${config.autoFormat ? "bg-violet-500" : "bg-slate-600"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform ${config.autoFormat ? "translate-x-3.5" : "translate-x-0"}`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-300">Enhance prompts</span>
            <button
              onClick={() =>
                updateConfig("promptImprovement", !config.promptImprovement)
              }
              className={`relative w-7 h-3.5 rounded-full transition-all ${config.promptImprovement ? "bg-violet-500" : "bg-slate-600"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform ${config.promptImprovement ? "translate-x-3.5" : "translate-x-0"}`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-300">Notifications</span>
            <button
              onClick={() =>
                updateConfig("notifications", !config.notifications)
              }
              className={`relative w-7 h-3.5 rounded-full transition-all ${config.notifications ? "bg-violet-500" : "bg-slate-600"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform ${config.notifications ? "translate-x-3.5" : "translate-x-0"}`}
              />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
