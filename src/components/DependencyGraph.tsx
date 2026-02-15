/**
 * Dependency Graph - D3 force-directed graph visualization
 */

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { DependencyGraph as DepGraph } from '@/types/codeIntelligence';

interface DependencyGraphProps {
  dependencyGraph: DepGraph | null;
  selectedFile?: string;
  onFileSelect?: (filePath: string) => void;
  width?: number;
  height?: number;
  showLabels?: boolean;
}

export const DependencyGraph: React.FC<DependencyGraphProps> = ({
  dependencyGraph,
  selectedFile,
  onFileSelect,
  width = 800,
  height = 600,
  showLabels = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredFile, setHoveredFile] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current || !dependencyGraph) {
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create container group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Prepare data
    const nodes = Object.values(dependencyGraph.nodes).map(node => ({
      id: node.file,
      file: node.file,
      dependencies: node.dependencies,
      dependents: node.dependents,
      isExternal: node.isExternal
    }));

    const links = nodes.flatMap(node =>
      node.dependencies.map(dep => ({
        source: node.file,
        target: dep,
        type: 'dependency'
      }))
    );

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.file).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(innerWidth / 2, innerHeight / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create links
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');

    // Create arrow marker
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#999');

    // Create nodes
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', (d: any) => {
        const dependentCount = d.dependents.length;
        return Math.max(5, Math.min(20, 5 + dependentCount * 2));
      })
      .attr('fill', (d: any) => {
        if (d.file === selectedFile) {
          return '#3b82f6'; // Blue for selected
        }
        if (hoveredFile === d.file) {
          return '#f59e0b'; // Orange for hovered
        }
        if (dependencyGraph.circularDependencies.some(cycle => cycle.includes(d.file))) {
          return '#ef4444'; // Red for circular deps
        }
        return '#10b981'; // Green for normal
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d: any) {
        setHoveredFile(d.file);
        d3.select(this).attr('r', (d: any) => {
          const dependentCount = d.dependents.length;
          return Math.max(8, Math.min(25, 8 + dependentCount * 2));
        });
      })
      .on('mouseout', function(event, d: any) {
        setHoveredFile(null);
        d3.select(this).attr('r', (d: any) => {
          const dependentCount = d.dependents.length;
          return Math.max(5, Math.min(20, 5 + dependentCount * 2));
        });
      })
      .on('click', function(event, d: any) {
        if (onFileSelect) {
          onFileSelect(d.file);
        }
      })
      .call(
        d3
          .drag<any, any>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended) as any
      );

    // Create labels
    if (showLabels) {
      const label = g
        .append('g')
        .attr('class', 'labels')
        .selectAll('text')
        .data(nodes)
        .enter()
        .append('text')
        .text((d: any) => {
          const parts = d.file.split('/');
          return parts[parts.length - 1];
        })
        .attr('font-size', '10px')
        .attr('dx', 12)
        .attr('dy', 4)
        .style('pointer-events', 'none')
        .style('user-select', 'none');
    }

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);

      if (showLabels) {
        g.selectAll('text')
          .attr('x', (d: any) => d.x)
          .attr('y', (d: any) => d.y);
      }
    });

    // Drag handlers
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

    // Zoom functionality
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom as any);

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [dependencyGraph, selectedFile, hoveredFile, width, height, showLabels, onFileSelect]);

  if (!dependencyGraph) {
    return (
      <div className="text-center py-12 text-slate-600 dark:text-slate-400">
        <p>No dependency graph available. Run indexing to build the graph.</p>
      </div>
    );
  }

  return (
    <div className="w-full relative">
      <div className="absolute top-2 right-2 bg-white dark:bg-slate-800 rounded px-2 py-1 text-xs shadow">
        Zoom: {(zoomLevel * 100).toFixed(0)}%
      </div>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border border-slate-200 dark:border-slate-700 rounded cursor-move"
      />
      {hoveredFile && (
        <div className="absolute bottom-2 left-2 bg-white dark:bg-slate-800 rounded px-3 py-2 text-sm shadow">
          <div className="font-medium">{hoveredFile}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {dependencyGraph.nodes[hoveredFile]?.dependents.length || 0} dependents
          </div>
        </div>
      )}
    </div>
  );
};
