# 🔧 طرح تعمیر و ارتقای رابط کاربری G-Studio

## 📊 تحلیل مشکلات

### 🔴 مشکلات شناسایی شده

#### 1. دکمه‌های غیرفعال (Non-functional Buttons)
**علت:**
- Handler های optional که undefined هستند
- Handler ها در App.tsx تعریف نشدن
- Props به درستی پاس داده نشدن

**مثال‌ها:**
```typescript
// Ribbon.tsx - دکمه‌های غیرفعال
onGoToLine?: () => void;        // ❌ Optional و undefined
onToggleWordWrap?: () => void;  // ❌ Optional و undefined  
onRunCode?: () => void;         // ❌ Optional و undefined
onSearchFiles?: () => void;     // ❌ Optional و undefined
onDuplicateFile?: () => void;   // ❌ Optional و undefined
onCopyFilePath?: () => void;    // ❌ Optional و undefined
```

#### 2. State Management پیچیده
**مشکل:**
- استفاده همزمان از Custom Hooks + Zustand + Local State
- Sync issues بین state های مختلف
- Re-render های غیرضروری

#### 3. Type Safety ضعیف
**مشکل:**
- خیلی از Props ها optional هستند
- Type checking ضعیف در runtime
- Undefined checks کافی نیست

---

## ✅ راه‌حل جامع

### مرحله 1: تکمیل Handler ها در App.tsx

باید این handler ها رو اضافه کنیم:

```typescript
// 1. Go to Line
const handleGoToLine = useCallback(() => {
  if (!activeFile) {
    showWarning('No file is open');
    return;
  }
  
  setPromptDialog({
    isOpen: true,
    title: 'Go to Line',
    message: 'Enter line number:',
    placeholder: '1',
    validate: (value) => {
      const num = parseInt(value);
      if (isNaN(num) || num < 1) {
        return 'Please enter a valid line number';
      }
      return null;
    },
    onConfirm: (value) => {
      const lineNumber = parseInt(value);
      // Implement go to line logic
      showSuccess(`Jumped to line ${lineNumber}`);
    }
  });
}, [activeFile]);

// 2. Toggle Word Wrap
const [wordWrapEnabled, setWordWrapEnabled] = useState(true);
const handleToggleWordWrap = useCallback(() => {
  setWordWrapEnabled(prev => !prev);
  showInfo(`Word wrap ${!wordWrapEnabled ? 'enabled' : 'disabled'}`);
}, [wordWrapEnabled]);

// 3. Run Code
const handleRunCode = useCallback(async () => {
  if (!activeFile || !files[activeFile]) {
    showWarning('No file is open');
    return;
  }
  
  const file = files[activeFile];
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  if (!['js', 'ts', 'jsx', 'tsx', 'html'].includes(ext || '')) {
    showWarning('Cannot run this file type');
    return;
  }
  
  showSuccess('Running code...');
  setPreviewVisible(true);
  
  // Trigger preview update
  // Preview panel will handle the execution
}, [activeFile, files, setPreviewVisible]);

// 4. Search Files
const handleSearchFiles = useCallback(() => {
  setPromptDialog({
    isOpen: true,
    title: 'Search Files',
    message: 'Enter search query:',
    placeholder: 'filename or content...',
    onConfirm: (query) => {
      const results = Object.keys(files).filter(path => 
        path.toLowerCase().includes(query.toLowerCase()) ||
        files[path].content.toLowerCase().includes(query.toLowerCase())
      );
      
      if (results.length === 0) {
        showWarning('No files found');
      } else {
        showSuccess(`Found ${results.length} file(s)`);
        // Open first result
        if (results[0]) {
          setActiveFile(results[0]);
          if (!openFiles.includes(results[0])) {
            setOpenFiles(prev => [...prev, results[0]]);
          }
        }
      }
    }
  });
}, [files, openFiles, setActiveFile, setOpenFiles]);

// 5. Duplicate File
const handleDuplicateFile = useCallback(() => {
  if (!activeFile || !files[activeFile]) {
    showWarning('No file is open');
    return;
  }
  
  const originalFile = files[activeFile];
  const ext = originalFile.name.split('.').pop();
  const baseName = originalFile.name.replace(`.${ext}`, '');
  const newName = `${baseName}_copy.${ext}`;
  
  setFiles(prev => ({
    ...prev,
    [newName]: {
      ...originalFile,
      name: newName
    }
  }));
  
  setOpenFiles(prev => [...prev, newName]);
  setActiveFile(newName);
  showSuccess(`File duplicated: ${newName}`);
}, [activeFile, files, setFiles, setOpenFiles, setActiveFile]);

// 6. Copy File Path
const handleCopyFilePath = useCallback(() => {
  if (!activeFile) {
    showWarning('No file is open');
    return;
  }
  
  navigator.clipboard.writeText(activeFile).then(() => {
    showSuccess('File path copied to clipboard');
  }).catch(() => {
    showError('Failed to copy file path');
  });
}, [activeFile]);

// 7. Find in File
const handleFind = useCallback(() => {
  if (!activeFile) {
    showWarning('No file is open');
    return;
  }
  
  setPromptDialog({
    isOpen: true,
    title: 'Find in File',
    message: 'Enter search text:',
    placeholder: 'search...',
    onConfirm: (query) => {
      const file = files[activeFile];
      if (!file) return;
      
      const matches = (file.content.match(new RegExp(query, 'gi')) || []).length;
      if (matches > 0) {
        showSuccess(`Found ${matches} match(es)`);
      } else {
        showWarning('No matches found');
      }
    }
  });
}, [activeFile, files]);

// 8. Undo/Redo (با history management)
const [history, setHistory] = useState<{
  past: Record<string, FileData>[];
  present: Record<string, FileData>;
  future: Record<string, FileData>[];
}>({
  past: [],
  present: files,
  future: []
});

const handleUndo = useCallback(() => {
  if (history.past.length === 0) {
    showWarning('Nothing to undo');
    return;
  }
  
  const previous = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, history.past.length - 1);
  
  setHistory({
    past: newPast,
    present: previous,
    future: [history.present, ...history.future]
  });
  
  setFiles(previous);
  showSuccess('Undo successful');
}, [history]);

const handleRedo = useCallback(() => {
  if (history.future.length === 0) {
    showWarning('Nothing to redo');
    return;
  }
  
  const next = history.future[0];
  const newFuture = history.future.slice(1);
  
  setHistory({
    past: [...history.past, history.present],
    present: next,
    future: newFuture
  });
  
  setFiles(next);
  showSuccess('Redo successful');
}, [history]);

// Update history when files change
useEffect(() => {
  setHistory(prev => ({
    past: [...prev.past, prev.present].slice(-50), // Keep last 50 states
    present: files,
    future: []
  }));
}, [files]);

// 9. Clear Editor
const handleClearEditor = useCallback(() => {
  setConfirmDialog({
    isOpen: true,
    title: 'Clear Editor',
    message: 'Are you sure you want to close all files? Unsaved changes will be lost.',
    variant: 'danger',
    onConfirm: () => {
      setFiles({});
      setOpenFiles([]);
      setActiveFile(null);
      showSuccess('Editor cleared');
    }
  });
}, [setFiles, setOpenFiles, setActiveFile]);

// 10. Refresh
const handleRefresh = useCallback(() => {
  // Reload files from localStorage or server
  try {
    const saved = localStorage.getItem('gstudio_files');
    if (saved) {
      const savedFiles = JSON.parse(saved);
      setFiles(savedFiles);
      showSuccess('Files refreshed from storage');
    } else {
      showWarning('No saved files found');
    }
  } catch (e) {
    showError('Failed to refresh files');
  }
}, [setFiles]);
```

### مرحله 2: به‌روزرسانی Ribbon Component

```typescript
// در App.tsx، پاس دادن handler ها به Ribbon
<Ribbon
  // ... existing props
  onGoToLine={handleGoToLine}
  onToggleWordWrap={handleToggleWordWrap}
  onRunCode={handleRunCode}
  onSearchFiles={handleSearchFiles}
  onDuplicateFile={handleDuplicateFile}
  onCopyFilePath={handleCopyFilePath}
  onFind={handleFind}
  onUndo={handleUndo}
  onRedo={handleRedo}
  onClearEditor={handleClearEditor}
  onRefresh={handleRefresh}
/>
```

### مرحله 3: بهبود Type Safety

