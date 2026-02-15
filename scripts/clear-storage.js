/**
 * Clear localStorage utility
 * Run this in browser console if you need to manually clear storage
 */

(function clearStorage() {
  console.log('[Clear Storage] Starting cleanup...');
  
  // Essential keys to keep
  const essentialKeys = [
    'gstudio_api_key',
    'secure_api_key',
    'gemini_api_key',
  ];
  
  let totalCleared = 0;
  const keysToRemove = [];
  
  // Collect non-essential keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !essentialKeys.includes(key)) {
      keysToRemove.push(key);
    }
  }
  
  // Remove non-essential keys
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
      totalCleared++;
    } catch (e) {
      console.warn(`Failed to remove ${key}:`, e);
    }
  });
  
  console.log(`[Clear Storage] Cleared ${totalCleared} items`);
  console.log(`[Clear Storage] Remaining items: ${localStorage.length}`);
  
  // Show storage size
  let totalSize = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += new Blob([value]).size;
      }
    }
  }
  
  console.log(`[Clear Storage] Total size: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`);
  console.log('[Clear Storage] Done! Refresh the page to continue.');
})();
