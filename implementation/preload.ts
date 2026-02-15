import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('speechAPI', {
  isSupported: () => {
    try {
      return (
        typeof (window as any).SpeechRecognition !== 'undefined' ||
        typeof (window as any).webkitSpeechRecognition !== 'undefined'
      );
    } catch {
      return false;
    }
  }
});
