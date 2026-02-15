/**
 * IPC Client - Communication with analysis backend
 */

export class IPCClient {
  private backendUrl: string;

  constructor() {
    // Default to local REST API
    this.backendUrl = process.env.CODE_INTELLIGENCE_API_URL || 'http://localhost:3001';
  }

  /**
   * Notify backend of file change
   */
  async notifyFileChange(filePath: string, content: string): Promise<void> {
    try {
      const response = await fetch(`${this.backendUrl}/api/intelligence/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: [filePath]
        })
      });

      if (!response.ok) {
        console.error(`[IPCClient] HTTP error! status: ${response.status}`);
        return; // Return instead of throwing
      }
    } catch (error) {
      console.error('[IPCClient] Failed to notify file change:', error);
    }
  }

  /**
   * Get analysis results for a file
   */
  async getAnalysis(filePath: string): Promise<any> {
    try {
      const encodedPath = encodeURIComponent(filePath);
      const response = await fetch(`${this.backendUrl}/api/intelligence/file/${encodedPath}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[IPCClient] Failed to get analysis:', error);
      return null;
    }
  }

  /**
   * Get breaking changes
   */
  async getBreakingChanges(): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/api/intelligence/breaking-changes`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[IPCClient] Failed to get breaking changes:', error);
      return null;
    }
  }

  /**
   * Get impact analysis for a file
   */
  async getImpact(filePath: string): Promise<any> {
    try {
      const encodedPath = encodeURIComponent(filePath);
      const response = await fetch(`${this.backendUrl}/api/intelligence/impact/${encodedPath}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[IPCClient] Failed to get impact:', error);
      return null;
    }
  }

  /**
   * Get dependency graph
   */
  async getDependencyGraph(): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/api/intelligence/dependency-graph`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[IPCClient] Failed to get dependency graph:', error);
      return null;
    }
  }

  /**
   * Subscribe to WebSocket updates
   */
  subscribeToUpdates(callback: (event: any) => void): WebSocket | null {
    try {
      const wsUrl = this.backendUrl.replace('http', 'ws') + '/ws';
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[IPCClient] WebSocket connected');
        // Subscribe to all file changes
        ws.send(JSON.stringify({ type: 'subscribe', paths: [] }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          callback(data);
        } catch (error) {
          console.error('[IPCClient] Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[IPCClient] WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('[IPCClient] WebSocket disconnected');
      };

      return ws;
    } catch (error) {
      console.error('[IPCClient] Failed to create WebSocket connection:', error);
      return null;
    }
  }
}
