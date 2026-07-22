/**
 * Move a node to another part of the DOM (default: <body>) for its lifetime.
 * Needed for full-screen overlays/modals so `position: fixed` escapes any
 * ancestor that creates a containing block (e.g. a hover `transform` on a card).
 */
export function portal(node: HTMLElement, target: HTMLElement | string = 'body') {
	const destination = typeof target === 'string' ? document.querySelector(target) : target;
	destination?.appendChild(node);

	return {
		destroy() {
			node.parentNode?.removeChild(node);
		}
	};
}
