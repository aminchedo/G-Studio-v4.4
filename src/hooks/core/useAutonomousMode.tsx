/**
 * useAutonomousMode - Refactored from class AutonomousController
 *
 * Provides autonomous AI mode control via React hooks
 * Manages permission levels, task queues, and safety controls
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";

// Types
export type TaskPermissionLevel = "view" | "suggest" | "execute" | "full";

export interface AutonomousTask {
  id: string;
  type: "code" | "file" | "system" | "network" | "custom";
  action: string;
  params: Record<string, unknown>;
  permissionRequired: TaskPermissionLevel;
  status:
    | "pending"
    | "approved"
    | "rejected"
    | "executing"
    | "completed"
    | "failed";
  result?: unknown;
  error?: string;
  createdAt: number;
  executedAt?: number;
  completedAt?: number;
}

export interface AutonomousConfig {
  enabled: boolean;
  permissionLevel: TaskPermissionLevel;
  autoApproveTypes: string[];
  maxQueueSize: number;
  taskTimeout: number;
  requireConfirmation: boolean;
  safeMode: boolean;
}

export interface AutonomousStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  averageExecutionTime: number;
}

export interface UseAutonomousModeReturn {
  // State
  isEnabled: boolean;
  permissionLevel: TaskPermissionLevel;
  config: AutonomousConfig;
  taskQueue: AutonomousTask[];
  currentTask: AutonomousTask | null;
  stats: AutonomousStats;
  isPaused: boolean;
  // Methods
  enable: () => void;
  disable: () => void;
  toggle: () => void;
  setPermissionLevel: (level: TaskPermissionLevel) => void;
  updateConfig: (updates: Partial<AutonomousConfig>) => void;
  queueTask: (
    task: Omit<AutonomousTask, "id" | "status" | "createdAt">,
  ) => string;
  approveTask: (taskId: string) => void;
  rejectTask: (taskId: string) => void;
  executeTask: (taskId: string) => Promise<unknown>;
  cancelTask: (taskId: string) => void;
  clearQueue: () => void;
  pause: () => void;
  resume: () => void;
  // Safety
  emergencyStop: () => void;
  getTaskHistory: () => AutonomousTask[];
}

// Default configuration
const DEFAULT_CONFIG: AutonomousConfig = {
  enabled: false,
  permissionLevel: "suggest",
  autoApproveTypes: [],
  maxQueueSize: 100,
  taskTimeout: 30000,
  requireConfirmation: true,
  safeMode: true,
};

// Permission level hierarchy
const PERMISSION_HIERARCHY: TaskPermissionLevel[] = [
  "view",
  "suggest",
  "execute",
  "full",
];

const hasPermission = (
  required: TaskPermissionLevel,
  current: TaskPermissionLevel,
): boolean => {
  const requiredIndex = PERMISSION_HIERARCHY.indexOf(required);
  const currentIndex = PERMISSION_HIERARCHY.indexOf(current);
  return currentIndex >= requiredIndex;
};

// Generate unique ID
const generateTaskId = (): string =>
  `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

/**
 * Hook for autonomous mode control
 */
