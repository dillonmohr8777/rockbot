export class AsyncPushQueue<T> implements AsyncIterable<T> {
  private items: T[] = [];
  private waiters: Array<{
    resolve: (value: IteratorResult<T>) => void;
    reject: (error: Error) => void;
  }> = [];
  private closed = false;
  private failure: Error | undefined;

  push(item: T): void {
    if (this.closed) return;
    const waiter = this.waiters.shift();
    if (waiter) waiter.resolve({ value: item, done: false });
    else this.items.push(item);
  }

  close(): void {
    this.closed = true;
    while (this.waiters.length) this.waiters.shift()!.resolve({ value: undefined as T, done: true });
  }

  fail(error: Error): void {
    this.failure = error;
    this.closed = true;
    while (this.waiters.length) this.waiters.shift()!.reject(error);
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: async () => {
        if (this.items.length) return { value: this.items.shift()!, done: false };
        if (this.failure) throw this.failure;
        if (this.closed) return { value: undefined as T, done: true };
        return new Promise<IteratorResult<T>>((resolve, reject) => this.waiters.push({ resolve, reject }));
      },
    };
  }
}
