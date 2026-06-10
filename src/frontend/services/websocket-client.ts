import type { ConnectionStatus } from '../../shared/types';

export interface WebSocketClientOptions {
  /** WebSocket server URL. Defaults to ws://localhost:3000 */
  url?: string;
  /** Maximum number of reconnection attempts before giving up. Defaults to Infinity */
  maxReconnectAttempts?: number;
  /** Base delay in ms for exponential backoff. Defaults to 1000 */
  baseDelay?: number;
  /** Maximum delay in ms for exponential backoff. Defaults to 30000 */
  maxDelay?: number;
}

export interface WebSocketMessage {
  type: string;
  data: unknown;
}

type StatusChangeCallback = (status: ConnectionStatus) => void;
type MessageCallback = (message: WebSocketMessage) => void;

/**
 * WebSocket client with automatic reconnection using exponential backoff.
 * Separated from the React hook for testability.
 */
export class WebSocketClient {
  private readonly url: string;
  private readonly maxReconnectAttempts: number;
  private readonly baseDelay: number;
  private readonly maxDelay: number;

  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private disconnected = false;

  private statusChangeCallbacks: StatusChangeCallback[] = [];
  private messageCallbacks: MessageCallback[] = [];

  constructor(options: WebSocketClientOptions = {}) {
    this.url = options.url ?? 'ws://localhost:3000';
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? Infinity;
    this.baseDelay = options.baseDelay ?? 1000;
    this.maxDelay = options.maxDelay ?? 30000;
  }

  /**
   * Register a callback for connection status changes.
   */
  onStatusChange(callback: StatusChangeCallback): void {
    this.statusChangeCallbacks.push(callback);
  }

  /**
   * Register a callback for incoming messages.
   */
  onMessage(callback: MessageCallback): void {
    this.messageCallbacks.push(callback);
  }

  /**
   * Connect to the WebSocket server.
   */
  connect(): void {
    if (this.disconnected) return;

    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.onopen = () => {
      if (this.disconnected) {
        ws.close();
        return;
      }
      this.reconnectAttempt = 0;
      this.emitStatusChange('connected');
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data as string);
        this.emitMessage(message);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (this.disconnected) return;

      this.ws = null;

      if (this.reconnectAttempt < this.maxReconnectAttempts) {
        this.emitStatusChange('reconnecting');
        const delay = this.getReconnectDelay(this.reconnectAttempt);
        this.reconnectAttempt += 1;

        this.reconnectTimeout = setTimeout(() => {
          if (!this.disconnected) {
            this.connect();
          }
        }, delay);
      } else {
        this.emitStatusChange('disconnected');
      }
    };

    ws.onerror = () => {
      // The close event will fire after error, triggering reconnection logic
    };
  }

  /**
   * Disconnect and stop any reconnection attempts.
   */
  disconnect(): void {
    this.disconnected = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Get the current reconnection attempt count.
   */
  getReconnectAttemptCount(): number {
    return this.reconnectAttempt;
  }

  private getReconnectDelay(attempt: number): number {
    const delay = this.baseDelay * Math.pow(2, attempt);
    return Math.min(delay, this.maxDelay);
  }

  private emitStatusChange(status: ConnectionStatus): void {
    for (const cb of this.statusChangeCallbacks) {
      cb(status);
    }
  }

  private emitMessage(message: WebSocketMessage): void {
    for (const cb of this.messageCallbacks) {
      cb(message);
    }
  }
}
