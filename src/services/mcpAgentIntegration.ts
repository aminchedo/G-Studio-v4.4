/**
 * MCP Agent Integration
 * Provides agent access to MCP connection status and tools
 */

import { getMcpConnectionManager, McpConnectionStatus } from './mcpConnectionManager';

/**
 * Get MCP connection status summary for agent context
 */
export function getMcpStatusForAgent(): string {
  const manager = getMcpConnectionManager();
  const status = manager.getStatusSummary();
  const tools = manager.getAvailableTools();
  
  if (status.total === 0) {
    return 'No MCP connections configured.';
  }

  let summary = `MCP Connection Status:\n`;
  summary += `- Total: ${status.total}\n`;
  summary += `- Connected: ${status.connected}\n`;
  summary += `- Disconnected: ${status.disconnected}\n`;
  summary += `- Errors: ${status.error}\n`;
  summary += `- Available Tools: ${tools.size}\n\n`;

  if (tools.size > 0) {
    summary += `Available MCP Tools:\n`;
    const toolList = Array.from(tools.entries()).slice(0, 20); // Limit to first 20
    for (const [toolName, info] of toolList) {
      summary += `- ${toolName} (from ${info.connectionName})\n`;
    }
    if (tools.size > 20) {
      summary += `... and ${tools.size - 20} more tools\n`;
    }
  }

  return summary;
}

/**
 * Get detailed MCP connection information for agent
 */
export function getMcpDetailsForAgent(): {
  status: McpConnectionStatus;
  connections: Array<{
    id: string;
    name: string;
    status: string;
    tools: string[];
    error?: string;
  }>;
  availableTools: Map<string, { connectionId: string; connectionName: string }>;
} {
  const manager = getMcpConnectionManager();
  const connections = manager.getAllConnections();
  const tools = manager.getAvailableTools();

  return {
    status: manager.getStatusSummary(),
    connections: connections.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      tools: c.tools,
      error: c.lastError,
    })),
    availableTools: tools,
  };
}

/**
 * Format MCP status for inclusion in system instruction
 */
export function formatMcpStatusForSystemInstruction(): string {
  const status = getMcpStatusForAgent();
  return `\n## MCP (Model Context Protocol) Connections\n\n${status}\n`;
}
