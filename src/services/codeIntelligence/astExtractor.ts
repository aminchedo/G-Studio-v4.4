/**
 * AST Extractor - Extracts AST information from TypeScript/JavaScript files
 */

// Use dynamic imports for Node.js modules (Electron compatibility)
const ts = typeof window === 'undefined' && typeof require !== 'undefined' ? require('typescript') : null;
const fs = typeof window === 'undefined' ? require('fs') : null;
const path = typeof window === 'undefined' ? require('path') : null;
import { ASTSnapshot, ASTNode, ImportInfo, ExportInfo, ParameterInfo } from '../../types/codeIntelligence';

export class ASTExtractor {
  private readonly AST_DIR = path ? path.join('.project-intel', 'index', 'ast') : '.project-intel/index/ast';

  /**
   * Extract AST snapshot from a file
   */
  extractAST(filePath: string, content: string): ASTSnapshot {
    const hash = this.generateHash(content);
    const nodes: ASTNode[] = [];
    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];
    const parseErrors: string[] = [];

    if (!ts) {
      // TypeScript compiler not available (browser environment)
      return {
        hash,
        nodes,
        imports,
        exports,
        parseErrors: ['TypeScript compiler not available in browser environment'],
        timestamp: Date.now(),
      };
    }

    try {
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      // Walk the AST
      const walk = (node: ts.Node): void => {
        try {
          // Extract functions
          if (ts.isFunctionDeclaration(node) && node.name) {
            nodes.push(this.extractFunction(node, sourceFile));
          }

          // Extract arrow functions assigned to variables
          if (ts.isVariableStatement(node)) {
            node.declarationList.declarations.forEach(decl => {
              if (decl.initializer && ts.isArrowFunction(decl.initializer) && ts.isIdentifier(decl.name)) {
                nodes.push(this.extractArrowFunction(decl, sourceFile));
              }
            });
          }

          // Extract classes
          if (ts.isClassDeclaration(node) && node.name) {
            nodes.push(this.extractClass(node, sourceFile));
          }

          // Extract interfaces
          if (ts.isInterfaceDeclaration(node)) {
            nodes.push(this.extractInterface(node, sourceFile));
          }

          // Extract type aliases
          if (ts.isTypeAliasDeclaration(node)) {
            nodes.push(this.extractTypeAlias(node, sourceFile));
          }

          // Extract enums
          if (ts.isEnumDeclaration(node)) {
            nodes.push(this.extractEnum(node, sourceFile));
          }

          // Extract imports
          if (ts.isImportDeclaration(node)) {
            const importInfo = this.extractImport(node, sourceFile);
            if (importInfo) {
              imports.push(importInfo);
            }
          }

          // Extract exports
          if (ts.isExportDeclaration(node)) {
            const exportInfo = this.extractExport(node, sourceFile);
            if (exportInfo) {
              exports.push(...exportInfo);
            }
          }

          // Extract export modifiers
          if (ts.canHaveModifiers(node)) {
            const modifiers = ts.getModifiers(node);
            if (modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
              if (ts.isFunctionDeclaration(node) && node.name) {
                exports.push({
                  name: node.name.text,
                  type: 'named',
                  isType: false
                });
              } else if (ts.isClassDeclaration(node) && node.name) {
                exports.push({
                  name: node.name.text,
                  type: 'named',
                  isType: false
                });
              } else if (ts.isInterfaceDeclaration(node)) {
                exports.push({
                  name: node.name.text,
                  type: 'named',
                  isType: true
                });
              }
            }
          }

          ts.forEachChild(node, walk);
        } catch (error) {
          parseErrors.push(`Error parsing node: ${error}`);
        }
      };

      walk(sourceFile);
    } catch (error) {
      parseErrors.push(`Failed to parse file: ${error}`);
    }

