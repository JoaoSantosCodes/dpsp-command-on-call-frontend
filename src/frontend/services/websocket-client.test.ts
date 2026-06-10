import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketClient } from './websocket-client';
import type { ConnectionStatus } from '../../shared/types';

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];

  url: string;
  readyState: number = 0; // CONNECTING
  onopen: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close() {
    this.readyState = 3; // CLOSED
  }

  send(_data: string) {}

  // Test helpers
  simulateOpen() {
    this.readyState = 1; // OPEN
    if (this.onopen) {
      this.onopen({ type: 'open' });
    }
  }

  simulateClose() {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose({ type: 'close' });
    }
  }

  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror({ type: 'error' });
    }
  }
}

vi.stubGlobal('WebSocket', MockWebSocket);

describe('WebSocketClient', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('connect', () => {
    it('should connect to the specified URL', () => {
      const client = new WebSocketClient({ url: 'ws://test:8080' });
      client.connect();

      expect(MockWebSocket.instances).toHaveLength(1);
      expect(MockWebSocket.instances[0].url).toBe('ws://test:8080');
    });

    it('should use default URL when not specified', () => {
      const client = new WebSocketClient();
      client.connect();

      expect(MockWebSocket.instances[0].url).toBe('ws://localhost:3000');
    });

    it('should emit connected status on successful connection', () => {
      const client = new WebSocketClient();
      const statuses: ConnectionStatus[] = [];
      client.onStatusChange((s) => statuses.push(s));

      client.connect();
      MockWebSocket.instances[0].simulateOpen();

      expect(statuses).toEqual(['connected']);
    });
  });

  describe('reconnection', () => {
    it('should emit reconnecting status on close', () => {
      const client = new WebSocketClient({ maxReconnectAttempts: 5 });
      const statuses: ConnectionStatus[] = [];
      client.onStatusChange((s) => statuses.push(s));

      client.connect();
      MockWebSocket.instances[0].simulateOpen();
      MockWebSocket.instances[0].simulateClose();

      expect(statuses).toContain('reconnecting');
    });

    it('should reconnect with exponential backoff', () => {
      const client = new WebSocketClient({
        baseDelay: 1000,
        maxReconnectAttempts: 5,
      });
      client.connect();

      const ws1 = MockWebSocket.instances[0];
      ws1.simulateOpen();
      ws1.simulateClose();

      // After 1st close: delay = 1000 * 2^0 = 1000ms
      expect(MockWebSocket.instances).toHaveLength(1);
      vi.advanceTimersByTime(999);
      expect(MockWebSocket.instances).toHaveLength(1);
      vi.advanceTimersByTime(1);
      expect(MockWebSocket.instances).toHaveLength(2);

      // After 2nd close: delay = 1000 * 2^1 = 2000ms
      MockWebSocket.instances[1].simulateClose();
      vi.advanceTimersByTime(1999);
      expect(MockWebSocket.instances).toHaveLength(2);
      vi.advanceTimersByTime(1);
      expect(MockWebSocket.instances).toHaveLength(3);

      // After 3rd close: delay = 1000 * 2^2 = 4000ms
      MockWebSocket.instances[2].simulateClose();
      vi.advanceTimersByTime(3999);
      expect(MockWebSocket.instances).toHaveLength(3);
      vi.advanceTimersByTime(1);
      expect(MockWebSocket.instances).toHaveLength(4);
    });

    it('should cap reconnection delay at maxDelay', () => {
      const client = new WebSocketClient({
        baseDelay: 1000,
        maxDelay: 5000,
        maxReconnectAttempts: 10,
      });
      client.connect();

      // Simulate multiple disconnects to get to high attempt count
      MockWebSocket.instances[0].simulateOpen();
      MockWebSocket.instances[0].simulateClose();
      vi.advanceTimersByTime(1000); // attempt 0: 1000ms

      MockWebSocket.instances[1].simulateClose();
      vi.advanceTimersByTime(2000); // attempt 1: 2000ms

      MockWebSocket.instances[2].simulateClose();
      vi.advanceTimersByTime(4000); // attempt 2: 4000ms

      MockWebSocket.instances[3].simulateClose();
      // attempt 3: min(8000, 5000) = 5000ms (capped)
      vi.advanceTimersByTime(4999);
      expect(MockWebSocket.instances).toHaveLength(4);
      vi.advanceTimersByTime(1);
      expect(MockWebSocket.instances).toHaveLength(5);
    });

    it('should stop reconnecting after maxReconnectAttempts', () => {
      const client = new WebSocketClient({
        baseDelay: 100,
        maxReconnectAttempts: 2,
      });
      const statuses: ConnectionStatus[] = [];
      client.onStatusChange((s) => statuses.push(s));

      client.connect();
      MockWebSocket.instances[0].simulateOpen();
      MockWebSocket.instances[0].simulateClose();

      // First reconnect
      vi.advanceTimersByTime(100);
      expect(MockWebSocket.instances).toHaveLength(2);

      MockWebSocket.instances[1].simulateClose();

      // Second reconnect
      vi.advanceTimersByTime(200);
      expect(MockWebSocket.instances).toHaveLength(3);

      // Third close - should NOT reconnect
      MockWebSocket.instances[2].simulateClose();
      vi.advanceTimersByTime(100000);
      expect(MockWebSocket.instances).toHaveLength(3);

      // Should emit 'disconnected'
      expect(statuses[statuses.length - 1]).toBe('disconnected');
    });

    it('should reset reconnect counter on successful connection', () => {
      const client = new WebSocketClient({
        baseDelay: 100,
        maxReconnectAttempts: 5,
      });
      client.connect();

      MockWebSocket.instances[0].simulateOpen();
      MockWebSocket.instances[0].simulateClose();

      // First reconnect at 100ms
      vi.advanceTimersByTime(100);
      expect(MockWebSocket.instances).toHaveLength(2);

      // Successful reconnection
      MockWebSocket.instances[1].simulateOpen();
      expect(client.getReconnectAttemptCount()).toBe(0);

      // Disconnect again - should start backoff from beginning
      MockWebSocket.instances[1].simulateClose();
      vi.advanceTimersByTime(100); // back to 100ms (2^0 * 100)
      expect(MockWebSocket.instances).toHaveLength(3);
    });
  });

  describe('messages', () => {
    it('should emit parsed messages to callbacks', () => {
      const client = new WebSocketClient();
      const messages: unknown[] = [];
      client.onMessage((msg) => messages.push(msg));

      client.connect();
      MockWebSocket.instances[0].simulateOpen();
      MockWebSocket.instances[0].simulateMessage({
        type: 'monitors:updated',
        data: { monitors: [] },
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        type: 'monitors:updated',
        data: { monitors: [] },
      });
    });

    it('should ignore malformed JSON messages', () => {
      const client = new WebSocketClient();
      const messages: unknown[] = [];
      client.onMessage((msg) => messages.push(msg));

      client.connect();
      MockWebSocket.instances[0].simulateOpen();

      // Send invalid JSON
      const ws = MockWebSocket.instances[0];
      if (ws.onmessage) {
        ws.onmessage({ data: 'not valid json' } as MessageEvent);
      }

      expect(messages).toHaveLength(0);
    });

    it('should support multiple message callbacks', () => {
      const client = new WebSocketClient();
      const messages1: unknown[] = [];
      const messages2: unknown[] = [];
      client.onMessage((msg) => messages1.push(msg));
      client.onMessage((msg) => messages2.push(msg));

      client.connect();
      MockWebSocket.instances[0].simulateOpen();
      MockWebSocket.instances[0].simulateMessage({
        type: 'test',
        data: null,
      });

      expect(messages1).toHaveLength(1);
      expect(messages2).toHaveLength(1);
    });
  });

  describe('disconnect', () => {
    it('should close the WebSocket connection', () => {
      const client = new WebSocketClient();
      client.connect();
      MockWebSocket.instances[0].simulateOpen();

      client.disconnect();

      expect(MockWebSocket.instances[0].readyState).toBe(3); // CLOSED
    });

    it('should cancel pending reconnection', () => {
      const client = new WebSocketClient({
        baseDelay: 1000,
        maxReconnectAttempts: 5,
      });
      client.connect();
      MockWebSocket.instances[0].simulateOpen();
      MockWebSocket.instances[0].simulateClose();

      // Reconnect is scheduled
      client.disconnect();

      // Advance time - no reconnection should happen
      vi.advanceTimersByTime(10000);
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    it('should not reconnect after disconnect', () => {
      const client = new WebSocketClient({
        baseDelay: 100,
        maxReconnectAttempts: 5,
      });
      client.disconnect();
      client.connect();

      // Should not create a WebSocket since disconnected flag is set
      expect(MockWebSocket.instances).toHaveLength(0);
    });
  });
});
