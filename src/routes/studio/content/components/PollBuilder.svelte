<script lang="ts">
	import { IconButton, Input, Select } from '$lib/ui';
	import { mdiClose, mdiPlus } from '@mdi/js';

	const modeOptions = [
		{ label: 'Single choice', value: 'single' },
		{ label: 'Multiple choice', value: 'multiple' }
	];

	const resultOptions = [
		{ label: 'After vote', value: 'after_vote' },
		{ label: 'Always visible', value: 'always' },
		{ label: 'After close', value: 'after_close' }
	];

	interface Props {
		initialPoll?: {
			question: string | null;
			mode: string;
			showResults: string;
			closesAt: Date | string | null;
			options: Array<{ label: string }>;
		} | null;
	}

	let { initialPoll = null }: Props = $props();
	let pollQuestion = $state('');
	let pollMode = $state('single');
	let pollShowResults = $state('after_vote');
	let pollClosesAt = $state('');
	let optionValues = $state(['', '']);

	function toDatetimeLocal(value: Date | string | null | undefined) {
		if (!value) return '';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
		return offsetDate.toISOString().slice(0, 16);
	}

	function addOption() {
		optionValues = [...optionValues, ''];
	}

	function removeOption(index: number) {
		if (optionValues.length <= 2) return;
		optionValues = optionValues.filter((_, optionIndex) => optionIndex !== index);
	}

	$effect(() => {
		pollQuestion = initialPoll?.question ?? '';
		pollMode = initialPoll?.mode === 'multiple' ? 'multiple' : 'single';
		pollShowResults =
			initialPoll?.showResults === 'always' || initialPoll?.showResults === 'after_close'
				? initialPoll.showResults
				: 'after_vote';
		pollClosesAt = toDatetimeLocal(initialPoll?.closesAt);
		optionValues =
			initialPoll?.options && initialPoll.options.length >= 2
				? initialPoll.options.map((option) => option.label)
				: ['', ''];
	});
</script>

<section class="poll-builder">
	<div class="poll-fields">
		<Input
			label="Question"
			name="pollQuestion"
			placeholder="Optional poll title"
			bind:value={pollQuestion}
		/>
		<div class="grid">
			<Select label="Voting mode" name="pollMode" options={modeOptions} bind:value={pollMode} />
			<Select
				label="Results"
				name="pollShowResults"
				options={resultOptions}
				bind:value={pollShowResults}
			/>
		</div>
		<Input type="datetime-local" label="Close date" name="pollClosesAt" bind:value={pollClosesAt} />

		<div class="options">
			<span class="options-label">Options</span>
			{#each optionValues as _, index (index)}
				<div class="option-row">
					<input
						name="pollOptions"
						placeholder={`Option ${index + 1}`}
						bind:value={optionValues[index]}
						required
					/>
					<IconButton
						path={mdiClose}
						label="Remove option"
						disabled={optionValues.length <= 2}
						onClick={() => removeOption(index)}
					/>
				</div>
			{/each}
			<button type="button" class="add-option" onclick={addOption}>
				<span aria-hidden="true"><svg viewBox="0 0 24 24"><path d={mdiPlus} /></svg></span>
				Add option
			</button>
		</div>
	</div>
</section>

<style lang="scss">
	.poll-builder {
		display: block;
	}

	.grid,
	.option-row {
		display: flex;
		gap: var(--space-3);
	}

	.poll-fields {
		display: grid;
		gap: var(--space-4);
	}

	.grid {
		align-items: flex-start;

		:global(.select-group) {
			flex: 1;
		}
	}

	.options {
		display: grid;
		gap: var(--space-2);

		.options-label {
			color: var(--text-primary);
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
		}
	}

	.option-row {
		align-items: center;

		input {
			width: 100%;
			min-height: 40px;
			padding: var(--space-2) var(--space-3);
			border: 1px solid var(--border-primary);
			border-radius: var(--radius-md);
			background: var(--bg-surface);
			color: var(--text-primary);
		}
	}

	.add-option {
		min-height: 40px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		width: fit-content;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-md);
		background: var(--bg-secondary);
		color: var(--text-primary);
		cursor: pointer;

		svg {
			width: 16px;
			height: 16px;
			fill: currentColor;
		}
	}

	@media (max-width: 640px) {
		.grid {
			flex-direction: column;
		}
	}
</style>
