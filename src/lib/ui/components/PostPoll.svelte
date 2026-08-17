<script lang="ts">
	import { enhance } from '$app/forms';
	import { mdiCheckCircleOutline, mdiPoll, mdiVoteOutline } from '@mdi/js';
	import SvgIcon from '../SvgIcon.svelte';

	type PollOption = {
		id: string;
		label: string;
		votes: number;
		selected: boolean;
	};

	type Poll = {
		id: string;
		question: string | null;
		mode: string;
		showResults: string;
		closesAt: Date | string | null;
		totalVotes: number;
		hasVoted: boolean;
		options: PollOption[];
	};

	const { poll }: { poll: Poll } = $props();

	const isClosed = $derived(
		poll.closesAt ? new Date(poll.closesAt).getTime() <= Date.now() : false
	);
	const canShowResults = $derived(
		poll.showResults === 'always' ||
			poll.hasVoted ||
			(poll.showResults === 'after_close' && isClosed)
	);

	function percent(votes: number) {
		if (!poll.totalVotes) return 0;
		return Math.round((votes / poll.totalVotes) * 100);
	}
</script>

<section class="post-poll" aria-label="Poll">
	<div class="poll-head">
		<div class="poll-icon">
			<SvgIcon path={mdiPoll} size={20} />
		</div>
		<div>
			{#if poll.question}
				<h4>{poll.question}</h4>
			{/if}
			<p>
				{poll.mode === 'multiple' ? 'Multiple choice' : 'Single choice'} · {poll.totalVotes} votes
			</p>
		</div>
	</div>

	<div class="poll-options">
		{#each poll.options as option (option.id)}
			<form method="POST" action="?/votePoll" use:enhance>
				<input type="hidden" name="pollId" value={poll.id} />
				<input type="hidden" name="optionId" value={option.id} />
				<button
					type="submit"
					class="poll-option"
					class:is-selected={option.selected}
					disabled={isClosed}
					aria-label={`Vote for ${option.label}`}
				>
					{#if canShowResults}
						<span class="result-bar" style:width={`${percent(option.votes)}%`}></span>
					{/if}
					<span class="option-copy">
						<span class="option-label">
							{#if option.selected}
								<SvgIcon path={mdiCheckCircleOutline} size={17} />
							{:else}
								<SvgIcon path={mdiVoteOutline} size={17} />
							{/if}
							{option.label}
						</span>
						{#if canShowResults}
							<span class="option-result">{percent(option.votes)}%</span>
						{/if}
					</span>
				</button>
			</form>
		{/each}
	</div>

	{#if isClosed}
		<p class="poll-note">Poll closed</p>
	{:else if poll.showResults === 'after_vote' && !poll.hasVoted}
		<p class="poll-note">Results unlock after your vote.</p>
	{/if}
</section>

<style lang="scss">
	.post-poll {
		width: min(100%, 520px);
		display: grid;
		gap: var(--space-3);
		margin-top: var(--space-4);
		padding: var(--space-4);
		border: 1px solid color-mix(in srgb, var(--primary) 34%, var(--border-primary));
		border-radius: var(--radius-lg);
		background:
			linear-gradient(135deg, color-mix(in srgb, var(--primary) 15%, transparent), transparent 58%),
			color-mix(in srgb, var(--bg-surface) 82%, var(--bg-primary));
	}

	.poll-head {
		display: grid;
		grid-template-columns: 40px minmax(0, 1fr);
		gap: var(--space-3);
		align-items: start;

		h4 {
			margin: 0;
			color: var(--text-primary);
			font-size: var(--font-size-lg);
			line-height: 1.25;
		}

		p {
			margin: var(--space-1) 0 0;
			color: var(--text-tertiary);
			font-size: var(--font-size-xs);
		}
	}

	.poll-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--primary) 16%, var(--bg-tertiary));
		color: var(--primary);
	}

	.poll-options {
		display: grid;
		gap: var(--space-2);
	}

	.poll-option {
		position: relative;
		width: 100%;
		min-height: 46px;
		overflow: hidden;
		padding: var(--space-3);
		border: 1px solid color-mix(in srgb, var(--border-primary) 70%, transparent);
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--bg-primary) 28%, var(--bg-surface));
		color: var(--text-primary);
		text-align: left;
		cursor: pointer;
		transition:
			border-color var(--duration-fast) var(--easing-ease-out),
			transform var(--duration-fast) var(--easing-ease-out);

		&:hover:not(:disabled) {
			transform: translateY(-1px);
			border-color: color-mix(in srgb, var(--primary) 58%, var(--border-primary));
		}

		&:focus-visible {
			outline: 2px solid var(--border-focus);
			outline-offset: 3px;
		}

		&:disabled {
			cursor: not-allowed;
			opacity: 0.76;
		}

		&.is-selected {
			border-color: color-mix(in srgb, var(--primary) 72%, var(--border-primary));
		}
	}

	.result-bar {
		position: absolute;
		inset: 0 auto 0 0;
		width: 0;
		background: color-mix(in srgb, var(--primary) 22%, transparent);
		transition: width var(--duration-normal) var(--easing-ease-out);
	}

	.option-copy {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.option-label {
		min-width: 0;
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--font-size-sm);
		font-weight: 700;
	}

	.option-result {
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		font-weight: 700;
	}

	.poll-note {
		margin: 0;
		color: var(--text-tertiary);
		font-size: var(--font-size-xs);
	}
</style>
