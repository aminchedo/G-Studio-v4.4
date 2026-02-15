# Phase 6: Custom AI Provider System - Implementation Plan

## 🎯 Objective
Create a flexible, extensible AI provider system inspired by nexusai-editor-4 that allows users to add custom AI providers through the AI Settings Hub.

## 🏗️ Architecture Overview

### Provider System Components

```
services/aiProviders/
├── base.ts              - Abstract base provider class
├── factory.ts           - Provider factory (singleton)
├── types.ts             - Provider type definitions
├── gemini.ts            - Gemini provider implementation
├── openai.ts            - OpenAI provider implementation
├── anthropic.ts         - Anthropic provider implementation
├── custom.ts            - Custom provider implementation
└── index.ts             - Exports

components/AISettingsHub/
├── ProvidersTab.tsx     - NEW: Provider management UI
└── CustomProviderModal.tsx - NEW: Add/edit custom providers
```

## 📋 Features

### 1. Built-in Providers
- ✅ Google Gemini (existing)
- ✅ OpenAI (GPT-4, GPT-3.5)
- ✅ Anthropic (Claude)
- ✅ Custom providers (user-defined)

### 2. Custom Provider Support
- Add custom API endpoints
- Configure authentication
- Set model parameters
- Test connectivity
- Save/load configurations

### 3. Provider Management UI
- List all providers
- Enable/disable providers
- Set default provider
- Configure provider settings
- Test provider connection

## 🎨 UI Design

### Providers Tab in AI Settings Hub

```
┌─────────────────────────────────────────────────────┐
│ AI Settings Hub                                      │
├─────────────────────────────────────────────────────┤
│ [Connection] [Models] [Providers] [Behavior] ...    │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Available Providers                                  │
│                                                      │
│ ┌──────────────────────────────────────────────┐   │
│ │ ✓ Google Gemini          [Active] [Configure]│   │
│ │   Models: gemini-2.0-flash, gemini-1.5-pro  │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ ┌──────────────────────────────────────────────┐   │
│ │ ○ OpenAI                 [Inactive] [Configure]│  │
│ │   Models: gpt-4, gpt-3.5-turbo               │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ ┌──────────────────────────────────────────────┐   │
│ │ ○ Anthropic              [Inactive] [Configure]│  │
│ │   Models: claude-3-opus, claude-3-sonnet     │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ Custom Providers                                     │
│                                                      │
│ ┌──────────────────────────────────────────────┐   │
│ │ ✓ My Local LLM          [Active] [Edit] [×]  │   │
│ │   Endpoint: http://localhost:11434           │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ [+ Add Custom Provider]                              │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Custom Provider Modal

```
┌─────────────────────────────────────────────────────┐
│ Add Custom Provider                            [×]   │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Provider Name *                                      │
│ ┌──────────────────────────────────────────────┐   │
│ │ My Custom Provider                           │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ API Endpoint *                                       │
│ ┌──────────────────────────────────────────────┐   │
│ │ https://api.example.com/v1                   │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ API Key                                              │
│ ┌──────────────────────────────────────────────┐   │
│ │ ••••••••••••••••••••                         │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ Authentication Type                                  │
│ ┌──────────────────────────────────────────────┐   │
│ │ Bearer Token ▼                               │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ Request Format                                       │
│ ┌──────────────────────────────────────────────┐   │
│ │ OpenAI Compatible ▼                          │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ Available Models (comma-separated)                   │
│ ┌──────────────────────────────────────────────┐   │
│ │ model-1, model-2, model-3                    │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ [Test Connection]                                    │
│                                                      │
│ ┌──────────────────────────────────────────────┐   │
│ │ ✓ Connection successful!                     │   │
│ │   Response time: 245ms                       │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│                          [Cancel]  [Save Provider]   │
└─────────────────────────────────────────────────────┘
```

## 🔧 Implementation Details

### 1. Provider Types

```typescript
// services/aiProviders/types.ts

