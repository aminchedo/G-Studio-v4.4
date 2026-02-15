# G-Studio Error Fix Workflow — وضعیت فعلی

**آخرین به‌روزرسانی**: 2026-02-11  
**زمینه**: ورک فلو رفع خطاهای TypeScript پروژه

---

## جای فعلی کار (Current Position)

### Phase 3.2 ✅ COMPLETE

- **شروع**: 1,396 خطا
- **بعد از 3.1**: 1,266 خطا
- **بعد از 3.2**: 516 خطا (کاهش ۶۳٪)
- **کلید موفقیت**: رفع duplicate exports در `types/index.ts` → 791 خطا حذف شد

### Phase 3.3 ⏳ IN PROGRESS

- **هدف**: 516 → ~350 خطا
- **الگوهای هدف**: TS2322 (prop mismatch), TS2339 (property doesn't exist)

### وضعیت فعلی (بر اساس tsc --noEmit)

- **تعداد خطاها**: ~300–400 (با احتساب duplicate path)
- **فایل‌های پرخطا**:
  1. `App.tsx` / `src/components/app/App.tsx` — مدال‌ها و propهای نامعتبر
  2. `mcpService.tsx` — implicit any
  3. `geminiService.ts` — type narrowing
  4. `projectStore.ts` — خطای `./additional` (module not found)

---

## مراحل بعدی (Next Steps)

### فوری (Quick Wins)

1. **projectStore**: تغییر `import { Project, ProjectFile } from './additional'` به `@/types/additional`

### Phase 3.3

2. **App.tsx**: اضافه کردن propهای missing به interfaces مدال‌ها:
   - RibbonProps: `onOpenAgentModal`
   - AgentModalProps: `onTabChange`
   - CodeIntelligenceDashboardProps: `files`
   - GeminiTesterProps: `apiKey`
   - McpToolModalProps: `onExecute`
   - و بقیه مدال‌ها: `isOpen`, `onClose`, `chains`, `tools`, `metrics`, `usage`, `agents`

3. **Layout components**: رفع `children`, `orientation`, `onSelect` برای SplitPane و ThemeToggle

### Phase 3.4

4. **TS7006**: اضافه کردن type به callback parameters در mcpService و سایر سرویس‌ها
5. **types/prettier.d.ts**: رفع خطای "is not a module"

---

## منابع (References)

- `docs/REFACTORING_STAGE_3_IMPLEMENTATION_PLAN.md` — طرح کلی
- `docs/CHECKPOINT_3.2_HIGH_IMPACT_FIXES_COMPLETE.md` — گزارش Phase 3.2
- `tools/go.py` — اورکستراتور اصلی
- `tools/apply_activation.py` — اعمال barrel exports

---

## یادآوری برای sessionهای بعدی

**جستجو در memory**: `g-studio_error_fix_workflow` یا `ورک فلو رفع خطا`
