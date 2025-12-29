/**
 * Simple in-memory pub/sub event bus for file change events.
 */

export type FileChangeType = "create" | "modify" | "delete";

export interface FileChangeEvent {
  path: string;
  relativePath: string;
  type: FileChangeType;
  timestamp: string;
  /** Parsed file type based on path */
  fileType: "session" | "agent-session" | "settings" | "credentials" | "other";
}

export type EventHandler = (event: FileChangeEvent) => void;

export class EventBus {
  private subscribers: Set<EventHandler> = new Set();

  /**
   * Subscribe to file change events.
   * @returns Unsubscribe function
   */
  subscribe(handler: EventHandler): () => void {
    this.subscribers.add(handler);
    return () => {
      this.subscribers.delete(handler);
    };
  }

  /**
   * Emit an event to all subscribers.
   */
  emit(event: FileChangeEvent): void {
    for (const handler of this.subscribers) {
      try {
        handler(event);
      } catch (error) {
        console.error("[EventBus] Handler error:", error);
      }
    }
  }

  /**
   * Get the number of active subscribers.
   */
  get subscriberCount(): number {
    return this.subscribers.size;
  }
}
