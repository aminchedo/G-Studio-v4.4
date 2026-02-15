/**
 * Code Intelligence Timeline - Enhanced D3.js timeline visualization with animated replay
 * Features: Better styling, tooltips, interactive controls, responsive design
 */

import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
// @ts-ignore
import * as d3 from 'd3';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, ZoomIn, ZoomOut , Calendar } from 'lucide-react';
import { BreakingChangeReport, Snapshot } from '@/types/codeIntelligence';

interface CodeIntelligenceTimelineProps {
  breakingChangeReports: BreakingChangeReport[];
  snapshots?: Snapshot[];
  width?: number;
  height?: number;
  onSnapshotSelect?: (snapshotId: string) => void;
}

export const CodeIntelligenceTimeline: React.FC<CodeIntelligenceTimelineProps> = ({
  breakingChangeReports,
  snapshots = [],
  width = 800,
  height = 400,
  onSnapshotSelect
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!svgRef.current || breakingChangeReports.length === 0) {
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse dates
    const data = breakingChangeReports.map(report => ({
      date: new Date(report.timestamp),
      report,
      breaking: report.summary.breaking,
      risky: report.summary.risky,
      safe: report.summary.safe,
      total: report.summary.total
    }));

    // Scales with padding
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(data, d => d.date) as [Date, Date])
      .range([0, innerWidth])
      .nice();

    const maxValue = d3.max(data, d => d.total) || 0;
    const yScale = d3
      .scaleLinear()
      .domain([0, maxValue * 1.1])
      .nice()
      .range([innerHeight, 0]);

    // Enhanced color scale
    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(['breaking', 'risky', 'safe'])
      .range(['#ef4444', '#f59e0b', '#10b981']);

    // Stack generator
    const stack = d3
      .stack<any, any>()
      .keys(['breaking', 'risky', 'safe'])
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const stackedData = stack(data);

    // Area generator with smooth curves
    const area = d3
      .area<any>()
      .x(d => xScale(d.data.date))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(d3.curveMonotoneX);

    // Draw areas with gradients
    const defs = svg.append('defs');
    stackedData.forEach((series: any, i: number) => {
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${series.key}`)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '0%').attr('y2', '100%');

      const color = colorScale(series.key);
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', color)
        .attr('stop-opacity', 0.8);
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', color)
        .attr('stop-opacity', 0.3);

      g.append('path')
        .datum(series)
        .attr('fill', `url(#gradient-${series.key})`)
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('d', area)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(event?.currentTarget || event?.target).attr('opacity', 1).attr('stroke-width', 3);
          
          const [x, y] = d3.pointer(event, svgRef.current);
          const point = d.data;
          setTooltip({
            x: x + 10,
            y: y - 10,
            text: `${new Date(point.date).toLocaleDateString()}\nBreaking: ${point.breaking}\nRisky: ${point.risky}\nSafe: ${point.safe}`
          });
        })
        .on('mouseout', function(this: any) {
          d3.select(event?.currentTarget || event?.target).attr('opacity', 0.7).attr('stroke-width', 2);
          setTooltip(null);
        });
    });

    // Enhanced axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.timeFormat('%Y-%m-%d') as any)
      .ticks(8);

    const yAxis = d3.axisLeft(yScale)
      .ticks(6)
      .tickFormat(d => `${d}`);

    const xAxisG = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)')
      .style('font-size', '11px')
      .style('fill', '#64748b');

    const yAxisG = g.append('g')
      .call(yAxis)
      .selectAll('text')
      .style('font-size', '11px')
      .style('fill', '#64748b');

    // Style axes
    xAxisG.selectAll('line, path').attr('stroke', '#cbd5e1');
    yAxisG.selectAll('line, path').attr('stroke', '#cbd5e1');

    // Labels
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - innerHeight / 2)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('fill', '#475569')
      .text('Number of Changes');

    g.append('text')
      .attr('transform', `translate(${innerWidth / 2}, ${innerHeight + margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('fill', '#475569')
      .text('Date');

    // Enhanced legend
    const legend = g
      .append('g')
      .attr('transform', `translate(${innerWidth - 120}, 20)`);

    ['breaking', 'risky', 'safe'].forEach((key: any, i: any) => {
      const legendRow = legend
        .append('g')
        .attr('transform', `translate(0, ${i * 22})`)
        .style('cursor', 'pointer');

      legendRow
        .append('rect')
        .attr('width', 16)
        .attr('height', 16)
        .attr('fill', colorScale(key))
        .attr('rx', 3);

      legendRow
        .append('text')
        .attr('x', 22)
        .attr('y', 12)
        .text(key.charAt(0).toUpperCase() + key.slice(1))
        .style('font-size', '11px')
        .style('font-weight', '500')
        .style('fill', '#475569');
    });

    // Add snapshot markers
    if (snapshots.length > 0) {
      snapshots.forEach(snapshot => {
        const x = xScale(new Date(snapshot.timestamp));
        const marker = g.append('g')
          .attr('transform', `translate(${x}, ${innerHeight})`)
          .style('cursor', 'pointer');

        marker.append('circle')
          .attr('r', 6)
          .attr('fill', '#3b82f6')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
          .on('mouseover', function(this: any) {
            d3.select(event?.currentTarget || event?.target).attr('r', 8);
          })
          .on('mouseout', function(this: any) {
            d3.select(event?.currentTarget || event?.target).attr('r', 6);
          })
          .on('click', () => {
            if (onSnapshotSelect) {
              onSnapshotSelect(snapshot.id);
            }
          });

        marker.append('line')
          .attr('y1', 0)
          .attr('y2', -innerHeight)
          .attr('stroke', '#3b82f6')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3')
          .attr('opacity', 0.3);

        marker.append('title')
          .text(`Snapshot: ${snapshot.id}\n${new Date(snapshot.timestamp).toLocaleString()}`);
      });
    }

    // Add playback indicator
    if (currentTime !== null) {
      const x = xScale(new Date(currentTime));
      g.append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '8,4')
        .attr('opacity', 0.8)
        .style('filter', 'drop-shadow(0 0 4px rgba(239,68,68,0.5))');
    }
  }, [breakingChangeReports, snapshots, width, height, currentTime, onSnapshotSelect]);

  // Enhanced playback controls
  const handlePlay = () => {
    if (breakingChangeReports.length === 0) return;
    
    setIsPlaying(true);
    const startTime = breakingChangeReports[0].timestamp;
    const endTime = breakingChangeReports[breakingChangeReports.length - 1].timestamp;
    const duration = endTime - startTime;
    const start = Date.now();

    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
    }

    playbackIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) * playbackSpeed;
      const current = startTime + elapsed;

      if (current >= endTime) {
        setCurrentTime(endTime);
        setIsPlaying(false);
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current);
          playbackIntervalRef.current = null;
        }
      } else {
        setCurrentTime(current);
      }
    }, 16); // ~60fps
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
  };

  const handleReset = () => {
    handlePause();
    setCurrentTime(null);
  };

  const handleSkip = (direction: 'forward' | 'backward') => {
    if (breakingChangeReports.length === 0) return;
    
    const current = currentTime || breakingChangeReports[0].timestamp;
    const index = breakingChangeReports.findIndex(r => r.timestamp >= current);
    
    if (direction === 'forward') {
      const nextIndex = Math.min(index + 1, breakingChangeReports.length - 1);
      setCurrentTime(breakingChangeReports[nextIndex].timestamp);
    } else {
      const prevIndex = Math.max(index - 1, 0);
      setCurrentTime(breakingChangeReports[prevIndex].timestamp);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);

  if (breakingChangeReports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
        <div /* Calendar */ className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">No Timeline Data Available</p>
        <p className="text-sm">Create snapshots to track changes over time.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Enhanced Playback Controls */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            className="p-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => handleSkip('backward')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Previous"
          >
            <SkipBack className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
          <button
            onClick={() => handleSkip('forward')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Next"
          >
            <SkipForward className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Speed:</label>
          <select
            value={playbackSpeed}
            onChange={(e: any) => setPlaybackSpeed(parseFloat(e.target.value))}
            className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="0.25">0.25x</option>
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="2">2x</option>
            <option value="5">5x</option>
            <option value="10">10x</option>
          </select>
        </div>
      </div>

      <div className="relative">
        <svg 
          ref={svgRef} 
          width={width} 
          height={height} 
          className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 shadow-lg"
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
    </div>
  );
};