export function useAutonomousMode(
  initialConfig: Partial<AutonomousConfig> = {},
  onTaskExecute?: (task: AutonomousTask) => Promise<unknown>,
): UseAutonomousModeReturn {
  // Configuration state
  const [config, setConfig] = useState<AutonomousConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });

  // Task management state
  const [taskQueue, setTaskQueue] = useState<AutonomousTask[]>([]);
  const [taskHistory, setTaskHistory] = useState<AutonomousTask[]>([]);
  const [currentTask, setCurrentTask] = useState<AutonomousTask | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [emergencyStopped, setEmergencyStopped] = useState(false);

  // Refs
  const executionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);

  // Computed stats
  const stats = useMemo((): AutonomousStats => {
    const completed = taskHistory.filter((t) => t.status === "completed");
    const failed = taskHistory.filter((t) => t.status === "failed");

    const executionTimes = completed
      .filter((t) => t.executedAt && t.completedAt)
      .map((t) => t.completedAt! - t.executedAt!);

    const averageExecutionTime =
      executionTimes.length > 0
        ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
        : 0;

    return {
      totalTasks: taskHistory.length,
      completedTasks: completed.length,
      failedTasks: failed.length,
      pendingTasks: taskQueue.filter((t) => t.status === "pending").length,
      averageExecutionTime,
    };
  }, [taskHistory, taskQueue]);

  // Enable autonomous mode
  const enable = useCallback(() => {
    if (emergencyStopped) {
      console.warn("[AutonomousMode] Cannot enable - emergency stop active");
      return;
    }
    setConfig((prev) => ({ ...prev, enabled: true }));
  }, [emergencyStopped]);

  // Disable autonomous mode
  const disable = useCallback(() => {
    setConfig((prev) => ({ ...prev, enabled: false }));
    setCurrentTask(null);
    if (executionTimeoutRef.current) {
      clearTimeout(executionTimeoutRef.current);
    }
  }, []);

  // Toggle autonomous mode
  const toggle = useCallback(() => {
    if (config.enabled) {
      disable();
    } else {
      enable();
    }
  }, [config.enabled, enable, disable]);

  // Set permission level
  const setPermissionLevel = useCallback((level: TaskPermissionLevel) => {
    setConfig((prev) => ({ ...prev, permissionLevel: level }));
  }, []);

  // Update configuration
  const updateConfig = useCallback((updates: Partial<AutonomousConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  // Queue a task
  const queueTask = useCallback(
    (taskData: Omit<AutonomousTask, "id" | "status" | "createdAt">): string => {
      if (taskQueue.length >= config.maxQueueSize) {
        throw new Error("Task queue is full");
      }

      const task: AutonomousTask = {
        ...taskData,
        id: generateTaskId(),
        status: "pending",
        createdAt: Date.now(),
      };

      // Auto-approve if configured
      if (
        !config.requireConfirmation ||
        config.autoApproveTypes.includes(task.type)
      ) {
        if (hasPermission(task.permissionRequired, config.permissionLevel)) {
          task.status = "approved";
        }
      }

      setTaskQueue((prev) => [...prev, task]);
      return task.id;
    },
    [config, taskQueue.length],
  );

  // Approve a task
  const approveTask = useCallback((taskId: string) => {
    setTaskQueue((prev) =>
      prev.map((task) =>
        task.id === taskId && task.status === "pending"
          ? { ...task, status: "approved" }
          : task,
      ),
    );
  }, []);

  // Reject a task
  const rejectTask = useCallback((taskId: string) => {
    setTaskQueue((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (task) {
        setTaskHistory((history) => [
          ...history,
          { ...task, status: "rejected" },
        ]);
      }
      return prev.filter((t) => t.id !== taskId);
    });
  }, []);

  // Execute a specific task
  const executeTask = useCallback(
    async (taskId: string): Promise<unknown> => {
      const task = taskQueue.find((t) => t.id === taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      if (task.status !== "approved") {
        throw new Error(`Task not approved: ${taskId}`);
      }

      if (!hasPermission(task.permissionRequired, config.permissionLevel)) {
        throw new Error(`Insufficient permissions for task: ${taskId}`);
      }

      // Update task status
      const updatedTask: AutonomousTask = {
        ...task,
        status: "executing",
        executedAt: Date.now(),
      };
      setCurrentTask(updatedTask);
      setTaskQueue((prev) => prev.filter((t) => t.id !== taskId));

      try {
        // Set timeout
        const timeoutPromise = new Promise((_, reject) => {
          executionTimeoutRef.current = setTimeout(() => {
            reject(new Error("Task execution timeout"));
          }, config.taskTimeout);
        });

        // Execute task
        const executePromise = onTaskExecute
          ? onTaskExecute(updatedTask)
          : Promise.resolve({ success: true });

        const result = await Promise.race([executePromise, timeoutPromise]);

        // Clear timeout
        if (executionTimeoutRef.current) {
          clearTimeout(executionTimeoutRef.current);
        }

        // Mark as completed
        const completedTask: AutonomousTask = {
          ...updatedTask,
          status: "completed",
          result,
          completedAt: Date.now(),
        };
        setTaskHistory((prev) => [...prev, completedTask]);
        setCurrentTask(null);

        return result;
      } catch (error) {
        // Clear timeout
        if (executionTimeoutRef.current) {
          clearTimeout(executionTimeoutRef.current);
        }

        // Mark as failed
        const failedTask: AutonomousTask = {
          ...updatedTask,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          completedAt: Date.now(),
        };
        setTaskHistory((prev) => [...prev, failedTask]);
        setCurrentTask(null);

        throw error;
      }
    },
    [taskQueue, config, onTaskExecute],
  );

  // Cancel a task
  const cancelTask = useCallback(
    (taskId: string) => {
      setTaskQueue((prev) => prev.filter((t) => t.id !== taskId));
      if (currentTask?.id === taskId) {
        setCurrentTask(null);
        if (executionTimeoutRef.current) {
          clearTimeout(executionTimeoutRef.current);
        }
      }
    },
    [currentTask],
  );

  // Clear queue
  const clearQueue = useCallback(() => {
    setTaskQueue([]);
  }, []);

  // Pause processing
  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  // Resume processing
  const resume = useCallback(() => {
    if (!emergencyStopped) {
      setIsPaused(false);
    }
  }, [emergencyStopped]);

  // Emergency stop
  const emergencyStop = useCallback(() => {
    console.warn("[AutonomousMode] EMERGENCY STOP ACTIVATED");
    setEmergencyStopped(true);
    setConfig((prev) => ({ ...prev, enabled: false }));
    setIsPaused(true);
    setCurrentTask(null);
    setTaskQueue([]);
    if (executionTimeoutRef.current) {
      clearTimeout(executionTimeoutRef.current);
    }
  }, []);

  // Get task history
  const getTaskHistory = useCallback(() => {
    return [...taskHistory];
  }, [taskHistory]);

  // Auto-process approved tasks
  useEffect(() => {
    if (
      !config.enabled ||
      isPaused ||
      emergencyStopped ||
      currentTask ||
      processingRef.current
    ) {
      return;
    }

    const approvedTask = taskQueue.find((t) => t.status === "approved");
    if (!approvedTask) return;

    processingRef.current = true;
    executeTask(approvedTask.id)
      .catch((error) => {
        console.error("[AutonomousMode] Task execution failed:", error);
      })
      .finally(() => {
        processingRef.current = false;
      });
  }, [
    config.enabled,
    isPaused,
    emergencyStopped,
    currentTask,
    taskQueue,
    executeTask,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (executionTimeoutRef.current) {
        clearTimeout(executionTimeoutRef.current);
      }
    };
  }, []);

  return {
    isEnabled: config.enabled,
    permissionLevel: config.permissionLevel,
    config,
    taskQueue,
    currentTask,
    stats,
    isPaused,
    enable,
    disable,
    toggle,
    setPermissionLevel,
    updateConfig,
    queueTask,
    approveTask,
    rejectTask,
    executeTask,
    cancelTask,
    clearQueue,
    pause,
    resume,
    emergencyStop,
    getTaskHistory,
  };
}

// Context for app-wide autonomous mode
import React, { createContext, useContext, ReactNode } from "react";

const AutonomousModeContext = createContext<UseAutonomousModeReturn | null>(
  null,
);

interface AutonomousModeProviderProps {
  children: ReactNode;
  initialConfig?: Partial<AutonomousConfig>;
  onTaskExecute?: (task: AutonomousTask) => Promise<unknown>;
}

export const AutonomousModeProvider: React.FC<AutonomousModeProviderProps> = ({
  children,
  initialConfig,
  onTaskExecute,
}) => {
  const autonomousMode = useAutonomousMode(initialConfig, onTaskExecute);

  return (
    <AutonomousModeContext.Provider value={autonomousMode}>
      {children}
    </AutonomousModeContext.Provider>
  );
};

export const useAutonomousModeContext = (): UseAutonomousModeReturn => {
  const context = useContext(AutonomousModeContext);
  if (!context) {
    throw new Error(
      "useAutonomousModeContext must be used within an AutonomousModeProvider",
    );
  }
  return context;
};

export default useAutonomousMode;
