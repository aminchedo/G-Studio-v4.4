/**
 * AI Thinking Engine - TTS orchestration for model replies.
 * MIGRATION NOTE: Minimal integration from master-update. Only TTS speak() is wired;
 * full thinkAbout/generateCode require thinkingStore (not yet in project).
 * Ensures model reply can trigger voiceStore.startSpeaking(reply).
 */

import { useVoiceStore } from "@/stores/voiceStore";

export class ThinkingEngine {
  private get voiceStore() {
    return useVoiceStore.getState();
  }

  /**
   * Speak text via voice store TTS. Safe when speech API unavailable.
   */
  async speak(text: string): Promise<void> {
    await this.voiceStore.startSpeaking(text);
    return new Promise((resolve) => {
      const checkSpeaking = setInterval(() => {
        if (!this.voiceStore.isSpeaking) {
          clearInterval(checkSpeaking);
          resolve();
        }
      }, 100);
    });
  }
}

export const thinkingEngine = new ThinkingEngine();
