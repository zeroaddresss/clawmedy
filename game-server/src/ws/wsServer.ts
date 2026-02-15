import { Server as HttpServer, IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { WsEvent, WsClientMessage } from "../types/ws";
import {
  canAcceptConnection,
  recordDisconnection,
  createMessageTracker,
  canAcceptMessage,
  WS_MAX_MESSAGE_SIZE,
  MessageTracker,
} from "./wsRateLimit";

interface TrackedClient {
  ws: WebSocket;
  subscribedGames: Set<string>;
  isAlive: boolean;
  ip: string;
  msgTracker: MessageTracker;
}

const clients = new Set<TrackedClient>();

let wss: WebSocketServer;

function extractIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return first!.trim();
  }
  return req.socket.remoteAddress || "unknown";
}

export function initWebSocketServer(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const ip = extractIp(req);

    if (!canAcceptConnection(ip)) {
      ws.close(1008, "Rate limit exceeded");
      return;
    }

    const client: TrackedClient = {
      ws,
      subscribedGames: new Set(),
      isAlive: true,
      ip,
      msgTracker: createMessageTracker(),
    };
    clients.add(client);

    ws.on("pong", () => {
      client.isAlive = true;
    });

    ws.on("message", (raw) => {
      const data = typeof raw === "string" ? raw : raw.toString();

      if (data.length > WS_MAX_MESSAGE_SIZE) {
        ws.close(1009, "Message too large");
        return;
      }

      if (!canAcceptMessage(client.msgTracker)) {
        try {
          ws.send(JSON.stringify({ error: "Message rate limit exceeded" }));
        } catch {
          // ignore send errors
        }
        return;
      }

      try {
        const msg: WsClientMessage = JSON.parse(data);
        if (msg.type === "subscribe" && msg.gameId) {
          client.subscribedGames.add(msg.gameId);
        } else if (msg.type === "unsubscribe" && msg.gameId) {
          client.subscribedGames.delete(msg.gameId);
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on("close", () => {
      clients.delete(client);
      recordDisconnection(ip);
    });

    ws.on("error", () => {
      clients.delete(client);
      recordDisconnection(ip);
    });
  });

  // Heartbeat every 30s
  const heartbeat = setInterval(() => {
    for (const client of clients) {
      if (!client.isAlive) {
        client.ws.terminate();
        clients.delete(client);
        recordDisconnection(client.ip);
        continue;
      }
      client.isAlive = false;
      client.ws.ping();
    }
  }, 30_000);

  wss.on("close", () => {
    clearInterval(heartbeat);
  });

  console.log("WebSocket server initialized on /ws");
  return wss;
}

export function broadcast(event: WsEvent): void {
  const payload = JSON.stringify(event);
  for (const client of clients) {
    if (client.ws.readyState !== WebSocket.OPEN) continue;

    // Send to clients that are subscribed to this game, or to all-events clients (no subscriptions)
    if (
      client.subscribedGames.size === 0 ||
      client.subscribedGames.has(event.gameId)
    ) {
      try {
        client.ws.send(payload);
      } catch {
        clients.delete(client);
      }
    }
  }
}

export function getConnectedClientCount(): number {
  return clients.size;
}
