/**
 * Context Database Service (Main Process)
 * 
 * SQLite-based context persistence for Local AI integration
 * Runs in Electron main process for direct SQLite access
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Get user data directory
function getUserDataDir() {
  const homeDir = os.homedir();
  const platform = process.platform;
  
  if (platform === 'win32') {
    return path.join(os.homedir(), 'AppData', 'Roaming', 'g-studio');
  } else if (platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Application Support', 'g-studio');
  } else {
    return path.join(homeDir, '.g-studio');
  }
}

// Get database path
function getDatabasePath() {
  const userDataDir = getUserDataDir();
  // Ensure directory exists
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }
  return path.join(userDataDir, 'context.db');
}

class ContextDatabaseService {
  constructor() {
    this.db = null;
    this.dbPath = getDatabasePath();
    this.currentSessionId = null;
  }

  /**
   * Initialize database and create tables
   */
  init() {
    try {
      console.log('[ContextDatabaseService] Initializing database at:', this.dbPath);
      
      this.db = new Database(this.dbPath);
      
      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      
      // Create tables
      this.createTables();
      
      console.log('[ContextDatabaseService] Database initialized');
      console.log('[CONTEXT]: sqlite + summary');
      console.log('[DB]: READY');
      
      return { success: true };
    } catch (error) {
      console.error('[ContextDatabaseService] Initialization error:', error);
      console.log('[DB]: ERROR');
      return { success: false, error: error.message };
    }
  }

  /**
   * Create database schema
   */
  createTables() {
    // Sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS context_sessions (
        id TEXT PRIMARY KEY,
        mode TEXT,
        active_model TEXT,
        created_at INTEGER,
        last_active_at INTEGER
      )
    `);

    // Context entries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS context_entries (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        role TEXT,
        content TEXT,
        token_estimate INTEGER,
        importance REAL,
        created_at INTEGER,
        FOREIGN KEY (session_id) REFERENCES context_sessions(id)
      )
    `);

    // Summaries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS context_summaries (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        layer INTEGER,
        content TEXT,
        covers_until INTEGER,
        method TEXT,
        created_at INTEGER,
        FOREIGN KEY (session_id) REFERENCES context_sessions(id)
      )
    `);

    // Context lineage table (Phase 18)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS context_lineage (
        id TEXT PRIMARY KEY,
        response_id TEXT,
        session_id TEXT,
        context_entry_ids TEXT,
        summary_ids TEXT,
        model TEXT,
        mode TEXT,
        created_at INTEGER,
        FOREIGN KEY (session_id) REFERENCES context_sessions(id)
      )
    `);

    // Create index for lineage lookups
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_context_lineage_response 
      ON context_lineage(response_id)
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_context_entries_session 
      ON context_entries(session_id, created_at)
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_context_entries_importance 
      ON context_entries(session_id, importance DESC)
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_context_summaries_session 
      ON context_summaries(session_id, layer)
    `);
  }

  /**
   * Create a new session
   */
  createSession(mode = 'CLOUD', activeModel = 'gemini') {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const now = Date.now();

      this.db.prepare(`
        INSERT INTO context_sessions (id, mode, active_model, created_at, last_active_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(sessionId, mode, activeModel, now, now);

      this.currentSessionId = sessionId;
      
      console.log('[ContextDatabaseService] Session created:', sessionId);
      return { success: true, sessionId };
    } catch (error) {
      console.error('[ContextDatabaseService] Create session error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current session or create new one
   */
  getCurrentSession() {
    if (this.currentSessionId) {
      // Check if session exists
      const session = this.db.prepare(`
        SELECT * FROM context_sessions WHERE id = ?
      `).get(this.currentSessionId);

      if (session) {
        // Update last active
        this.db.prepare(`
          UPDATE context_sessions SET last_active_at = ? WHERE id = ?
        `).run(Date.now(), this.currentSessionId);
        return this.currentSessionId;
      }
    }

    // Create new session
    const result = this.createSession();
    return result.sessionId;
  }

  /**
   * Add context entry
   */
  addEntry(sessionId, entry) {
    try {
      const { role, content, tokenEstimate = 0, importance = 0.5 } = entry;
      const id = `entry_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const now = Date.now();

      this.db.prepare(`
        INSERT INTO context_entries 
        (id, session_id, role, content, token_estimate, importance, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, sessionId, role, content, tokenEstimate, importance, now);

      // Update session last active
      this.db.prepare(`
        UPDATE context_sessions SET last_active_at = ? WHERE id = ?
      `).run(now, sessionId);

      console.log('[CONTEXT_PERSIST]: SUCCESS');
      return { success: true, id };
    } catch (error) {
      console.error('[ContextDatabaseService] Add entry error:', error);
      console.log('[CONTEXT_PERSIST]: FAILED');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get relevant context entries
   * Uses hybrid ranking: recency + importance
   */
  getRelevantContext(sessionId, query = '', limit = 20) {
    try {
      // Get entries sorted by hybrid score: (importance * 0.6) + (recency_score * 0.4)
      // Recency score: newer entries get higher score (normalized by max age)
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      const entries = this.db.prepare(`
        SELECT 
          id,
          role,
          content,
          token_estimate,
          importance,
          created_at,
          (
            (importance * 0.6) + 
            ((1.0 - MIN(1.0, (CAST(? - created_at AS REAL) / ?))) * 0.4)
          ) AS score
        FROM context_entries
        WHERE session_id = ?
        ORDER BY score DESC, created_at DESC
        LIMIT ?
      `).all(now, maxAge, sessionId, limit);

      return { success: true, entries };
    } catch (error) {
      console.error('[ContextDatabaseService] Get context error:', error);
      return { success: false, error: error.message, entries: [] };
    }
  }

  /**
   * Create summary
   */
  createSummary(sessionId, summary) {
    try {
      const { layer, content, coversUntil, method = 'local_ai' } = summary;
      const id = `summary_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const now = Date.now();

      this.db.prepare(`
        INSERT INTO context_summaries 
        (id, session_id, layer, content, covers_until, method, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, sessionId, layer, content, coversUntil, method, now);

      return { success: true, id };
    } catch (error) {
      console.error('[ContextDatabaseService] Create summary error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get summaries for session
   */
  getSummaries(sessionId) {
    try {
      const summaries = this.db.prepare(`
        SELECT * FROM context_summaries
        WHERE session_id = ?
        ORDER BY layer ASC, created_at DESC
      `).all(sessionId);

      return { success: true, summaries };
    } catch (error) {
      console.error('[ContextDatabaseService] Get summaries error:', error);
      return { success: false, error: error.message, summaries: [] };
    }
  }

  /**
   * Get context size (total tokens)
   */
  getContextSize(sessionId) {
    try {
      const result = this.db.prepare(`
        SELECT SUM(token_estimate) as total_tokens, COUNT(*) as entry_count
        FROM context_entries
        WHERE session_id = ?
      `).get(sessionId);

      return {
        success: true,
        totalTokens: result.total_tokens || 0,
        entryCount: result.entry_count || 0,
      };
    } catch (error) {
      console.error('[ContextDatabaseService] Get context size error:', error);
      return { success: false, totalTokens: 0, entryCount: 0 };
    }
  }

  /**
   * Trim context (remove lowest importance entries)
   */
  trimContext(sessionId, targetTokens) {
    try {
      const size = this.getContextSize(sessionId);
      if (size.totalTokens <= targetTokens) {
        return { success: true, trimmed: false };
      }

      // Get entries sorted by importance (ascending) and recency (ascending)
      const entriesToRemove = this.db.prepare(`
        SELECT id, token_estimate
        FROM context_entries
        WHERE session_id = ?
        ORDER BY importance ASC, created_at ASC
      `).all(sessionId);

      let tokensToRemove = size.totalTokens - targetTokens;
      const idsToRemove = [];

      for (const entry of entriesToRemove) {
        if (tokensToRemove <= 0) break;
        idsToRemove.push(entry.id);
        tokensToRemove -= entry.token_estimate || 0;
      }

      if (idsToRemove.length > 0) {
        const placeholders = idsToRemove.map(() => '?').join(',');
        this.db.prepare(`
          DELETE FROM context_entries
          WHERE id IN (${placeholders})
        `).run(...idsToRemove);

        console.log('[ContextDatabaseService] Trimmed', idsToRemove.length, 'entries');
        console.log('[CONTEXT_TRIM]: APPLIED');
        return { success: true, trimmed: true, removedCount: idsToRemove.length };
      }

      return { success: true, trimmed: false };
    } catch (error) {
      console.error('[ContextDatabaseService] Trim context error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record context lineage for a response
   */
  recordLineage(sessionId, lineage) {
    try {
      const { responseId, contextEntryIds, summaryIds, model, mode } = lineage;
      const id = `lineage_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const now = Date.now();

      this.db.prepare(`
        INSERT INTO context_lineage 
        (id, response_id, session_id, context_entry_ids, summary_ids, model, mode, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        responseId,
        sessionId,
        JSON.stringify(contextEntryIds || []),
        JSON.stringify(summaryIds || []),
        model || 'unknown',
        mode || 'CLOUD',
        now
      );

      console.log('[LINEAGE]: RECORDED');
      return { success: true, id };
    } catch (error) {
      console.error('[ContextDatabaseService] Record lineage error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get lineage for a response
   */
  getLineage(responseId) {
    try {
      const lineage = this.db.prepare(`
        SELECT * FROM context_lineage
        WHERE response_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).get(responseId);

      if (lineage) {
        return {
          success: true,
          lineage: {
            id: lineage.id,
            responseId: lineage.response_id,
            sessionId: lineage.session_id,
            contextEntryIds: JSON.parse(lineage.context_entry_ids || '[]'),
            summaryIds: JSON.parse(lineage.summary_ids || '[]'),
            model: lineage.model,
            mode: lineage.mode,
            createdAt: lineage.created_at,
          },
        };
      }

      return { success: false, lineage: null };
    } catch (error) {
      console.error('[ContextDatabaseService] Get lineage error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record productivity metric
   */
  recordProductivityMetric(metric) {
    try {
      const { id, taskId, stepId, metricType, value, timestamp, metadata } = metric;

      this.db.prepare(`
        INSERT INTO productivity_metrics 
        (id, task_id, step_id, metric_type, value, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        taskId,
        stepId || null,
        metricType,
        value,
        timestamp,
        JSON.stringify(metadata || {})
      );

      return { success: true, id };
    } catch (error) {
      console.error('[ContextDatabaseService] Record productivity metric error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get productivity metrics
   */
  getProductivityMetrics(metricType, taskType, limit, taskId) {
    try {
      let query = `
        SELECT * FROM productivity_metrics
        WHERE metric_type = ?
      `;
      const params = [metricType];

      if (taskId) {
        query += ' AND task_id = ?';
        params.push(taskId);
      }

      query += ' ORDER BY timestamp DESC LIMIT ?';
      params.push(limit);

      const metrics = this.db.prepare(query).all(...params);

      return {
        success: true,
        metrics: metrics.map(m => ({
          id: m.id,
          taskId: m.task_id,
          stepId: m.step_id,
          metricType: m.metric_type,
          value: m.value,
          timestamp: m.timestamp,
          metadata: JSON.parse(m.metadata || '{}'),
        })),
      };
    } catch (error) {
      console.error('[ContextDatabaseService] Get productivity metrics error:', error);
      return { success: false, error: error.message, metrics: [] };
    }
  }

  /**
   * Record decomposition plan
   */
  recordDecompositionPlan(plan) {
    try {
      const { id, taskId, originalMessage, steps, totalEstimatedTime, confidence } = plan;
      const now = Date.now();

      this.db.prepare(`
        INSERT INTO decomposition_plans 
        (id, task_id, original_message, steps, total_estimated_time, confidence, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        taskId,
        originalMessage,
        JSON.stringify(steps),
        totalEstimatedTime,
        confidence,
        now
      );

      return { success: true, id };
    } catch (error) {
      console.error('[ContextDatabaseService] Record decomposition plan error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get decomposition plan
   */
  getDecompositionPlan(taskId) {
    try {
      const plan = this.db.prepare(`
        SELECT * FROM decomposition_plans
        WHERE task_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).get(taskId);

      if (plan) {
        return {
          success: true,
          plan: {
            id: plan.id,
            taskId: plan.task_id,
            originalMessage: plan.original_message,
            steps: JSON.parse(plan.steps || '[]'),
            totalEstimatedTime: plan.total_estimated_time,
            confidence: plan.confidence,
            createdAt: plan.created_at,
          },
        };
      }

      return { success: false, plan: null };
    } catch (error) {
      console.error('[ContextDatabaseService] Get decomposition plan error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record planning feedback
   */
  recordPlanningFeedback(feedback) {
    try {
      const { id, taskType, adjustmentType, adjustmentValue, reason } = feedback;
      const now = Date.now();

      this.db.prepare(`
        INSERT INTO planning_feedback 
        (id, task_type, adjustment_type, adjustment_value, reason, applied_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        id,
        taskType,
        adjustmentType,
        JSON.stringify(adjustmentValue),
        reason,
        now
      );

      return { success: true, id };
    } catch (error) {
      console.error('[ContextDatabaseService] Record planning feedback error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get planning feedback
   */
  getPlanningFeedback(taskType, limit = 50) {
    try {
      const feedbacks = this.db.prepare(`
        SELECT * FROM planning_feedback
        WHERE task_type = ?
        ORDER BY applied_at DESC
        LIMIT ?
      `).all(taskType, limit);

      return {
        success: true,
        feedbacks: feedbacks.map(f => ({
          id: f.id,
          taskType: f.task_type,
          adjustmentType: f.adjustment_type,
          adjustmentValue: JSON.parse(f.adjustment_value || '{}'),
          reason: f.reason,
          appliedAt: f.applied_at,
        })),
      };
    } catch (error) {
      console.error('[ContextDatabaseService] Get planning feedback error:', error);
      return { success: false, error: error.message, feedbacks: [] };
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[ContextDatabaseService] Database closed');
    }
  }
}

// Singleton instance
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new ContextDatabaseService();
  }
  return instance;
}

module.exports = { ContextDatabaseService, getInstance };