export interface ProviderConfig {
  name: string;
  apiKey: string;
  baseUrl: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatCompletion {
  id: string;
  model: string;
  choices: Array<{
    message: ChatMessage;
    finishReason: string;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamChunk {
  id: string;
  model: string;
  content?: string;
  finishReason?: string;
}

export interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  maxTokens: number;
  supportedModels: string[];
}

export type AuthType = 'bearer' | 'api-key' | 'basic' | 'custom';
export type RequestFormat = 'openai' | 'anthropic' | 'google' | 'custom';

export interface CustomProviderConfig extends ProviderConfig {
  authType: AuthType;
  requestFormat: RequestFormat;
  models: string[];
  customHeaders?: Record<string, string>;
  transformRequest?: (options: ChatCompletionOptions) => any;
  transformResponse?: (response: any) => ChatCompletion;
}
```

### 2. Base Provider

```typescript
// services/aiProviders/base.ts

export abstract class BaseProvider {
  protected config: ProviderConfig;
  protected providerName: string;

  constructor(config: ProviderConfig, providerName: string) {
    this.config = config;
    this.providerName = providerName;
  }

  abstract createChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletion>;
  abstract streamChatCompletion(options: ChatCompletionOptions): AsyncGenerator<StreamChunk>;
  abstract countTokens(text: string): Promise<number>;
  abstract validateConfig(config: ProviderConfig): boolean;
  abstract getSupportedModels(): string[];
  abstract getCapabilities(): ProviderCapabilities;

  getProviderName(): string {
    return this.providerName;
  }

  getConfig(): ProviderConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<ProviderConfig>): void {
    const newConfig = { ...this.config, ...config };
    if (!this.validateConfig(newConfig)) {
      throw new Error(`Invalid configuration for provider: ${this.providerName}`);
    }
    this.config = newConfig;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.countTokens('test');
      return true;
    } catch (error) {
      console.error(`[${this.providerName}] Connection test failed:`, error);
      return false;
    }
  }
}
```

### 3. Provider Factory

```typescript
// services/aiProviders/factory.ts

export class ProviderFactory {
  private static instance: ProviderFactory;
  private providers: Map<string, ProviderConstructor> = new Map();

  static getInstance(): ProviderFactory {
    if (!ProviderFactory.instance) {
      ProviderFactory.instance = new ProviderFactory();
    }
    return ProviderFactory.instance;
  }

  registerProvider(name: string, providerClass: ProviderConstructor): void {
    this.providers.set(name, providerClass);
  }

  createProvider(providerName: string, config: ProviderConfig): BaseProvider {
    const ProviderClass = this.providers.get(providerName);
    if (!ProviderClass) {
      throw new Error(`Provider '${providerName}' is not registered`);
    }
    return new ProviderClass(config, providerName);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  isProviderRegistered(providerName: string): boolean {
    return this.providers.has(providerName);
  }
}
```

### 4. Custom Provider Implementation

```typescript
// services/aiProviders/custom.ts

export class CustomProvider extends BaseProvider {
  private customConfig: CustomProviderConfig;

  constructor(config: CustomProviderConfig, providerName: string) {
    super(config, providerName);
    this.customConfig = config;
  }

  async createChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletion> {
    const requestBody = this.transformRequest(options);
    const response = await this.makeRequest('/chat/completions', requestBody);
    return this.transformResponse(response);
  }

