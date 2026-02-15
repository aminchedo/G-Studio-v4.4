# Installation Instructions - G Studio v2.3.0

**Issue:** Getting 404 error for `@types/monaco-editor` during `npm install`  
**Solution:** This package doesn't exist - Monaco Editor includes its own types

---

## ✅ Your package.json is CORRECT

No changes needed! The package.json does NOT reference `@types/monaco-editor`.

Monaco Editor v0.55.1 includes built-in TypeScript definitions.

---

## 🧹 Clean Installation Steps

### Step 1: Clean Everything
```bash
# Windows (Command Prompt)
rmdir /s /q node_modules
del package-lock.json

# Windows (PowerShell)
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# Mac/Linux
rm -rf node_modules package-lock.json
```

### Step 2: Clear NPM Cache
```bash
npm cache clean --force
```

### Step 3: Fresh Install
```bash
npm install
```

---

## 🔍 If You Still Get 404 Error

### Check 1: Verify No Old References
Search your project for any files that might reference `@types/monaco-editor`:

```bash
# Windows PowerShell
Get-ChildItem -Recurse -Include *.json,*.sh,*.md | Select-String "@types/monaco-editor"

# Mac/Linux
grep -r "@types/monaco-editor" . --include="*.json" --include="*.sh" --include="*.md"
```

**Expected result:** Only documentation files (which are safe to ignore)

### Check 2: Check NPM Registry
```bash
npm view @types/monaco-editor
```

**Expected result:** `npm ERR! 404 '@types/monaco-editor@*' is not in this registry.`

This is CORRECT - the package doesn't exist and shouldn't exist.

### Check 3: Verify Monaco Editor is Installed
```bash
npm list monaco-editor
npm list @monaco-editor/react
```

**Expected result:**
```
monaco-editor@0.55.1
@monaco-editor/react@4.7.0
```

---

## 🎯 Why This Happens

### Common Causes of 404 Error

1. **Old package-lock.json**
   - Contains cached reference to non-existent package
   - **Solution:** Delete it and reinstall

2. **Corrupted npm cache**
   - NPM cache has old/invalid data
   - **Solution:** `npm cache clean --force`

3. **Old documentation files**
   - Scripts or docs that try to install the package
   - **Solution:** Ignore or delete them (already done)

4. **Network/Registry Issues**
   - NPM registry temporarily unavailable
   - **Solution:** Wait and retry, or use different registry

---

## 🔧 Alternative Solutions

### Solution 1: Use Yarn Instead
```bash
# Install Yarn
npm install -g yarn

# Install dependencies with Yarn
yarn install
```

### Solution 2: Use Different NPM Registry
```bash
# Use official NPM registry
npm config set registry https://registry.npmjs.org/

# Then install
npm install
```

### Solution 3: Skip Optional Dependencies
```bash
npm install --no-optional
```

### Solution 4: Install Dependencies One by One
```bash
# Install core dependencies first
npm install react react-dom
npm install @monaco-editor/react monaco-editor
npm install zustand lucide-react

# Then install the rest
npm install
```

---

## ✅ Verification Steps

After successful installation:

### 1. Check Monaco Editor
```bash
npm list monaco-editor
```
Should show: `monaco-editor@0.55.1`

### 2. Check Types Are Available
Create a test file `test-monaco.ts`:
```typescript
import * as monaco from 'monaco-editor';
import Editor from '@monaco-editor/react';

// If no TypeScript errors, types are working!
const editor: monaco.editor.IStandaloneCodeEditor;
```

### 3. Run Type Check
```bash
npm run type-check
```
Should complete with no Monaco-related errors.

### 4. Start Development
```bash
npm run dev
```
Should start without errors.

---

## 📋 Complete Clean Install Script

### Windows (PowerShell)
```powershell
# Save as: clean-install.ps1
Write-Output "Cleaning project..."
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue

Write-Output "Clearing npm cache..."
npm cache clean --force

Write-Output "Installing dependencies..."
npm install

Write-Output "Done! Run: npm run dev"
```

### Mac/Linux (Bash)
```bash
#!/bin/bash
# Save as: clean-install.sh

echo "Cleaning project..."
rm -rf node_modules package-lock.json

echo "Clearing npm cache..."
npm cache clean --force

echo "Installing dependencies..."
npm install

echo "Done! Run: npm run dev"
```

---

## 🆘 Still Having Issues?

### Check NPM Version
```bash
npm --version
```
**Recommended:** v9.5.0 or higher

### Update NPM
```bash
npm install -g npm@latest
```

### Check Node Version
```bash
node --version
```
**Recommended:** v18.0.0 or higher

### Check Internet Connection
```bash
ping registry.npmjs.org
```

### Try Verbose Install
```bash
npm install --verbose
```
This will show exactly where the error occurs.

---

## 📚 Understanding Monaco Editor Types

### How It Works
```
monaco-editor@0.55.1
└── esm/
    └── vs/
        └── editor/
            └── editor.api.d.ts  ← TypeScript definitions here!
```

### Usage Example
```typescript
// No @types package needed!
import * as monaco from 'monaco-editor';

// Full type support automatically:
const model: monaco.editor.ITextModel = monaco.editor.createModel(
  'const x = 1;',
  'typescript'
);
```

---

## ✅ Final Checklist

Before running `npm install`:

- [ ] Deleted `node_modules` folder
- [ ] Deleted `package-lock.json` file
- [ ] Cleared npm cache: `npm cache clean --force`
- [ ] Verified no `@types/monaco-editor` in `package.json`
- [ ] Checked internet connection
- [ ] Using npm v9.5.0 or higher

After running `npm install`:

- [ ] No 404 errors
- [ ] `monaco-editor@0.55.1` installed
- [ ] `@monaco-editor/react@4.7.0` installed
- [ ] `npm run type-check` passes
- [ ] `npm run dev` starts successfully

---

## 🎉 Success!

Once installed successfully, you'll have:
- ✅ Monaco Editor with built-in types
- ✅ Full TypeScript support
- ✅ No need for @types packages
- ✅ Ready to develop!

---

**Next Steps:**
1. Run the clean install steps above
2. Start development: `npm run dev`
3. Enjoy coding! 🚀

**If you still get errors, please share the exact error message.**
