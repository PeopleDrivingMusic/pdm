<script lang="ts">
	import { Button, Input, Link, notificationStore } from '$lib/ui';
	import { page } from '$app/state';
	import { enhance, applyAction } from '$app/forms';

	const form = $derived(page.form);
	const formError = $derived(form?.error as string | undefined);
	const hasError = $derived(!!formError);
	let login = $state('');
	let password = $state('');
	let loading = $state(false);
</script>

<svelte:head>
	<title>Artist Studio Login - PDM</title>
	<meta name="description" content="Log in to your artist studio" />
</svelte:head>

<div class="artist-login-wrapper">
	<div class="form-wrapper">
		<div class="form-container">
			<div class="form-header">
				<h1>Artist Studio</h1>
				<p>Log in to manage your music</p>
			</div>

			<form
				method="POST"
				action="?/login"
				use:enhance={() => {
					loading = true;
					return async ({ result }) => {
						loading = false;
						if (result.type === 'redirect') {
							notificationStore.success('Welcome back!');
						} else if (result.type === 'failure') {
							notificationStore.error(result.data?.error || 'An error occurred');
						}
						await applyAction(result);
					};
				}}
			>
				<Input
					label="Login"
					type="text"
					name="login"
					placeholder="artist_login"
					bind:value={login}
					error={hasError}
					required
				/>

				<Input
					label="Password"
					type="password"
					name="password"
					placeholder="••••••••"
					bind:value={password}
					error={hasError}
					required
				/>

				<div class="form-buttons">
					<Button type="submit" variant="primary" disabled={loading} full={true}>
						{loading ? 'Signing in...' : 'Sign in'}
					</Button>
					{#if hasError}
						<div class="error-message">{formError}</div>
					{/if}
				</div>
			</form>

			<div class="form-footer">
				<Link color="primary" href="/">Back home</Link>
				<span class="footer-separator">•</span>
				<Link color="primary" href="/artist/register">Register as artist</Link>
			</div>
		</div>
	</div>

	<div class="logo-wrapper">
		<div class="dashboard-preview">
			<div class="preview-placeholder">
				<h2>PDM</h2>
				<p>Creator tools for your next release</p>
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.artist-login-wrapper {
		display: flex;
		min-height: 100vh;
		width: 100%;
		background-color: var(--bg-primary);

		.form-wrapper,
		.logo-wrapper {
			flex: 1;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: var(--space-4, 2rem);
		}

		.error-message {
			margin-top: 0.5rem;
			color: var(--text-error, #dc2626);
			font-size: 0.875rem;
			text-align: center;
		}
	}

	.form-container {
		width: 100%;
		max-width: 420px;

		.form-header {
			text-align: center;
			margin-bottom: 2rem;

			h1 {
				font-size: 2rem;
				font-weight: 600;
				color: var(--text-on-primary);
				margin: 0 0 0.5rem 0;
			}

			p {
				color: var(--text-tertiary);
				margin: 0;
				font-size: 16px;
			}
		}

		form {
			display: flex;
			flex-direction: column;
			gap: 1.5rem;
		}

		.form-buttons {
			display: flex;
			flex-direction: column;
			gap: 1rem;
		}

		.form-footer {
			text-align: center;
			margin-top: 2rem;
			color: var(--text-tertiary);
			display: flex;
			justify-content: center;
			gap: 0.75rem;
			align-items: center;
		}

		.footer-separator {
			color: var(--text-tertiary);
		}
	}

	.logo-wrapper {
		background: linear-gradient(
			135deg,
			var(--color-brand-600) 0%,
			var(--color-brand-800) 50%,
			var(--bg-tertiary) 100%
		);
		position: relative;

		.preview-placeholder {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 0.5rem;
			padding: 2.5rem;
			color: #fff;
			text-align: center;
			background: rgba(0, 0, 0, 0.15);
			border-radius: 24px;
			backdrop-filter: blur(6px);
		}

		h2 {
			font-size: 2.25rem;
			margin: 0;
		}

		p {
			margin: 0;
			font-size: 1rem;
			opacity: 0.9;
		}
	}

	@media (max-width: 900px) {
		.artist-login-wrapper {
			flex-direction: column;
		}

		.logo-wrapper {
			width: 100%;
			min-height: 280px;
		}
	}
</style>
