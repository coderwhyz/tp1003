/**
 * 订阅者集合。
 *
 * 现在只管「谁连着」这一件事：广播时无差别地把同一个内容发给所有人。
 *
 * 还没有的：按条件过滤、发送缓冲、连接数上限、以及发送失败的处理。
 */
export class StreamHub {
  #subscribers = new Set();

  get size() {
    return this.#subscribers.size;
  }

  add(subscriber) {
    this.#subscribers.add(subscriber);
  }

  remove(subscriber) {
    return this.#subscribers.delete(subscriber);
  }

  list() {
    return [...this.#subscribers];
  }

  /**
   * 给所有订阅者发同一条 payload。
   *
   * @param {unknown} payload
   * @returns {number} 实际发送的订阅者数量
   */
  broadcast(payload) {
    for (const subscriber of this.#subscribers) {
      subscriber.send(payload);
    }
    return this.#subscribers.size;
  }
}
