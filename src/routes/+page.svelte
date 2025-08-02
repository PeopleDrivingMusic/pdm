<script lang="ts">
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
</script>

<div class="theme-toggle-wrapper">
	<ThemeToggle />
</div>

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

<style lang="scss">
	@use '../styles/variables' as vars;
	
	.theme-toggle-wrapper {
		position: fixed;
		top: vars.$spacing-lg;
		right: vars.$spacing-lg;
		z-index: 1000;
	}
	
	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 80vh;
		text-align: center;
		padding: vars.$spacing-xl 0;
		
		&-title {
			font-size: 4rem;
			font-weight: 900;
			background: var(--gradient-primary);
			background-clip: text;
			-webkit-background-clip: text;
			-webkit-text-fill-color: transparent;
			margin-bottom: vars.$spacing-sm;
			letter-spacing: -0.02em;
		}
		
		&-subtitle {
			font-size: vars.$font-xxl;
			color: var(--text-secondary);
			margin-bottom: vars.$spacing-lg;
			font-weight: 300;
		}
		
		&-description {
			font-size: vars.$font-lg;
			color: var(--text-secondary);
			margin-bottom: vars.$spacing-xl;
			max-width: 600px;
			line-height: 1.6;
		}
		
		&-actions {
			display: flex;
			gap: vars.$spacing-md;
			flex-wrap: wrap;
			justify-content: center;
		}
	}
	
	@media (max-width: vars.$breakpoint-md) {
		.theme-toggle-wrapper {
			top: vars.$spacing-md;
			right: vars.$spacing-md;
		}
		
		.hero {
			&-title {
				font-size: 3rem;
			}
			
			&-subtitle {
				font-size: vars.$font-xl;
			}
			
			&-description {
				font-size: vars.$font-md;
				padding: 0 vars.$spacing-md;
			}
			
			&-actions {
				flex-direction: column;
				align-items: center;
			}
		}
	}
</style>
