# tp1003 推送协议与接口约定

## 传输

- HTTP + Server-Sent Events（SSE）
- 订阅端点：`GET /api/stream`
- 响应头：`Content-Type: text/event-stream; charset=utf-8`

## 事件帧格式

当前只发一种帧——只有 `data` 字段：

```
data: {"type":"order.created","payload":{"id":42}}

```

（末尾需要一个空行表示帧结束）

连接建立时会先发一个注释帧，客户端可以据此确认连接已就绪：

```
: subscriber sub_a1b2c3d4

```

## 当前不支持（后续迭代）

- 事件 `id:` 行
- 断线续传（请求头 `Last-Event-ID`）
- 心跳注释行
- `retry:` 重连间隔提示
- payload 内含换行时的多行 data 拆分
- 按事件类型过滤订阅
- 慢客户端的缓冲与丢弃策略
- 连接数上限

## 接口约定

### POST /api/events

```json
{ "type": "order.created", "payload": { "id": 42 } }
```

- `type` 必填，必须是非空字符串
- 响应 `202`，body 为 `{ "delivered": <订阅者数量> }`

### GET /api/stream

- 建立长连接，保持打开直到客户端断开
- 每收到一个事件，推送一帧 `data`

### GET /api/health

返回 `{ "status": "ok", "subscribers": <当前订阅者数量> }`

### 错误响应

统一为 `{ "error": "<message>" }`。
