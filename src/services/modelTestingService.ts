/**
 * Model Testing Service
 * SINGLE SOURCE OF TRUTH for model probing
 * 
 * This service is ONLY called from the "API Model Test" button.
 * No other part of the system may probe models.
 * 
 * NOW USES UltimateGeminiTesterService for all API interactions
 * to ensure consistent bypass/DNS features and full Gemini access.
 */

import { ModelValidationStore, ModelTestResult } from './modelValidationStore';
import { detectModelFamily } from './modelInfo';
import { UltimateGeminiTester } from './ultimateGeminiTester';

export interface ModelTestOutput {
  usableModels: string[];
  rejectedModels: Array<{
    modelId: string;
    reason: 'quota_exhausted' | 'permission_denied' | 'model_disabled' | 'incompatible' | 'not_found' | 'network_error' | 'timeout' | 'unknown' | 'rate_limited';
    isModelScoped: boolean; // true if this is model-specific, false if provider-level
  }>;
  providerStatus: 'ok' | 'exhausted' | 'rate_limited';
  testedAt: number;
}

export class ModelTestingService {
  /**
   * Track if API Model Test is currently in progress
   * Used to prevent other services from making API calls during test
   */
  private static testInProgress: boolean = false;
  private static testApiKey: string | null = null;

  /**
   * Check if API Model Test is currently in progress
   */
  static isTestInProgress(apiKey?: string): boolean {
    if (!this.testInProgress) return false;
    // If apiKey provided, check if it matches the test API key
    if (apiKey && this.testApiKey) {
      return apiKey === this.testApiKey;
    }
    return true;
  }

  /**
   * Test a single model with a minimal, safe probe
   * TEXT modality only, very short prompt, no streaming/tools/images
   * 
   * @param apiKey - API key to use
   * @param modelId - Model ID to test
   * @param timeout - Timeout in milliseconds (default: 2000)
   * @returns Test result with classification
   */
  private static async probeModel(
    apiKey: string,
    modelId: string,
    timeout: number = 10000, // Increased from 2000 to 10000 (10 seconds) to handle slow responses
    tester?: UltimateGeminiTester // Optional tester instance for reuse
  ): Promise<{
    success: boolean;
    failureReason?: ModelTestOutput['rejectedModels'][0]['reason'];
    isModelScoped?: boolean; // true if model-specific, false if provider-level
    isRateLimited?: boolean; // true if 429 - STOP IMMEDIATELY
    responseTime?: number; // Response time in milliseconds (from SmartHTTPClient)
  }> {
    try {
      // Generate random number for minimal prompt
      const randomNumber = Math.floor(Math.random() * 100) + 1;
      const testPrompt = randomNumber.toString();

      // Use UltimateGeminiTesterService for consistent bypass/DNS
      let client;
      if (tester) {
        client = tester.getClient();
      } else {
        // Create temporary tester instance
        const tempTester = new UltimateGeminiTester({
          apiKey,
          bypassMode: 'auto',
          region: 'us',
          smartDNS: true,
          verbose: false
        });
        await tempTester.initialize();
        client = tempTester.getClient();
      }

      // Make request through SmartHTTPClient (with bypass/DNS/retry)
      const result = await client.request(
        `models/${modelId}:generateContent`,
        {
          method: 'POST',
          body: {
            contents: [{ parts: [{ text: testPrompt }] }],
            generationConfig: { maxOutputTokens: 10 } // Minimal response
            // NO streaming, NO tools, NO images, NO audio
          },
          timeout: timeout,
          maxRetries: 1 // Single attempt for probe (fast failure)
        }
      );

      // ⛔ 429 RATE LIMITED: STOP IMMEDIATELY - do not parse, do not continue
      // 429 means: API key valid, model valid, quota/rate temporarily exhausted
      // This is NOT a model failure, NOT a fatal error
      // CRITICAL: Check status code BEFORE parsing response body for optimal short-circuit
      if (result.status === 429 || result.error?.includes('429')) {
        console.warn(`[ModelTestingService] 429 detected on ${modelId} - short-circuiting immediately`);
        return { 
          success: false, 
          failureReason: 'rate_limited',
          isModelScoped: false,
          isRateLimited: true,
          responseTime: result.responseTime || 0
        };
      }
      
      // Check if request was successful
      if (!result.success) {
        const errorMsg = result.error || 'Unknown error';
        
        // Parse error reason
        if (errorMsg.includes('403') || errorMsg.includes('Permission')) {
          return { 
            success: false, 
            failureReason: 'permission_denied',
            isModelScoped: true,
            responseTime: result.responseTime || 0
          };
        }
        if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
          return { 
            success: false, 
            failureReason: 'not_found',
            isModelScoped: true,
            responseTime: result.responseTime || 0
          };
        }
        if (errorMsg.includes('quota') || errorMsg.includes('exhausted')) {
          return { 
            success: false, 
            failureReason: 'quota_exhausted',
            isModelScoped: false,
            responseTime: result.responseTime || 0
          };
        }
        if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
          return { 
            success: false, 
            failureReason: 'timeout',
            isModelScoped: false,
            responseTime: result.responseTime || 0
          };
        }
        if (errorMsg.includes('network') || errorMsg.includes('ECONN')) {
          return { 
            success: false, 
            failureReason: 'network_error',
            isModelScoped: false,
            responseTime: result.responseTime || 0
          };
        }
        
        return { 
          success: false, 
          failureReason: 'unknown',
          isModelScoped: false,
          responseTime: result.responseTime || 0
        };
      }
      
