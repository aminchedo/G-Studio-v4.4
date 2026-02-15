/**
 * GeminiTesterResults - Results Display
 * 
 * Component for displaying test results with search, filter, and details
 */

import React, { useMemo } from 'react';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Zap,
  Eye,
  Image,
  Clock,
  TrendingUp,
  Award
} from 'lucide-react';
import { useGeminiTester } from './GeminiTesterContext';
import { TestResult } from './GeminiTesterTypes';

export const GeminiTesterResults: React.FC = React.memo(() => {
  const {
    results,
    searchQuery,
    categoryFilter,
    statusFilter,
    recommendations,
    setSearchQuery,
    setCategoryFilter,
    setStatusFilter,
    setSelectedModel,
    setShowModelModal
  } = useGeminiTester();

  /**
   * Filter and search results
   */
  const filteredResults = useMemo(() => {
    if (!results) return [];

    let filtered = [...results];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.family?.toLowerCase().includes(query) ||
        r.tier?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter(r => r.family === categoryFilter);
    }

    // Status filter
    if (statusFilter === 'accessible') {
      filtered = filtered.filter(r => r.accessible);
    } else if (statusFilter === 'restricted') {
      filtered = filtered.filter(r => !r.accessible && r.error?.includes('403'));
    } else if (statusFilter === 'failed') {
      filtered = filtered.filter(r => !r.accessible && !r.error?.includes('403'));
    }

    return filtered;
  }, [results, searchQuery, categoryFilter, statusFilter]);

  /**
   * Get unique categories
   */
  const categories = useMemo(() => {
    if (!results) return [];
    const cats = new Set(results.map(r => r.family).filter(Boolean));
    return Array.from(cats).sort();
  }, [results]);

  /**
   * Calculate statistics
   */
  const stats = useMemo(() => {
    if (!results) return { total: 0, accessible: 0, restricted: 0, failed: 0 };
    
    return {
      total: results.length,
      accessible: results.filter(r => r.accessible).length,
      restricted: results.filter(r => !r.accessible && r.error?.includes('403')).length,
      failed: results.filter(r => !r.accessible && !r.error?.includes('403')).length
    };
  }, [results]);

  /**
   * Handle model click
   */
  const handleModelClick = (model: TestResult) => {
    setSelectedModel(model);
    setShowModelModal(true);
  };

  /**
   * Get status badge
   */
  const getStatusBadge = (result: TestResult) => {
    if (result.accessible) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-900/30 border border-green-800/30 text-green-300 text-xs rounded-full">
          <CheckCircle2 className="w-3 h-3" />
          Accessible
        </span>
      );
    } else if (result.error?.includes('403')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-900/30 border border-yellow-800/30 text-yellow-300 text-xs rounded-full">
          <AlertCircle className="w-3 h-3" />
          Restricted
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-900/30 border border-red-800/30 text-red-300 text-xs rounded-full">
          <XCircle className="w-3 h-3" />
          Failed
        </span>
      );
    }
  };

  /**
   * Get recommendation badge
   */
  const getRecommendationBadge = (modelName: string) => {
    if (!recommendations) return null;

    const badges = [];
    if (recommendations.bestForSpeed === modelName) {
      badges.push({ label: 'Fastest', color: 'blue', icon: Zap });
    }
    if (recommendations.bestForQuality === modelName) {
      badges.push({ label: 'Best Quality', color: 'purple', icon: Award });
    }
    if (recommendations.bestForBalance === modelName) {
      badges.push({ label: 'Best Balance', color: 'green', icon: TrendingUp });
    }
    if (recommendations.bestForLatest === modelName) {
      badges.push({ label: 'Latest', color: 'yellow', icon: Zap });
    }

    return badges.map((badge, i) => {
      const Icon = badge.icon;
      return (
        <span
          key={i}
          className={`inline-flex items-center gap-1 px-2 py-1 bg-${badge.color}-900/30 border border-${badge.color}-800/30 text-${badge.color}-300 text-xs rounded-full`}
        >
          <Icon className="w-3 h-3" />
          {badge.label}
        </span>
      );
    });
  };

  if (!results) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <Search className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">No results yet</p>
          <p className="text-sm text-slate-500">
            Run a test to see model results here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Stats */}
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-xl font-semibold text-white mb-4">Test Results</h2>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Total Models</div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-3">
            <div className="text-xs text-green-400 mb-1">Accessible</div>
            <div className="text-2xl font-bold text-green-300">{stats.accessible}</div>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-3">
            <div className="text-xs text-yellow-400 mb-1">Restricted</div>
            <div className="text-2xl font-bold text-yellow-300">{stats.restricted}</div>
          </div>
          <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3">
            <div className="text-xs text-red-400 mb-1">Failed</div>
            <div className="text-2xl font-bold text-red-300">{stats.failed}</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="accessible">Accessible</option>
            <option value="restricted">Restricted</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Active Filters */}
        {(searchQuery || categoryFilter || statusFilter) && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-slate-400">Active filters:</span>
            {searchQuery && (
              <span className="px-2 py-1 bg-blue-900/30 border border-blue-800/30 text-blue-300 text-xs rounded">
                Search: {searchQuery}
              </span>
            )}
            {categoryFilter && (
              <span className="px-2 py-1 bg-purple-900/30 border border-purple-800/30 text-purple-300 text-xs rounded">
                Category: {categoryFilter}
              </span>
            )}
            {statusFilter && (
              <span className="px-2 py-1 bg-green-900/30 border border-green-800/30 text-green-300 text-xs rounded">
                Status: {statusFilter}
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('');
                setStatusFilter('');
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredResults.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">No models match your filters</p>
            <p className="text-sm text-slate-500">
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredResults.map((result, index) => (
              <div
                key={index}
                onClick={() => handleModelClick(result)}
                className="bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-white font-medium">{result.name}</h3>
                      {getStatusBadge(result)}
                      {getRecommendationBadge(result.name)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      {result.family && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-blue-400 rounded-full" />
                          {result.family}
                        </span>
                      )}
                      {result.tier && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-purple-400 rounded-full" />
                          {result.tier}
                        </span>
                      )}
                    </div>
                  </div>

                  {result.responseTime && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-green-400 text-sm">
                        <Clock className="w-4 h-4" />
                        {result.responseTime}ms
                      </div>
                    </div>
                  )}
                </div>

                {/* Capabilities */}
                <div className="flex items-center gap-2">
                  {result.streaming && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-900/30 text-blue-300 text-xs rounded">
                      <Zap className="w-3 h-3" />
                      Streaming
                    </span>
                  )}
                  {result.multimodal && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-900/30 text-purple-300 text-xs rounded">
                      <Image className="w-3 h-3" />
                      Multimodal
                    </span>
                  )}
                  {result.methods && result.methods.length > 0 && (
                    <span className="text-xs text-slate-500">
                      {result.methods.length} methods
                    </span>
                  )}
                </div>

                {/* Error Message */}
                {result.error && (
                  <div className="mt-3 text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded p-2">
                    {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

GeminiTesterResults.displayName = 'GeminiTesterResults';
