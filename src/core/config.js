import path from 'node:path';

const DEFAULTS = {
  port: 7070,
  data: './data',
};

/**
 * 读取命令行配置。支持 `--key value` 与 `--key=value`。
 *
 * 目前只从命令行读；环境变量和配置文件都还没支持。
 */
export function loadConfig(argv = process.argv) {
  const flags = collectFlags(argv.slice(2));

  return {
    port: positiveInt(flags.port, DEFAULTS.port, 'port', 65535),
    dataDir: path.resolve(String(flags.data ?? DEFAULTS.data)),
  };
}

function collectFlags(args) {
  const flags = {};

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith('--')) continue;

    const body = token.slice(2);
    const eq = body.indexOf('=');
    if (eq !== -1) {
      flags[body.slice(0, eq)] = body.slice(eq + 1);
      continue;
    }

    if (args[i + 1] !== undefined && !args[i + 1].startsWith('--')) {
      flags[body] = args[i + 1];
      i += 1;
      continue;
    }

    flags[body] = true;
  }

  return flags;
}

function positiveInt(raw, fallback, label, upper = Number.MAX_SAFE_INTEGER) {
  if (raw === undefined) return fallback;

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0 || value > upper) {
    throw new Error(`invalid --${label}: ${String(raw)}`);
  }
  return value;
}
