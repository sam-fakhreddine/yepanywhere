import * as fs from "node:fs";
import * as path from "node:path";
import pino from "pino";

export interface LogConfig {
  /** Directory for log files. Default: .claude-anywhere/logs relative to cwd */
  logDir: string;
  /** Log filename. Default: server.log */
  logFile: string;
  /** Minimum log level. Default: info */
  logLevel: pino.Level;
  /** Also log to console. Default: true */
  logToConsole: boolean;
  /** Log to file. Default: true */
  logToFile: boolean;
  /** Use pretty printing for console. Default: true in dev */
  prettyPrint: boolean;
}

const defaultConfig: LogConfig = {
  logDir: path.join(process.cwd(), ".claude-anywhere", "logs"),
  logFile: "server.log",
  logLevel: "info",
  logToConsole: true,
  logToFile: true,
  prettyPrint: process.env.NODE_ENV !== "production",
};

let logger: pino.Logger | null = null;
let originalConsole: {
  log: typeof console.log;
  error: typeof console.error;
  warn: typeof console.warn;
  info: typeof console.info;
  debug: typeof console.debug;
} | null = null;

/**
 * Initialize the logger with the given configuration.
 * This should be called once at server startup.
 */
export function initLogger(config: Partial<LogConfig> = {}): pino.Logger {
  const finalConfig = { ...defaultConfig, ...config };

  // Ensure log directory exists
  if (finalConfig.logToFile) {
    fs.mkdirSync(finalConfig.logDir, { recursive: true });
  }

  const streams: pino.StreamEntry[] = [];

  // Console stream
  if (finalConfig.logToConsole) {
    if (finalConfig.prettyPrint) {
      // Use pino-pretty for development
      const pretty = pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      });
      streams.push({ stream: pretty, level: finalConfig.logLevel });
    } else {
      streams.push({ stream: process.stdout, level: finalConfig.logLevel });
    }
  }

  // File stream
  if (finalConfig.logToFile) {
    const logPath = path.join(finalConfig.logDir, finalConfig.logFile);
    const fileStream = fs.createWriteStream(logPath, { flags: "a" });
    streams.push({ stream: fileStream, level: finalConfig.logLevel });
  }

  if (streams.length === 0) {
    // No streams configured, use a silent logger
    logger = pino({ level: "silent" });
  } else if (streams.length === 1 && streams[0]) {
    logger = pino({ level: finalConfig.logLevel }, streams[0].stream);
  } else {
    logger = pino({ level: finalConfig.logLevel }, pino.multistream(streams));
  }

  return logger;
}

/**
 * Get the logger instance. Must call initLogger first.
 */
export function getLogger(): pino.Logger {
  if (!logger) {
    // Auto-initialize with defaults if not yet initialized
    return initLogger();
  }
  return logger;
}

/**
 * Intercept console.log/error/warn/info and route through pino logger.
 * Call this after initLogger() to capture all console output.
 */
export function interceptConsole(): void {
  if (originalConsole) {
    // Already intercepted
    return;
  }

  const log = getLogger();

  // Save original console methods
  originalConsole = {
    log: console.log.bind(console),
    error: console.error.bind(console),
    warn: console.warn.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console),
  };

  // Replace console methods
  console.log = (...args: unknown[]) => {
    log.info({ console: true }, formatConsoleArgs(args));
  };

  console.error = (...args: unknown[]) => {
    log.error({ console: true }, formatConsoleArgs(args));
  };

  console.warn = (...args: unknown[]) => {
    log.warn({ console: true }, formatConsoleArgs(args));
  };

  console.info = (...args: unknown[]) => {
    log.info({ console: true }, formatConsoleArgs(args));
  };

  console.debug = (...args: unknown[]) => {
    log.debug({ console: true }, formatConsoleArgs(args));
  };
}

/**
 * Restore original console methods.
 */
export function restoreConsole(): void {
  if (originalConsole) {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
    originalConsole = null;
  }
}

/**
 * Format console arguments into a string for pino.
 */
function formatConsoleArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      if (arg instanceof Error) return arg.stack || arg.message;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");
}

/**
 * Get the path to the current log file.
 */
export function getLogFilePath(config: Partial<LogConfig> = {}): string {
  const finalConfig = { ...defaultConfig, ...config };
  return path.join(finalConfig.logDir, finalConfig.logFile);
}

/**
 * Get the log directory path.
 */
export function getLogDir(config: Partial<LogConfig> = {}): string {
  const finalConfig = { ...defaultConfig, ...config };
  return finalConfig.logDir;
}
