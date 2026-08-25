import { describe, it, expect } from 'vitest';
import { createAsyncQueue } from './asyncQueue';

describe('createAsyncQueue', () => {
	it('delivers a value pushed before iteration starts', async () => {
		const queue = createAsyncQueue<number>();
		queue.push(1);

		const iterator = queue.iterate();
		const result = await iterator.next();
		expect(result).toEqual({ value: 1, done: false });
	});

	it('delivers a value pushed after iteration has started waiting', async () => {
		const queue = createAsyncQueue<number>();
		const iterator = queue.iterate();

		const pending = iterator.next();
		queue.push(42);

		expect(await pending).toEqual({ value: 42, done: false });
	});

	it('delivers values in push order', async () => {
		const queue = createAsyncQueue<number>();
		queue.push(1);
		queue.push(2);
		queue.push(3);

		const iterator = queue.iterate();
		expect((await iterator.next()).value).toBe(1);
		expect((await iterator.next()).value).toBe(2);
		expect((await iterator.next()).value).toBe(3);
	});

	it('ends iteration cleanly when closed while a consumer is waiting', async () => {
		const queue = createAsyncQueue<number>();
		const iterator = queue.iterate();

		const pending = iterator.next();
		queue.close();

		expect(await pending).toEqual({ value: undefined, done: true });
	});

	it('settles a pending next() when the consumer gives up via return(), with no push or close', async () => {
		const queue = createAsyncQueue<number>();
		const iterator = queue.iterate();

		const pending = iterator.next();
		const returned = await iterator.return(undefined);

		expect(returned).toEqual({ value: undefined, done: true });
		expect(await pending).toEqual({ value: undefined, done: true });
	});

	it('drops a push that arrives after close', async () => {
		const queue = createAsyncQueue<number>();
		queue.close();
		queue.push(1);

		const iterator = queue.iterate();
		expect(await iterator.next()).toEqual({ value: undefined, done: true });
	});
});
