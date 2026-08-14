// Environment-aware logger.
// In production nothing is written to the browser console, preventing
// disclosure of internal state, database errors and user activity data.

const isDev = import.meta.env.DEV;

function toSafeMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (message: string, error?: unknown) => {
    if (isDev) {
      console.error(message, error !== undefined ? toSafeMessage(error) : '');
    }
  },
};