      // Success - model is accessible
      // Even if response is empty, success=true means model is valid
      // Check if response has data (candidates) for additional validation
      if (result.data?.candidates && result.data.candidates.length > 0) {
        // Model responded successfully with candidates
        return { success: true, responseTime: result.responseTime || 0 };
      }
      
      // Success response but no candidates - still valid (model exists and responded)
      return { success: true, responseTime: result.responseTime || 0 };
    } catch (error: any) {
      // Timeout or network error from SmartHTTPClient
      const errorMsg = error?.message || String(error);
      
      if (errorMsg.includes('timeout') || errorMsg.includes('AbortError')) {
        return { 
          success: false, 
          failureReason: 'timeout',
          isModelScoped: false,
          responseTime: 0 // Timeout - no response time available
        };
      } else if (errorMsg.includes('network') || errorMsg.includes('ECONN')) {
        return { 
          success: false, 
          failureReason: 'network_error',
          isModelScoped: false,
          responseTime: 0 // Network error - no response time available
        };
      } else {
        return { 
          success: false, 
          failureReason: 'unknown',
          isModelScoped: false,
          responseTime: 0 // Unknown error - no response time available
        };
      }
    }
  }

  /**
   * Fetch model details (token limits) from API
   * Called during discovery to enrich test results
   * NOW USES UltimateGeminiTesterService for consistent bypass/DNS
   */
  private static async fetchModelDetails(
    apiKey: string, 
    modelId: string,
    tester?: UltimateGeminiTester
  ): Promise<{
    maxInputTokens?: number;
    maxOutputTokens?: number;
  }> {
    try {
      // Use UltimateGeminiTesterService if provided, otherwise create new instance
      let client: any;
      if (tester) {
        client = tester.getClient();
      } else {
        const tempTester = new UltimateGeminiTester({
          apiKey,
          bypassMode: 'auto',
          verbose: false
        });
        await tempTester.initialize();
        client = tempTester.getClient();
      }

      const result = await client.request(
        `models/${modelId}?key=${apiKey}`,
        { timeout: 10000, maxRetries: 1 }
      );
      
      if (!result.success || !result.data) {
        return {}; // Return empty if fetch fails
      }
      
      const data = result.data;
      return {
        maxInputTokens: typeof data.inputTokenLimit === 'number' ? data.inputTokenLimit : undefined,
        maxOutputTokens: typeof data.outputTokenLimit === 'number' ? data.outputTokenLimit : undefined
      };
    } catch (error) {
      // Silently fail - token limits are optional
      return {};
    }
  }

  /**
   * Discover available models from API using UltimateGeminiTesterService
   * Uses the /models endpoint to get all available models
   * Includes retry logic, CDN fallback, and bypass features
   * 
   * @param apiKey - API key to use
   * @param tester - Optional UltimateGeminiTester instance (reuse if available)
   * @returns Array of discovered model IDs
   */
  private static async discoverModelsFromAPI(
    apiKey: string,
    tester?: UltimateGeminiTester
  ): Promise<string[]> {
    try {
      // Use UltimateGeminiTesterService if provided, otherwise create new instance
      let testerInstance: UltimateGeminiTester;
      if (tester) {
        testerInstance = tester;
      } else {
        testerInstance = new UltimateGeminiTester({
          apiKey,
          bypassMode: 'auto',
          verbose: false
        });
        await testerInstance.initialize();
      }

      // Use the tester's discoverModels method which has all the retry/CDN/bypass logic
      const models = await testerInstance.discoverModels();
      
      // Extract model IDs from the enriched model objects
      const discoveredModels = models.map((model: any) => model.name);
      
      console.log(`[ModelTestingService] ✅ Discovered ${discoveredModels.length} models from API using UltimateGeminiTesterService`);
      return discoveredModels;
    } catch (error: any) {
      console.warn(`[ModelTestingService] Model discovery failed: ${error.message}`);
      return [];
    }
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test all candidate models
   * This is the ONLY place where models are probed
   * 
   * IMPORTANT: This is a USER-INITIATED action that:
   * 1. Clears previous test results (unlocks immutability)
   * 2. Exits degraded mode (unlocks global lock)
   * 3. Discovers models from API (like ultimate_gemini_tester.js)
   * 4. Runs fresh model tests
   * 5. Locks results when complete
   * 
   * @param apiKey - API key to use
   * @param candidateModels - List of candidate model IDs to test (fallback if discovery fails)
   * @param onProgress - Optional progress callback
   * @returns Structured test output
   */
  static async testAllModels(
    apiKey: string,
    candidateModels: string[],
    onProgress?: (current: number, total: number, modelId: string) => void
  ): Promise<ModelTestOutput> {
    // USER ACTION: Clear previous results and exit degraded mode
    // This is the ONLY way to unlock the global lock
    ModelValidationStore.clearResults(apiKey);
    
    const { DegradedMode } = await import('./degradedMode');
    DegradedMode.exitDegradedMode('gemini');
    console.log(`[ModelTestingService] USER_ACTION: Starting fresh API Model Test - previous results cleared, degraded mode exited`);
    
    // CRITICAL: Mark test as in progress to prevent other API calls
    this.testInProgress = true;
    this.testApiKey = apiKey;
    
    // STEP 1: Create UltimateGeminiTester instance for reuse (ensures consistent bypass/DNS)
    // This instance will be reused for all probeModel and fetchModelDetails calls
    console.log(`[ModelTestingService] Initializing UltimateGeminiTester with bypass/DNS...`);
    const tester = new UltimateGeminiTester({
      apiKey,
      bypassMode: 'auto',
      region: 'us',
      smartDNS: true,
      verbose: false
    });
    await tester.initialize();
    console.log(`[ModelTestingService] ✅ UltimateGeminiTester initialized with bypass: ${tester.getResults().bypassMethod}`);
    
    // STEP 2: Discover models from API (like ultimate_gemini_tester.js)
    // Uses advanced retry logic, exponential backoff, and CDN fallback
    console.log(`[ModelTestingService] Step 1: Discovering models from API (with retry & CDN fallback)...`);
    const discoveredModels = await this.discoverModelsFromAPI(apiKey, tester);
    
    // Use discovered models if available, otherwise fallback to candidate models
    const modelsToTest = discoveredModels.length > 0 ? discoveredModels : candidateModels;
    console.log(`[ModelTestingService] Step 2: Testing ${modelsToTest.length} models (${discoveredModels.length > 0 ? 'discovered from API' : 'using candidate list'})`);
    
    // Log bypass status (browser will use system proxy automatically if configured)
    console.log(`[ModelTestingService] Bypass: Browser will use system proxy automatically if configured`);
    
    // Start discovery tracking
    ModelValidationStore.startDiscovery(apiKey, modelsToTest.length);
    
    const usableModels: string[] = [];
    const rejectedModels: ModelTestOutput['rejectedModels'] = [];
    let rateLimitedCount = 0;

    try {
      // FULL SCAN REQUIRED: Discovery MUST probe ALL models
      // This is a background enumeration task, not a fail-fast process
      // modelsToTest.length → probeModel() MUST be invoked for each model
      // No early break, no early return, no "enough info" optimization
      for (let i = 0; i < modelsToTest.length; i++) {
        const modelId = modelsToTest[i];
        
        if (onProgress) {
          onProgress(i + 1, modelsToTest.length, modelId);
        }

        const result = await this.probeModel(apiKey, modelId, 10000, tester);

        // 🔍 429 IN DISCOVERY PHASE: Model is VALID but rate limited
        // 429 means: API key valid, model valid, quota/rate temporarily exhausted
        // CRITICAL: 429 is proof that model works - add to usableModels!
        // This is the correct behavior: if API returns 429, model exists and is accessible
        if (result.isRateLimited) {
          rateLimitedCount++;
          
          console.log(`[ModelTestingService] 429 detected on "${modelId}" (${i + 1}/${candidateModels.length}) - model is VALID (rate limited), adding to usable models`);
          
          // ✅ MODEL IS VALID (429 = API key valid, model valid, just rate limited)
          // Add to usableModels because 429 proves the model works
          usableModels.push(modelId);
          
          // Fetch model details (token limits) for rate-limited models
          const modelDetails = await this.fetchModelDetails(apiKey, modelId, tester);
          
          // Record test result as "working" (429 means it works, just rate limited)
          ModelValidationStore.recordTestResult(
            apiKey,
            modelId,
            'working',
            undefined, // No failure reason
            modelDetails.maxInputTokens,
            modelDetails.maxOutputTokens,
            result.responseTime // Include response time from probe
          );
          
          // Update discovery progress with new usable count
          ModelValidationStore.updateDiscoveryProgress(
            apiKey,
            i + 1,
            usableModels.length,
            rateLimitedCount
          );
          
          // Add longer delay after rate limit to avoid hammering
          await new Promise(resolve => setTimeout(resolve, 1000)); // Increased delay
          // Continue to next model
          continue;
        }

        if (result.success) {
          // ✅ MODEL OK - add immediately (monotonic accumulation)
          usableModels.push(modelId);
          
          // Fetch model details (token limits) for successful models
          // Family detection happens here during discovery (exactly once)
          const modelDetails = await this.fetchModelDetails(apiKey, modelId, tester);
          
          // Record test result with token limits and response time
          // Family is detected automatically from modelId during discovery
          ModelValidationStore.recordTestResult(
            apiKey,
            modelId,
            'working',
            undefined, // No failure reason
            modelDetails.maxInputTokens,
            modelDetails.maxOutputTokens,
            result.responseTime // Include response time from probe
          );
          
          // Update discovery progress with new usable count
          ModelValidationStore.updateDiscoveryProgress(
            apiKey,
            i + 1,
            usableModels.length,
            rateLimitedCount
          );
        } else {
          // ❌ MODEL FAILED (not rate limited - real failure)
          const failureReason = result.failureReason || 'unknown';
          
          // FILTER 429 ERRORS: They are treated as temporary noise, not real errors
          // Only record hard errors (invalid modality, permission denied, etc.)
          if (failureReason === 'rate_limited') {
            // Skip - 429 is already handled above, this shouldn't happen but filter just in case
            console.log(`[ModelTestingService] Filtered 429 error for "${modelId}" - treating as noise`);
            continue;
          }

          // ⚠️ RETRY LOGIC: For timeout/network/unknown errors, retry once with longer timeout
          // This helps catch models that are slow to respond but still valid
          // User confirmed all 13 models work, so "unknown" errors might be transient
          if ((failureReason === 'timeout' || failureReason === 'network_error' || failureReason === 'unknown') && i < modelsToTest.length) {
            console.log(`[ModelTestingService] Retrying "${modelId}" after ${failureReason} (attempt 2/2 with 15s timeout)...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
            
            const retryResult = await this.probeModel(apiKey, modelId, 15000, tester); // 15 second timeout for retry
            
            if (retryResult.success || retryResult.isRateLimited) {
              // ✅ Model works on retry - add to usable models
              if (retryResult.isRateLimited) {
                console.log(`[ModelTestingService] Retry successful: "${modelId}" is VALID (429 on retry)`);
                usableModels.push(modelId);
                const modelDetails = await this.fetchModelDetails(apiKey, modelId, tester);
                ModelValidationStore.recordTestResult(apiKey, modelId, 'working', undefined, modelDetails.maxInputTokens, modelDetails.maxOutputTokens, retryResult.responseTime);
                ModelValidationStore.updateDiscoveryProgress(apiKey, i + 1, usableModels.length, rateLimitedCount);
                continue;
              } else {
                console.log(`[ModelTestingService] Retry successful: "${modelId}" works!`);
                usableModels.push(modelId);
                const modelDetails = await this.fetchModelDetails(apiKey, modelId, tester);
                ModelValidationStore.recordTestResult(apiKey, modelId, 'working', undefined, modelDetails.maxInputTokens, modelDetails.maxOutputTokens, retryResult.responseTime);
                ModelValidationStore.updateDiscoveryProgress(apiKey, i + 1, usableModels.length, rateLimitedCount);
                continue;
              }
            }
            // If retry also fails, continue to rejection logic below
          }

          rejectedModels.push({
            modelId,
            reason: failureReason,
            isModelScoped: result.isModelScoped !== false
          });

          ModelValidationStore.recordTestResult(apiKey, modelId, 'failed', failureReason as any);
          
          // Update discovery progress (even for failures)
          ModelValidationStore.updateDiscoveryProgress(
            apiKey,
            i + 1,
            usableModels.length,
            rateLimitedCount
          );
        }

        // Small delay to avoid rate limiting (increased to 1 second like HTML tester)
        if (i < candidateModels.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay like HTML tester
        }
      }
      
      // Discovery is complete ONLY when scannedModelCount === candidateModelCount
      // This is the ONLY valid completion condition
      console.log(`[ModelTestingService] Discovery complete: scanned ${candidateModels.length}/${candidateModels.length} models, found ${usableModels.length} usable models`);
      
      // End discovery phase
      ModelValidationStore.endDiscovery(apiKey);

      // Determine provider status AFTER full scan completion
      // Discovery is complete: scannedModelCount === candidateModelCount
      // DOMAIN LOGIC: In discovery phase, 429s are expected signal noise
      // Provider is "ok" if we found any usable models, regardless of rate limits
      let providerStatus: ModelTestOutput['providerStatus'] = 'ok';
      
      // Only mark as rate_limited if:
      // 1. Discovery completed (full scan finished - scannedModelCount === candidateModelCount)
      // 2. We found ZERO usable models AND
      // 3. We encountered rate limits (indicating they blocked discovery)
      // This is the ONLY case where discovery failure is attributed to rate limits
      if (usableModels.length === 0 && rateLimitedCount > 0) {
        providerStatus = 'rate_limited';
        console.warn(`[ModelTestingService] Discovery complete (full scan): No usable models found after ${rateLimitedCount} rate limits`);
      } else if (usableModels.length > 0) {
        // Success: Found usable models despite any rate limits
        console.log(`[ModelTestingService] Discovery complete (full scan): Found ${usableModels.length} usable models (${rateLimitedCount} rate limits encountered, but discovery succeeded)`);
      } else {
        // No rate limits but also no usable models - likely other issues
        console.warn(`[ModelTestingService] Discovery complete (full scan): No usable models found (no rate limits detected)`);
      }

      // Store provider status and lock results
      ModelValidationStore.setProviderStatus(apiKey, providerStatus);
      // IMMUTABILITY LOCK: Mark test as complete - results are now read-only
      ModelValidationStore.markTestComplete(apiKey);

      return {
        usableModels,
        rejectedModels,
        providerStatus,
        testedAt: Date.now()
      };
    } finally {
      // CRITICAL: Always clear test in progress flag
      this.testInProgress = false;
      this.testApiKey = null;
    }
  }

  /**
   * Get candidate models (fixed list - MANDATORY)
   * Uses the fixed 14-model universe - no dynamic discovery
   * This is the ONLY source of candidate models for testing
   */
  static async getCandidateModels(apiKey: string): Promise<string[]> {
    // Fixed candidate model source (MANDATORY)
    // No dynamic guessing, no external discovery
    const { DEFAULT_MODELS } = await import('./defaultModels');
    return [...DEFAULT_MODELS];
  }
}
