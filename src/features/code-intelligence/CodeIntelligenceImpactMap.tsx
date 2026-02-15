/**
 * Code Intelligence Impact Map - Enhanced D3.js force-directed graph visualization
 * Features: Interactive nodes, tooltips, zoom, pan, better styling
 */

import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
// @ts-ignore
import * as d3 from 'd3';
import { DependencyGraph } from '@/types/codeIntelligence';
import { FileCode, AlertTriangle, Info } from 'lucide-react';

interface CodeIntelligenceImpactMapProps {
  dependencyGraph: DependencyGraph | null;
  changedFiles?: string[];
  width?: number;
  height?: number;
}

export const CodeIntelligenceImpactMap: React.FC<CodeIntelligenceImpactMapProps> = ({
  dependencyGraph,
  changedFiles = [],
  width = 800,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    if (!svgRef.current || !dependencyGraph) {
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Add zoom behavior
    const zoom = d3.zoom<any, any>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event: any) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Convert nodes to proper format
    const nodes = Object.values(dependencyGraph.nodes).map(node => ({
      id: node.file,
      file: node.file,
      dependencies: node.dependencies,
      dependents: node.dependents,
      isExternal: node.isExternal,
      impact: node.dependents.length
    }));

    // Convert circular dependencies and regular dependencies to link format
    const allLinks: Array<{ source: any; target: any }> = [];
    
    // Add regular dependency links
    nodes.forEach(node => {
      node.dependencies.forEach(dep => {
        const targetNode = nodes.find(n => n.file === dep);
        if (targetNode) {
          allLinks.push({ source: node, target: targetNode });
        }
      });
    });
    
    // Add circular dependency links
    if (dependencyGraph.circularDependencies && dependencyGraph.circularDependencies.length > 0) {
      dependencyGraph.circularDependencies.forEach((cycle: any) => {
        if (Array.isArray(cycle)) {
          for (let i = 0; i < cycle.length; i++) {
            const source = nodes.find(n => n.file === cycle[i]);
            const target = nodes.find(n => n.file === cycle[(i + 1) % cycle.length]);
            if (source && target && !allLinks.some(l => l.source === source && l.target === target)) {
              allLinks.push({ source, target });
            }
          }
        }
      });
    }

    // Create force simulation with better parameters
    const simulation = d3
      .forceSimulation(nodes as any)
      .force('link', d3.forceLink(allLinks).id((d: any) => d.file || d).distance(120).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(innerWidth / 2, innerHeight / 2))
      .force('collision', d3.forceCollide().radius((d: any) => Math.max(15, Math.min(30, 10 + d.impact * 2))));

    // Create links with gradient
    const defs = svg.append('defs');
    const linkGradient = defs.append('linearGradient')
      .attr('id', 'link-gradient')
      .attr('gradientUnits', 'userSpaceOnUse');

    const links = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(allLinks)
      .enter()
      .append('line')
      .attr('stroke', (d: any) => {
        // Highlight circular dependencies
        const isCircular = dependencyGraph.circularDependencies.some((cycle: any) => 
          Array.isArray(cycle) && cycle.includes(d.source.file) && cycle.includes(d.target.file)
        );
        return isCircular ? '#ef4444' : '#94a3b8';
      })
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: any) => {
        const isCircular = dependencyGraph.circularDependencies.some((cycle: any) => 
          Array.isArray(cycle) && cycle.includes(d.source.file) && cycle.includes(d.target.file)
        );
        return isCircular ? 3 : 1.5;
      })
      .style('cursor', 'pointer');

    // Create nodes with better styling
    const nodeElements = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag<any, any>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended) as any
      );

    // Add circles
    nodeElements
      .append('circle')
      .attr('r', (d: any) => {
        const dependentCount = d.dependents.length;
        return Math.max(8, Math.min(25, 8 + dependentCount * 1.5));
      })
      .attr('fill', (d: any) => {
        if (changedFiles.includes(d.file)) {
          return '#ef4444'; // Red for changed files
        }
        if (selectedNode === d.file) {
          return '#8b5cf6'; // Purple for selected
        }
        const dependentCount = d.dependents.length;
        if (dependentCount > 10) {
          return '#f59e0b'; // Orange for high impact
        } else if (dependentCount > 5) {
          return '#3b82f6'; // Blue for medium impact
        }
        return '#10b981'; // Green for low impact
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))')
      .on('mouseover', function(event, d: any) {
        d3.select(event?.currentTarget || event?.target).attr('stroke-width', 3).attr('r', (d: any) => {
          const dependentCount = d.dependents.length;
          return Math.max(10, Math.min(28, 10 + dependentCount * 1.5));
        });
        
        const [x, y] = d3.pointer(event, svgRef.current);
        setTooltip({
          x: x + 10,
          y: y - 10,
          text: `${d.file}\nDependents: ${d.dependents.length}\nDependencies: ${d.dependencies.length}`
        });
      })
      .on('mouseout', function(event, d: any) {
        d3.select(event?.currentTarget || event?.target).attr('stroke-width', 2).attr('r', (d: any) => {
          const dependentCount = d.dependents.length;
          return Math.max(8, Math.min(25, 8 + dependentCount * 1.5));
        });
        setTooltip(null);
      })
      .on('click', function(event, d: any) {
        setSelectedNode(selectedNode === d.file ? null : d.file);
      });

    // Add labels with better styling
    const labels = nodeElements
      .append('text')
      .text((d: any) => {
        const parts = d.file.split('/');
        return parts[parts.length - 1];
      })
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('dx', 12)
      .attr('dy', 4)
      .attr('fill', '#1e293b')
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .style('text-shadow', '0 1px 2px rgba(255,255,255,0.8)');

    // Add impact badges
    nodeElements
      .filter((d: any) => d.dependents.length > 5)
      .append('circle')
      .attr('r', 6)
      .attr('cx', (d: any) => {
        const r = Math.max(8, Math.min(25, 8 + d.dependents.length * 1.5));
        return r + 4;
      })
      .attr('cy', (d: any) => {
        const r = Math.max(8, Math.min(25, 8 + d.dependents.length * 1.5));
        return -r - 4;
      })
      .attr('fill', '#f59e0b')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);

    // Update positions on tick
    simulation.on('tick', () => {
      links
        .attr('x1', (d: any) => (d.source.x || 0))
        .attr('y1', (d: any) => (d.source.y || 0))
        .attr('x2', (d: any) => (d.target.x || 0))
        .attr('y2', (d: any) => (d.target.y || 0));

      nodeElements.attr('transform', (d: any) => `translate(${d.x || 0},${d.y || 0})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Add legend
    const legend = g.append('g').attr('transform', `translate(${innerWidth - 150}, 20)`);
    
    const legendData = [
      { color: '#10b981', label: 'Low Impact (<5)' },
      { color: '#3b82f6', label: 'Medium (5-10)' },
      { color: '#f59e0b', label: 'High (>10)' },
      { color: '#ef4444', label: 'Changed' },
    ];

    legendData.forEach((item: any, i: any) => {
      const legendRow = legend.append('g').attr('transform', `translate(0, ${i * 20})`);
      legendRow.append('circle').attr('r', 6).attr('fill', item.color).attr('stroke', '#fff').attr('stroke-width', 1);
      legendRow.append('text').attr('x', 12).attr('y', 4).text(item.label).attr('font-size', '10px').attr('fill', '#64748b');
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [dependencyGraph, changedFiles, width, height, selectedNode]);

  if (!dependencyGraph) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
        <Info className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">No dependency graph available</p>
        <p className="text-sm">Run indexing to build the graph.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <Info className="w-4 h-4" />
        <span>Drag nodes to reposition • Scroll to zoom • Click to select</span>
      </div>
      <svg 
        ref={svgRef} 
        width={width} 
        height={height} 
        className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
        style={{ cursor: 'grab' }}
      />
      {tooltip && (
        <div
          className="fixed z-50 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-xl pointer-events-none"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="whitespace-pre-line">{tooltip.text}</div>
        </div>
      )}
    </div>
  );
};
