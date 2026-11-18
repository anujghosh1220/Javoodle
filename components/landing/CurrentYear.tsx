"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Copyright year — resolved on the client so the page stays prerenderable. */
export function CurrentYear() {
  const year = useSyncExternalStore(
    subscribe,
    () => new Date().getFullYear(),
    () => 2026
  );
  return <>{year}</>;
}
