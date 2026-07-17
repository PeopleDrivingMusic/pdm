<script lang="ts">
	import { onMount } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Placeholder from '@tiptap/extension-placeholder';

	interface Props {
		editor?: Editor | null;
		initialContent?: Record<string, unknown> | string | null;
	}

	let editorElement: HTMLDivElement;
	let { editor = $bindable(null), initialContent = null }: Props = $props();
	let bodyJson = $state('');
	let bodyHtml = $state('');
	let appliedInitialContent = $state<unknown>(null);

	function syncEditor(nextEditor: Editor) {
		bodyJson = JSON.stringify(nextEditor.getJSON());
		bodyHtml = nextEditor.getHTML();
		editor = nextEditor;
	}

	onMount(() => {
		const instance = new Editor({
			element: editorElement,
			extensions: [
				StarterKit,
				Placeholder.configure({
					placeholder: 'Write an update, add context for a poll, or tease the next release...'
				})
			],
			content: initialContent || '',
			editorProps: {
				attributes: {
					class: 'tiptap-editor__surface'
				}
			},
			onCreate: ({ editor }) => syncEditor(editor),
			onUpdate: ({ editor }) => syncEditor(editor),
			onSelectionUpdate: ({ editor: currentEditor }) => {
				editor = currentEditor;
			}
		});

		editor = instance;

		return () => {
			instance.destroy();
		};
	});

	$effect(() => {
		if (!editor || appliedInitialContent === initialContent) return;
		appliedInitialContent = initialContent;
		editor.commands.setContent(initialContent || '', { emitUpdate: false });
		syncEditor(editor);
	});
</script>

<section class="post-editor">
	<div class="editor-shell">
		<div bind:this={editorElement}></div>
	</div>
	<input type="hidden" name="bodyJson" value={bodyJson} />
	<input type="hidden" name="bodyHtml" value={bodyHtml} />
</section>

<style lang="scss">
	.post-editor {
		overflow: hidden;
		background: transparent;
	}

	.editor-shell {
		min-height: 310px;
		padding: var(--space-3) 0 var(--space-4);
	}

	:global(.tiptap-editor__surface) {
		min-height: 290px;
		color: var(--text-primary);
		font-size: var(--font-size-lg);
		line-height: 1.65;
		outline: none;
	}

	:global(.tiptap-editor__surface p) {
		margin: 0 0 var(--space-3);
	}

	:global(.tiptap-editor__surface ul) {
		padding-left: var(--space-6);
	}

	:global(.tiptap-editor__surface blockquote) {
		margin: var(--space-4) 0;
		padding-left: var(--space-4);
		border-left: 3px solid var(--primary);
		color: var(--text-secondary);
	}

	:global(.tiptap-editor__surface .is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		height: 0;
		color: var(--text-tertiary);
		pointer-events: none;
	}
</style>
