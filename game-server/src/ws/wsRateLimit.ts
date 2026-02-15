const WS_CONN_PER_IP_MAX = parseInt(process.env["WS_CONN_PER_IP_MAX"] || "5", 10);
const WS_CONN_PER_IP_WINDOW_MS = parseInt(process.env["WS_CONN_PER_IP_WINDOW_MS"] || "60000", 10);
const WS_MAX_TOTAL_CONNECTIONS = parseInt(process.env["WS_MAX_TOTAL_CONNECTIONS"] || "100", 10);
const WS_MSG_PER_CONN_MAX = parseInt(process.env["WS_MSG_PER_CONN_MAX"] || "10", 10);
const WS_MSG_PER_CONN_WINDOW_MS = parseInt(process.env["WS_MSG_PER_CONN_WINDOW_MS"] || "10000", 10);
export const WS_MAX_MESSAGE_SIZE = parseInt(process.env["WS_MAX_MESSAGE_SIZE"] || "1024", 10);

interface IpRecord {
  /** Timestamps of recent connection attempts within the window */
  connectionTimestamps: number[];
  /** Number of currently active connections */
  activeConnections: number;
}

export interface MessageTracker {
  /** Timestamps of recent messages within the window */
  timestamps: number[];
}

const ipRecords = new Map<string, IpRecord>();
let totalActiveConnections = 0;

/**
 * Check if a new WS connection from this IP should be accepted.
 * Returns true if allowed, false if rate-limited.
 */
export function canAcceptConnection(ip: string): boolean {
  if (totalActiveConnections >= WS_MAX_TOTAL_CONNECTIONS) {
    return false;
  }

  const now = Date.now();
  let record = ipRecords.get(ip);

  if (!record) {
    record = { connectionTimestamps: [], activeConnections: 0 };
    ipRecords.set(ip, record);
  }

  // Evict timestamps outside the window
  record.connectionTimestamps = record.connectionTimestamps.filter(
    (ts) => now - ts < WS_CONN_PER_IP_WINDOW_MS
  );

  if (record.connectionTimestamps.length >= WS_CONN_PER_IP_MAX) {
    return false;
  }

  record.connectionTimestamps.push(now);
  record.activeConnections++;
  totalActiveConnections++;
  return true;
}

/**
 * Record that a WS connection from this IP has disconnected.
 */
export function recordDisconnection(ip: string): void {
  const record = ipRecords.get(ip);
  if (record) {
    record.activeConnections = Math.max(0, record.activeConnections - 1);
  }
  totalActiveConnections = Math.max(0, totalActiveConnections - 1);
}

/**
 * Create a new message tracker for a connection.
 */
export function createMessageTracker(): MessageTracker {
  return { timestamps: [] };
}

/**
 * Check if a message from this connection should be accepted.
 * Returns true if allowed, false if rate-limited.
 */
export function canAcceptMessage(tracker: MessageTracker): boolean {
  const now = Date.now();

  // Evict timestamps outside the window
  tracker.timestamps = tracker.timestamps.filter(
    (ts) => now - ts < WS_MSG_PER_CONN_WINDOW_MS
  );

  if (tracker.timestamps.length >= WS_MSG_PER_CONN_MAX) {
    return false;
  }

  tracker.timestamps.push(now);
  return true;
}

// Cleanup interval: every 5 min, evict IPs with no active connections
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

setInterval(() => {
  for (const [ip, record] of ipRecords) {
    if (record.activeConnections <= 0) {
      ipRecords.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS).unref();
