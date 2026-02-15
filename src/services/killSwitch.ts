/**
 * Global Kill-Switch
 * 
 * System-level kill-switch independent of UI.
 * Survives UI crashes and provides auditable control.
 */

export class KillSwitch {
  private static globalKillSwitchActive: boolean = false;
  private static killSwitchHistory: Array<{
    timestamp: number;
    action: 'ACTIVATED' | 'DEACTIVATED';
    reason?: string;
  }> = [];

  /**
   * Activate global kill-switch
   */
  static activate(reason?: string): void {
    this.globalKillSwitchActive = true;
    this.killSwitchHistory.push({
      timestamp: Date.now(),
      action: 'ACTIVATED',
      reason,
    });
    console.log(`[AUTONOMOUS]: GLOBAL_KILL_SWITCH ACTIVATED${reason ? ` (${reason})` : ''}`);
    
    // Persist to localStorage for UI crash survival
    if (typeof window !== 'undefined') {
      localStorage.setItem('gstudio_killswitch_active', 'true');
      localStorage.setItem('gstudio_killswitch_timestamp', Date.now().toString());
      if (reason) {
        localStorage.setItem('gstudio_killswitch_reason', reason);
      }
    }
  }

  /**
   * Deactivate global kill-switch
   */
  static deactivate(reason?: string): void {
    this.globalKillSwitchActive = false;
    this.killSwitchHistory.push({
      timestamp: Date.now(),
      action: 'DEACTIVATED',
      reason,
    });
    console.log(`[AUTONOMOUS]: GLOBAL_KILL_SWITCH DEACTIVATED${reason ? ` (${reason})` : ''}`);
    
    // Clear from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gstudio_killswitch_active');
      localStorage.removeItem('gstudio_killswitch_timestamp');
      localStorage.removeItem('gstudio_killswitch_reason');
    }
  }

  /**
   * Check if kill-switch is active
   */
  static isActive(): boolean {
    // Check in-memory state
    if (this.globalKillSwitchActive) {
      return true;
    }

    // Check persisted state (survives UI crashes)
    if (typeof window !== 'undefined') {
      const persisted = localStorage.getItem('gstudio_killswitch_active');
      if (persisted === 'true') {
        // Restore in-memory state
        this.globalKillSwitchActive = true;
        return true;
      }
    }

    return false;
  }

  /**
   * Get kill-switch history
   */
  static getHistory(): Array<{
    timestamp: number;
    action: 'ACTIVATED' | 'DEACTIVATED';
    reason?: string;
  }> {
    return [...this.killSwitchHistory];
  }

  /**
   * Initialize kill-switch from persisted state
   */
  static initialize(): void {
    if (typeof window !== 'undefined') {
      const persisted = localStorage.getItem('gstudio_killswitch_active');
      if (persisted === 'true') {
        this.globalKillSwitchActive = true;
        const timestamp = localStorage.getItem('gstudio_killswitch_timestamp');
        const reason = localStorage.getItem('gstudio_killswitch_reason');
        console.log(`[AUTONOMOUS]: GLOBAL_KILL_SWITCH RESTORED (from ${timestamp ? new Date(parseInt(timestamp)).toISOString() : 'unknown'})`);
      }
    }
  }
}

// Initialize on import
KillSwitch.initialize();
