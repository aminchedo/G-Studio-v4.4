/**
 * MCP Connection Manager
 * Manages connections to 60+ MCP servers with health monitoring, reconnection, and status tracking
 */

export interface McpConnection {
  id: string;
  name: string;
  serverUrl?: string;
  command?: string;
  args?: string[];
  status: 'connected' | 'disconnected' | 'connecting' | 'error' | 'idle';
  lastHealthCheck?: Date;
  lastError?: string;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  tools: string[];
  metadata?: {
    version?: string;
    description?: string;
    capabilities?: string[];
  };
}

export interface McpConnectionStatus {
  total: number;
  connected: number;
  disconnected: number;
  connecting: number;
  error: number;
  idle: number;
}

export class McpConnectionManager {
  private connections: Map<string, McpConnection> = new Map();
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectIntervals: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly RECONNECT_DELAY = 5000; // 5 seconds

  /**
   * Register an MCP connection
   */
  registerConnection(config: Omit<McpConnection, 'status' | 'reconnectAttempts' | 'lastHealthCheck'>): void {
    const connection: McpConnection = {
      ...config,
      status: 'idle',
      reconnectAttempts: 0,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      tools: config.tools || [],
    };

    this.connections.set(config.id, connection);
    console.log(`[MCP Manager] Registered connection: ${config.id} (${config.name})`);
  }

  /**
   * Connect to an MCP server
   */
  async connect(connectionId: string): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    if (connection.status === 'connected') {
      return true;
    }

    connection.status = 'connecting';
    connection.lastError = undefined;

    try {
      // Simulate connection logic - replace with actual MCP client connection
      await this.attemptConnection(connection);
      
      connection.status = 'connected';
      connection.lastHealthCheck = new Date();
      connection.reconnectAttempts = 0;
      
      console.log(`[MCP Manager] Connected: ${connectionId}`);
      return true;
    } catch (error) {
      connection.status = 'error';
      connection.lastError = error instanceof Error ? error.message : String(error);
      connection.reconnectAttempts++;
      
      console.error(`[MCP Manager] Connection failed: ${connectionId}`, error);
      
      // Schedule reconnection if attempts remain
      if (connection.reconnectAttempts < connection.maxReconnectAttempts) {
        this.scheduleReconnect(connectionId);
      }
      
      return false;
    }
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Clear any scheduled reconnection
    const reconnectInterval = this.reconnectIntervals.get(connectionId);
    if (reconnectInterval) {
      clearTimeout(reconnectInterval);
      this.reconnectIntervals.delete(connectionId);
    }

