# React Best Practices - Preventing Infinite Loops & Errors

## Quick Reference Guide

### 1. Zustand Store Selectors

#### ❌ DON'T: Return new objects without memoization
```typescript
export const useActions = () => useStore(state => ({
  action1: state.action1,
  action2: state.action2,
})); // New object every render!
```

#### ✅ DO: Use React.useMemo for stable references
```typescript
export const useActions = () => {
  const action1 = useStore(state => state.action1);
  const action2 = useStore(state => state.action2);
  
  return React.useMemo(() => ({
    action1,
    action2,
  }), [action1, action2]);
};
```

### 2. Null Safety in Components

#### ❌ DON'T: Access properties before null checks
```typescript
const Component = ({ data }) => {
  const value = data.property; // Crashes if data is null
  
  if (!data) return null;
  return <div>{value}</div>;
};
```

#### ✅ DO: Check null first, then access
```typescript
const Component = ({ data }) => {
  if (!data) return null;
  
  const value = data.property; // Safe
  return <div>{value}</div>;
};
```

### 3. useEffect Dependencies

#### ❌ DON'T: Include state you're setting in dependencies
```typescript
useEffect(() => {
  if (condition) {
    setState(newValue);
  }
}, [state]); // Infinite loop!
```

#### ✅ DO: Use refs for one-time guards
```typescript
const hasRun = useRef(false);

useEffect(() => {
  if (condition && !hasRun.current) {
    hasRun.current = true;
    setState(newValue);
  }
}, [condition]); // No loop
```

### 4. State Updates in Render

#### ❌ DON'T: Update state during render
```typescript
function Component() {
  const [count, setCount] = useState(0);
  
  if (someCondition) {
    setCount(1); // Causes infinite loop!
  }
  
  return <div>{count}</div>;
}
```

#### ✅ DO: Update state in effects or callbacks
```typescript
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (someCondition) {
      setCount(1); // Safe
    }
  }, [someCondition]);
  
  return <div>{count}</div>;
}
```

### 5. Functional State Updates

#### ❌ DON'T: Use stale state values
```typescript
const handleClick = () => {
  setState(state + 1); // May use stale value
  setState(state + 1); // Won't work as expected
};
```

#### ✅ DO: Use functional updates
```typescript
const handleClick = () => {
  setState(prev => prev + 1); // Always current
  setState(prev => prev + 1); // Works correctly
};
```

### 6. Object/Array Dependencies

#### ❌ DON'T: Create new objects in dependencies
```typescript
useEffect(() => {
  // Do something
}, [{ key: value }]); // New object every render!
```

#### ✅ DO: Use primitive values or memoized objects
```typescript
const config = useMemo(() => ({ key: value }), [value]);

useEffect(() => {
  // Do something
}, [config]); // Stable reference
```

### 7. Event Handlers

#### ❌ DON'T: Create inline functions with dependencies
```typescript
<button onClick={() => {
  doSomething(data);
}}>Click</button> // New function every render
```

#### ✅ DO: Use useCallback for stable references
```typescript
const handleClick = useCallback(() => {
  doSomething(data);
}, [data]);

<button onClick={handleClick}>Click</button>
```

## Common Patterns

### Pattern 1: One-Time Initialization
```typescript
const initialized = useRef(false);

useEffect(() => {
  if (!initialized.current) {
    initialized.current = true;
    // Run once
  }
}, []);
```

### Pattern 2: Conditional State Update
```typescript
useEffect(() => {
  if (condition && !hasUpdated.current) {
    hasUpdated.current = true;
    setState(newValue);
  }
}, [condition]);
```

### Pattern 3: Stable Action Object
```typescript
const actions = useMemo(() => ({
  create: () => {},
  update: () => {},
  delete: () => {},
}), []); // Empty deps if actions don't change
```

### Pattern 4: Safe Notification Display
```typescript
const [notifications, setNotifications] = useState([]);

// Always check before accessing
if (notifications.length === 0) return null;

return notifications.map(notif => (
  <div key={notif.id}>{notif.message}</div>
));
```

## Debugging Tips

### 1. React DevTools Profiler
- Record interactions
- Look for components rendering repeatedly
- Check "Why did this render?"

### 2. Console Logging
```typescript
useEffect(() => {
  console.log('Effect ran', { dependency1, dependency2 });
}, [dependency1, dependency2]);
```

### 3. Strict Mode
- Helps catch side effects
- Runs effects twice in development
- Reveals hidden bugs

### 4. ESLint Rules
Enable these rules:
- `react-hooks/rules-of-hooks`
- `react-hooks/exhaustive-deps`

## Quick Checklist

Before committing code, verify:

- [ ] No state updates during render
- [ ] All useEffect dependencies are correct
- [ ] No new objects/arrays in dependency arrays
- [ ] Null checks before property access
- [ ] Functional updates for state depending on previous state
- [ ] Stable references for callbacks and objects
- [ ] One-time operations use refs as guards
- [ ] No infinite loops in console

## Resources

- [React Hooks Documentation](https://react.dev/reference/react)
- [Zustand Best Practices](https://github.com/pmndrs/zustand)
- [React DevTools](https://react.dev/learn/react-developer-tools)

---

**Remember:** Most infinite loops come from:
1. State in its own effect dependencies
2. New objects/arrays in dependencies
3. State updates during render
4. Unstable selector references

Fix these, and you'll avoid 90% of React loop issues!
