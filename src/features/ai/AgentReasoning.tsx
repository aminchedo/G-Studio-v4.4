/**
 * AgentReasoning Component - Display AI Thinking Process
 * Shows step-by-step reasoning, alternatives, and confidence levels
 */

import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Lightbulb, AlertTriangle, CheckCircle, TrendingUp, Info } from 'lucide-react';

export interface ReasoningStep {
  step: number;
  thought: string;
  confidence: number; // 0-100
  timestamp?: Date;
}

export interface Alternative {
  approach: string;
  pros: string[];
  cons: string[];
  score: number; // 0-100
}

export interface FinalDecision {
  chosen: string;
  reason: string;
  confidence: number;
}

export interface AgentReasoningData {
  steps: ReasoningStep[];
  alternatives?: Alternative[];
  finalDecision?: FinalDecision;
  thinkingTime?: number; // milliseconds
}

export interface AgentReasoningProps {
  reasoning: AgentReasoningData;
  isThinking?: boolean;
  showAlternatives?: boolean;
  showSteps?: boolean;
  compact?: boolean;
}

export const AgentReasoning: React.FC<AgentReasoningProps> = ({
  reasoning,
  isThinking = false,
  showAlternatives = true,
  showSteps = true,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [expandedAlternatives, setExpandedAlternatives] = useState<Set<number>>(new Set());

  const toggleAlternative = (index: number) => {
    const next = new Set(expandedAlternatives);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setExpandedAlternatives(next);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (compact && !isExpanded) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded cursor-pointer hover:bg-slate-750 transition-colors"
        onClick={() => setIsExpanded(true)}
      >
        <Brain className="w-4 h-4 text-purple-400" />
        <span className="text-sm text-slate-300">
          {isThinking ? 'Agent is thinking...' : 'View reasoning'}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 ml-auto" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700 cursor-pointer hover:bg-slate-750 transition-colors"
        onClick={() => compact && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Brain className={`w-5 h-5 text-purple-400 ${isThinking ? 'animate-pulse' : ''}`} />
          <h3 className="text-sm font-semibold text-white">
            {isThinking ? 'Agent is thinking...' : 'Agent Reasoning'}
          </h3>
          {reasoning.thinkingTime && (
            <span className="text-xs text-slate-400">
              ({(reasoning.thinkingTime / 1000).toFixed(1)}s)
            </span>
          )}
        </div>
        {compact && (
          <button onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Thinking Steps */}
          {showSteps && reasoning.steps.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-3 flex items-center gap-2">
                <TrendingUp className="w-3 h-3" />
                Thinking Process
              </h4>
              <div className="space-y-3">
                {reasoning.steps.map((step, index) => (
                  <div
                    key={index}
                    className="flex gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700"
                  >
                    {/* Step Number */}
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                        {step.step}
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 mb-2">{step.thought}</p>
                      
                      {/* Confidence Bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getConfidenceBg(step.confidence)} transition-all duration-300`}
                            style={{ width: `${step.confidence}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${getConfidenceColor(step.confidence)}`}>
                          {step.confidence}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alternatives Considered */}
          {showAlternatives && reasoning.alternatives && reasoning.alternatives.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-3 flex items-center gap-2">
                <Lightbulb className="w-3 h-3" />
                Alternatives Considered
              </h4>
              <div className="space-y-2">
                {reasoning.alternatives.map((alt, index) => (
                  <div
                    key={index}
                    className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden"
                  >
                    {/* Alternative Header */}
                    <div
                      className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-750 transition-colors"
                      onClick={() => toggleAlternative(index)}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm text-slate-200">{alt.approach}</span>
                        <div className="flex items-center gap-1">
                          <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${alt.score}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">{alt.score}%</span>
                        </div>
                      </div>
                      {expandedAlternatives.has(index) ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>

                    {/* Alternative Details */}
                    {expandedAlternatives.has(index) && (
                      <div className="px-3 py-2 border-t border-slate-700 space-y-2">
                        {/* Pros */}
                        {alt.pros.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <CheckCircle className="w-3 h-3 text-green-400" />
                              <span className="text-xs font-semibold text-green-400">Pros</span>
                            </div>
                            <ul className="space-y-1 ml-4">
                              {alt.pros.map((pro, i) => (
                                <li key={i} className="text-xs text-slate-300 flex items-start gap-1">
                                  <span className="text-green-400 mt-0.5">•</span>
                                  <span>{pro}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Cons */}
                        {alt.cons.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                              <span className="text-xs font-semibold text-red-400">Cons</span>
                            </div>
                            <ul className="space-y-1 ml-4">
                              {alt.cons.map((con, i) => (
                                <li key={i} className="text-xs text-slate-300 flex items-start gap-1">
                                  <span className="text-red-400 mt-0.5">•</span>
                                  <span>{con}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Decision */}
          {reasoning.finalDecision && (
            <div className="p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-300 mb-1">Final Decision</h4>
                  <p className="text-sm text-blue-200 mb-2">{reasoning.finalDecision.chosen}</p>
                  <p className="text-xs text-blue-300">{reasoning.finalDecision.reason}</p>
                </div>
              </div>
              
              {/* Decision Confidence */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-blue-400">Confidence:</span>
                <div className="flex-1 h-1.5 bg-blue-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${reasoning.finalDecision.confidence}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-blue-300">
                  {reasoning.finalDecision.confidence}%
                </span>
              </div>
            </div>
          )}

          {/* Empty State */}
          {reasoning.steps.length === 0 && !reasoning.finalDecision && (
            <div className="text-center py-8 text-slate-400">
              <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No reasoning data available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Example usage component
export const AgentReasoningExample: React.FC = () => {
  const exampleReasoning: AgentReasoningData = {
    steps: [
      {
        step: 1,
        thought: 'Analyzing the user request to understand the core requirements',
        confidence: 95,
      },
      {
        step: 2,
        thought: 'Identifying the best approach based on project structure and constraints',
        confidence: 85,
      },
      {
        step: 3,
        thought: 'Considering edge cases and potential issues',
        confidence: 75,
      },
    ],
    alternatives: [
      {
        approach: 'Use React Context API',
        pros: ['Simple to implement', 'No external dependencies', 'Built-in to React'],
        cons: ['Can cause unnecessary re-renders', 'Not ideal for complex state'],
        score: 70,
      },
      {
        approach: 'Use Zustand',
        pros: ['Minimal boilerplate', 'Good performance', 'Easy to learn'],
        cons: ['External dependency', 'Less ecosystem support than Redux'],
        score: 85,
      },
      {
        approach: 'Use Redux Toolkit',
        pros: ['Industry standard', 'Great DevTools', 'Large ecosystem'],
        cons: ['More boilerplate', 'Steeper learning curve'],
        score: 75,
      },
    ],
    finalDecision: {
      chosen: 'Zustand',
      reason: 'Best balance of simplicity and performance for this use case',
      confidence: 90,
    },
    thinkingTime: 2500,
  };

  return <AgentReasoning reasoning={exampleReasoning} />;
};
