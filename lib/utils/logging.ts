// Centralized logging utility
export const logLevels = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error
};

export type LogLevel = keyof typeof logLevels;

export function logEvent(
  level: LogLevel, 
  message: string, 
  context?: Record<string, unknown>
): void {
  const logMessage = context 
    ? `${message} ${JSON.stringify(context)}` 
    : message;
  
  logLevels[level](logMessage);
}
