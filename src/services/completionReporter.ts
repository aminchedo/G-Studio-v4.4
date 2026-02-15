/**
 * Completion Reporter
 * 
 * Generates final authoritative diagnostic report that defines "DONE"
 * Only this report defines whether the system successfully completed
 */

import { ModelId } from '@/types';
import { FailureType, ClassificationResult } from './aiBehaviorValidation';
import { CompletionVerificationResult } from './aiBehaviorValidation';

export interface SystemStatus {
  ui: 'OK' | 'BLOCKED';
  ai: 'OK' | 'BLOCKED';
  infra: 'OK' | 'DEGRADED';
}

export interface RuntimeFix {
  type: string;
  description: string;
  timestamp: number;
  requestId: string;
}

export interface LiveVerification {
  uiInteractions: boolean;
  aiRequestSent: boolean;
  aiResponseReceived: boolean;
  networkReachable: boolean;
  details: string[];
}

export interface ErrorRootCause {
  errorId: string;
  timestamp: number;
  classification: FailureType | ClassificationResult;
  rootCause: string;
  classificationProof: {
    errorMessage?: string;
    errorName?: string;
    httpStatus?: number;
    networkError?: boolean;
    jsException?: boolean;
  };
  requestId: string;
  modelName?: ModelId;
}

export interface CodeDeliveryConfirmation {
  codeDetected: boolean;
  languageDetected?: string;
  codeBlockCount: number;
  uiRendered: boolean;
  messageId?: string;
}

export interface CompletionReport {
  requestId: string;
  timestamp: number;
  status: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  
  // SYSTEM STATUS
  systemStatus: SystemStatus;
  
  // WHAT WAS FIXED
  runtimeFixes: RuntimeFix[];
  
  // WHAT WAS VERIFIED LIVE
  liveVerification: LiveVerification;
  
  // WHY PREVIOUS ERRORS OCCURRED
  errorRootCauses: ErrorRootCause[];
  
  // CONFIRMATION OF CODE DELIVERY
  codeDelivery: CodeDeliveryConfirmation;
  
  // COMPLETION VERIFICATION
  completionVerification: CompletionVerificationResult;
  
  // FINAL VERDICT
  finalVerdict: string;
}

export class CompletionReporter {
  private static reports: Map<string, CompletionReport> = new Map();
  private static runtimeFixes: RuntimeFix[] = [];
  private static errorRootCauses: ErrorRootCause[] = [];

  /**
   * Record a runtime fix
   */
  static recordRuntimeFix(
    requestId: string,
    type: string,
    description: string
  ): void {
    this.runtimeFixes.push({
      type,
      description,
      timestamp: Date.now(),
      requestId
    });
  }

  /**
   * Record an error root cause
   */
  static recordErrorRootCause(
    requestId: string,
    error: Error | null,
    classification: FailureType | ClassificationResult,
    modelName?: ModelId
  ): void {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    let rootCause = 'Unknown error';
    const classificationProof: ErrorRootCause['classificationProof'] = {};

    if (error) {
      classificationProof.errorMessage = error.message;
      classificationProof.errorName = error.name;

      // Determine root cause based on classification
      if (classification === FailureType.CODE_BUG || classification === ClassificationResult.CODE_BUG) {
        rootCause = 'Code bug: JS exception before network call or invalid request structure';
        classificationProof.jsException = true;
      } else if (classification === FailureType.CONFIG_FAILURE || classification === ClassificationResult.CONFIG_FAILURE) {
        rootCause = 'Configuration failure: API key missing or invalid';
      } else if (classification === FailureType.INFRA_FAILURE || classification === ClassificationResult.INFRA_FAILURE) {
        rootCause = 'Infrastructure failure: Network error, timeout, or server error';
        classificationProof.networkError = true;
        // Try to extract HTTP status
        const statusMatch = error.message.match(/(\d{3})/);
        if (statusMatch) {
          classificationProof.httpStatus = parseInt(statusMatch[1], 10);
        }
      } else if (classification === FailureType.MODEL_FAILURE || classification === ClassificationResult.MODEL_FAILURE) {
        rootCause = 'Model failure: Empty response, refusal, or malformed output';
      }
    }

    this.errorRootCauses.push({
      errorId,
      timestamp: Date.now(),
      classification,
      rootCause,
      classificationProof,
      requestId,
      modelName
    });
  }

  /**
   * Generate final completion report
   */
  static generateReport(
    requestId: string,
    systemStatus: SystemStatus,
    liveVerification: LiveVerification,
    codeDelivery: CodeDeliveryConfirmation,
    completionVerification: CompletionVerificationResult,
    allModelsExhausted: boolean
  ): CompletionReport {
    // Filter fixes and errors for this request
    const requestFixes = this.runtimeFixes.filter(f => f.requestId === requestId);
    const requestErrors = this.errorRootCauses.filter(e => e.requestId === requestId);

    // Determine status
    let status: 'SUCCESS' | 'FAILURE' | 'PARTIAL' = 'SUCCESS';
    if (allModelsExhausted && !completionVerification.isComplete) {
      status = 'FAILURE';
    } else if (!completionVerification.isComplete) {
      status = 'PARTIAL';
    }

    // Generate final verdict
    let finalVerdict = '';
    if (status === 'SUCCESS') {
      finalVerdict = `✅ SUCCESS: Request ${requestId} completed successfully. Code delivered and verified.`;
    } else if (status === 'FAILURE') {
      finalVerdict = `❌ FAILURE: Request ${requestId} failed after exhausting all models. No code delivered.`;
    } else {
      finalVerdict = `⚠️ PARTIAL: Request ${requestId} partially completed but verification failed.`;
    }

    const report: CompletionReport = {
      requestId,
      timestamp: Date.now(),
      status,
      systemStatus,
      runtimeFixes: requestFixes,
      liveVerification,
      errorRootCauses: requestErrors,
      codeDelivery,
      completionVerification,
      finalVerdict
    };

    // Store report
    this.reports.set(requestId, report);

    return report;
  }

