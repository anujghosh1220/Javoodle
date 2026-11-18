"use client";

export type RobotEmotion =
  | "happy"
  | "excited"
  | "thinking"
  | "confused"
  | "encouraging"
  | "celebrating"
  | "focused"
  | "sleepy"
  | "idle";

type Handler = (emotion: RobotEmotion) => void;

const listeners = new Set<Handler>();

/** Fire a robot reaction from anywhere in the app. */
export function emitRobotEvent(emotion: RobotEmotion) {
  listeners.forEach((h) => h(emotion));
}

/** Subscribe to robot events; returns unsubscribe. */
export function onRobotEvent(handler: Handler): () => void {
  listeners.add(handler);
  return () => listeners.delete(handler);
}