  async *streamChatCompletion(options: ChatCompletionOptions): AsyncGenerator<StreamChunk> {
    const requestBody = this.transformRequest({ ...options, stream: true });
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            yield this.transformStreamChunk(parsed);
          } catch (e) {
            console.error('Failed to parse stream chunk:', e);
          }
        }
      }
    }
  }

  private transformRequest(options: ChatCompletionOptions): any {
    if (this.customConfig.transformRequest) {
      return this.customConfig.transformRequest(options);
    }

    // Default: OpenAI format
    return {
      model: options.model || this.config.model,
      messages: options.messages,
      temperature: options.temperature ?? this.config.temperature,
      max_tokens: options.maxTokens ?? this.config.maxTokens,
      stream: options.stream ?? false,
    };
  }

  private transformResponse(response: any): ChatCompletion {
    if (this.customConfig.transformResponse) {
      return this.customConfig.transformResponse(response);
    }

    // Default: OpenAI format
    return response as ChatCompletion;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.customConfig.customHeaders,
    };

    switch (this.customConfig.authType) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        break;
      case 'api-key':
        headers['X-API-Key'] = this.config.apiKey;
        break;
      case 'basic':
        const encoded = btoa(`api:${this.config.apiKey}`);
        headers['Authorization'] = `Basic ${encoded}`;
        break;
    }

    return headers;
  }

  validateConfig(config: ProviderConfig): boolean {
    return !!(config.baseUrl && config.apiKey);
  }

  getSupportedModels(): string[] {
    return this.customConfig.models || [];
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsTools: false,
      supportsVision: false,
      maxTokens: this.config.maxTokens || 4096,
      supportedModels: this.getSupportedModels(),
    };
  }

  async countTokens(text: string): Promise<number> {
    // Simple estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
```

## 📊 Storage Schema

```typescript
// LocalStorage structure
interface StoredProviders {
  builtIn: {
    gemini: { enabled: boolean; config: ProviderConfig };
    openai: { enabled: boolean; config: ProviderConfig };
    anthropic: { enabled: boolean; config: ProviderConfig };
  };
  custom: Array<{
    id: string;
    name: string;
    enabled: boolean;
    config: CustomProviderConfig;
  }>;
  activeProvider: string; // Provider ID
}
```

## ✅ Implementation Checklist

### Phase 6.1: Core Provider System (2 hours)
- [ ] Create provider types (`services/aiProviders/types.ts`)
- [ ] Implement base provider (`services/aiProviders/base.ts`)
- [ ] Implement provider factory (`services/aiProviders/factory.ts`)
- [ ] Create custom provider class (`services/aiProviders/custom.ts`)
- [ ] Migrate existing Gemini service to provider pattern

### Phase 6.2: Provider UI (2 hours)
- [ ] Create ProvidersTab component
- [ ] Create CustomProviderModal component
- [ ] Add provider list UI
- [ ] Add provider configuration UI
- [ ] Add connection testing UI

### Phase 6.3: Integration (1 hour)
- [ ] Integrate with AI Settings Hub
- [ ] Add provider storage/loading
- [ ] Update chat service to use providers
- [ ] Add provider switching logic

### Phase 6.4: Testing & Documentation (1 hour)
- [ ] Test built-in providers
- [ ] Test custom provider creation
- [ ] Test provider switching
- [ ] Write user documentation

## 🎯 Success Criteria

- [ ] Users can add custom AI providers
- [ ] Users can configure provider settings
- [ ] Users can test provider connections
- [ ] Users can switch between providers
- [ ] Provider configurations persist
- [ ] All built-in providers work
- [ ] Custom providers work with OpenAI-compatible APIs

## 📝 User Benefits

1. **Flexibility**: Use any AI provider
2. **Cost Control**: Switch to cheaper providers
3. **Privacy**: Use local/private providers
4. **Redundancy**: Fallback providers
5. **Experimentation**: Test different models

## 🔗 Related Files

- `services/geminiService.ts` - Current Gemini implementation
- `components/AISettingsHub.tsx` - Settings UI
- `types.ts` - Type definitions

## 🎉 Expected Outcome

A flexible, extensible AI provider system that allows users to:
- Use built-in providers (Gemini, OpenAI, Anthropic)
- Add custom providers with any API
- Configure and test providers
- Switch between providers seamlessly
- Save provider configurations

This brings G-Studio to feature parity with nexusai-editor-4's provider system!
