# tp1003 — 实时事件推送服务

团队内部的实时推送服务。业务系统把事件 POST 进来，订阅方通过 SSE 长连接实时收到。

## 技术栈与约束

- Node.js 18+（ESM 模块）
- **仅使用 Node.js 内置模块，不引入任何第三方 npm 包**
- 传输：HTTP + Server-Sent Events（SSE）
- 测试：Node.js 内置 `node:test` 与 `node:assert`
- 本地开发无需 Docker

> 约束原因：需要在受限的内网环境中零依赖部署。

## 运行

```bash
node src/server.js --port 7070
```

## 测试

```bash
npm test
```

## 手工试一下

```bash
# 终端 A：订阅
curl -N http://127.0.0.1:7070/api/stream

# 终端 B：发事件
curl -X POST http://127.0.0.1:7070/api/events \
  -H "Content-Type: application/json" \
  -d '{"type":"order.created","payload":{"id":42}}'
```

## 目录结构

```
src/
├── server.js              入口：加载配置、创建 hub、启动监听
├── core/
│   ├── config.js          命令行参数解析
│   ├── logger.js          简易日志
│   └── http.js            请求体读取与 JSON 响应助手
├── stream/
│   ├── sse.js             SSE 响应封装
│   └── hub.js             订阅者集合与广播
└── events/
    └── routes.js          请求分发与接口实现
tests/
└── stream.test.js
```

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 服务状态与当前订阅者数量 |
| GET | `/api/stream` | 建立 SSE 长连接，持续接收事件 |
| POST | `/api/events` | 发布事件，body: `{ type, payload }` |

## SSE 实现的现状

见 `docs/SPEC.md`。目前**没有事件 id、没有心跳、没有断线续传**，payload 里带换行也会让客户端解析出错。
