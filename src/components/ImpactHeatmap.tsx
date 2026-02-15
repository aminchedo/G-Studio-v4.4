/**
 * Impact Heatmap - Module vs Module matrix visualization
 */

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { DependencyGraph } from '@/types/codeIntelligence';
import { ImpactResult } from '@/services/codeIntelligence/analysis/impactAnalyzer';

interface ImpactHeatmapProps {
  dependencyGraph: DependencyGraph | null;
  impactResults?: ImpactResult;
  width?: number;
  height?: number;
}

export const ImpactHeatmap: React.FC<ImpactHeatmapProps> = ({
  dependencyGraph,
  impactResults,
  width = 800,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredCell, setHoveredCell] = useState<{ source: string; target: string; value: number } | null>(null);

  useEffect(() => {
    if (!svgRef.current || !dependencyGraph) {
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 100, right: 100, bottom: 100, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Group files by module (directory)
    const modules = new Map<string, string[]>();
    Object.keys(dependencyGraph.nodes).forEach(filePath => {
      const module = filePath.split('/').slice(0, -1).join('/') || 'root';
      if (!modules.has(module)) {
        modules.set(module, []);
      }
      modules.get(module)!.push(filePath);
    });

    const moduleList = Array.from(modules.keys());
    const cellSize = Math.min(innerWidth / moduleList.length, innerHeight / moduleList.length, 30);

    // Build module dependency matrix
    const matrix: number[][] = [];
    moduleList.forEach(sourceModule => {
      const row: number[] = [];
      moduleList.forEach(targetModule => {
        if (sourceModule === targetModule) {
          row.push(0); // Self-dependency
        } else {
          const sourceFiles = modules.get(sourceModule) || [];
          const targetFiles = modules.get(targetModule) || [];
          
          let dependencyCount = 0;
          sourceFiles.forEach(sourceFile => {
            const node = dependencyGraph.nodes[sourceFile];
            if (node) {
              const deps = node.dependencies.filter(dep => targetFiles.includes(dep));
              dependencyCount += deps.length;
            }
          });

          // Normalize by module size
          const normalized = sourceFiles.length > 0 
            ? dependencyCount / sourceFiles.length 
            : 0;
          row.push(normalized);
        }
      });
      matrix.push(row);
    });

    // Color scale
    const maxValue = Math.max(...matrix.flat());
    const colorScale = d3
      .scaleSequential(d3.interpolateYlOrRd)
      .domain([0, maxValue]);

    // Create heatmap cells
    moduleList.forEach((sourceModule, i) => {
      moduleList.forEach((targetModule, j) => {
        const value = matrix[i][j];
        const x = j * cellSize;
        const y = i * cellSize;

        g.append('rect')
          .attr('x', x)
          .attr('y', y)
          .attr('width', cellSize - 1)
          .attr('height', cellSize - 1)
          .attr('fill', value > 0 ? colorScale(value) : '#f3f4f6')
          .attr('stroke', '#fff')
          .attr('stroke-width', 0.5)
          .style('cursor', 'pointer')
          .on('mouseover', function() {
            setHoveredCell({ source: sourceModule, target: targetModule, value });
            d3.select(this).attr('stroke-width', 2).attr('stroke', '#3b82f6');
          })
          .on('mouseout', function() {
            setHoveredCell(null);
            d3.select(this).attr('stroke-width', 0.5).attr('stroke', '#fff');
          });

        // Add value text for non-zero cells
        if (value > 0) {
          g.append('text')
            .attr('x', x + cellSize / 2)
            .attr('y', y + cellSize / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '8px')
            .attr('fill', value > maxValue * 0.5 ? '#fff' : '#000')
            .text(value.toFixed(2));
        }
      });
    });

    // Add module labels on top
    g.append('g')
      .selectAll('text')
      .data(moduleList)
      .enter()
      .append('text')
      .text(d => d.split('/').pop() || d)
      .attr('x', (d, i) => i * cellSize + cellSize / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('transform', (d, i) => `rotate(-45, ${i * cellSize + cellSize / 2}, -5)`);

    // Add module labels on left
    g.append('g')
      .selectAll('text')
      .data(moduleList)
      .enter()
      .append('text')
      .text(d => d.split('/').pop() || d)
      .attr('x', -5)
      .attr('y', (d, i) => i * cellSize + cellSize / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '10px');

    // Add legend
    const legendWidth = 200;
    const legendHeight = 20;
    const legend = g
      .append('g')
      .attr('transform', `translate(${innerWidth - legendWidth}, ${innerHeight + 30})`);

    const legendScale = d3.scaleLinear().domain([0, maxValue]).range([0, legendWidth]);
    const legendAxis = d3.axisBottom(legendScale).ticks(5);

    const defs = svg.append('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'heatmap-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%');

    const numStops = 10;
    for (let i = 0; i <= numStops; i++) {
      const value = (i / numStops) * maxValue;
      gradient
        .append('stop')
        .attr('offset', `${(i / numStops) * 100}%`)
        .attr('stop-color', colorScale(value));
    }

    legend
      .append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#heatmap-gradient)');

    legend
      .append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(legendAxis);

    legend
      .append('text')
      .attr('x', legendWidth / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .text('Dependency Intensity');
  }, [dependencyGraph, impactResults, width, height]);

  if (!dependencyGraph) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>No dependency graph available. Run indexing to build the graph.</p>
      </div>
    );
  }

  return (
    <div className="w-full relative">
      <svg
        ref={svgRef}
        width={width}
        height={height + 100}
        className="border border-slate-700 rounded"
      />
      {hoveredCell && (
        <div className="absolute top-2 left-2 bg-slate-800 rounded px-3 py-2 text-sm shadow border border-slate-700/60">
          <div className="font-medium text-slate-200">
            {hoveredCell.source.split('/').pop()} → {hoveredCell.target.split('/').pop()}
          </div>
          <div className="text-xs text-slate-400">
            Intensity: {hoveredCell.value.toFixed(3)}
          </div>
        </div>
      )}
    </div>
  );
};
