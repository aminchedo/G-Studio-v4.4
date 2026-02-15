/**
 * useMultiAgent - Multi-agent collaboration hook
 * 
 * Manages multiple AI agents for collaborative task execution
 * Handles task routing, agent coordination, and result aggregation
 */

import { useState, useCallback, useRef, useMemo } from 'react';

// Types
export type AgentType = 
  | 'coder'
  | 'reviewer'
  | 'tester'
  | 'documenter'
  | 'architect'
  | 'debugger'
  | 'optimizer'
  | 'analyst';

export interface Agent {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  capabilities: string[];
  status: 'idle' | 'busy' | 'error';
  currentTask?: string;
  completedTasks: number;
  successRate: number;
}

export interface Task {
  id: string;
  type: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'assigned' | 'in-progress' | 'completed' | 'failed';
  assignedAgent?: string;
  result?: unknown;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

export interface ComplexTask {
  id: string;
  description: string;
  subtasks: Task[];
  requiredAgents: AgentType[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface CollaborationEvent {
  id: string;
  type: 'task_assigned' | 'task_started' | 'task_completed' | 'task_failed' | 'agent_communication';
  timestamp: number;
  agentId: string;
  taskId?: string;
  message: string;
  data?: unknown;
}

export interface UseMultiAgentReturn {
  // State
  agents: Agent[];
  activeAgent: AgentType | null;
  taskQueue: Task[];
  collaborationHistory: CollaborationEvent[];
  isProcessing: boolean;
  
  // Actions
  assignTask: (task: Omit<Task, 'id' | 'status' | 'createdAt'>, agentType?: AgentType) => Promise<Task>;
  executeCollaborativeTask: (task: ComplexTask) => Promise<unknown>;
  setActiveAgent: (agentType: AgentType | null) => void;
  getAgentsByCapability: (capability: string) => Agent[];
  cancelTask: (taskId: string) => void;
  clearHistory: () => void;
  
  // Agent Management
  getAgentStatus: (agentType: AgentType) => Agent | undefined;
  resetAgent: (agentType: AgentType) => void;
}

// Default agents configuration
const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'agent-coder',
    type: 'coder',
    name: 'Code Writer',
    description: 'Writes clean, efficient code based on requirements',
    capabilities: ['code-generation', 'implementation', 'refactoring'],
    status: 'idle',
    completedTasks: 0,
    successRate: 1,
  },
  {
    id: 'agent-reviewer',
    type: 'reviewer',
    name: 'Code Reviewer',
    description: 'Reviews code for quality, best practices, and potential issues',
    capabilities: ['code-review', 'quality-check', 'best-practices'],
    status: 'idle',
    completedTasks: 0,
    successRate: 1,
  },
  {
    id: 'agent-tester',
    type: 'tester',
    name: 'Test Engineer',
    description: 'Creates comprehensive tests for code',
    capabilities: ['unit-testing', 'integration-testing', 'test-generation'],
    status: 'idle',
    completedTasks: 0,
    successRate: 1,
  },
  {
    id: 'agent-documenter',
    type: 'documenter',
    name: 'Documentation Writer',
    description: 'Creates clear documentation and comments',
    capabilities: ['documentation', 'comments', 'api-docs', 'readme'],
    status: 'idle',
    completedTasks: 0,
    successRate: 1,
  },
  {
    id: 'agent-architect',
    type: 'architect',
    name: 'System Architect',
    description: 'Designs system architecture and structure',
    capabilities: ['architecture', 'design-patterns', 'system-design'],
    status: 'idle',
    completedTasks: 0,
    successRate: 1,
  },
  {
    id: 'agent-debugger',
    type: 'debugger',
    name: 'Bug Hunter',
    description: 'Finds and fixes bugs in code',
    capabilities: ['debugging', 'bug-fixing', 'error-analysis'],
    status: 'idle',
    completedTasks: 0,
    successRate: 1,
  },
  {
    id: 'agent-optimizer',
    type: 'optimizer',
    name: 'Performance Optimizer',
    description: 'Optimizes code for better performance',
    capabilities: ['optimization', 'performance', 'efficiency'],
    status: 'idle',
    completedTasks: 0,
    successRate: 1,
  },
  {
    id: 'agent-analyst',
    type: 'analyst',
    name: 'Code Analyst',
    description: 'Analyzes code complexity and quality metrics',
    capabilities: ['analysis', 'metrics', 'complexity'],
    status: 'idle',
    completedTasks: 0,
    successRate: 1,
  },
];

// Task type to agent mapping
const TASK_AGENT_MAP: Record<string, AgentType[]> = {
  'write-code': ['coder'],
  'generate-code': ['coder'],
  'implement': ['coder', 'architect'],
  'review': ['reviewer'],
  'test': ['tester'],
  'document': ['documenter'],
  'debug': ['debugger'],
  'fix-bug': ['debugger', 'coder'],
  'optimize': ['optimizer'],
  'analyze': ['analyst'],
  'refactor': ['coder', 'optimizer'],
  'design': ['architect'],
};

// Generate unique ID
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * useMultiAgent hook
 */
export function useMultiAgent(): UseMultiAgentReturn {
  // State
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS);
  const [activeAgent, setActiveAgentState] = useState<AgentType | null>(null);
  const [taskQueue, setTaskQueue] = useState<Task[]>([]);
  const [collaborationHistory, setCollaborationHistory] = useState<CollaborationEvent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs
  const taskControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Add collaboration event
  const addEvent = useCallback((event: Omit<CollaborationEvent, 'id' | 'timestamp'>) => {
    const newEvent: CollaborationEvent = {
      ...event,
      id: generateId(),
      timestamp: Date.now(),
    };
    setCollaborationHistory(prev => [...prev.slice(-99), newEvent]);
  }, []);

