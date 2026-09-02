/**
 * Who may see real chat content, as opposed to the masked teaser.
 *
 * The history endpoint and the live stream ask this same question in two different
 * shapes — one refuses with `not_subscribed`, the other swaps messages for teasers — so
 * the rule lives in one place. Two copies of a boolean is how a room ends up readable in
 * the history and masked in the stream.
 */
export function canReadChatContent(input: {
	isSubscriber: boolean;
	/** The artist who owns the room; they cannot subscribe to themselves. */
	isOwner: boolean;
	/**
	 * An imported page. Nobody owns it and nobody is its subscriber, so gating reads
	 * would leave the room permanently unreadable by every single visitor. Writing is
	 * NOT opened by this — Subscribe stays the conversion event.
	 */
	isSeeded: boolean;
}): boolean {
	return input.isSubscriber || input.isOwner || input.isSeeded;
}
