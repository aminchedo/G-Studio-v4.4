# Golden Runtime UI Enforcement Specification

**Version**: 1.0  
**Date**: 2025-02-05  
**Status**: ✅ **AUTHORITATIVE**  
**Enforcement Level**: MANDATORY

---

## Purpose

This specification defines the **non-negotiable runtime enforcement rules** for UI control behavior in G Studio. It ensures that every UI interaction produces a real, measurable effect and prevents "fake UI" (buttons that appear clickable but do nothing).

---

## Core Principles

### 1. Observable Effect Requirement

**Rule**: Every UI interaction MUST produce an observable effect within 2 seconds.

**Valid Observable Effects**:
- ✅ Modal/Dialog appearance
- ✅ State change (files, messages, UI visibility)
- ✅ Network request initiation (visible in network monitor)
- ✅ Toast/Notification appearance
- ✅ Navigation/Route change
- ✅ Editor state change (Monaco editor)
- ✅ File system operation (create, delete, modify)

**Invalid Effects** (DO NOT COUNT):
- ❌ Console.log only (no UI change)
- ❌ Silent state change (no visual feedback)
- ❌ Error without user notification
- ❌ Promise resolution without UI update

### 2. Non-Removable Runtime Assertions

**Rule**: Runtime assertions MUST be enforced at all critical boundaries and CANNOT be disabled in production.

**Enforcement Points**:
1. **UI → Handler Boundary**: Every click must have a registered handler
2. **Handler → Service Boundary**: Handler must call a service or update state
3. **Service → Effect Boundary**: Service must produce observable effect
4. **Network → Response Boundary**: API calls must update UI or show error

**Implementation**: `services/runtimeUIVerification.ts`

**Production Safety**: Assertions cannot be bypassed or disabled via environment variables.

### 3. Mandatory Action Registry

**Rule**: All UI actions MUST be registered in `uiActionRegistry` before the component mounts.

**Registration Pattern**:
```typescript
// In App.tsx or component useEffect
uiActionRegistry.register('action-name', () => {
  // Handler implementation
});
```

**Enforcement**: Runtime verification checks registry on every interaction.

**Location**: `services/uiActionRegistry.ts`

### 4. Global Click Interception

**Rule**: All UI clicks MUST be intercepted and traced through the execution path.

**Implementation**:
- Global event listener on `document` (capture phase)
- RequestId generation for each interaction
- Execution path tracing
- Effect observation

**Location**: `services/runtimeUIVerification.ts` - `setupGlobalEventHooks()`

### 5. Observable Effect Enforcement

**Rule**: If no observable effect is detected within 2 seconds, the control MUST be marked as BROKEN.

**Detection Method**:
1. Capture pre-click state (DOM, network, console)
2. Execute click
3. Wait up to 2 seconds
4. Compare post-click state
5. Classify: WORKING / BROKEN / REQUIRES-CONFIG / NO-OP

**Classification Rules**:
- **WORKING**: Observable effect detected
- **BROKEN**: No effect, error, or handler missing
- **REQUIRES-CONFIG**: Needs user input (API key, file selection)
- **NO-OP**: Intentional no-op (disabled button, already active state)

### 6. Fail-Fast Rules for Fake UI

**Rule**: Silent failures are NOT allowed. If a button does nothing, it MUST fail fast with a user-visible error.

**Fail-Fast Triggers**:
- Click handler missing
- Handler throws error without catch
- Effect not detected within timeout
- Network request fails without user notification

**User Experience**:
- Show toast notification: "This action is not available. Please check settings."
- Log error with requestId for debugging
- Do NOT silently fail

### 7. DEV vs PROD Behavior

#### DEV Mode
- **Logging**: Detailed logs for all interactions
- **Effect Verification**: Warnings for slow effects
- **Self-Healing**: Attempts to fix broken bindings
- **Debug Info**: RequestId, execution path, state changes

#### PROD Mode
- **Logging**: Minimal (errors only)
- **Effect Verification**: Fail-fast on broken controls
- **Self-Healing**: Disabled (security)
- **User Messages**: Friendly, actionable error messages

**Detection**: `import.meta.env.DEV` or `NODE_ENV === 'development'`

### 8. Binary UI Truth Verdict System

**Formula**:
```
UI_STATUS = VALID if:
  - All tested controls are WORKING or REQUIRES-CONFIG
  - No BROKEN controls exist
  - NO-OP controls are intentional (disabled state)
  - No silent failures detected

UI_STATUS = INVALID if:
  - Any BROKEN control exists
  - Silent failures detected
  - Missing handlers for critical actions
  - Fake UI detected (clickable but no effect)
```

