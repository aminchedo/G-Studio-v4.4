/**
 * REST API Server - Express server for Code Intelligence API
 */

// Use dynamic imports for Node.js modules (Electron compatibility)
const express = typeof window === 'undefined' ? require('express') : null;
const cors = typeof window === 'undefined' ? require('cors') : null;
const http = typeof window === 'undefined' ? require('http') : null;
const WebSocket = typeof window === 'undefined' ? require('ws') : null;

import { CodeIntelligenceAPI } from '../api';
import { getCodeIntelligenceAPI } from '../api';
import { APIRoutes } from './routes';

export interface RESTServerConfig {
  port?: number;
  enableCORS?: boolean;
  apiKey?: string; // Optional API key for authentication
}

export class RESTServer {
  private app: any;
  private server: any;
  private wss: any; // WebSocket server
  private api: CodeIntelligenceAPI;
  private routes: APIRoutes;
  private config: RESTServerConfig;
  private wsClients: Set<any> = new Set();

  constructor(config: RESTServerConfig = {}) {
    this.config = {
      port: config.port || 3001,
      enableCORS: config.enableCORS !== false,
      ...config
    };

    if (!express) {
      console.warn('[RESTServer] Express not available - REST API disabled');
      return;
    }

    this.app = express();
    this.api = getCodeIntelligenceAPI();
    this.routes = new APIRoutes(this.api);

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    if (!this.app) return;

    // CORS
    if (this.config.enableCORS && cors) {
      this.app.use(cors());
    }

    // JSON body parser
    this.app.use(express.json());

    // Optional API key authentication
    if (this.config.apiKey) {
      this.app.use((req: any, res: any, next: any) => {
        const apiKey = req.headers['x-api-key'] || req.query.apiKey;
        if (apiKey !== this.config.apiKey) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
      });
    }

    // Request logging
    this.app.use((req: any, res: any, next: any) => {
      console.log(`[REST API] ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    if (!this.app) return;

    // Health check
    this.app.get('/health', (req: any, res: any) => this.routes.healthCheck(req, res));

    // Existing routes
    this.app.post('/api/intelligence/analyze', (req: any, res: any) => this.routes.analyze(req, res));
    this.app.get('/api/intelligence/dependency-graph', (req: any, res: any) => this.routes.getDependencyGraph(req, res));
    this.app.get('/api/intelligence/breaking-changes', (req: any, res: any) => this.routes.getBreakingChanges(req, res));
    this.app.get('/api/intelligence/history', (req: any, res: any) => this.routes.getHistory(req, res));
    this.app.get('/api/intelligence/impact/:file', (req: any, res: any) => this.routes.getImpact(req, res));
    this.app.get('/api/intelligence/file/:file', (req: any, res: any) => this.routes.getFileMetadata(req, res));
    this.app.get('/api/intelligence/ai-analysis', (req: any, res: any) => this.routes.getAIAnalysis(req, res));

    // New routes
    this.app.get('/api/intelligence/cpg', (req: any, res: any) => this.routes.getCPG(req, res));
    this.app.post('/api/intelligence/cpg/query', (req: any, res: any) => this.routes.queryCPG(req, res));
    this.app.get('/api/intelligence/trends', (req: any, res: any) => this.routes.getTrends(req, res));
    this.app.get('/api/intelligence/snapshots/:id', (req: any, res: any) => this.routes.getSnapshot(req, res));
    this.app.post('/api/intelligence/snapshots/:id/restore', (req: any, res: any) => this.routes.restoreSnapshot(req, res));

    // Error handler
    this.app.use((err: any, req: any, res: any, next: any) => {
      console.error('[REST API] Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  /**
   * Setup WebSocket server for live updates
   */
  private setupWebSocket(): void {
    if (!WebSocket || !this.server) {
      return;
    }

    this.wss = new WebSocket.Server({ 
      server: this.server,
      path: '/ws'
    });

    this.wss.on('connection', (ws: any) => {
      this.wsClients.add(ws);
      console.log('[WebSocket] Client connected. Total clients:', this.wsClients.size);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'subscribe') {
            // Handle subscription to specific file paths
            ws.subscribedPaths = data.paths || [];
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      });

      ws.on('close', () => {
        this.wsClients.delete(ws);
        console.log('[WebSocket] Client disconnected. Total clients:', this.wsClients.size);
      });

      ws.on('error', (error: any) => {
        console.error('[WebSocket] Error:', error);
      });
    });
  }

  /**
   * Broadcast change event to WebSocket clients
   */
  broadcastChange(event: {
    type: 'file_changed' | 'snapshot_created' | 'breaking_change';
    filePath?: string;
    data?: any;
  }): void {
    if (!this.wss || !WebSocket) {
      return;
    }

    const message = JSON.stringify(event);
    this.wsClients.forEach((client: any) => {
      if (client.readyState === WebSocket.OPEN) {
        // Only send to clients subscribed to this file path (or all if no subscription)
        if (!client.subscribedPaths || client.subscribedPaths.length === 0 || 
            (event.filePath && client.subscribedPaths.includes(event.filePath))) {
          try {
            client.send(message);
          } catch (error) {
            console.error('[WebSocket] Failed to send message:', error);
          }
        }
      }
    });
  }

  /**
   * Start the server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.app) {
        reject(new Error('Express not available'));
        return;
      }

      // Create HTTP server (needed for WebSocket)
      if (http) {
        this.server = http.createServer(this.app);
      } else {
        this.server = this.app;
      }

      this.server.listen(this.config.port, () => {
        console.log(`[REST API] Server started on port ${this.config.port}`);
        
        // Setup WebSocket after server starts
        this.setupWebSocket();
        
        resolve();
      });

      this.server.on('error', (err: any) => {
        console.error('[REST API] Server error:', err);
        reject(err);
      });
    });
  }

  /**
   * Stop the server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      // Close WebSocket server
      if (this.wss) {
        this.wss.close(() => {
          console.log('[WebSocket] Server closed');
        });
      }

      // Close HTTP server
      if (this.server) {
        this.server.close(() => {
          console.log('[REST API] Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.server && this.server.listening;
  }
}