  /**
   * Get report for a request
   */
  static getReport(requestId: string): CompletionReport | undefined {
    return this.reports.get(requestId);
  }

  /**
   * Format report as markdown for display
   */
  static formatReportAsMarkdown(report: CompletionReport): string {
    const lines: string[] = [];

    lines.push('# Final Diagnostic Report');
    lines.push('');
    lines.push(`**Request ID:** ${report.requestId}`);
    lines.push(`**Timestamp:** ${new Date(report.timestamp).toISOString()}`);
    lines.push(`**Status:** ${report.status}`);
    lines.push(`**Final Verdict:** ${report.finalVerdict}`);
    lines.push('');

    // SYSTEM STATUS
    lines.push('## SYSTEM STATUS');
    lines.push('');
    lines.push(`- **UI:** ${report.systemStatus.ui}`);
    lines.push(`- **AI:** ${report.systemStatus.ai}`);
    lines.push(`- **INFRA:** ${report.systemStatus.infra}`);
    lines.push('');

    // WHAT WAS FIXED
    lines.push('## WHAT WAS FIXED');
    lines.push('');
    if (report.runtimeFixes.length === 0) {
      lines.push('No runtime fixes applied.');
    } else {
      report.runtimeFixes.forEach(fix => {
        lines.push(`- **${fix.type}:** ${fix.description} (${new Date(fix.timestamp).toISOString()})`);
      });
    }
    lines.push('');

    // WHAT WAS VERIFIED LIVE
    lines.push('## WHAT WAS VERIFIED LIVE');
    lines.push('');
    lines.push(`- **UI Interactions:** ${report.liveVerification.uiInteractions ? '✅' : '❌'}`);
    lines.push(`- **AI Request Sent:** ${report.liveVerification.aiRequestSent ? '✅' : '❌'}`);
    lines.push(`- **AI Response Received:** ${report.liveVerification.aiResponseReceived ? '✅' : '❌'}`);
    lines.push(`- **Network Reachable:** ${report.liveVerification.networkReachable ? '✅' : '❌'}`);
    if (report.liveVerification.details.length > 0) {
      lines.push('');
      lines.push('**Details:**');
      report.liveVerification.details.forEach(detail => {
        lines.push(`- ${detail}`);
      });
    }
    lines.push('');

    // WHY PREVIOUS ERRORS OCCURRED
    lines.push('## WHY PREVIOUS ERRORS OCCURRED');
    lines.push('');
    if (report.errorRootCauses.length === 0) {
      lines.push('No errors occurred.');
    } else {
      report.errorRootCauses.forEach(error => {
        lines.push(`### Error ${error.errorId}`);
        lines.push(`- **Classification:** ${error.classification}`);
        lines.push(`- **Root Cause:** ${error.rootCause}`);
        lines.push(`- **Timestamp:** ${new Date(error.timestamp).toISOString()}`);
        if (error.modelName) {
          lines.push(`- **Model:** ${error.modelName}`);
        }
        lines.push('**Classification Proof:**');
        lines.push('```json');
        lines.push(JSON.stringify(error.classificationProof, null, 2));
        lines.push('```');
        lines.push('');
      });
    }
    lines.push('');

    // CONFIRMATION OF CODE DELIVERY
    lines.push('## CONFIRMATION OF CODE DELIVERY');
    lines.push('');
    lines.push(`- **Code Detected:** ${report.codeDelivery.codeDetected ? '✅' : '❌'}`);
    if (report.codeDelivery.languageDetected) {
      lines.push(`- **Language Detected:** ${report.codeDelivery.languageDetected}`);
    }
    lines.push(`- **Code Block Count:** ${report.codeDelivery.codeBlockCount}`);
    lines.push(`- **UI Rendered:** ${report.codeDelivery.uiRendered ? '✅' : '❌'}`);
    if (report.codeDelivery.messageId) {
      lines.push(`- **Message ID:** ${report.codeDelivery.messageId}`);
    }
    lines.push('');

    // COMPLETION VERIFICATION
    lines.push('## COMPLETION VERIFICATION');
    lines.push('');
    lines.push(`- **Is Complete:** ${report.completionVerification.isComplete ? '✅' : '❌'}`);
    lines.push('');
    lines.push('**Criteria:**');
    lines.push(`- Model Responded: ${report.completionVerification.criteria.modelResponded ? '✅' : '❌'}`);
    lines.push(`- Response Non-Empty: ${report.completionVerification.criteria.responseNonEmpty ? '✅' : '❌'}`);
    lines.push(`- Contains Code Block: ${report.completionVerification.criteria.containsCodeBlock ? '✅' : '❌'}`);
    lines.push(`- Code Syntactically Valid: ${report.completionVerification.criteria.codeSyntacticallyValid ? '✅' : '❌'}`);
    lines.push(`- Contains Explanation: ${report.completionVerification.criteria.containsExplanation ? '✅' : '❌'}`);
    lines.push(`- No Unclassified Errors: ${report.completionVerification.criteria.noUnclassifiedErrors ? '✅' : '❌'}`);
    lines.push('');
    if (report.completionVerification.failures.length > 0) {
      lines.push('**Failures:**');
      report.completionVerification.failures.forEach(failure => {
        lines.push(`- ${failure}`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Clear old reports (cleanup)
   */
  static clearOldReports(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [requestId, report] of this.reports.entries()) {
      if (now - report.timestamp > olderThanMs) {
        this.reports.delete(requestId);
      }
    }
  }
}