**Enforcement**: Runtime verification calculates UI_STATUS on every interaction batch.

**Reporting**: UI_STATUS logged and available via `runtimeUIVerification.getStatus()`

---

## Implementation Requirements

### 1. Runtime Verification Service

**File**: `services/runtimeUIVerification.ts`

**Required Methods**:
- `initialize()`: Setup global hooks and observers
- `discoverUIElements()`: Find all interactive elements
- `traceInteraction()`: Track execution path
- `verifyEffect()`: Check for observable effects
- `getStatus()`: Return UI_STATUS

**Status**: ✅ Already implemented

### 2. Action Registry

**File**: `services/uiActionRegistry.ts`

**Required Methods**:
- `register(action, handler)`: Register action handler
- `get(action)`: Get handler for action
- `has(action)`: Check if action registered
- `list()`: List all registered actions

**Status**: ✅ Already implemented

### 3. Effect Verification Hooks

**Location**: `services/runtimeUIVerification.ts`

**Required Capabilities**:
- Pre-click state capture
- Post-click state comparison
- Network request monitoring
- Modal detection
- Toast detection
- State change detection

**Status**: ✅ Already implemented

### 4. Self-Healing Engine

**Location**: `services/runtimeUIVerification.ts`

**Required Capabilities**:
- Detect broken bindings
- Infer action from element label/attributes
- Bind handlers from action registry
- Fix broken chains without reload

**Status**: ✅ Already implemented (DEV mode only)

---

## Testing Requirements

### Mandatory Tests

1. **Every Button Click**: Must produce observable effect
2. **Every Link Click**: Must navigate or open modal
3. **Every Form Submit**: Must show success/error feedback
4. **Every API Call**: Must update UI or show error
5. **Every State Change**: Must be visually reflected

### Test Execution

**Method**: Runtime browser automation (not static analysis)

**Tools**: Browser MCP tools for:
- Element discovery
- Click execution
- State observation
- Network monitoring

**Frequency**: 
- DEV: Continuous (on every interaction)
- PROD: On application startup + periodic checks

---

## Compliance Checklist

### For Developers

- [ ] All UI actions registered in `uiActionRegistry`
- [ ] Every button click produces observable effect
- [ ] Error states show user-friendly messages
- [ ] Disabled states are intentional and documented
- [ ] No silent failures

### For QA

- [ ] Runtime verification enabled
- [ ] All controls tested at runtime
- [ ] UI_STATUS = VALID before release
- [ ] No broken bindings in production
- [ ] Effect verification working

### For Production

- [ ] Runtime assertions active
- [ ] Fail-fast enabled
- [ ] User-friendly error messages
- [ ] No console errors for UI interactions
- [ ] Network errors handled gracefully

---

## Enforcement

### Automatic Enforcement

The runtime verification service automatically enforces these rules:
- ✅ Global click interception (active)
- ✅ Effect verification (active)
- ✅ Action registry checks (active)
- ✅ Fail-fast on broken controls (active)

### Manual Enforcement

Developers must:
- Register all actions in `uiActionRegistry`
- Ensure every click produces observable effect
- Test controls at runtime (not just static analysis)
- Fix broken bindings before commit

### CI/CD Integration

**Recommended**: Add runtime UI verification to CI/CD pipeline:
1. Start dev server
2. Run automated click tests
3. Verify UI_STATUS = VALID
4. Fail build if UI_STATUS = INVALID

---

## Exceptions

### Allowed NO-OP Controls

1. **Disabled Buttons**: When no file open, no selection, etc.
2. **Already Active States**: Toggle buttons in active state
3. **Conditional Actions**: Actions that require specific conditions

**Requirement**: NO-OP must be intentional and visually indicated (disabled state, active styling).

### Allowed REQUIRES-CONFIG

1. **API Key Required**: Actions requiring API configuration
2. **File Selection Required**: Actions requiring file context
3. **User Input Required**: Actions requiring user data

**Requirement**: Must show clear message: "This action requires configuration."

---

## Version History

- **v1.0** (2025-02-05): Initial Golden Specification based on runtime verification results

---

## References

- `services/runtimeUIVerification.ts`: Implementation
- `services/uiActionRegistry.ts`: Action registry
- `RUNTIME_UI_VERIFICATION_REPORT.md`: Verification results
- `App.tsx`: Action registration examples

---

**This specification is AUTHORITATIVE and MANDATORY. All UI controls must comply with these rules.**
