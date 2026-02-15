# Custom AI Providers - User Guide

## 🎯 Overview

G-Studio now supports custom AI providers! You can add any AI service with an OpenAI-compatible API, including:
- Local LLMs (LM Studio, Ollama, LocalAI)
- Cloud providers (OpenAI, Anthropic, Cohere, etc.)
- Custom/private AI endpoints
- Self-hosted models

## 🚀 Quick Start

### 1. Open AI Settings Hub

Click the **Settings** button in the ribbon or press `Ctrl+,` to open the AI Settings Hub.

### 2. Navigate to Providers Tab

Click on the **Providers** tab in the sidebar (pink icon).

### 3. Add a Custom Provider

Click the **"+ Add Custom"** button in the Custom Providers section.

### 4. Fill in Provider Details

**Required Fields:**
- **Provider Name**: A friendly name for your provider (e.g., "My Local LLM")
- **API Endpoint**: The base URL of your API (e.g., `http://localhost:11434/v1`)
- **API Key**: Your API key or token (use any value for local providers)
- **Available Models**: Comma-separated list of models (e.g., `llama-2, mistral, codellama`)

**Optional Fields:**
- **Authentication Type**: How to authenticate (Bearer Token, API Key Header, Basic Auth, None)
- **Request Format**: API format (OpenAI Compatible, Anthropic, Google, Custom)

### 5. Test Connection

Click **"Test Connection"** to verify your provider is accessible. You'll see:
- ✅ Success message with response time
- ❌ Error message if connection fails

### 6. Save Provider

Click **"Add Provider"** to save your custom provider.

### 7. Enable and Activate

- Toggle the provider to **"Enabled"**
- Click the ⚡ icon to set it as the **Active** provider

## 📋 Common Use Cases

### Local LLM with LM Studio

```
Provider Name: LM Studio
API Endpoint: http://localhost:1234/v1
API Key: lm-studio
Authentication: Bearer Token
Request Format: OpenAI Compatible
Models: llama-2-7b, codellama-13b
```

### Local LLM with Ollama

```
Provider Name: Ollama
API Endpoint: http://localhost:11434/v1
API Key: ollama
Authentication: Bearer Token
Request Format: OpenAI Compatible
Models: llama2, mistral, codellama
```

### OpenAI

```
Provider Name: OpenAI
API Endpoint: https://api.openai.com/v1
API Key: sk-...
Authentication: Bearer Token
Request Format: OpenAI Compatible
Models: gpt-4, gpt-4-turbo, gpt-3.5-turbo
```

### Anthropic Claude

```
Provider Name: Anthropic
API Endpoint: https://api.anthropic.com/v1
API Key: sk-ant-...
Authentication: API Key Header
Request Format: Anthropic
Models: claude-3-opus, claude-3-sonnet, claude-3-haiku
```

### Custom/Private Endpoint

```
Provider Name: My Private AI
API Endpoint: https://my-ai.company.com/api/v1
API Key: your-secret-key
Authentication: Bearer Token
Request Format: OpenAI Compatible
Models: custom-model-1, custom-model-2
```

## 🔧 Authentication Types

### Bearer Token (Default)
Sends API key in `Authorization: Bearer <key>` header.
**Use for**: OpenAI, most OpenAI-compatible APIs

### API Key Header
Sends API key in `X-API-Key: <key>` header.
**Use for**: Some custom APIs, Anthropic

### Basic Auth
Sends API key as Basic authentication.
**Use for**: APIs requiring username/password

### No Authentication
No authentication headers sent.
**Use for**: Local models, public APIs

## 🎨 Provider Management

### Enable/Disable Providers
Toggle providers on/off without deleting them. Disabled providers won't appear in model selection.

### Set Active Provider
The active provider is used for all AI requests. Click the ⚡ icon to activate a provider.

### Edit Provider
Click the ⚙️ icon to edit provider settings. All fields can be updated.

### Delete Provider
Click the 🗑️ icon to permanently delete a custom provider.

## 🧪 Testing Providers

### Connection Test
The "Test Connection" button sends a simple request to verify:
- ✅ API endpoint is accessible
- ✅ Authentication works
- ✅ Provider responds correctly
- ⏱️ Response time

### Troubleshooting

**Connection Failed**
- Check API endpoint URL (include `/v1` if needed)
- Verify API key is correct
- Ensure provider is running (for local models)
- Check firewall/network settings

**Authentication Error**
- Verify API key format
- Try different authentication type
- Check if API key has proper permissions

**No Response**
- Increase timeout in provider settings
- Check if model name is correct
- Verify provider supports the request format

## 💡 Tips

1. **Local Models**: Use `http://localhost` for local providers
2. **Model Names**: Check provider documentation for exact model names
3. **Multiple Providers**: Add multiple providers for redundancy
4. **Cost Savings**: Use local models for development, cloud for production
5. **Privacy**: Use local providers for sensitive data

## 🔒 Security

- API keys are stored in browser localStorage
- Keys are never sent to G-Studio servers
- Use HTTPS endpoints for cloud providers
- Consider using environment variables for production

## 📚 Advanced Configuration

### Custom Headers
Add custom headers in the provider configuration for special requirements.

### Request Transformation
For non-OpenAI-compatible APIs, implement custom request/response transformers.

### Model-Specific Settings
Configure temperature, max tokens, and other parameters per provider.

## 🆘 Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify provider documentation
3. Test with a simple curl command first
4. Check provider status/health endpoints

## 🎉 Examples

### Complete LM Studio Setup

1. Start LM Studio and load a model
2. Enable the local server (default: `http://localhost:1234`)
3. In G-Studio:
   - Open AI Settings Hub → Providers
   - Click "Add Custom"
   - Name: "LM Studio"
   - Endpoint: `http://localhost:1234/v1`
   - API Key: `lm-studio` (any value works)
   - Models: Check LM Studio for loaded model name
   - Test Connection
   - Save and Enable

### Complete Ollama Setup

1. Install and start Ollama
2. Pull a model: `ollama pull llama2`
3. In G-Studio:
   - Open AI Settings Hub → Providers
   - Click "Add Custom"
   - Name: "Ollama"
   - Endpoint: `http://localhost:11434/v1`
   - API Key: `ollama` (any value works)
   - Models: `llama2, mistral, codellama`
   - Test Connection
   - Save and Enable

---

**Enjoy using custom AI providers in G-Studio!** 🚀
