/**
 * CPG Builder - Constructs Code Property Graph from AST
 */

import {
  fs,
  path,
  safeProcessCwd,
  safePathJoin,
  safePathIsAbsolute,
  isNodeModulesAvailable,
} from "../nodeCompat";

// Use dynamic imports for TypeScript compiler
// Handle both Node.js and browser environments gracefully
let ts: any = null;
try {
  if (typeof window === "undefined" && typeof require !== "undefined") {
    // Node.js environment - try to require TypeScript
    ts = require("typescript");
  }
} catch (error) {
  // TypeScript not available - this is expected in browser environments
  // The code will handle this gracefully by checking if ts is null
  console.debug(
    "[CPGBuilder] TypeScript compiler not available (expected in browser)",
  );
}

import {
  CodePropertyGraph,
  CPGNode,
  CPGEdge,
  ASTSnapshot,
} from "../../../types/codeIntelligence";

interface FunctionCall {
  callerId: string;
  calleeName: string;
  location: { start: number; end: number; line: number };
}

interface VariableAssignment {
  variableName: string;
  nodeId: string;
  location: { start: number; end: number; line: number };
}

export class CPGBuilder {
  private readonly CPG_DIR = safePathJoin(".project-intel", "index", "cpg");

  /**
   * Build Code Property Graph from AST snapshots
   */
  buildCPG(astSnapshots: Record<string, ASTSnapshot>): CodePropertyGraph {
    const nodes: Record<string, CPGNode> = {};
    const edges: CPGEdge[] = [];
    const fileNodes: Record<string, string[]> = {};
    let nodeIdCounter = 0;

    const generateNodeId = (): string => {
      return `node_${nodeIdCounter++}`;
    };

    // Process each file
    Object.entries(astSnapshots).forEach(([filePath, snapshot]) => {
      const fileNodeIds: string[] = [];

      // Create file node
      const fileNodeId = generateNodeId();
      nodes[fileNodeId] = {
        id: fileNodeId,
        type: "file",
        name: filePath,
        filePath,
        properties: {
          hash: snapshot.hash,
          timestamp: snapshot.timestamp,
        },
      };
      fileNodeIds.push(fileNodeId);

      // Process AST nodes
      snapshot.nodes.forEach((astNode) => {
        const nodeId = generateNodeId();

        nodes[nodeId] = {
          id: nodeId,
          type: this.mapASTNodeTypeToCPGType(astNode.type),
          name: astNode.name,
          filePath,
          location: astNode.location,
          properties: {
            signature: astNode.signature,
            returnType: astNode.returnType,
            parameters: astNode.parameters,
          },
        };
        fileNodeIds.push(nodeId);

        // Add syntax edge (file -> node)
        edges.push({
          id: `edge_${edges.length}`,
          source: fileNodeId,
          target: nodeId,
          type: "syntax",
          properties: {},
        });
      });

      // Process imports (data-flow edges)
      snapshot.imports.forEach((importInfo) => {
        if (!importInfo.isExternal) {
          // Create import edge (will be resolved to actual file later)
          const importNodeId = generateNodeId();
          nodes[importNodeId] = {
            id: importNodeId,
            type: "expression",
            name: `import:${importInfo.source}`,
            filePath,
            properties: {
              specifiers: importInfo.specifiers,
              isTypeOnly: importInfo.isTypeOnly,
            },
          };
          fileNodeIds.push(importNodeId);

          edges.push({
            id: `edge_${edges.length}`,
            source: fileNodeId,
            target: importNodeId,
            type: "import",
            properties: {
              source: importInfo.source,
            },
          });
        }
      });

      // Process exports
      snapshot.exports.forEach((exportInfo) => {
        const exportNodeId = generateNodeId();
        nodes[exportNodeId] = {
          id: exportNodeId,
          type: "expression",
          name: `export:${exportInfo.name}`,
          filePath,
          properties: {
            exportType: exportInfo.type,
            isType: exportInfo.isType,
          },
        };
        fileNodeIds.push(exportNodeId);

        edges.push({
          id: `edge_${edges.length}`,
          source: fileNodeId,
          target: exportNodeId,
          type: "export",
          properties: {
            name: exportInfo.name,
          },
        });
      });

      fileNodes[filePath] = fileNodeIds;
    });

    // Build control flow and data flow edges from full AST traversal
    // Parse source files to extract detailed control-flow and data-flow information
    Object.entries(astSnapshots).forEach(([filePath, snapshot]) => {
      const fileNodeIds = fileNodes[filePath];
      if (!fileNodeIds || fileNodeIds.length === 0) return;

      // Try to load source file for full AST parsing
      const sourceContent = this.loadSourceFile(filePath);
      if (sourceContent && ts) {
        const sourceFile = ts.createSourceFile(
          filePath,
          sourceContent,
          ts.ScriptTarget.Latest,
          true,
        );

        // Extract function calls and control-flow structures
        const functionCalls: FunctionCall[] = [];
        const variableAssignments: VariableAssignment[] = [];
        const controlFlowNodes: Array<{
          nodeId: string;
          type: string;
          location: any;
        }> = [];

        this.traverseASTForCPG(
          sourceFile,
          fileNodeIds,
          nodes,
          functionCalls,
          variableAssignments,
          controlFlowNodes,
        );

        // Add call edges (function → function calls)
        functionCalls.forEach((call) => {
          const callerNode = fileNodeIds
            .map((id) => nodes[id])
            .find((node) => {
              if (!node || node.type !== "function") return false;
              const nodeLoc = node.location;
              if (!nodeLoc) return false;
              return (
                call.location.start >= nodeLoc.start &&
                call.location.end <= nodeLoc.end
              );
            });

          if (callerNode) {
            // Find callee node (could be in same file or different file)
            const calleeNode = Object.values(nodes).find(
              (node) =>
                node.name === call.calleeName && node.type === "function",
            );

            if (calleeNode) {
              edges.push({
                id: `edge_${edges.length}`,
                source: callerNode.id,
                target: calleeNode.id,
                type: "call",
                properties: {
                  callLocation: call.location,
                },
              });
            }
          }
        });

        // Add data-flow edges (variable assignments)
        variableAssignments.forEach((assignment) => {
          const assignmentNode = nodes[assignment.nodeId];
          if (assignmentNode) {
            // Find usages of this variable (simplified - would need full data-flow analysis)
            const usageNodes = fileNodeIds
              .map((id) => nodes[id])
              .filter((node) => {
                if (!node || node.type !== "variable") return false;
                return node.name === assignment.variableName;
              });

            usageNodes.forEach((usageNode) => {
              if (usageNode.id !== assignment.nodeId) {
                edges.push({
                  id: `edge_${edges.length}`,
                  source: assignment.nodeId,
                  target: usageNode.id,
                  type: "data-flow",
                  properties: {
                    variable: assignment.variableName,
                  },
                });
              }
            });
          }
        });

        // Add control-flow edges (if/else, loops, switches)
        controlFlowNodes.forEach((cfNode, index) => {
          if (index < controlFlowNodes.length - 1) {
            edges.push({
              id: `edge_${edges.length}`,
              source: cfNode.nodeId,
              target: controlFlowNodes[index + 1].nodeId,
              type: "control-flow",
              properties: {
                structureType: cfNode.type,
              },
            });
          }
        });
      }

      // Fallback: Add sequential control flow edges between functions/classes
      const functionNodes = fileNodeIds
        .map((id) => nodes[id])
        .filter(
          (node) => node && (node.type === "function" || node.type === "class"),
        );

      for (let i = 0; i < functionNodes.length - 1; i++) {
        // Only add if not already added by full AST traversal
        const existingEdge = edges.find(
          (e) =>
            e.source === functionNodes[i].id &&
            e.target === functionNodes[i + 1].id &&
            e.type === "control-flow",
        );

        if (!existingEdge) {
          edges.push({
            id: `edge_${edges.length}`,
            source: functionNodes[i].id,
            target: functionNodes[i + 1].id,
            type: "control-flow",
            properties: {
              order: i + 1,
            },
          });
        }
      }
    });

    // Resolve cross-file imports/exports
    this.resolveCrossFileImports(astSnapshots, nodes, edges, fileNodes);

    const cpg: CodePropertyGraph = {
      nodes,
      edges,
      fileNodes,
      timestamp: Date.now(),
    };

    this.saveCPG(cpg);
    return cpg;
  }

