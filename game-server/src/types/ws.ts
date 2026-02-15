export type WsEventType =
  | "game_created"
  | "joke_submitted"
  | "judge_streaming"
  | "judge_verdict"
  | "game_settled";

export interface WsEvent {
  type: WsEventType;
  gameId: string;
  data: unknown;
  timestamp: number;
}

export interface WsSubscribeMessage {
  type: "subscribe";
  gameId: string;
}

export interface WsUnsubscribeMessage {
  type: "unsubscribe";
  gameId: string;
}

export type WsClientMessage = WsSubscribeMessage | WsUnsubscribeMessage;
