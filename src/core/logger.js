const LEVELS = ['debug', 'info', 'warn', 'error'];

/**
 * 简易日志，普通级别写 stdout、error 级别写 stderr。
 *
 * 目前是人类可读的文本格式；如需被日志系统采集，应改为结构化输出。
 */
export function createLogger(level = 'info') {
  const threshold = Math.max(0, LEVELS.indexOf(level));

  const write = (name, message) => {
    if (LEVELS.indexOf(name) < threshold) return;
    const stream = name === 'error' ? process.stderr : process.stdout;
    stream.write(`[${new Date().toISOString()}] ${name.toUpperCase().padEnd(5)} ${message}\n`);
  };

  return {
    debug: (message) => write('debug', message),
    info: (message) => write('info', message),
    warn: (message) => write('warn', message),
    error: (message) => write('error', message),
  };
}
