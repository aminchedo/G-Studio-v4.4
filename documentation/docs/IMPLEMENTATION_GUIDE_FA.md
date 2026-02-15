# 🚀 راهنمای پیاده‌سازی تعمیرات رابط کاربری

## 📋 خلاصه مشکلات و راه‌حل‌ها

### ❌ مشکلات فعلی
1. **دکمه‌های غیرفعال**: خیلی از دکمه‌ها handler ندارند
2. **State Management پیچیده**: استفاده همزمان از چند سیستم state
3. **Type Safety ضعیف**: Props های optional زیاد

### ✅ راه‌حل‌های پیاده‌سازی شده
1. ✅ Hook جدید `useEditorHandlers` ساخته شد
2. ✅ تمام handler های لازم پیاده‌سازی شدند
3. ✅ پشتیبانی کامل از فارسی
4. ✅ Undo/Redo با history management
5. ✅ Auto-save به localStorage

---

## 🔧 مراحل پیاده‌سازی

### مرحله 1: به‌روزرسانی App.tsx

در فایل `App.tsx`، این تغییرات رو اعمال کن:

```typescript
// 1. Import کردن hook جدید
import { useEditorHandlers } from './hooks/useEditorHandlers';

// 2. در داخل کامپوننت App، بعد از تعریف state ها:
const editorHandlers = useEditorHandlers({
  files,
  setFiles,
  activeFile,
  setActiveFile,
  openFiles,
  setOpenFiles,
  setPreviewVisible,
  setPromptDialog,
  setConfirmDialog
});

// 3. پاس دادن handler ها به Ribbon:
<Ribbon
  // ... props های موجود
  onGoToLine={editorHandlers.handleGoToLine}
  onToggleWordWrap={editorHandlers.handleToggleWordWrap}
  onRunCode={editorHandlers.handleRunCode}
  onSearchFiles={editorHandlers.handleSearchFiles}
  onDuplicateFile={editorHandlers.handleDuplicateFile}
  onCopyFilePath={editorHandlers.handleCopyFilePath}
  onFind={editorHandlers.handleFind}
  onUndo={editorHandlers.handleUndo}
  onRedo={editorHandlers.handleRedo}
  onClearEditor={editorHandlers.handleClearEditor}
  onRefresh={editorHandlers.handleRefresh}
/>

// 4. پاس دادن wordWrapEnabled به CodeEditor:
<CodeEditor
  // ... props های موجود
  wordWrap={editorHandlers.wordWrapEnabled}
/>
```

### مرحله 2: به‌روزرسانی Ribbon.tsx

در فایل `components/Ribbon.tsx`:

```typescript
// 1. به‌روزرسانی interface:
interface RibbonProps {
  // ... props های موجود
  
  // Handler های جدید (همه required)
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

// 2. حذف "?" از تمام handler ها (تبدیل optional به required)
```

### مرحله 3: به‌روزرسانی CodeEditor.tsx

در فایل `components/CodeEditor.tsx`:

```typescript
// 1. اضافه کردن prop جدید:
interface CodeEditorProps {
  // ... props های موجود
  wordWrap?: boolean;
}

// 2. استفاده از wordWrap در Monaco:
<MonacoEditor
  // ... options های موجود
  options={{
    // ... options های موجود
    wordWrap: wordWrap ? 'on' : 'off',
  }}
/>

// 3. Listen کردن به custom events:
useEffect(() => {
  const handleGoToLine = (e: CustomEvent) => {
    const { line } = e.detail;
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(line);
      editorRef.current.setPosition({ lineNumber: line, column: 1 });
    }
  };

  const handleWordWrap = (e: CustomEvent) => {
    const { enabled } = e.detail;
    if (editorRef.current) {
      editorRef.current.updateOptions({ wordWrap: enabled ? 'on' : 'off' });
    }
  };

  const handleFind = (e: CustomEvent) => {
    const { query } = e.detail;
    if (editorRef.current) {
      editorRef.current.trigger('', 'actions.find', { searchString: query });
    }
  };

  window.addEventListener('gstudio:gotoLine', handleGoToLine as EventListener);
  window.addEventListener('gstudio:wordWrap', handleWordWrap as EventListener);
  window.addEventListener('gstudio:find', handleFind as EventListener);

  return () => {
    window.removeEventListener('gstudio:gotoLine', handleGoToLine as EventListener);
    window.removeEventListener('gstudio:wordWrap', handleWordWrap as EventListener);
    window.removeEventListener('gstudio:find', handleFind as EventListener);
  };
}, []);
```

### مرحله 4: به‌روزرسانی PreviewPanel.tsx

در فایل `components/PreviewPanel.tsx`:

```typescript
// Listen کردن به runCode event:
useEffect(() => {
  const handleRunCode = (e: CustomEvent) => {
    const { file, content } = e.detail;
    // Update preview with new content
    setPreviewContent(content);
  };

  window.addEventListener('gstudio:runCode', handleRunCode as EventListener);

  return () => {
    window.removeEventListener('gstudio:runCode', handleRunCode as EventListener);
  };
}, []);
```

---

## 🎯 قابلیت‌های جدید

### 1. Go to Line (Ctrl+G)
- کاربر می‌تونه شماره خط رو وارد کنه
- Validation برای ورودی
- Jump به خط مورد نظر در Monaco

### 2. Word Wrap Toggle
- فعال/غیرفعال کردن word wrap
- ذخیره preference در localStorage
- اعمال فوری در Monaco

### 3. Run Code (Ctrl+R)
- اجرای فایل‌های JS, TS, HTML
- نمایش خروجی در Preview Panel
- پشتیبانی از انواع مختلف فایل