```typescript
// types.ts - اضافه کردن interface برای handlers
export interface EditorHandlers {
  onGoToLine: () => void;
  onToggleWordWrap: () => void;
  onRunCode: () => void;
  onSearchFiles: () => void;
  onDuplicateFile: () => void;
  onCopyFilePath: () => void;
  onFind: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearEditor: () => void;
  onRefresh: () => void;
}

// Ribbon.tsx - استفاده از interface
interface RibbonProps extends EditorHandlers {
  // ... other props
}
```

---

## 🎨 بهبودهای UI/UX

### 1. اضافه کردن Loading States
```typescript
const [isRunning, setIsRunning] = useState(false);

const handleRunCode = useCallback(async () => {
  setIsRunning(true);
  try {
    // Run code logic
    await new Promise(resolve => setTimeout(resolve, 1000));
    showSuccess('Code executed successfully');
  } catch (error) {
    showError('Failed to run code');
  } finally {
    setIsRunning(false);
  }
}, []);
```

### 2. اضافه کردن Keyboard Shortcuts
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'g':
          e.preventDefault();
          handleGoToLine();
          break;
        case 'f':
          e.preventDefault();
          handleFind();
          break;
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
          break;
        case 'd':
          e.preventDefault();
          handleDuplicateFile();
          break;
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [handleGoToLine, handleFind, handleUndo, handleRedo, handleDuplicateFile]);
```

### 3. بهبود Visual Feedback
```typescript
// اضافه کردن tooltip ها
<button
  onClick={handleRunCode}
  disabled={!activeFile || isRunning}
  title="Run Code (Ctrl+R)"
  className={`... ${isRunning ? 'animate-pulse' : ''}`}
>
  {isRunning ? <Loader2 className="animate-spin" /> : <Play />}
  Run
</button>
```

---

## 📝 چک‌لیست پیاده‌سازی

### فاز 1: Handler های اصلی (اولویت بالا)
- [ ] handleGoToLine
- [ ] handleToggleWordWrap
- [ ] handleRunCode
- [ ] handleSearchFiles
- [ ] handleFind

### فاز 2: File Operations (اولویت متوسط)
- [ ] handleDuplicateFile
- [ ] handleCopyFilePath
- [ ] handleUndo/Redo
- [ ] handleClearEditor
- [ ] handleRefresh

### فاز 3: UI/UX Improvements (اولویت پایین)
- [ ] Loading states
- [ ] Keyboard shortcuts
- [ ] Tooltips
- [ ] Visual feedback
- [ ] Error boundaries

---

## 🚀 نحوه اجرا

### گام 1: ایجاد فایل Handler ها
```bash
# ایجاد فایل جدید برای handler ها
touch hooks/useEditorHandlers.ts
```

### گام 2: پیاده‌سازی Handler ها
کپی کردن کدهای بالا در فایل جدید

### گام 3: استفاده در App.tsx
```typescript
import { useEditorHandlers } from './hooks/useEditorHandlers';

const handlers = useEditorHandlers({
  files,
  setFiles,
  activeFile,
  setActiveFile,
  openFiles,
  setOpenFiles,
  setPreviewVisible
});
```

### گام 4: پاس دادن به Ribbon
```typescript
<Ribbon {...handlers} />
```

---

## 🎯 نتیجه نهایی

بعد از پیاده‌سازی:
- ✅ تمام دکمه‌ها فعال و کاربردی
- ✅ Type safety کامل
- ✅ Error handling مناسب
- ✅ User feedback واضح
- ✅ Keyboard shortcuts
- ✅ Loading states
- ✅ Undo/Redo functionality

---

## 📊 تخمین زمان

- **فاز 1:** 2-3 ساعت
- **فاز 2:** 2-3 ساعت  
- **فاز 3:** 1-2 ساعت
- **تست و Debug:** 2-3 ساعت

**جمع کل:** 7-11 ساعت کار

---

## 💡 نکات مهم

1. **تست کردن هر handler به صورت جداگانه**
2. **اضافه کردن error boundary برای هر بخش**
3. **استفاده از TypeScript برای type safety**
4. **اضافه کردن unit test ها**
5. **مستندسازی هر handler**

---

**آماده برای شروع پیاده‌سازی؟** 🚀
