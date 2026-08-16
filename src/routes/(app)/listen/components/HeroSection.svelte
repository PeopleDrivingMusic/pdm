<script lang="ts">
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import { mdiPlay, mdiMusicBox } from '@mdi/js';
	import { Button } from '$lib/ui';

	const greeting = new Date().getHours() < 12 ? 'Good Morning' : 'Good Afternoon';
</script>

<section class="hero-section">
	<div class="hero-bg"></div>

	<div class="hero-content">
		<div class="hero-text">
			<h1 class="hero-title">{greeting}! 🎵</h1>
			<p class="hero-subtitle">Ready to discover your next favorite song?</p>
		</div>

		<div class="hero-actions">
			<div>
				<Button variant="primary" size="lg">
					<SvgIcon path={mdiPlay} size={20} />
					Start Listening
				</Button>
			</div>
			<div>
				<Button variant="secondary" size="lg">
					<SvgIcon path={mdiMusicBox} size={20} />
					Browse Playlists
				</Button>
			</div>
		</div>
	</div>

	<div class="hero-illustration">
		<div class="music-note">♪</div>
		<div class="music-note">♫</div>
		<div class="music-note">♪</div>
	</div>
</section>

<style lang="scss">
	.hero-section {
		position: relative;
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--space-8);
		align-items: center;
		padding: var(--space-12) var(--space-6);
		border-radius: var(--radius-xl);
		margin: 0 var(--space-6);
		overflow: hidden;

		@media (max-width: 768px) {
			grid-template-columns: 1fr;
			padding: var(--space-8) var(--space-4);
			margin: 0;
		}
	}

	.hero-bg {
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-purple-600) 100%);
		z-index: -1;

		@media (prefers-color-scheme: dark) {
			background: linear-gradient(135deg, var(--color-brand-900) 0%, var(--color-purple-900) 100%);
		}

		&::before {
			content: '';
			position: absolute;
			width: 400px;
			height: 400px;
			border-radius: 50%;
			background: rgba(255, 255, 255, 0.1);
			top: -100px;
			right: -50px;
		}

		&::after {
			content: '';
			position: absolute;
			width: 300px;
			height: 300px;
			border-radius: 50%;
			background: rgba(255, 255, 255, 0.05);
			bottom: -50px;
			left: 100px;
		}
	}

	.hero-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		color: var(--color-white);
		position: relative;
		z-index: 1;
	}

	.hero-text {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.hero-title {
		margin: 0;
		@include text-display-lg();
		font-weight: 700;
	}

	.hero-subtitle {
		margin: 0;
		@include text-lg();
		opacity: 0.95;
	}

	.hero-actions {
		display: flex;
		gap: var(--space-4);
		flex-wrap: wrap;

		@media (max-width: 768px) {
			flex-direction: column;
		}
	}

	.hero-illustration {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
		font-size: 80px;
		opacity: 0.3;
		animation: float 3s ease-in-out infinite;

		@media (max-width: 768px) {
			display: none;
		}
	}

	.music-note {
		animation: bounce 1s ease-in-out infinite;

		&:nth-child(2) {
			animation-delay: 0.2s;
			font-size: 100px;
		}

		&:nth-child(3) {
			animation-delay: 0.4s;
		}
	}

	@keyframes float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-20px);
		}
	}

	@keyframes bounce {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-30px);
		}
	}
</style>
