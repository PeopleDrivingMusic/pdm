<script lang="ts">
	interface Props {
		defaultValue?: number;
		startingValue?: number;
		maxValue?: number;
		className?: string;
		isStepped?: boolean;
		stepSize?: number;
		onChange?: (value: number) => void;
	}

	let {
		defaultValue = 50,
		startingValue = 0,
		maxValue = 100,
		className = '',
		isStepped = false,
		stepSize = 1,
		onChange
	}: Props = $props();

	let value = $state(defaultValue);

	function normalize(nextValue: number) {
		const stepped = isStepped ? Math.round(nextValue / stepSize) * stepSize : nextValue;
		return Math.min(Math.max(stepped, startingValue), maxValue);
	}

	function handleInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		value = normalize(Number(target.value));
		onChange?.(value);
	}
</script>

<div class={`elastic-slider ${className}`}>
	<span class="elastic-slider__icon" aria-hidden="true">-</span>
	<input
		type="range"
		min={startingValue}
		max={maxValue}
		step={isStepped ? stepSize : 1}
		{value}
		oninput={handleInput}
		aria-label="Slider"
	/>
	<span class="elastic-slider__icon" aria-hidden="true">+</span>
	<span class="elastic-slider__value">{Math.round(value)}</span>
</div>

<style lang="scss">
	.elastic-slider {
		display: grid;
		grid-template-columns: auto 1fr auto auto;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		color: var(--text-primary);
	}

	.elastic-slider__icon,
	.elastic-slider__value {
		@include text-xs();
		color: var(--text-secondary);
	}

	input[type='range'] {
		width: 100%;
		accent-color: var(--primary);
	}
</style>
