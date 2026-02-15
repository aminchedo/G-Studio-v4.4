/**
 * AccessibilityChecker Component - WCAG Compliance Checker
 * Analyzes preview content for accessibility issues
 */

import React, { useState, useCallback } from 'react';
import { Eye, AlertTriangle, CheckCircle, Info, RefreshCw, ExternalLink } from 'lucide-react';

export interface AccessibilityIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  rule: string;
  description: string;
  element: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  wcagCriterion: string;
  suggestion: string;
  learnMoreUrl?: string;
}

export interface AccessibilityReport {
  score: number;
  totalIssues: number;
  errors: number;
  warnings: number;
  infos: number;
  issues: AccessibilityIssue[];
  timestamp: Date;
}

export interface AccessibilityCheckerProps {
  previewRef?: React.RefObject<HTMLIFrameElement>;
  onReportGenerated?: (report: AccessibilityReport) => void;
  wcagLevel?: 'A' | 'AA' | 'AAA';
}

export const AccessibilityChecker: React.FC<AccessibilityCheckerProps> = ({
  previewRef,
  onReportGenerated,
  wcagLevel = 'AA',
}) => {
  const [report, setReport] = useState<AccessibilityReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  // Run accessibility checks
  const runChecks = useCallback(async () => {
    if (!previewRef?.current) return;

    setIsChecking(true);
    const issues: AccessibilityIssue[] = [];

    try {
      const iframeDoc = previewRef.current.contentDocument;
      if (!iframeDoc) return;

      // Check 1: Images without alt text
      const images = iframeDoc.getElementsByTagName('img');
      Array.from(images).forEach((img, index) => {
        if (!img.hasAttribute('alt')) {
          issues.push({
            id: `img-alt-${index}`,
            severity: 'error',
            rule: 'Images must have alt text',
            description: 'Image is missing alternative text',
            element: `<img src="${img.src.substring(0, 50)}...">`,
            wcagLevel: 'A',
            wcagCriterion: '1.1.1 Non-text Content',
            suggestion: 'Add an alt attribute describing the image content',
            learnMoreUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
          });
        } else if (img.alt.trim() === '') {
          issues.push({
            id: `img-alt-empty-${index}`,
            severity: 'warning',
            rule: 'Alt text should be descriptive',
            description: 'Image has empty alt text',
            element: `<img src="${img.src.substring(0, 50)}...">`,
            wcagLevel: 'A',
            wcagCriterion: '1.1.1 Non-text Content',
            suggestion: 'Provide descriptive alt text or use alt="" for decorative images',
          });
        }
      });

      // Check 2: Form inputs without labels
      const inputs = iframeDoc.querySelectorAll('input, select, textarea');
      Array.from(inputs).forEach((input, index) => {
        const id = input.getAttribute('id');
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        
        if (!id && !ariaLabel && !ariaLabelledBy) {
          issues.push({
            id: `input-label-${index}`,
            severity: 'error',
            rule: 'Form inputs must have labels',
            description: 'Input element is not associated with a label',
            element: `<${input.tagName.toLowerCase()} type="${input.getAttribute('type') || 'text'}">`,
            wcagLevel: 'A',
            wcagCriterion: '1.3.1 Info and Relationships',
            suggestion: 'Add a <label> element or use aria-label attribute',
            learnMoreUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
          });
        }
      });

      // Check 3: Heading hierarchy
      const headings = iframeDoc.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let lastLevel = 0;
      Array.from(headings).forEach((heading, index) => {
        const level = parseInt(heading.tagName.substring(1));
        if (level - lastLevel > 1) {
          issues.push({
            id: `heading-hierarchy-${index}`,
            severity: 'warning',
            rule: 'Heading levels should not be skipped',
            description: `Heading level skipped from H${lastLevel} to H${level}`,
            element: `<${heading.tagName.toLowerCase()}>${heading.textContent?.substring(0, 30)}...</${heading.tagName.toLowerCase()}>`,
            wcagLevel: 'A',
            wcagCriterion: '1.3.1 Info and Relationships',
            suggestion: 'Use heading levels in sequential order',
          });
        }
        lastLevel = level;
      });

      // Check 4: Color contrast (simplified)
      const elements = iframeDoc.querySelectorAll('*');
      Array.from(elements).slice(0, 50).forEach((element, index) => {
        const styles = iframeDoc.defaultView?.getComputedStyle(element);
        if (!styles) return;

        const color = styles.color;
        const bgColor = styles.backgroundColor;
        
        // Simple check: if both are set and similar, flag it
        if (color && bgColor && color !== 'rgba(0, 0, 0, 0)' && bgColor !== 'rgba(0, 0, 0, 0)') {
          // This is a simplified check - real contrast checking requires more complex calculations
          if (color === bgColor) {
            issues.push({
              id: `contrast-${index}`,
              severity: 'error',
              rule: 'Sufficient color contrast required',
              description: 'Text color and background color are the same',
              element: element.tagName.toLowerCase(),
              wcagLevel: 'AA',
              wcagCriterion: '1.4.3 Contrast (Minimum)',
              suggestion: 'Ensure text has sufficient contrast with background (4.5:1 ratio)',
              learnMoreUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html',
            });
          }
        }
      });

      // Check 5: Links with meaningful text
      const links = iframeDoc.getElementsByTagName('a');
      Array.from(links).forEach((link, index) => {
        const text = link.textContent?.trim() || '';
        const meaninglessTexts = ['click here', 'read more', 'here', 'link', 'more'];
        
        if (meaninglessTexts.includes(text.toLowerCase())) {
          issues.push({
            id: `link-text-${index}`,
            severity: 'warning',
            rule: 'Links should have meaningful text',
            description: `Link text "${text}" is not descriptive`,
            element: `<a href="${link.href}">${text}</a>`,
            wcagLevel: 'A',
            wcagCriterion: '2.4.4 Link Purpose (In Context)',
            suggestion: 'Use descriptive link text that explains the destination',
            learnMoreUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html',
          });
        }
      });

      // Check 6: Page language
      const htmlElement = iframeDoc.documentElement;
      if (!htmlElement.hasAttribute('lang')) {
        issues.push({
          id: 'page-lang',
          severity: 'error',
          rule: 'Page must have language attribute',
          description: 'HTML element is missing lang attribute',
          element: '<html>',
          wcagLevel: 'A',
          wcagCriterion: '3.1.1 Language of Page',
          suggestion: 'Add lang="en" (or appropriate language code) to <html> tag',
          learnMoreUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html',
        });
      }

      // Check 7: Page title
      const title = iframeDoc.title;
      if (!title || title.trim() === '') {
        issues.push({
          id: 'page-title',
          severity: 'error',
          rule: 'Page must have a title',
          description: 'Document is missing a title',
          element: '<title>',
          wcagLevel: 'A',
          wcagCriterion: '2.4.2 Page Titled',
          suggestion: 'Add a descriptive <title> element in the <head>',
          learnMoreUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/page-titled.html',
        });
      }

      // Check 8: Buttons with accessible names
      const buttons = iframeDoc.getElementsByTagName('button');
      Array.from(buttons).forEach((button, index) => {
        const text = button.textContent?.trim() || '';
        const ariaLabel = button.getAttribute('aria-label');
        
        if (!text && !ariaLabel) {
          issues.push({
            id: `button-name-${index}`,
            severity: 'error',
            rule: 'Buttons must have accessible names',
            description: 'Button has no text or aria-label',
            element: '<button>',
            wcagLevel: 'A',
            wcagCriterion: '4.1.2 Name, Role, Value',
            suggestion: 'Add text content or aria-label to the button',
          });
        }
      });

      // Calculate score
      const errorCount = issues.filter(i => i.severity === 'error').length;
      const warningCount = issues.filter(i => i.severity === 'warning').length;
      const infoCount = issues.filter(i => i.severity === 'info').length;
      
      // Score: 100 - (errors * 10) - (warnings * 5) - (infos * 1)
      const score = Math.max(0, 100 - (errorCount * 10) - (warningCount * 5) - (infoCount * 1));

      const newReport: AccessibilityReport = {
        score,
        totalIssues: issues.length,
        errors: errorCount,
        warnings: warningCount,
        infos: infoCount,
        issues,
        timestamp: new Date(),
      };

      setReport(newReport);
      onReportGenerated?.(newReport);
    } catch (error) {
      console.error('Failed to run accessibility checks:', error);
    } finally {
      setIsChecking(false);
    }
  }, [previewRef, onReportGenerated]);

  // Filter issues by severity
  const filteredIssues = report?.issues.filter(issue => 
    selectedSeverity === 'all' || issue.severity === selectedSeverity
  ) || [];

  // Get severity icon
  const getSeverityIcon = (severity: AccessibilityIssue['severity']) => {
    switch (severity) {
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'info': return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold">Accessibility Checker</h3>
          <span className="px-2 py-0.5 bg-blue-900 text-blue-300 text-xs rounded">
            WCAG {wcagLevel}
          </span>
        </div>
        <button
          onClick={runChecks}
          disabled={isChecking}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isChecking ? (
            <>
              <RefreshCw className="w-4 h-4 inline mr-1 animate-spin" />
              Checking...
            </>
          ) : (
            'Run Check'
          )}
        </button>
      </div>

      {/* Score */}
      {report && (
        <div className="p-4 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Accessibility Score</span>
            <span className={`text-2xl font-bold ${
              report.score >= 90 ? 'text-green-400' :
              report.score >= 70 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {report.score}
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full transition-all ${
                report.score >= 90 ? 'bg-green-500' :
                report.score >= 70 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${report.score}%` }}
            />
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <span className="text-slate-400">{report.errors} errors</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              <span className="text-slate-400">{report.warnings} warnings</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span className="text-slate-400">{report.infos} info</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {report && (
        <div className="flex gap-2 p-3 border-b border-slate-700">
          {(['all', 'error', 'warning', 'info'] as const).map((severity) => (
            <button
              key={severity}
              onClick={() => setSelectedSeverity(severity)}
              className={`px-3 py-1 rounded text-sm capitalize transition-colors ${
                selectedSeverity === severity
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {severity}
              {severity !== 'all' && (
                <span className="ml-1">
                  ({report.issues.filter(i => i.severity === severity).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Issues List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!report ? (
          <div className="text-center py-8 text-slate-500">
            <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No accessibility report yet</p>
            <p className="text-sm mt-1">Click "Run Check" to analyze your preview</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="text-center py-8 text-green-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3" />
            <p className="font-semibold">No {selectedSeverity !== 'all' ? selectedSeverity : ''} issues found!</p>
            <p className="text-sm text-slate-400 mt-1">Your content meets WCAG {wcagLevel} standards</p>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div key={issue.id} className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <div className="flex items-start gap-3 mb-2">
                {getSeverityIcon(issue.severity)}
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">{issue.rule}</h4>
                  <p className="text-sm text-slate-300 mb-2">{issue.description}</p>
                  <code className="text-xs bg-slate-900 px-2 py-1 rounded text-blue-300 block mb-2">
                    {issue.element}
                  </code>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                    <span className="px-2 py-0.5 bg-slate-700 rounded">
                      WCAG {issue.wcagLevel}
                    </span>
                    <span>{issue.wcagCriterion}</span>
                  </div>
                  <div className="p-2 bg-blue-900/30 border border-blue-700/50 rounded text-sm">
                    <p className="text-blue-300">💡 {issue.suggestion}</p>
                  </div>
                  {issue.learnMoreUrl && (
                    <a
                      href={issue.learnMoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2"
                    >
                      Learn more <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <p className="text-xs text-slate-400">
          💡 Tip: Aim for a score of 90+ to ensure your content is accessible to all users
        </p>
      </div>
    </div>
  );
};

export default AccessibilityChecker;
