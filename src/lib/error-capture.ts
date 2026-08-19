let lastCapturedError: { error: unknown; at: number } | undefined;

const CAPTURE_TTL_MS = 5_000;

function recordError(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
}

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => {
    const errorEvent = event as ErrorEvent;
    recordError(errorEvent.error ?? event);
  });
  globalThis.addEventListener("unhandledrejection", (event) => {
    const rejectionEvent = event as PromiseRejectionEvent;
    recordError(rejectionEvent.reason);
  });
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;

  if (Date.now() - lastCapturedError.at > CAPTURE_TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }

  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}