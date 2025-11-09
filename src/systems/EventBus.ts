export interface GameEvent {
  type: string;
  data: any;
  timestamp: number;
  source?: string;
}

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, Array<(event: GameEvent) => void>> = new Map();

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  subscribe(eventType: string, callback: (event: GameEvent) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  unsubscribe(eventType: string, callback: (event: GameEvent) => void): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(eventType: string, data: any, source?: string): void {
    const event: GameEvent = {
      type: eventType,
      data,
      timestamp: Date.now(),
      source
    };

    console.log(`[EVENT_BUS] Emitting event: ${eventType}`, data);

    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`[EVENT_BUS] Error in event callback for ${eventType}:`, error);
        }
      });
    }
  }

  // Convenience methods for common event types
  emitProximityEvent(npcId: string, eventType: 'enter' | 'exit', distance: number): void {
    this.emit(`proximity_${eventType}`, { npcId, distance }, 'ProximitySystem');
  }

  emitChronEvent(eventType: string, data: any): void {
    this.emit(`chron_${eventType}`, data, 'ChronSystem');
  }

  emitStoryEvent(eventType: string, data: any): void {
    this.emit(`story_${eventType}`, data, 'StorySystem');
  }
}
