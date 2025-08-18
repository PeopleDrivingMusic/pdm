import { dev } from '$app/environment';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	component?: string;
	userId?: string;
	sessionId?: string;
	requestId?: string;
	metadata?: Record<string, any>;
	stack?: string;
}

class Logger {
	private logLevel: LogLevel;
	private isDev: boolean;

	constructor() {
		this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
		this.isDev = dev;
	}

	private shouldLog(level: LogLevel): boolean {
		const levels: Record<LogLevel, number> = {
			debug: 0,
			info: 1,
			warn: 2,
			error: 3
		};

		return levels[level] >= levels[this.logLevel];
	}

	private formatLog(entry: LogEntry): string {
		if (this.isDev) {
			// In development mode - human-readable format
			const timestamp = new Date(entry.timestamp).toLocaleString();
			let log = `[${timestamp}] [${entry.level.toUpperCase()}]`;
			
			if (entry.component) {
				log += ` [${entry.component}]`;
			}
			
			log += ` ${entry.message}`;
			
			if (entry.metadata && Object.keys(entry.metadata).length > 0) {
				log += ` | Metadata: ${JSON.stringify(entry.metadata)}`;
			}
			
			if (entry.stack) {
				log += `\nStack: ${entry.stack}`;
			}
			
			return log;
		} else {
			// In production - JSON format for Loki
			return JSON.stringify(entry);
		}
	}

	private log(level: LogLevel, message: string, options: Partial<LogEntry> = {}): void {
		if (!this.shouldLog(level)) return;

		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			...options
		};

		const formattedLog = this.formatLog(entry);

		// Console output
		switch (level) {
			case 'debug':
				console.debug(formattedLog);
				break;
			case 'info':
				console.info(formattedLog);
				break;
			case 'warn':
				console.warn(formattedLog);
				break;
			case 'error':
				console.error(formattedLog);
				break;
		}

		// In production also write to file or send to external service
		if (!this.isDev) {
			this.writeToFile(formattedLog);
		}
	}

	private writeToFile(log: string): void {
		// In container, write to stdout for Docker logging driver
		process.stdout.write(log + '\n');
	}

	debug(message: string, options?: Partial<LogEntry>): void {
		this.log('debug', message, options);
	}

	info(message: string, options?: Partial<LogEntry>): void {
		this.log('info', message, options);
	}

	warn(message: string, options?: Partial<LogEntry>): void {
		this.log('warn', message, options);
	}

	error(message: string, options?: Partial<LogEntry>): void {
		// Automatically add stack trace for errors
		if (options?.metadata?.error instanceof Error) {
			options.stack = options.metadata.error.stack;
		}
		this.log('error', message, options);
	}

	// Special methods for different event types
	httpRequest(method: string, url: string, statusCode: number, duration: number, options?: Partial<LogEntry>): void {
		this.info(`HTTP ${method} ${url} - ${statusCode} (${duration}ms)`, {
			component: 'http',
			metadata: {
				method,
				url,
				statusCode,
				duration
			},
			...options
		});
	}

	dbQuery(query: string, duration: number, options?: Partial<LogEntry>): void {
		this.debug(`DB Query executed in ${duration}ms`, {
			component: 'database',
			metadata: {
				query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
				duration
			},
			...options
		});
	}

	userAction(action: string, userId: string, options?: Partial<LogEntry>): void {
		this.info(`User action: ${action}`, {
			component: 'user',
			userId,
			metadata: {
				action
			},
			...options
		});
	}

	security(event: string, level: 'info' | 'warn' | 'error' = 'warn', options?: Partial<LogEntry>): void {
		this.log(level, `Security event: ${event}`, {
			component: 'security',
			metadata: {
				event
			},
			...options
		});
	}
}

// Singleton instance
export const logger = new Logger();

// Middleware for automatic HTTP request logging
export function createLoggingMiddleware() {
	return async ({ event, resolve }: { event: any; resolve: any }) => {
		const start = Date.now();
		const requestId = crypto.randomUUID();
		
		// Add requestId to locals for use in handlers
		event.locals.requestId = requestId;
		
		logger.info(`Incoming request: ${event.request.method} ${event.url.pathname}`, {
			component: 'http',
			requestId,
			metadata: {
				method: event.request.method,
				path: event.url.pathname,
				userAgent: event.request.headers.get('user-agent'),
				ip: event.getClientAddress()
			}
		});

		let response;
		let error;
		
		try {
			response = await resolve(event);
		} catch (e) {
			error = e;
			logger.error(`Request failed: ${event.request.method} ${event.url.pathname}`, {
				component: 'http',
				requestId,
				metadata: {
					error: e,
					method: event.request.method,
					path: event.url.pathname
				}
			});
			throw e;
		} finally {
			const duration = Date.now() - start;
			
			if (response) {
				logger.httpRequest(
					event.request.method,
					event.url.pathname,
					response.status,
					duration,
					{ requestId }
				);
			}
		}

		return response;
	};
}
