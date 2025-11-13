import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';
import { nanoid } from 'nanoid';

type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
type GCPLogSeverity =
  | 'DEFAULT'
  | 'DEBUG'
  | 'INFO'
  | 'NOTICE'
  | 'WARNING'
  | 'ERROR'
  | 'CRITICAL'
  | 'ALERT'
  | 'EMERGENCY';

const levelToSeverityMap: Record<LogLevel, GCPLogSeverity> = {
  trace: 'DEBUG',
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
  fatal: 'CRITICAL',
};

function mapLevelToSeverity(level: LogLevel): GCPLogSeverity {
  return levelToSeverityMap[level] ?? 'DEFAULT';
}

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDevelopmentEnv = config.isDevelopment();

        return {
          pinoHttp: {
            name: 'url-shortener-api',
            level: isDevelopmentEnv ? 'trace' : 'info',
            quietReqLogger: true,
            quietResLogger: true,
            genReqId: () => nanoid(),

            customSuccessMessage(req, res, responseTime) {
              return `${req.method} ${req.url} ${res.statusCode} ${responseTime}ms`;
            },
            customLogLevel(_, res) {
              if (res.statusCode >= 500) {
                return 'error';
              } else if (res.statusCode >= 400) {
                return 'warn';
              }

              return 'info';
            },

            // Pretty printing in development
            transport: isDevelopmentEnv
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    levelFirst: true,
                    translateTime: 'HH:MM:ss.l',
                    ignore: 'pid,hostname,context',
                  },
                }
              : undefined,
            messageKey: isDevelopmentEnv ? 'msg' : 'message',
            base: undefined,
            formatters: isDevelopmentEnv
              ? undefined
              : {
                  level(label) {
                    return { severity: mapLevelToSeverity(label as LogLevel) };
                  },
                },
            // Should support asynchronous logging, but something's off with nestjs-pino
            // stream: destination({
            //   sync: false, // Asynchronous writes
            //   minLength: 4096, // Buffer before writing
            // }),
          },
        };
      },
    }),
  ],
})
export class LoggerModule {}