    connection.status = 'disconnected';
    connection.lastHealthCheck = undefined;
    console.log(`[MCP Manager] Disconnected: ${connectionId}`);
  }

  /**
   * Get connection status
   */
  getConnection(connectionId: string): McpConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get all connections
   */
  getAllConnections(): McpConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection status summary
   */
  getStatusSummary(): McpConnectionStatus {
    const connections = Array.from(this.connections.values());
    return {
      total: connections.length,
      connected: connections.filter(c => c.status === 'connected').length,
      disconnected: connections.filter(c => c.status === 'disconnected').length,
      connecting: connections.filter(c => c.status === 'connecting').length,
      error: connections.filter(c => c.status === 'error').length,
      idle: connections.filter(c => c.status === 'idle').length,
    };
  }

  /**
   * Get tools available from all connected MCPs
   */
  getAvailableTools(): Map<string, { connectionId: string; connectionName: string; tool: string }> {
    const tools = new Map();
    
    for (const connection of this.connections.values()) {
      if (connection.status === 'connected' && connection.tools) {
        for (const tool of connection.tools) {
          tools.set(tool, {
            connectionId: connection.id,
            connectionName: connection.name,
            tool,
          });
        }
      }
    }
    
    return tools;
  }

  /**
   * Start health checking for all connections
   */
  startHealthChecks(): void {
    if (this.healthCheckInterval) {
      return; // Already running
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);

    console.log('[MCP Manager] Health checks started');
  }

  /**
   * Stop health checking
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('[MCP Manager] Health checks stopped');
    }
  }

  /**
   * Perform health checks on all connections
   */
  private async performHealthChecks(): Promise<void> {
    const connected = Array.from(this.connections.values()).filter(
      c => c.status === 'connected'
    );

    for (const connection of connected) {
      try {
        // Simulate health check - replace with actual MCP ping
        const isHealthy = await this.checkConnectionHealth(connection);
        
        if (isHealthy) {
          connection.lastHealthCheck = new Date();
        } else {
          connection.status = 'error';
          connection.lastError = 'Health check failed';
          this.scheduleReconnect(connection.id);
        }
      } catch (error) {
        connection.status = 'error';
        connection.lastError = error instanceof Error ? error.message : String(error);
        this.scheduleReconnect(connection.id);
      }
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Clear existing reconnect interval
    const existing = this.reconnectIntervals.get(connectionId);
    if (existing) {
      clearTimeout(existing);
    }

    if (connection.reconnectAttempts >= connection.maxReconnectAttempts) {
      console.warn(`[MCP Manager] Max reconnect attempts reached for: ${connectionId}`);
      return;
    }

    const delay = this.RECONNECT_DELAY * (connection.reconnectAttempts + 1);
    const timeoutId = setTimeout(() => {
      this.reconnectIntervals.delete(connectionId);
      this.connect(connectionId);
    }, delay);

    this.reconnectIntervals.set(connectionId, timeoutId);
    console.log(`[MCP Manager] Scheduled reconnect for ${connectionId} in ${delay}ms`);
  }

  /**
   * Attempt connection to MCP server
   * NOTE: Real MCP client implementation requires Node.js runtime or MCP SDK
   * In browser environment, MCP connections are not directly supported.
   * This implementation marks connections as disabled in browser context.
   */
  private async attemptConnection(connection: McpConnection): Promise<void> {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Browser environment - MCP connections require Node.js runtime
      // Mark as disabled rather than simulating
      connection.status = 'disconnected';
      connection.lastError = 'MCP connections require Node.js runtime. Browser environment detected.';
      throw new Error('MCP connections are not available in browser environment. This feature requires Electron main process or Node.js runtime.');
    }
    
    // Node.js environment - would implement real MCP client here
    // For now, mark as not implemented rather than simulating
    connection.status = 'disconnected';
    connection.lastError = 'MCP client implementation not available. Real MCP SDK integration required.';
    throw new Error('MCP client implementation not available. Real MCP SDK integration required.');
  }

  /**
   * Check connection health
   * NOTE: Real health check requires active MCP connection
   * In browser environment or without real connection, returns false
   */
  private async checkConnectionHealth(connection: McpConnection): Promise<boolean> {
    // If connection is not actually connected, health check fails
    if (connection.status !== 'connected') {
      return false;
    }
    
    // Check if we're in browser environment
    if (typeof window !== 'undefined') {
      // Browser environment - no real connections possible
      return false;
    }
    
    // Node.js environment - would implement real MCP ping here
    // For now, return false since we don't have real connections
    return false;
  }

  /**
   * Connect all idle connections
   */
  async connectAll(): Promise<{ succeeded: number; failed: number }> {
    const idle = Array.from(this.connections.values()).filter(
      c => c.status === 'idle' || c.status === 'disconnected'
    );

    let succeeded = 0;
    let failed = 0;

    for (const connection of idle) {
      const success = await this.connect(connection.id);
      if (success) {
        succeeded++;
      } else {
        failed++;
      }
    }

    return { succeeded, failed };
  }

  /**
   * Disconnect all connections
   */
  async disconnectAll(): Promise<void> {
    for (const connection of this.connections.values()) {
      if (connection.status === 'connected' || connection.status === 'connecting') {
        await this.disconnect(connection.id);
      }
    }
  }

  /**
   * Remove a connection
   */
  removeConnection(connectionId: string): void {
    this.disconnect(connectionId);
    this.connections.delete(connectionId);
    console.log(`[MCP Manager] Removed connection: ${connectionId}`);
  }

  /**
   * Clear all connections
   */
  clear(): void {
    this.stopHealthChecks();
    this.disconnectAll();
    this.connections.clear();
    console.log('[MCP Manager] Cleared all connections');
  }
}

/**
 * Global MCP Connection Manager singleton
 */
let globalMcpManager: McpConnectionManager | null = null;

export function getMcpConnectionManager(): McpConnectionManager {
  if (!globalMcpManager) {
    globalMcpManager = new McpConnectionManager();
    // Auto-start health checks
    globalMcpManager.startHealthChecks();
  }
  return globalMcpManager;
}

/**
 * Initialize MCP connections from configuration
 */
export async function initializeMcpConnections(
  configs: Array<Omit<McpConnection, 'status' | 'reconnectAttempts' | 'lastHealthCheck'>>
): Promise<void> {
  const manager = getMcpConnectionManager();
  
  for (const config of configs) {
    manager.registerConnection(config);
  }
  
  // Connect all by default
  await manager.connectAll();
}
