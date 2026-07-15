export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  ts: string
  level: LogLevel
  service: string
  msg: string
  data?: Record<string, any>
}

export function log(
  level: LogLevel,
  service: string,
  msg: string,
  data?: Record<string, any>
) {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    service,
    msg,
    ...(data ? { data } : {}),
  }
  const line = JSON.stringify(entry)
  if (level === 'error') console.error(line)
  else console.log(line)
}

export const logger = {
  info: (service: string, msg: string, data?: any) =>
    log('info', service, msg, data),
  warn: (service: string, msg: string, data?: any) =>
    log('warn', service, msg, data),
  error: (service: string, msg: string, data?: any) =>
    log('error', service, msg, data),
  debug: (service: string, msg: string, data?: any) =>
    log('debug', service, msg, data),
}
