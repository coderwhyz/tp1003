const MAX_BODY_BYTES = 1024 * 1024;

/**
 * 读请求体并解析为 JSON。
 *
 * 空请求体返回 undefined；body 非法或超限时抛出带 status 字段的错误。
 */
export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy();
        const err = new Error('request body too large');
        err.status = 413;
        reject(err);
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (raw === '') {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        const err = new Error('invalid JSON body');
        err.status = 400;
        reject(err);
      }
    });

    req.on('error', reject);
  });
}

/** 发送 JSON 响应。 */
export function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

/** 发送错误响应，统一为 { error: string } 结构。 */
export function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}
