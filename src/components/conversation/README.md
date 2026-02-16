# 🎨 Conversation Module - Premium AI Chat Interface

## Overview

A beautiful, modern conversation interface for G-Studio with premium design, smooth animations, and advanced features.

## 🌟 Components

### 1. **ConversationWindow** (Basic)
The essential chat interface with core features.

**Features:**
- ✨ Premium glassmorphism design
- 💬 Message bubbles with avatars
- 📎 File attachment support
- 🎤 Voice input button
- ⌨️ Auto-resizing textarea
- 📋 Copy message content
- 🔄 Auto-scroll to latest message
- ⏱️ Typing indicators

**Perfect for:** Simple chat implementations, minimal UI needs

### 2. **EnhancedConversationWindow** (Advanced)
Full-featured chat with advanced capabilities.

**Additional Features:**
- 💻 Code syntax highlighting
- ✏️ Message editing
- 🗑️ Message deletion
- 🔍 Search messages
- 📥 Export conversation
- 🎨 Markdown rendering
- 📌 System messages
- 🔄 Edit history tracking

**Perfect for:** Professional applications, feature-rich chat needs

---

## 🚀 Quick Start

### Basic Usage

```tsx
import { ConversationWindow } from '@/components/conversation';

function MyApp() {
  const handleSendMessage = (message: string, files?: File[]) => {
    console.log('Message:', message);
    console.log('Files:', files);
    // Send to your AI API
  };

  return (
    <div className="h-screen">
      <ConversationWindow
        onSendMessage={handleSendMessage}
        isTyping={false}
      />
    </div>
  );
}
```

### Enhanced Usage

```tsx
import { EnhancedConversationWindow } from '@/components/conversation';

function MyApp() {
  const handleSendMessage = async (message: string): Promise<string> => {
    // Call your AI API
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
    const data = await response.json();
    return data.reply;
  };

  return (
    <div className="h-screen">
      <EnhancedConversationWindow
        onSendMessage={handleSendMessage}
        showSearch={true}
        showExport={true}
        allowEdit={true}
        allowDelete={true}
      />
    </div>
  );
}
```

---

## 📚 API Reference

### ConversationWindow Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSendMessage` | `(message: string, files?: File[]) => void` | `() => {}` | Callback when user sends a message |
| `initialMessages` | `Message[]` | `[]` | Initial messages to display |
| `isTyping` | `boolean` | `false` | Show typing indicator |
| `className` | `string` | `''` | Additional CSS classes |

### EnhancedConversationWindow Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSendMessage` | `(message: string) => Promise<string>` | required | Async function that returns AI response |
| `showSearch` | `boolean` | `true` | Enable search functionality |
| `showExport` | `boolean` | `true` | Enable conversation export |
| `allowEdit` | `boolean` | `true` | Allow message editing |
| `allowDelete` | `boolean` | `true` | Allow message deletion |
| `theme` | `'dark' \| 'light'` | `'dark'` | UI theme |
| `className` | `string` | `''` | Additional CSS classes |

### Message Type

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isCode?: boolean;
  language?: string;
  attachments?: Attachment[];
  isEdited?: boolean;
}
```

### Attachment Type

```typescript
interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}
```

---

## 🎨 Design Features

### Glassmorphism
- Frosted glass effect with backdrop blur
- Subtle gradient overlays
- Professional depth and layering

### Color Coding
- **Blue Gradient**: User messages
- **Purple Gradient**: AI assistant messages
- **Emerald Gradient**: System messages
- **Slate Backgrounds**: Neutral containers

### Animations
- Smooth fade-in for new messages
- Typing indicator with bouncing dots
- Hover effects on all interactive elements
- Scale animations on buttons

### Typography
- Clear message hierarchy
- Monospace for code blocks
- Responsive text sizing
- Proper line heights

---

## 💡 Usage Examples

### Example 1: Connect to Gemini AI

```tsx
import { EnhancedConversationWindow } from '@/components/conversation';

const GeminiChat = () => {
  const handleSendMessage = async (message: string): Promise<string> => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }]
        })
      }
    );
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  };

  return <EnhancedConversationWindow onSendMessage={handleSendMessage} />;
};
```

### Example 2: With File Upload Handler

```tsx
import { ConversationWindow } from '@/components/conversation';

const FileUploadChat = () => {
  const handleSendMessage = async (message: string, files?: File[]) => {
    const formData = new FormData();
    formData.append('message', message);
    
    if (files) {
      files.forEach(file => formData.append('files', file));
    }

    await fetch('/api/chat', {
      method: 'POST',
      body: formData
    });
  };

  return <ConversationWindow onSendMessage={handleSendMessage} />;
};
```

### Example 3: With Typing Indicator

```tsx
import { ConversationWindow } from '@/components/conversation';
import { useState } from 'react';

