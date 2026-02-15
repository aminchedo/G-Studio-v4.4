/**
 * ContextViewer Component
 *
 * Displays conversation context (goals, decisions, changes)
 */

import React from "react";
import { useCurrentConversation } from "@/stores/conversationStore";
import { Target, CheckCircle, FileEdit, HelpCircle } from "lucide-react";

interface ContextViewerProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const ContextViewer: React.FC<ContextViewerProps> = ({
  isOpen,
  onClose,
}) => {
  const conversation = useCurrentConversation();

  if (!conversation) {
    return (
      <div className="p-4 text-slate-400 text-sm text-center">
        No conversation selected
      </div>
    );
  }

  const { context } = conversation;

  return (
    <div className="p-4 space-y-4 bg-slate-900 text-slate-300">
      {/* Current Task */}
      {context.currentTask && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-sm text-white">Current Task</h3>
          </div>
          <p className="text-sm bg-slate-800 p-3 rounded">
            {context.currentTask}
          </p>
        </div>
      )}

      {/* Project Goals */}
      {context.projectGoals && context.projectGoals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <h3 className="font-semibold text-sm text-white">Project Goals</h3>
          </div>
          <ul className="space-y-1">
            {context.projectGoals.map((goal, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-green-400 mt-0.5">•</span>
                <span>{goal}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent Changes */}
      {context.recentChanges && context.recentChanges.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileEdit className="w-4 h-4 text-yellow-400" />
            <h3 className="font-semibold text-sm text-white">Recent Changes</h3>
          </div>
          <div className="space-y-2">
            {context.recentChanges.slice(0, 5).map((change, i) => (
              <div key={i} className="text-sm bg-slate-800 p-2 rounded">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs text-blue-400">
                    {change.path}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      change.type === "created"
                        ? "bg-green-900 text-green-300"
                        : change.type === "modified"
                          ? "bg-yellow-900 text-yellow-300"
                          : "bg-red-900 text-red-300"
                    }`}
                  >
                    {change.type}
                  </span>
                </div>
                {change.description && (
                  <p className="text-xs text-slate-400">{change.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open Questions */}
      {context.openQuestions && context.openQuestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-4 h-4 text-purple-400" />
            <h3 className="font-semibold text-sm text-white">Open Questions</h3>
          </div>
          <ul className="space-y-1">
            {context.openQuestions.map((question, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">?</span>
                <span>{question}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Decisions */}
      {context.decisions && context.decisions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-sm text-white">Decisions Made</h3>
          </div>
          <div className="space-y-2">
            {context.decisions.slice(0, 5).map((decision, i) => {
              const d =
                typeof decision === "string"
                  ? { question: decision, answer: "", reasoning: undefined }
                  : (decision as {
                      question?: string;
                      answer?: string;
                      reasoning?: string;
                    });
              return (
                <div key={i} className="text-sm bg-slate-800 p-2 rounded">
                  <p className="font-medium mb-1">{d.question}</p>
                  <p className="text-slate-400">{d.answer}</p>
                  {d.reasoning && (
                    <p className="text-xs text-slate-500 mt-1">
                      Reasoning: {d.reasoning}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!context.currentTask &&
        (!context.projectGoals || context.projectGoals.length === 0) &&
        (!context.recentChanges || context.recentChanges.length === 0) &&
        (!context.openQuestions || context.openQuestions.length === 0) &&
        (!context.decisions || context.decisions.length === 0) && (
          <div className="text-center text-slate-400 py-8">
            <p className="text-sm">No context information yet</p>
            <p className="text-xs mt-1">Context will be built as you chat</p>
          </div>
        )}
    </div>
  );
};
