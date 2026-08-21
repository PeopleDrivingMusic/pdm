/**
 * A minimal push-based async queue: producers call `push`, one consumer drains it
 * via `iterate()`. Bridges callback-based event sources (Postgres LISTEN, an
 * EventEmitter) into a single `for await` loop, which is what `getChatRoom` needs
 * to merge message events and presence events into one stream.
 */
export function createAsyncQueue<T>() {
	const buffer: T[] = [];
	const waiters: Array<(result: IteratorResult<T>) => void> = [];
	let closed = false;

	function push(value: T): void {
		if (closed) return;
		const waiter = waiters.shift();
		if (waiter) waiter({ value, done: false });
		else buffer.push(value);
	}

	function close(): void {
		if (closed) return;
		closed = true;
		while (waiters.length > 0) {
			waiters.shift()!({ value: undefined as never, done: true });
		}
	}

	async function* iterate(): AsyncGenerator<T> {
		while (true) {
			if (buffer.length > 0) {
				yield buffer.shift() as T;
				continue;
			}
			if (closed) return;
			const result = await new Promise<IteratorResult<T>>((resolve) => waiters.push(resolve));
			if (result.done) return;
			yield result.value;
		}
	}

	return { push, close, iterate };
}
