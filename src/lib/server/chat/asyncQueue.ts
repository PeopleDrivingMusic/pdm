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

	function iterate(): AsyncGenerator<T> {
		async function* gen(): AsyncGenerator<T> {
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

		const generator = gen();
		// A generator's own `.return()` (from a consumer's `for await` `break`, or
		// called directly) can't take effect while it's suspended inside the
		// `await` above — that await has no way to observe the return request,
		// so without this it would hang forever unless some *other* caller
		// happens to `push`/`close` independently. Resolving this iterator's own
		// pending wait first lets the generator's `finally`-less loop above settle
		// immediately instead of deadlocking a caller that gives up.
		const originalReturn = generator.return.bind(generator);
		generator.return = (async (value?: T | PromiseLike<T>) => {
			const waiter = waiters.shift();
			if (waiter) waiter({ value: undefined as never, done: true });
			return originalReturn(value);
		}) as typeof generator.return;

		return generator;
	}

	return { push, close, iterate };
}
