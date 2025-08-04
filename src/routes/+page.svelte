<script lang="ts">
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import DesignSystemDemo from '$lib/components/DesignSystemDemo.svelte';
	
	let showDesignSystem = false;
</script>

<div class="theme-toggle-wrapper">
	<ThemeToggle />
</div>

<div class="design-toggle-wrapper">
	<button 
		class="design-toggle-btn"
		on:click={() => showDesignSystem = !showDesignSystem}
	>
		{showDesignSystem ? 'Hide' : 'Show'} Design System
	</button>
</div>

{#if showDesignSystem}
	<DesignSystemDemo />
{:else}
	<div class="container">
		<main class="hero">
			<h1 class="hero-title">PDM</h1>
			<h2 class="hero-subtitle">People Driving Music</h2>
			<p class="hero-description">
				Revolutionizing music discovery and sharing through blockchain technology on the Sui network.
			</p>
			<div class="hero-actions">
				<button class="btn primary">Get Started</button>
				<a href="https://github.com/PeopleDrivingMusic/pdm" class="btn secondary">Learn More</a>
			</div>
		</main>
	</div>
{/if}

<style lang="scss">
	@use '../styles/variables' as mixins;
	
	.design-toggle-wrapper {
		position: fixed;
		top: var(--space-6);
		left: var(--space-6);
		z-index: var(--z-fixed);
	}

	.design-toggle-btn {
		@include mixins.text-sm();
		@include mixins.font-semibold();
		padding: var(--space-2) var(--space-4);
		background: var(--primary);
		color: var(--text-on-primary);
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-normal) var(--easing-ease-out);
		box-shadow: var(--shadow-sm);

		&:hover {
			background: var(--primary-hover);
			box-shadow: var(--shadow-md);
			transform: translateY(-1px);
		}

		&:active {
			transform: translateY(0);
		}
	}
	
	.theme-toggle-wrapper {
		position: fixed;
		top: var(--space-6);
		right: var(--space-6);
		z-index: var(--z-fixed);
	}
	
	.container {
		@include mixins.container();
	}
	
	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 80vh;
		text-align: center;
		padding: var(--space-20) 0;
		
		&-title {
			@include mixins.text-display-2xl();
			background: linear-gradient(135deg, var(--primary) 0%, var(--brand-300) 100%);
			background-clip: text;
			-webkit-background-clip: text;
			-webkit-text-fill-color: transparent;
			margin-bottom: var(--space-2);
		}
		
		&-subtitle {
			@include mixins.text-display-sm();
			@include mixins.font-medium();
			color: var(--text-secondary);
			margin-bottom: var(--space-6);
		}
		
		&-description {
			@include mixins.text-lg();
			color: var(--text-secondary);
			margin-bottom: var(--space-10);
			max-width: 600px;
			line-height: 1.6;
		}
		
		&-actions {
			display: flex;
			gap: var(--space-4);
			flex-wrap: wrap;
			justify-content: center;
		}
	}
	
	.btn {
		@include mixins.button-base();
		
		&.primary {
			@include mixins.button-primary();
		}
		
		&.secondary {
			@include mixins.button-outline();
		}
	}
	
	@include mixins.tablet-up {
		.theme-toggle-wrapper {
			top: var(--space-4);
			right: var(--space-4);
		}
		
		.design-toggle-wrapper {
			top: var(--space-4);
			left: var(--space-4);
		}
		
		.hero {
			padding: var(--space-16) var(--space-4);
			
			&-title {
				@include mixins.text-display-lg();
			}
			
			&-subtitle {
				@include mixins.text-display-xs();
				@include mixins.font-medium();
			}
			
			&-description {
				@include mixins.text-md();
			}
			
			&-actions {
				flex-direction: column;
				align-items: center;
				width: 100%;
				
				.btn {
					width: 100%;
					max-width: 300px;
				}
			}
		}
	}
</style>