    const snapshot: ASTSnapshot = {
      filePath,
      hash,
      timestamp: Date.now(),
      nodes,
      imports,
      exports,
      parseErrors: parseErrors.length > 0 ? parseErrors : undefined
    };

    this.saveASTSnapshot(filePath, snapshot);
    return snapshot;
  }

  /**
   * Extract function information
   */
  private extractFunction(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): ASTNode {
    const name = node.name?.text || 'anonymous';
    const parameters = node.parameters.map(p => this.extractParameter(p, sourceFile));
    const returnType = node.type ? this.getTypeText(node.type, sourceFile) : 'void';
    const signature = this.buildSignature(name, parameters, returnType);

    return {
      type: 'function',
      name,
      signature,
      parameters,
      returnType,
      location: this.getLocation(node, sourceFile)
    };
  }

  /**
   * Extract arrow function information
   */
  private extractArrowFunction(decl: ts.VariableDeclaration, sourceFile: ts.SourceFile): ASTNode {
    const name = ts.isIdentifier(decl.name) ? decl.name.text : 'anonymous';
    const initializer = decl.initializer as ts.ArrowFunction;
    const parameters = initializer.parameters.map(p => this.extractParameter(p, sourceFile));
    const returnType = initializer.type ? this.getTypeText(initializer.type, sourceFile) : 'void';
    const signature = this.buildSignature(name, parameters, returnType);

    return {
      type: 'function',
      name,
      signature,
      parameters,
      returnType,
      location: this.getLocation(decl, sourceFile)
    };
  }

  /**
   * Extract class information
   */
  private extractClass(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): ASTNode {
    const name = node.name?.text || 'anonymous';
    const members: string[] = [];

    node.members.forEach(member => {
      if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
        members.push(member.name.text);
      } else if (ts.isPropertyDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
        members.push(member.name.text);
      }
    });

    return {
      type: 'class',
      name,
      signature: `class ${name}`,
      location: this.getLocation(node, sourceFile),
      exports: members
    };
  }

  /**
   * Extract interface information
   */
  private extractInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ASTNode {
    const name = node.name.text;
    const members: string[] = [];

    node.members.forEach(member => {
      if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
        members.push(member.name.text);
      }
    });

    return {
      type: 'interface',
      name,
      signature: `interface ${name}`,
      location: this.getLocation(node, sourceFile),
      exports: members
    };
  }

  /**
   * Extract type alias information
   */
  private extractTypeAlias(node: ts.TypeAliasDeclaration, sourceFile: ts.SourceFile): ASTNode {
    const name = node.name.text;
    const typeText = this.getTypeText(node.type, sourceFile);

    return {
      type: 'type',
      name,
      signature: `type ${name} = ${typeText}`,
      location: this.getLocation(node, sourceFile)
    };
  }

  /**
   * Extract enum information
   */
  private extractEnum(node: ts.EnumDeclaration, sourceFile: ts.SourceFile): ASTNode {
    const name = node.name.text;
    const members: string[] = node.members.map(m => {
      if (ts.isIdentifier(m.name)) {
        return m.name.text;
      }
      return '';
    }).filter(Boolean);

    return {
      type: 'enum',
      name,
      signature: `enum ${name}`,
      location: this.getLocation(node, sourceFile),
      exports: members
    };
  }

  /**
   * Extract parameter information
   */
  private extractParameter(param: ts.ParameterDeclaration, sourceFile: ts.SourceFile): ParameterInfo {
    const name = ts.isIdentifier(param.name) ? param.name.text : 'unknown';
    const type = param.type ? this.getTypeText(param.type, sourceFile) : 'any';
    const optional = !!param.questionToken || !!param.initializer;
    const defaultValue = param.initializer ? this.getText(param.initializer, sourceFile) : undefined;

    return { name, type, optional, defaultValue };
  }

  /**
   * Extract import information
   */
  private extractImport(node: ts.ImportDeclaration, sourceFile: ts.SourceFile): ImportInfo | null {
    if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) {
      return null;
    }

    const source = node.moduleSpecifier.text;
    const specifiers: string[] = [];
    let isTypeOnly = false;

    if (node.importClause) {
      if (node.importClause.isTypeOnly) {
        isTypeOnly = true;
      }

      if (node.importClause.namedBindings) {
        if (ts.isNamespaceImport(node.importClause.namedBindings)) {
          specifiers.push(node.importClause.namedBindings.name.text);
        } else if (ts.isNamedImports(node.importClause.namedBindings)) {
          node.importClause.namedBindings.elements.forEach(elem => {
            if (ts.isIdentifier(elem.name)) {
              specifiers.push(elem.name.text);
            }
          });
        }
      }

      if (node.importClause.name) {
        specifiers.push(node.importClause.name.text);
      }
    }

    const isExternal = !source.startsWith('.') && !source.startsWith('/');

    return {
      source,
      specifiers,
      isTypeOnly,
      isExternal
    };
  }

  /**
   * Extract export information
   */
  private extractExport(node: ts.ExportDeclaration, sourceFile: ts.SourceFile): ExportInfo[] {
    const exports: ExportInfo[] = [];

    if (node.exportClause && ts.isNamedExports(node.exportClause)) {
      node.exportClause.elements.forEach(elem => {
        const name = ts.isIdentifier(elem.name) ? elem.name.text : '';
        if (name) {
          exports.push({
            name,
            type: 'named',
            isType: elem.isTypeOnly || false
          });
        }
      });
    }

    return exports;
  }

  /**
   * Build function signature string
   */
  private buildSignature(name: string, parameters: ParameterInfo[], returnType: string): string {
    const params = parameters.map(p => {
      let param = `${p.name}${p.optional ? '?' : ''}: ${p.type}`;
      if (p.defaultValue) {
        param += ` = ${p.defaultValue}`;
      }
      return param;
    }).join(', ');

    return `${name}(${params}): ${returnType}`;
  }

  /**
   * Get location information
   */
  private getLocation(node: ts.Node, sourceFile: ts.SourceFile): ASTNode['location'] {
    const start = node.getStart(sourceFile);
    const end = node.getEnd();
    const { line } = sourceFile.getLineAndCharacterOfPosition(start);

    return {
      start,
      end,
      line: line + 1
    };
  }

  /**
   * Get type text
   */
  private getTypeText(node: ts.TypeNode, sourceFile: ts.SourceFile): string {
    return node.getText(sourceFile);
  }

  /**
   * Get node text
   */
  private getText(node: ts.Node, sourceFile: ts.SourceFile): string {
    return node.getText(sourceFile);
  }

  /**
   * Generate hash for content
   */
  private generateHash(content: string): string {
    // Simple hash - in production, use crypto
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Save AST snapshot to disk
   */
  private saveASTSnapshot(filePath: string, snapshot: ASTSnapshot): void {
    try {
      if (!fs.existsSync(this.AST_DIR)) {
        fs.mkdirSync(this.AST_DIR, { recursive: true });
      }

      const safePath = filePath.replace(/[^a-zA-Z0-9]/g, '_');
      const snapshotPath = path.join(this.AST_DIR, `${safePath}.json`);
      fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
    } catch (error) {
      console.warn(`[ASTExtractor] Failed to save snapshot for ${filePath}:`, error);
    }
  }

  /**
   * Load AST snapshot from disk
   */
  loadASTSnapshot(filePath: string): ASTSnapshot | null {
    try {
      const safePath = filePath.replace(/[^a-zA-Z0-9]/g, '_');
      const snapshotPath = path.join(this.AST_DIR, `${safePath}.json`);
      
      if (fs.existsSync(snapshotPath)) {
        const content = fs.readFileSync(snapshotPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn(`[ASTExtractor] Failed to load snapshot for ${filePath}:`, error);
    }
    return null;
  }
}
