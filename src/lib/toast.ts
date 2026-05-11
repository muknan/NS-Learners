let counter = 0;

export function nextToastId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `toast-${++counter}-${Date.now()}`;
}
