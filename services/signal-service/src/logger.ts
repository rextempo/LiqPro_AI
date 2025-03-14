/**
 * 简单的日志记录模块
 */

export const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${message}`, meta ? meta : '');
  },
  
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${message}`, meta ? meta : '');
  },
  
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] ${message}`, meta ? meta : '');
  },
  
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, meta ? meta : '');
    }
  }
}; 