  // Update agent status
  const updateAgentStatus = useCallback((
    agentType: AgentType,
    updates: Partial<Agent>
  ) => {
    setAgents(prev =>
      prev.map(agent =>
        agent.type === agentType ? { ...agent, ...updates } : agent
      )
    );
  }, []);

  // Find best agent for task
  const findBestAgent = useCallback((taskType: string, preferredType?: AgentType): Agent | null => {
    // If preferred type specified and available
    if (preferredType) {
      const preferred = agents.find(a => a.type === preferredType && a.status === 'idle');
      if (preferred) return preferred;
    }

    // Find based on task type mapping
    const suitableTypes = TASK_AGENT_MAP[taskType] || [];
    for (const type of suitableTypes) {
      const agent = agents.find(a => a.type === type && a.status === 'idle');
      if (agent) return agent;
    }

    // Fallback to any idle agent
    return agents.find(a => a.status === 'idle') || null;
  }, [agents]);

  // Assign task
  const assignTask = useCallback(async (
    taskInput: Omit<Task, 'id' | 'status' | 'createdAt'>,
    agentType?: AgentType
  ): Promise<Task> => {
    const task: Task = {
      ...taskInput,
      id: generateId(),
      status: 'pending',
      createdAt: Date.now(),
    };

    // Find suitable agent
    const agent = findBestAgent(task.type, agentType);
    if (!agent) {
      task.status = 'failed';
      task.error = 'No available agent';
      setTaskQueue(prev => [...prev, task]);
      return task;
    }

    // Assign to agent
    task.status = 'assigned';
    task.assignedAgent = agent.id;
    setTaskQueue(prev => [...prev, task]);

    // Update agent status
    updateAgentStatus(agent.type, {
      status: 'busy',
      currentTask: task.id,
    });

    addEvent({
      type: 'task_assigned',
      agentId: agent.id,
      taskId: task.id,
      message: `Task "${task.description}" assigned to ${agent.name}`,
    });

    // Execute task
    setIsProcessing(true);
    const controller = new AbortController();
    taskControllersRef.current.set(task.id, controller);

    try {
      // Update task status
      task.status = 'in-progress';
      task.startedAt = Date.now();
      setTaskQueue(prev =>
        prev.map(t => (t.id === task.id ? { ...t, ...task } : t))
      );

      addEvent({
        type: 'task_started',
        agentId: agent.id,
        taskId: task.id,
        message: `${agent.name} started working on "${task.description}"`,
      });

      // Simulate task execution
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 1000 + Math.random() * 2000);
        controller.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Task cancelled'));
        });
      });

      // Task completed
      task.status = 'completed';
      task.completedAt = Date.now();
      task.result = { success: true, output: `Task completed by ${agent.name}` };

      updateAgentStatus(agent.type, {
        status: 'idle',
        currentTask: undefined,
        completedTasks: agent.completedTasks + 1,
      });

      addEvent({
        type: 'task_completed',
        agentId: agent.id,
        taskId: task.id,
        message: `${agent.name} completed "${task.description}"`,
        data: task.result,
      });
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Task failed';

      updateAgentStatus(agent.type, {
        status: 'idle',
        currentTask: undefined,
        successRate: agent.successRate * 0.95,
      });

      addEvent({
        type: 'task_failed',
        agentId: agent.id,
        taskId: task.id,
        message: `${agent.name} failed on "${task.description}": ${task.error}`,
      });
    } finally {
      taskControllersRef.current.delete(task.id);
      setIsProcessing(taskControllersRef.current.size > 0);
      setTaskQueue(prev =>
        prev.map(t => (t.id === task.id ? task : t))
      );
    }

    return task;
  }, [findBestAgent, updateAgentStatus, addEvent]);

  // Execute collaborative task
  const executeCollaborativeTask = useCallback(async (
    complexTask: ComplexTask
  ): Promise<unknown> => {
    const results: Record<string, unknown> = {};
    const errors: string[] = [];

    // Sort subtasks by dependencies
    const sortedSubtasks = [...complexTask.subtasks].sort((a, b) => {
      if (a.dependencies?.includes(b.id)) return 1;
      if (b.dependencies?.includes(a.id)) return -1;
      return (b.priority === 'critical' ? 4 : b.priority === 'high' ? 3 : b.priority === 'medium' ? 2 : 1) -
             (a.priority === 'critical' ? 4 : a.priority === 'high' ? 3 : a.priority === 'medium' ? 2 : 1);
    });

    // Execute subtasks
    for (const subtask of sortedSubtasks) {
      // Check dependencies
      if (subtask.dependencies) {
        const unmetDeps = subtask.dependencies.filter(depId => !results[depId]);
        if (unmetDeps.length > 0) {
          errors.push(`Task ${subtask.id} has unmet dependencies: ${unmetDeps.join(', ')}`);
          continue;
        }
      }

      // Find agent type for subtask
      const agentType = complexTask.requiredAgents.find(type =>
        agents.find(a => a.type === type && a.status === 'idle')
      );

      try {
        const result = await assignTask(subtask, agentType);
        results[subtask.id] = result;
      } catch (error) {
        errors.push(`Task ${subtask.id} failed: ${error}`);
      }
    }

    return {
      taskId: complexTask.id,
      results,
      errors,
      success: errors.length === 0,
    };
  }, [agents, assignTask]);

  // Set active agent
  const setActiveAgent = useCallback((agentType: AgentType | null) => {
    setActiveAgentState(agentType);
  }, []);

  // Get agents by capability
  const getAgentsByCapability = useCallback((capability: string): Agent[] => {
    return agents.filter(agent =>
      agent.capabilities.includes(capability)
    );
  }, [agents]);

  // Cancel task
  const cancelTask = useCallback((taskId: string) => {
    const controller = taskControllersRef.current.get(taskId);
    if (controller) {
      controller.abort();
      taskControllersRef.current.delete(taskId);
    }
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setCollaborationHistory([]);
  }, []);

  // Get agent status
  const getAgentStatus = useCallback((agentType: AgentType): Agent | undefined => {
    return agents.find(a => a.type === agentType);
  }, [agents]);

  // Reset agent
  const resetAgent = useCallback((agentType: AgentType) => {
    updateAgentStatus(agentType, {
      status: 'idle',
      currentTask: undefined,
      completedTasks: 0,
      successRate: 1,
    });
  }, [updateAgentStatus]);

  return {
    agents,
    activeAgent,
    taskQueue,
    collaborationHistory,
    isProcessing,
    assignTask,
    executeCollaborativeTask,
    setActiveAgent,
    getAgentsByCapability,
    cancelTask,
    clearHistory,
    getAgentStatus,
    resetAgent,
  };
}

export default useMultiAgent;