  /**
   * Map AST node type to CPG node type
   */
  private mapASTNodeTypeToCPGType(astType: string): CPGNode["type"] {
    switch (astType) {
      case "function":
        return "function";
      case "class":
        return "class";
      case "variable":
        return "variable";
      default:
        return "expression";
    }
  }

  /**
   * Save CPG to disk
   */
  private saveCPG(cpg: CodePropertyGraph): void {
    if (!fs || !path) {
      return;
    }

    try {
      if (!fs.existsSync(this.CPG_DIR)) {
        fs.mkdirSync(this.CPG_DIR, { recursive: true });
      }

      const cpgPath = path.join(this.CPG_DIR, "graph.json");
      fs.writeFileSync(cpgPath, JSON.stringify(cpg, null, 2));
    } catch (error) {
      console.error("[CPGBuilder] Failed to save CPG:", error);
    }
  }

  /**
   * Load CPG from disk
   */
  loadCPG(): CodePropertyGraph | null {
    if (!fs || !path) {
      return null;
    }

    try {
      const cpgPath = path.join(this.CPG_DIR, "graph.json");
      if (fs.existsSync(cpgPath)) {
        const content = fs.readFileSync(cpgPath, "utf8");
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn("[CPGBuilder] Failed to load CPG:", error);
    }
    return null;
  }

  /**
   * Load source file content
   */
  private loadSourceFile(filePath: string): string | null {
    if (!isNodeModulesAvailable()) {
      return null;
    }

    try {
      // Try to resolve file path
      let fullPath = filePath;
      if (!safePathIsAbsolute(filePath)) {
        fullPath = safePathJoin(safeProcessCwd(), filePath);
      }

      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath, "utf8");
      }
    } catch (error) {
      console.warn(
        `[CPGBuilder] Failed to load source file ${filePath}:`,
        error,
      );
    }
    return null;
  }

  /**
   * Traverse AST to extract control-flow and data-flow information
   */
  private traverseASTForCPG(
    sourceFile: ts.SourceFile,
    fileNodeIds: string[],
    nodes: Record<string, CPGNode>,
    functionCalls: FunctionCall[],
    variableAssignments: VariableAssignment[],
    controlFlowNodes: Array<{ nodeId: string; type: string; location: any }>,
  ): void {
    if (!ts) {
      return;
    }
    const walk = (node: ts.Node, parentFunctionId?: string): void => {
      // Detect control-flow structures
      if (ts.isIfStatement(node)) {
        const location = this.getNodeLocation(node, sourceFile);
        const ifNodeId = fileNodeIds.find((id) => {
          const n = nodes[id];
          return (
            n &&
            n.location &&
            n.location.start <= location.start &&
            n.location.end >= location.end
          );
        });
        if (ifNodeId) {
          controlFlowNodes.push({ nodeId: ifNodeId, type: "if", location });
        }
      } else if (
        ts.isForStatement(node) ||
        ts.isForInStatement(node) ||
        ts.isForOfStatement(node)
      ) {
        const location = this.getNodeLocation(node, sourceFile);
        const loopNodeId = fileNodeIds.find((id) => {
          const n = nodes[id];
          return (
            n &&
            n.location &&
            n.location.start <= location.start &&
            n.location.end >= location.end
          );
        });
        if (loopNodeId) {
          controlFlowNodes.push({ nodeId: loopNodeId, type: "for", location });
        }
      } else if (ts.isWhileStatement(node) || ts.isDoStatement(node)) {
        const location = this.getNodeLocation(node, sourceFile);
        const loopNodeId = fileNodeIds.find((id) => {
          const n = nodes[id];
          return (
            n &&
            n.location &&
            n.location.start <= location.start &&
            n.location.end >= location.end
          );
        });
        if (loopNodeId) {
          controlFlowNodes.push({
            nodeId: loopNodeId,
            type: "while",
            location,
          });
        }
      } else if (ts.isSwitchStatement(node)) {
        const location = this.getNodeLocation(node, sourceFile);
        const switchNodeId = fileNodeIds.find((id) => {
          const n = nodes[id];
          return (
            n &&
            n.location &&
            n.location.start <= location.start &&
            n.location.end >= location.end
          );
        });
        if (switchNodeId) {
          controlFlowNodes.push({
            nodeId: switchNodeId,
            type: "switch",
            location,
          });
        }
      }

      // Detect function calls
      if (ts.isCallExpression(node)) {
        const expression = node.expression;
        if (ts.isIdentifier(expression)) {
          const calleeName = expression.text;
          const location = this.getNodeLocation(node, sourceFile);

          // Find the function that contains this call
          const containingFunction = fileNodeIds
            .map((id) => nodes[id])
            .find((node) => {
              if (!node || node.type !== "function") return false;
              const nodeLoc = node.location;
              if (!nodeLoc) return false;
              return (
                location.start >= nodeLoc.start && location.end <= nodeLoc.end
              );
            });

          if (containingFunction) {
            functionCalls.push({
              callerId: containingFunction.id,
              calleeName,
              location,
            });
          }
        }
      }

      // Detect variable assignments
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        const variableName = node.name.text;
        const location = this.getNodeLocation(node, sourceFile);

        // Find variable node
        const varNodeId = fileNodeIds.find((id) => {
          const n = nodes[id];
          return n && n.type === "variable" && n.name === variableName;
        });

        if (varNodeId) {
          variableAssignments.push({
            variableName,
            nodeId: varNodeId,
            location,
          });
        }
      }

      // Track current function context
      let currentFunctionId = parentFunctionId;
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
        const funcName =
          ts.isFunctionDeclaration(node) &&
          node.name &&
          ts.isIdentifier(node.name)
            ? node.name.text
            : ts.isMethodDeclaration(node) &&
                node.name &&
                ts.isIdentifier(node.name)
              ? node.name.text
              : null;

        if (funcName) {
          const funcNode = fileNodeIds
            .map((id) => nodes[id])
            .find((n) => n && n.type === "function" && n.name === funcName);
          if (funcNode) {
            currentFunctionId = funcNode.id;
          }
        }
      }

      ts.forEachChild(node, (child) => walk(child, currentFunctionId));
    };

    walk(sourceFile);
  }

  /**
   * Get node location
   */
  private getNodeLocation(
    node: ts.Node,
    sourceFile: ts.SourceFile,
  ): { start: number; end: number; line: number } {
    const start = node.getStart(sourceFile);
    const end = node.getEnd();
    const { line } = sourceFile.getLineAndCharacterOfPosition(start);
    return { start, end, line: line + 1 };
  }

  /**
   * Resolve cross-file imports/exports to create edges between files
   */
  private resolveCrossFileImports(
    astSnapshots: Record<string, ASTSnapshot>,
    nodes: Record<string, CPGNode>,
    edges: CPGEdge[],
    fileNodes: Record<string, string[]>,
  ): void {
    if (!ts) {
      // TypeScript compiler not available (browser environment)
      return;
    }
    // Build export map: filePath -> exported symbols
    const exportMap = new Map<string, Map<string, string>>(); // filePath -> symbolName -> nodeId

    Object.entries(astSnapshots).forEach(([filePath, snapshot]) => {
      const fileExports = new Map<string, string>();
      snapshot.exports.forEach((exportInfo) => {
        // Find export node
        const exportNode = fileNodes[filePath]
          ?.map((id) => nodes[id])
          .find((node) => node && node.name === `export:${exportInfo.name}`);

        if (exportNode) {
          fileExports.set(exportInfo.name, exportNode.id);
        }
      });
      exportMap.set(filePath, fileExports);
    });

    // Resolve imports to exports
    Object.entries(astSnapshots).forEach(([filePath, snapshot]) => {
      snapshot.imports.forEach((importInfo) => {
        if (importInfo.isExternal) {
          return; // Skip external imports
        }

        // Resolve import source to actual file path
        const resolvedPath = this.resolveImportPath(
          importInfo.source,
          filePath,
        );
        if (!resolvedPath) {
          return;
        }

        const targetExports = exportMap.get(resolvedPath);
        if (!targetExports) {
          return;
        }

        // Create import edges for each imported symbol
        importInfo.specifiers.forEach((specifier) => {
          const exportNodeId = targetExports.get(specifier);
          if (exportNodeId) {
            // Find import node in source file
            const importNode = fileNodes[filePath]
              ?.map((id) => nodes[id])
              .find(
                (node) => node && node.name === `import:${importInfo.source}`,
              );

            if (importNode) {
              edges.push({
                id: `edge_${edges.length}`,
                source: importNode.id,
                target: exportNodeId,
                type: "import",
                properties: {
                  source: importInfo.source,
                  symbol: specifier,
                },
              });
            }
          }
        });
      });
    });
  }

  /**
   * Resolve import path to actual file path
   */
  private resolveImportPath(
    importSource: string,
    fromFile: string,
  ): string | null {
    if (!path) {
      return null;
    }

    try {
      // Remove file extension if present
      const basePath = importSource.replace(/\.(ts|tsx|js|jsx)$/, "");

      // Try different extensions
      const extensions = [
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        "/index.ts",
        "/index.tsx",
        "/index.js",
        "/index.jsx",
      ];

      for (const ext of extensions) {
        let resolvedPath: string;

        if (importSource.startsWith(".")) {
          // Relative import
          const fromDir = path.dirname(fromFile);
          resolvedPath = path.join(fromDir, basePath + ext);
        } else {
          // Absolute import (from project root)
          const { safeProcessCwd } = require("../nodeCompat");
          resolvedPath = path.join(safeProcessCwd(), basePath + ext);
        }

        // Normalize path
        resolvedPath = path.normalize(resolvedPath);

        // Check if file exists
        if (fs && fs.existsSync(resolvedPath)) {
          // Convert to relative path
          const { safeProcessCwd } = require("../nodeCompat");
          return path.relative(safeProcessCwd(), resolvedPath);
        }
      }
    } catch (error) {
      console.warn(
        `[CPGBuilder] Failed to resolve import path ${importSource} from ${fromFile}:`,
        error,
      );
    }

    return null;
  }
}
