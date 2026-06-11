<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import {
		mdiFormatBold,
		mdiFormatItalic,
		mdiFormatListBulleted,
		mdiFormatQuoteClose
	} from '@mdi/js';
	import { IconButton } from '$lib/ui';

	interface Props {
		editor: Editor | null;
	}

	let { editor }: Props = $props();
</script>

<div class="toolbar" aria-label="Post formatting">
	<IconButton
		path={mdiFormatBold}
		label="Bold"
		active={editor?.isActive('bold') ?? false}
		disabled={!editor}
		onClick={() => editor?.chain().focus().toggleBold().run()}
	/>
	<IconButton
		path={mdiFormatItalic}
		label="Italic"
		active={editor?.isActive('italic') ?? false}
		disabled={!editor}
		onClick={() => editor?.chain().focus().toggleItalic().run()}
	/>
	<IconButton
		path={mdiFormatListBulleted}
		label="Bullet list"
		active={editor?.isActive('bulletList') ?? false}
		disabled={!editor}
		onClick={() => editor?.chain().focus().toggleBulletList().run()}
	/>
	<IconButton
		path={mdiFormatQuoteClose}
		label="Quote"
		active={editor?.isActive('blockquote') ?? false}
		disabled={!editor}
		onClick={() => editor?.chain().focus().toggleBlockquote().run()}
	/>
</div>

<style lang="scss">
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		padding: var(--space-2) 0;
		background: transparent;
	}
</style>
