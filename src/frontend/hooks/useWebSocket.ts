import { useEffect, useRef } from 'react';
import {
  useCommandCenterStore,
  addActiveIncident,
  updateIncidentEscalation,
  removeActiveIncident,
} from '../store/command-center-store';
import type { Monitor, ActiveIncident } from '../../shared/types';
import { WebSocketClient, WebSocketClientOptions } from '../services/websocket-client';

export interface UseWebSocketOptions extends WebSocketClientOptions {}

/**
 * Hook that connects to the Command Center WebSocket server,
 * handles reconnection with exponential backoff, and updates
 * the Zustand store when events are received.
 */
export function useWebSocket(options: UseWebSocketOptions = {}): void {
  const clientRef = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    const client = new WebSocketClient(options);

    client.onStatusChange((status) => {
      useCommandCenterStore.getState().setConnectionStatus(status);
    });

    client.onMessage((message) => {
      handleWebSocketMessage(message);
    });

    client.connect();
    clientRef.current = client;

    return () => {
      client.disconnect();
      clientRef.current = null;
      useCommandCenterStore.getState().setConnectionStatus('disconnected');
    };
  }, []);
}

interface WebSocketMessage {
  type: string;
  data: unknown;
}

/**
 * Handles incoming WebSocket messages and updates the Zustand store.
 * Exported for testing purposes.
 */
export function handleWebSocketMessage(message: WebSocketMessage): void {
  switch (message.type) {
    case 'monitors:updated': {
      const { monitors } = message.data as { monitors: Monitor[] };
      useCommandCenterStore.getState().setMonitors(monitors);
      break;
    }
    case 'incident:new': {
      const { incident } = message.data as { incident: ActiveIncident };
      addActiveIncident(incident);
      break;
    }
    case 'incident:escalated': {
      const { escalation } = message.data as {
        escalation: { incidentId: string; escalationLevel: number };
      };
      updateIncidentEscalation(
        escalation.incidentId,
        escalation.escalationLevel
      );
      break;
    }
    case 'incident:resolved': {
      const { incident } = message.data as { incident: { id: string } };
      removeActiveIncident(incident.id);
      break;
    }
  }
}
