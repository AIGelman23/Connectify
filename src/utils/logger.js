export const logger = {
  info: (message, data = {}) => {
    console.log(`[INFO] ${message}`, data);
  },

  warn: (message, data = {}) => {
    console.warn(`[WARN] ${message}`, data);
  },

  error: (message, error, data = {}) => {
    console.error(`[ERROR] ${message}`, error, data);
  },

  security: (message, data = {}) => {
    console.log(`[SECURITY] ${message}`, {
      timestamp: new Date().toISOString(),
      ...data,
    });
  },
};
