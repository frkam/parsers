import pino from "pino";

// Базовая конфигурация для всех логгеров
const baseConfig = {
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss",
      ignore: "pid,hostname,time",
      messageFormat: "[PARSE] [{service}] {msg}",
    },
  },
};

// Функция для создания логгера для конкретного сервиса
export const createServiceLogger = (serviceName: string) => {
  return pino({
    ...baseConfig,
    base: { service: serviceName.toUpperCase() },
  });
};

// Основной логгер (для общих случаев)
export const logger = pino(baseConfig);
