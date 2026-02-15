/**
 * CodeNavigation Component - Go-to-definition, Find References, Symbol Search
 * Provides code intelligence features for navigation
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Search, MapPin, FileText, Code, ChevronRight, X } from 'lucide-react';

export interface Symbol {
  name: string;
  kind: 'function' | 'class' | 'variable' | 'interface' | 'type' | 'constant';
  file: string;
  line: number;
  column: number;
  signature?: string;
}

export interface Reference {
  file: string;
  line: number;
  column: number;
  context: string; // Line of code containing the reference
}

export interface CodeNavigationProps {
  files: Record<string, { name: string; content: string; language: string }>;
  onNavigate: (file: string, line: number, column: number) => void;
  currentFile?: string;
  currentPosition?: { line: number; column: number };
}

export const CodeNavigation: React.FC<CodeNavigationProps> = ({
  files,
  onNavigate,
  currentFile,
  currentPosition,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'symbols' | 'references'>('symbols');
  const [selectedSymbol, setSelectedSymbol] = useState<Symbol | null>(null);

  // Extract symbols from all files
  const symbols = useMemo(() => {
    const allSymbols: Symbol[] = [];

    Object.entries(files).forEach(([path, file]) => {
      const content = file.content;
      const lines = content.split('\n');

      lines.forEach((line, lineIndex) => {
        // Function declarations
        const functionMatch = line.match(/(?:function|const|let|var)\s+(\w+)\s*(?:=\s*)?(?:\([^)]*\)|=>)/);
        if (functionMatch) {
          allSymbols.push({
            name: functionMatch[1],
            kind: 'function',
            file: path,
            line: lineIndex + 1,
            column: line.indexOf(functionMatch[1]),
            signature: line.trim(),
          });
        }

        // Class declarations
        const classMatch = line.match(/class\s+(\w+)/);
        if (classMatch) {
          allSymbols.push({
            name: classMatch[1],
            kind: 'class',
            file: path,
            line: lineIndex + 1,
            column: line.indexOf(classMatch[1]),
            signature: line.trim(),
          });
        }

        // Interface declarations
        const interfaceMatch = line.match(/interface\s+(\w+)/);
        if (interfaceMatch) {
          allSymbols.push({
            name: interfaceMatch[1],
            kind: 'interface',
            file: path,
            line: lineIndex + 1,
            column: line.indexOf(interfaceMatch[1]),
            signature: line.trim(),
          });
        }

        // Type declarations
        const typeMatch = line.match(/type\s+(\w+)/);
        if (typeMatch) {
          allSymbols.push({
            name: typeMatch[1],
            kind: 'type',
            file: path,
            line: lineIndex + 1,
            column: line.indexOf(typeMatch[1]),
            signature: line.trim(),
          });
        }

        // Const declarations
        const constMatch = line.match(/const\s+(\w+)\s*=/);
        if (constMatch && !line.includes('=>')) {
          allSymbols.push({
            name: constMatch[1],
            kind: 'constant',
            file: path,
            line: lineIndex + 1,
            column: line.indexOf(constMatch[1]),
            signature: line.trim(),
          });
        }
      });
    });

    return allSymbols;
  }, [files]);

  // Find references for a symbol
  const findReferences = useCallback((symbolName: string): Reference[] => {
    const references: Reference[] = [];

    Object.entries(files).forEach(([path, file]) => {
      const content = file.content;
      const lines = content.split('\n');

      lines.forEach((line, lineIndex) => {
        // Simple word boundary check
        const regex = new RegExp(`\\b${symbolName}\\b`, 'g');
        let match;
        
        while ((match = regex.exec(line)) !== null) {
          references.push({
            file: path,
            line: lineIndex + 1,
            column: match.index,
            context: line.trim(),
          });
        }
      });
    });

    return references;
  }, [files]);

  // Filter symbols by search query
  const filteredSymbols = useMemo(() => {
    if (!searchQuery.trim()) return symbols;

    const query = searchQuery.toLowerCase();
    return symbols.filter(
      (symbol) =>
        symbol.name.toLowerCase().includes(query) ||
        symbol.kind.toLowerCase().includes(query) ||
        symbol.file.toLowerCase().includes(query)
    );
  }, [symbols, searchQuery]);

  // Get references for selected symbol
  const references = useMemo(() => {
    if (!selectedSymbol) return [];
    return findReferences(selectedSymbol.name);
  }, [selectedSymbol, findReferences]);

  // Get symbol icon
  const getSymbolIcon = (kind: Symbol['kind']) => {
    const iconClass = 'w-4 h-4';
    switch (kind) {
      case 'function':
        return <Code className={`${iconClass} text-purple-400`} />;
      case 'class':
        return <FileText className={`${iconClass} text-blue-400`} />;
      case 'interface':
        return <FileText className={`${iconClass} text-cyan-400`} />;
      case 'type':
        return <FileText className={`${iconClass} text-green-400`} />;
      case 'variable':
        return <MapPin className={`${iconClass} text-yellow-400`} />;
      case 'constant':
        return <MapPin className={`${iconClass} text-orange-400`} />;
    }
  };

  // Get symbol badge color
  const getSymbolBadgeColor = (kind: Symbol['kind']) => {
    switch (kind) {
      case 'function':
        return 'bg-purple-900/30 text-purple-300 border-purple-700';
      case 'class':
        return 'bg-blue-900/30 text-blue-300 border-blue-700';
      case 'interface':
        return 'bg-cyan-900/30 text-cyan-300 border-cyan-700';
      case 'type':
        return 'bg-green-900/30 text-green-300 border-green-700';
      case 'variable':
        return 'bg-yellow-900/30 text-yellow-300 border-yellow-700';
      case 'constant':
        return 'bg-orange-900/30 text-orange-300 border-orange-700';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-white mb-3">Code Navigation</h3>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symbols..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800 p-1 rounded">
          <button
            onClick={() => setActiveTab('symbols')}
            className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
              activeTab === 'symbols'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Symbols ({filteredSymbols.length})
          </button>
          <button
            onClick={() => setActiveTab('references')}
            className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
              activeTab === 'references'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
            disabled={!selectedSymbol}
          >
            References ({references.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'symbols' ? (
          // Symbols List
          <div className="p-2">
            {filteredSymbols.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No symbols found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredSymbols.map((symbol, index) => (
                  <div
                    key={`${symbol.file}-${symbol.line}-${index}`}
                    className={`p-2 rounded cursor-pointer transition-colors ${
                      selectedSymbol === symbol
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                    onClick={() => {
                      setSelectedSymbol(symbol);
                      onNavigate(symbol.file, symbol.line, symbol.column);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {getSymbolIcon(symbol.kind)}
                      <span className="text-sm font-medium flex-1 truncate">
                        {symbol.name}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${getSymbolBadgeColor(
                          symbol.kind
                        )}`}
                      >
                        {symbol.kind}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs opacity-75">
                      <span className="truncate">{symbol.file}</span>
                      <span>:</span>
                      <span>{symbol.line}</span>
                    </div>
                    {symbol.signature && (
                      <div className="mt-1 text-xs font-mono opacity-60 truncate">
                        {symbol.signature}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // References List
          <div className="p-2">
            {selectedSymbol && (
              <div className="mb-3 p-3 bg-slate-800 rounded border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getSymbolIcon(selectedSymbol.kind)}
                    <span className="text-sm font-medium text-white">
                      {selectedSymbol.name}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedSymbol(null)}
                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  {references.length} reference{references.length !== 1 ? 's' : ''} found
                </p>
              </div>
            )}

            {references.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {selectedSymbol ? 'No references found' : 'Select a symbol to find references'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {references.map((ref, index) => (
                  <div
                    key={`${ref.file}-${ref.line}-${index}`}
                    className="p-2 rounded cursor-pointer hover:bg-slate-800 transition-colors text-slate-300"
                    onClick={() => onNavigate(ref.file, ref.line, ref.column)}
                  >
                    <div className="flex items-center gap-2 mb-1 text-xs">
                      <FileText className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{ref.file}</span>
                      <ChevronRight className="w-3 h-3 text-slate-600" />
                      <span className="text-slate-400">Line {ref.line}</span>
                    </div>
                    <div className="text-xs font-mono bg-slate-950 px-2 py-1 rounded overflow-x-auto">
                      {ref.context}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Hook for code navigation
export const useCodeNavigation = (
  files: Record<string, { name: string; content: string; language: string }>
) => {
  const [currentSymbol, setCurrentSymbol] = useState<Symbol | null>(null);

  const goToDefinition = useCallback(
    (symbolName: string): Symbol | null => {
      // Find symbol definition
      for (const [path, file] of Object.entries(files)) {
        const lines = file.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Check for function/class/interface/type declarations
          const patterns = [
            new RegExp(`(?:function|const|let|var)\\s+${symbolName}\\s*(?:=\\s*)?(?:\\([^)]*\\)|=>)`),
            new RegExp(`class\\s+${symbolName}`),
            new RegExp(`interface\\s+${symbolName}`),
            new RegExp(`type\\s+${symbolName}`),
          ];

          for (const pattern of patterns) {
            if (pattern.test(line)) {
              const symbol: Symbol = {
                name: symbolName,
                kind: 'function', // Simplified
                file: path,
                line: i + 1,
                column: line.indexOf(symbolName),
              };
              setCurrentSymbol(symbol);
              return symbol;
            }
          }
        }
      }
      return null;
    },
    [files]
  );

  const findReferences = useCallback(
    (symbolName: string): Reference[] => {
      const references: Reference[] = [];

      Object.entries(files).forEach(([path, file]) => {
        const lines = file.content.split('\n');
        lines.forEach((line, lineIndex) => {
          const regex = new RegExp(`\\b${symbolName}\\b`, 'g');
          let match;
          
          while ((match = regex.exec(line)) !== null) {
            references.push({
              file: path,
              line: lineIndex + 1,
              column: match.index,
              context: line.trim(),
            });
          }
        });
      });

      return references;
    },
    [files]
  );

  return {
    currentSymbol,
    goToDefinition,
    findReferences,
  };
};
