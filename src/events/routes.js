import crypto from 'node:crypto';

import { openStream, writeData } from '../stream/sse.js';
import { readJsonBody, sendJson, sendError } from '../core/http.js';

/**
 * 请求分发与接口实现。
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {{ hub: object, logger: object }} context
 */
export async function handleRequest(req, res, context) {
  const { hub, logger } = context;
  const { pathname } = new URL(req.url, 'http://localhost');

  try {
    if (req.method === 'GET' && pathname === '/api/health') {
      sendJson(res, 200, { status: 'ok', subscribers: hub.size });
      return;
    }

    // 订阅：建立一条 SSE 长连接，直到客户端断开才结束
    if (req.method === 'GET' && pathname === '/api/stream') {
      const subscriber = {
        id: `sub_${crypto.randomBytes(4).toString('hex')}`,
        send: (payload) => writeData(res, payload),
      };

      openStream(res, { comment: `subscriber ${subscriber.id}` });
      hub.add(subscriber);
      logger.info(`subscriber connected: ${subscriber.id} (${hub.size} total)`);

      req.on('close', () => {
        hub.remove(subscriber);
        logger.info(`subscriber disconnected: ${subscriber.id} (${hub.size} left)`);
      });
      return;
    }

    // 发布事件：广播给当前所有订阅者
    if (req.method === 'POST' && pathname === '/api/events') {
      const body = (await readJsonBody(req)) ?? {};
      const { type, payload } = body;

      if (typeof type !== 'string' || type.trim() === '') {
        sendError(res, 400, 'type is required');
        return;
      }

      const delivered = hub.broadcast({ type: type.trim(), payload: payload ?? null });
      logger.info(`event '${type.trim()}' broadcast to ${delivered} subscriber(s)`);
      sendJson(res, 202, { delivered });
      return;
    }

    sendError(res, 404, 'not found');
  } catch (err) {
    if (err.status) {
      sendError(res, err.status, err.message);
      return;
    }
    logger.error(`request failed: ${err.message}`);
    if (!res.headersSent) sendError(res, 500, 'internal error');
  }
}