### 4. Search Files (Ctrl+Shift+F)
- جستجو در نام فایل‌ها
- جستجو در محتوای فایل‌ها
- باز کردن خودکار اولین نتیجه

### 5. Find in File (Ctrl+F)
- جستجو در فایل فعلی
- نمایش تعداد نتایج
- Highlight کردن در Monaco

### 6. Duplicate File (Ctrl+D)
- کپی کردن فایل فعلی
- نام‌گذاری خودکار (file_copy.ext)
- باز کردن خودکار فایل جدید

### 7. Copy File Path
- کپی کردن مسیر فایل به clipboard
- Feedback به کاربر

### 8. Undo/Redo (Ctrl+Z / Ctrl+Shift+Z)
- History management با 50 state
- Undo/Redo برای تمام تغییرات
- Visual feedback

### 9. Clear Editor
- بستن تمام فایل‌ها
- Confirmation dialog
- پاک کردن state

### 10. Refresh
- بازیابی فایل‌ها از localStorage
- Sync با storage

### 11. Auto-save
- ذخیره خودکار فایل‌ها
- Debounced save (500ms)
- Backup در localStorage

---

## ⌨️ Keyboard Shortcuts

| Shortcut | عملیات |
|----------|--------|
| `Ctrl+G` | Go to Line |
| `Ctrl+F` | Find in File |
| `Ctrl+R` | Run Code |
| `Ctrl+D` | Duplicate File |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+Shift+F` | Search Files |
| `Ctrl+S` | Save (موجود) |
| `Ctrl+N` | New File (موجود) |

---

## 🧪 تست کردن

### تست Handler ها

```typescript
// 1. Go to Line
- فایلی باز کن
- دکمه "Go to Line" رو بزن
- عدد 10 رو وارد کن
- باید به خط 10 بره

// 2. Word Wrap
- فایلی با خط بلند باز کن
- دکمه "Word Wrap" رو بزن
- باید wrap بشه

// 3. Run Code
- یک فایل HTML باز کن
- دکمه "Run" رو بزن
- باید در Preview نمایش داده بشه

// 4. Search Files
- چند فایل ایجاد کن
- دکمه "Search" رو بزن
- نام یکی از فایل‌ها رو جستجو کن
- باید فایل باز بشه

// 5. Duplicate File
- یک فایل باز کن
- دکمه "Duplicate" رو بزن
- باید فایل جدید با نام _copy ساخته بشه

// 6. Undo/Redo
- یک فایل ایجاد کن
- محتوایی بنویس
- Ctrl+Z بزن
- باید undo بشه
- Ctrl+Shift+Z بزن
- باید redo بشه
```

---

## 🐛 رفع مشکلات احتمالی

### مشکل 1: Handler ها کار نمی‌کنند
**راه‌حل:**
```typescript
// بررسی کن که handler ها به درستی پاس داده شدن:
console.log('Handlers:', {
  onGoToLine: typeof onGoToLine,
  onRunCode: typeof onRunCode,
  // ...
});
```

### مشکل 2: Monaco به event ها گوش نمی‌ده
**راه‌حل:**
```typescript
// بررسی کن که event listener ها اضافه شدن:
window.addEventListener('gstudio:gotoLine', (e) => {
  console.log('Event received:', e);
});
```

### مشکل 3: History کار نمی‌کنه
**راه‌حل:**
```typescript
// بررسی کن که files تغییر می‌کنه:
useEffect(() => {
  console.log('Files changed:', Object.keys(files).length);
}, [files]);
```

### مشکل 4: localStorage پر شده
**راه‌حل:**
```typescript
// پاک کردن localStorage:
localStorage.removeItem('gstudio_files');
localStorage.removeItem('gstudio_word_wrap');
```

---

## 📊 چک‌لیست نهایی

### قبل از Commit
- [ ] تمام handler ها تست شدن
- [ ] Keyboard shortcuts کار می‌کنن
- [ ] Error handling درست کار می‌کنه
- [ ] Notification ها نمایش داده میشن
- [ ] localStorage ذخیره می‌کنه
- [ ] Undo/Redo کار می‌کنه
- [ ] TypeScript error نداره
- [ ] Console error نداره

### بعد از Commit
- [ ] Build موفق بوده
- [ ] Production test شده
- [ ] Performance مشکلی نداره
- [ ] Memory leak نداره

---

## 🎨 بهبودهای آینده

### فاز بعدی (اختیاری)
1. **Multi-cursor support** در Monaco
2. **Code folding** پیشرفته
3. **Minimap** با highlight
4. **Split editor** برای مقایسه
5. **Git integration** برای version control
6. **Collaborative editing** با WebSocket
7. **AI-powered suggestions** در editor
8. **Custom themes** برای editor

---

## 📞 پشتیبانی

اگر مشکلی پیش اومد:

1. **مستندات رو بخون**: `UI_FIX_PLAN.md`
2. **Console رو چک کن**: برای error ها
3. **Handler ها رو log کن**: برای debug
4. **Event ها رو بررسی کن**: با DevTools

---

## ✅ نتیجه

بعد از پیاده‌سازی این تغییرات:

- ✅ **تمام دکمه‌ها فعال** و کاربردی هستند
- ✅ **User Experience** بهتر شده
- ✅ **Type Safety** کامل
- ✅ **Error Handling** مناسب
- ✅ **Keyboard Shortcuts** فعال
- ✅ **Auto-save** و **History**
- ✅ **پشتیبانی کامل فارسی**

---

**موفق باشید! 🚀**

اگر سوالی داشتید، به فایل `UI_FIX_PLAN.md` مراجعه کنید.
