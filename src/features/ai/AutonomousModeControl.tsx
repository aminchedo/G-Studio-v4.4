/**
 * Autonomous Mode Control Panel
 * 
 * UI for controlling autonomous execution mode.
 */

import React, { useState, useEffect } from 'react';
import { Play, Square, Pause, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { AutonomousController, AutonomousMode } from '@/services/autonomousController';
import { KillSwitch } from '@/services/security/killSwitch';

export const AutonomousModeControl: React.FC = () => {
  const [mode, setMode] = useState<AutonomousMode>('MANUAL');
  const [hasPermission, setHasPermission] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<any>(null);
  const [updateInterval, setUpdateInterval] = useState<NodeJS.Timeout | null>(null);
  const [killSwitchActive, setKillSwitchActive] = useState(false);

  useEffect(() => {
    // Check permission
    if (typeof window !== 'undefined') {
      setHasPermission(localStorage.getItem('gstudio_autonomous_permission') === 'true');
    }

    // Poll execution status and kill-switch
    const interval = setInterval(() => {
      const status = AutonomousController.getExecutionStatus();
      setExecutionStatus(status);
      setKillSwitchActive(KillSwitch.isActive());
    }, 1000);
    setUpdateInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const handleEnableAutonomous = () => {
    if (!hasPermission) {
      const confirmed = window.confirm(
        'Autonomous mode allows the AI to execute multiple steps automatically.\n\n' +
        'This requires explicit permission. Do you want to enable autonomous mode?'
      );
      if (confirmed) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('gstudio_autonomous_permission', 'true');
          setHasPermission(true);
        }
      } else {
        return;
      }
    }

    try {
      AutonomousController.setMode('AUTONOMOUS', true);
      setMode('AUTONOMOUS');
    } catch (error) {
      const errorMsg = `Failed to enable autonomous mode: ${error instanceof Error ? error.message : 'Unknown error'}`;
      if (typeof window !== 'undefined' && (window as any).showError) {
        (window as any).showError(errorMsg);
      } else {
        console.error(errorMsg);
      }
    }
  };

  const handleDisableAutonomous = () => {
    AutonomousController.setMode('MANUAL', false);
    setMode('MANUAL');
  };

  const handleEmergencyStop = () => {
    if (executionStatus?.executionId) {
      const confirmed = window.confirm(
        'Are you sure you want to emergency stop the autonomous execution?\n\n' +
        'This will immediately halt all steps and cannot be undone.'
      );
      if (confirmed) {
        AutonomousController.emergencyStopExecution(executionStatus.executionId);
      }
    }
  };

  const handleKillSwitch = () => {
    if (killSwitchActive) {
      const confirmed = window.confirm(
        'Deactivate global kill-switch?\n\n' +
        'This will allow autonomous executions to proceed.'
      );
      if (confirmed) {
        KillSwitch.deactivate('User deactivated via UI');
        setKillSwitchActive(false);
      }
    } else {
      const confirmed = window.confirm(
        '⚠️ ACTIVATE GLOBAL KILL-SWITCH?\n\n' +
        'This will immediately halt ALL autonomous executions system-wide.\n' +
        'The kill-switch survives UI crashes and persists across sessions.\n\n' +
        'Are you sure?'
      );
      if (confirmed) {
        KillSwitch.activate('User activated via UI');
        setKillSwitchActive(true);
      }
    }
  };

  const config = AutonomousController.getConfig();

  return (
    <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          {mode === 'AUTONOMOUS' ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
          )}
          Autonomous Mode
        </h3>
        <span className={`text-xs px-2 py-1 rounded ${
          mode === 'AUTONOMOUS' 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-slate-700/60 text-slate-400'
        }`}>
          {mode}
        </span>
      </div>

      {killSwitchActive && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-400 font-semibold">Global Kill-Switch ACTIVE</span>
            </div>
            <button
              onClick={handleKillSwitch}
              className="px-2 py-1 bg-red-500/30 hover:bg-red-500/40 text-red-300 text-xs rounded"
            >
              Deactivate
            </button>
          </div>
          <p className="text-xs text-red-300/80 mt-1">All autonomous executions are blocked system-wide.</p>
        </div>
      )}

      {mode === 'AUTONOMOUS' && executionStatus?.active && !killSwitchActive && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-yellow-400 font-semibold">Active Execution</span>
            <button
              onClick={handleEmergencyStop}
              className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded flex items-center gap-1"
            >
              <Square className="w-3 h-3" />
              Emergency Stop
            </button>
          </div>
          <div className="text-xs text-slate-300 space-y-1">
            <div>Step: {executionStatus.steps} / {config.maxSteps}</div>
            <div>Elapsed: {Math.floor(executionStatus.elapsed / 1000)}s</div>
            <div className="text-slate-500">ID: {executionStatus.executionId?.substring(0, 20)}...</div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {mode === 'MANUAL' ? (
          <button
            onClick={handleEnableAutonomous}
            className="w-full px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-sm text-purple-300 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            Enable Autonomous Mode
          </button>
        ) : (
          <button
            onClick={handleDisableAutonomous}
            className="w-full px-3 py-2 bg-slate-700/60 hover:bg-slate-700/80 border border-slate-600 rounded-lg text-sm text-slate-300 flex items-center justify-center gap-2"
          >
            <Square className="w-4 h-4" />
            Disable Autonomous Mode
          </button>
        )}
      </div>

      <div className="pt-2 border-t border-slate-700/60">
        <div className="text-xs text-slate-400 space-y-1">
          <div>Max Steps: {config.maxSteps}</div>
          <div>Max Retries: {config.maxRetries}</div>
          <div>Timeout: {Math.floor(config.timeout / 1000)}s</div>
          <div className="pt-1 text-slate-500">
            {hasPermission ? '✓ Permission granted' : '⚠ Permission required'}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-700/60">
        <button
          onClick={handleKillSwitch}
          className={`w-full px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 ${
            killSwitchActive
              ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300'
              : 'bg-slate-700/60 hover:bg-slate-700/80 border border-slate-600 text-slate-300'
          }`}
        >
          <Shield className="w-4 h-4" />
          {killSwitchActive ? 'Kill-Switch Active' : 'Activate Kill-Switch'}
        </button>
        <p className="text-xs text-slate-500 mt-1">
          System-wide emergency stop (survives UI crashes)
        </p>
      </div>
    </div>
  );
};
