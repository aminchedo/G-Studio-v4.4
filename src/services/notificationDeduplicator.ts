/**
 * Notification Deduplication System
 * Prevents notification spam by tracking shown notifications
 */

interface NotificationRecord {
  fingerprint: string;
  timestamp: number;
  count: number;
  lastShown: number;
}

export class NotificationDeduplicator {
  private static records: Map<string, NotificationRecord> = new Map();
  private static readonly COOLDOWN_MS = 60000; // 1 minute cooldown
  private static readonly MAX_NOTIFICATIONS_PER_HOUR = 3;

  static shouldShow(fingerprint: string): boolean {
    const record = this.records.get(fingerprint);
    const now = Date.now();

    if (!record) {
      // First time seeing this notification
      this.records.set(fingerprint, {
        fingerprint,
        timestamp: now,
        count: 1,
        lastShown: now
      });
      return true;
    }

    // Check cooldown
    if (now - record.lastShown < this.COOLDOWN_MS) {
      return false; // Still in cooldown
    }

    // Check hourly limit
    const hourAgo = now - 3600000; // 1 hour
    if (record.timestamp > hourAgo && record.count >= this.MAX_NOTIFICATIONS_PER_HOUR) {
      return false; // Too many notifications in the last hour
    }

    // Reset count if more than an hour has passed
    if (record.timestamp < hourAgo) {
      record.count = 0;
      record.timestamp = now;
    }

    // Update record
    record.count++;
    record.lastShown = now;
    this.records.set(fingerprint, record);

    return true;
  }

  static createFingerprint(
    errorType: string,
    errorMessage: string,
    modelId?: string
  ): string {
    // Create a stable fingerprint from error characteristics
    const normalizedMessage = errorMessage.toLowerCase()
      .replace(/\d+/g, 'N') // Replace numbers
      .replace(/[^\w\s]/g, '') // Remove special chars
      .substring(0, 100); // Limit length

    return `${errorType}:${normalizedMessage}:${modelId || 'unknown'}`;
  }

  static reset(): void {
    this.records.clear();
  }

  static resetFingerprint(fingerprint: string): void {
    this.records.delete(fingerprint);
  }
}