const TypingIndicatorChat = () => {
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async (message: string) => {
    setIsTyping(true);
    
    // Simulate AI response delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsTyping(false);
  };

  return (
    <ConversationWindow
      onSendMessage={handleSendMessage}
      isTyping={isTyping}
    />
  );
};
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift + Enter` | New line |
| `Ctrl/Cmd + K` | Focus search (Enhanced) |

---

## 🎯 Customization

### Custom Colors

Modify the gradient colors in the component files:

```tsx
// User messages
className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20"

// AI messages  
className="bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20"

// Change to your brand colors
className="bg-gradient-to-br from-brand-600/20 to-brand-800/20"
```

### Custom Avatars

Replace the default SVG icons with your own:

```tsx
// In ConversationWindow.tsx
const UserIcon = () => (
  <img src="/path/to/user-avatar.png" alt="User" />
);
```

### Custom Styling

Add your own CSS classes:

```tsx
<ConversationWindow
  className="shadow-2xl rounded-3xl"
/>
```

---

## 🔧 Integration with AI Services

### Gemini AI
```typescript
const geminiHandler = async (message: string) => {
  const response = await fetch(geminiApiUrl, {
    method: 'POST',
    body: JSON.stringify({ contents: [{ parts: [{ text: message }] }] })
  });
  return response.candidates[0].content.parts[0].text;
};
```

### OpenAI (ChatGPT)
```typescript
const openaiHandler = async (message: string) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: message }]
    })
  });
  return response.choices[0].message.content;
};
```

### Claude (Anthropic)
```typescript
const claudeHandler = async (message: string) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': API_KEY },
    body: JSON.stringify({
      model: 'claude-3-opus-20240229',
      messages: [{ role: 'user', content: message }]
    })
  });
  return response.content[0].text;
};
```

---

## 🚀 Performance Tips

1. **Lazy Loading**: Load conversation component only when needed
2. **Message Pagination**: Implement virtual scrolling for long conversations
3. **Debounce Search**: Add debounce to search input (300ms recommended)
4. **Memoization**: Use `useMemo` for filtered messages
5. **Optimize Images**: Compress avatar images for faster loading

---

## 🎨 Advanced Features

### Code Highlighting

The Enhanced version automatically detects code blocks:

````markdown
```javascript
const greeting = "Hello World";
console.log(greeting);
```
````

Will render with syntax highlighting and a copy button.

### Message Export

Export conversations as plain text:

```typescript
// Built-in export functionality
// Click the download button in the header
// Or programmatically:
const exportConversation = () => {
  const text = messages.map(m => 
    `[${m.role}] ${m.content}`
  ).join('\n\n');
  
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  // Trigger download...
};
```

### Search Functionality

Filter messages in real-time:

```typescript
const filteredMessages = messages.filter(m =>
  m.content.toLowerCase().includes(searchQuery.toLowerCase())
);
```

---

## 📱 Responsive Design

The components are designed to work on all screen sizes:

- **Desktop**: Full-featured experience
- **Tablet**: Optimized layout
- **Mobile**: Touch-friendly interactions

For mobile optimization, consider:
```tsx
<div className="h-screen md:h-[600px] max-w-full md:max-w-4xl">
  <ConversationWindow />
</div>
```

---

## 🐛 Troubleshooting

### Messages not scrolling
**Solution**: Ensure parent container has `h-full` or fixed height

### Textarea not resizing
**Solution**: Check that `resize-none` class is present

### Icons not showing
**Solution**: Verify Tailwind CSS is properly configured

### Animations stuttering
**Solution**: Add `will-change-transform` to animated elements

---

## 📊 File Structure

```
src/components/conversation/
├── ConversationWindow.tsx          # Basic version
├── EnhancedConversationWindow.tsx  # Advanced version
├── ConversationDemo.tsx            # Demo/example file
├── index.ts                        # Exports
└── README.md                       # This file
```

---

## ✅ Checklist for Integration

- [ ] Import conversation component
- [ ] Set up message handler function
- [ ] Connect to AI API
- [ ] Test message sending
- [ ] Test file attachments (if using)
- [ ] Configure typing indicator
- [ ] Customize colors (optional)
- [ ] Add error handling
- [ ] Test on mobile devices
- [ ] Review performance

---

## 🎉 You're Ready!

Your premium AI conversation interface is ready to use. The components are:

- ✅ Production-ready
- ✅ Fully typed with TypeScript
- ✅ Responsive and accessible
- ✅ Highly customizable
- ✅ Performance optimized

Enjoy building amazing conversational experiences! 🚀

---

**Need help?** Check the demo file (`ConversationDemo.tsx`) for working examples!
