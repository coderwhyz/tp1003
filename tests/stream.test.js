import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { StreamHub } from '../src/stream/hub.js';
import { handleRequest } from '../src/events/routes.js';
import { createLogger } from '../src/core/logger.js';

const logger = createLogger('error');

/** 起一个真实的 HTTP 服务。 */
async function startServer() {
  const hub = new StreamHub();
  const server = http.createServer((req, res) => handleRequest(req, res, { hub, logger }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    hub,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections?.();
      }),
  };
}

/**
 * 打开一条真实的 SSE 连接，提供按帧读取的 next()。
 * 帧之间用空行分隔。
 */
async function openStream(baseUrl) {
  const controller = new AbortController();
  const res = await fetch(`${baseUrl}/api/stream`, { signal: controller.signal });

  let text = '';
  let cursor = 0;

  const drained = (async () => {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
  })().catch(() => {});

  return {
    status: res.status,
    contentType: res.headers.get('content-type'),
    async next(timeoutMs = 3000) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const index = text.indexOf('\n\n', cursor);
        if (index !== -1) {
          const frame = text.slice(cursor, index);
          cursor = index + 2;
          return frame;
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      throw new Error(`timeout waiting for SSE frame; received so far: ${JSON.stringify(text)}`);
    },
    async close() {
      controller.abort();
      await drained;
    },
  };
}

/* ------------------------------------------------------------------ 接口 */

test('health 返回当前订阅者数量', async () => {
  const env = await startServer();
  try {
    const body = await (await fetch(`${env.baseUrl}/api/health`)).json();
    assert.equal(body.status, 'ok');
    assert.equal(body.subscribers, 0);
  } finally {
    await env.close();
  }
});

test('建立 SSE 连接后立刻收到一条注释帧', async () => {
  const env = await startServer();
  const stream = await openStream(env.baseUrl);
  try {
    assert.equal(stream.status, 200);
    assert.match(stream.contentType, /text\/event-stream/);

    const frame = await stream.next();
    assert.match(frame, /^: /);
  } finally {
    await stream.close();
    await env.close();
  }
});

test('发布的事件会推送给已连接的订阅者', async () => {
  const env = await startServer();
  const stream = await openStream(env.baseUrl);
  try {
    await stream.next(); // 吃掉注释帧

    const res = await fetch(`${env.baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'order.created', payload: { id: 42 } }),
    });
    assert.equal(res.status, 202);

    const body = await res.json();
    assert.equal(body.delivered, 1);

    const frame = await stream.next();
    assert.match(frame, /^data: /);

    const data = JSON.parse(frame.slice('data: '.length));
    assert.equal(data.type, 'order.created');
    assert.deepEqual(data.payload, { id: 42 });
  } finally {
    await stream.close();
    await env.close();
  }
});

test('多个订阅者都能收到同一个事件', async () => {
  const env = await startServer();
  const first = await openStream(env.baseUrl);
  const second = await openStream(env.baseUrl);
  try {
    await first.next();
    await second.next();

    const res = await fetch(`${env.baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'ping' }),
    });
    assert.equal((await res.json()).delivered, 2);

    assert.equal(JSON.parse((await first.next()).slice('data: '.length)).type, 'ping');
    assert.equal(JSON.parse((await second.next()).slice('data: '.length)).type, 'ping');
  } finally {
    await first.close();
    await second.close();
    await env.close();
  }
});

test('订阅者断开后会从 hub 里移除', async () => {
  const env = await startServer();
  const stream = await openStream(env.baseUrl);
  try {
    await stream.next();
    assert.equal(env.hub.size, 1);

    await stream.close();

    const deadline = Date.now() + 2000;
    while (env.hub.size > 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal(env.hub.size, 0);
  } finally {
    await stream.close();
    await env.close();
  }
});

test('缺少 type 字段时返回 400', async () => {
  const env = await startServer();
  try {
    const res = await fetch(`${env.baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: { id: 1 } }),
    });
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /type is required/);
  } finally {
    await env.close();
  }
});
