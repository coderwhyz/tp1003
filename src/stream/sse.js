/**
 * SSE（Server-Sent Events）响应的最简封装。
 *
 * 目前只做了两件事：把响应头切成事件流，以及按 `data:` 行写一段文本。
 *
 * 还没实现的部分：
 * - 事件 id（`id:` 行）与断线续传（Last-Event-ID）
 * - 心跳注释行
 * - `retry:` 重连间隔提示
 * - data 内含换行时的多行拆分（现在直接塞进去会让客户端解析出错）
 */

/**
 * 把响应切成 SSE 流，并先发一个注释行表示连接已建立。
 *
 * @param {import('node:http').ServerResponse} res
 * @param {{ comment?: string }} [options]
 */
export function openStream(res, { comment = 'connected' } = {}) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(`: ${comment}\n\n`);
}

/**
 * 写一条只有 data 字段的事件。
 *
 * @param {import('node:http').ServerResponse} res
 * @param {unknown} payload 字符串按原样发送，其它类型会 JSON 序列化
 */
export function writeData(res, payload) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  res.write(`data: ${text}\n\n`);
}

/** 结束事件流。 */
export function closeStream(res) {
  res.end();
}
