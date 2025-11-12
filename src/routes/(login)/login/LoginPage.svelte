<script lang="ts">
	import { Button, Input, Link, Checkbox } from '$lib/ui';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';

	// const error =  $page.url.searchParams.get('error');
	const error = $derived(page.url.searchParams.get('error'));
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let rememberMe = $state(false);
	let loading = $state(false);
	let mode = $state('login');

	function switchMode(event: MouseEvent, newMode: 'login' | 'register') {
		event.preventDefault();
		mode = newMode;
	}
</script>

<svelte:head>
	<title>Welcome to PDM Universe</title>
	<meta name="description" content="Welcome to People Driving Music" />
</svelte:head>

<div class="login-wrapper">
	<div class="form-wrapper">
		<div class="form-container">
			<div class="form-header">
				<h1>Welcome</h1>
				<p>Log in to People Driving Music</p>
			</div>

			{#if error}
				<div class="error-message">
					{#if error === 'oauth_error'}
						An error occurred while logging in with Google. Please try again.
					{:else if error === 'invalid_credentials'}
						Invalid email or password.
					{:else}
						An error occurred. Please try again.
					{/if}
				</div>
			{/if}
			<form
				method="POST"
				action="?/{mode}"
				use:enhance={() => {
					loading = true;
					return ({ result }) => {
						loading = false;
					};
				}}
			>
				<Input
					label="Email"
					type="email"
					name="email"
					placeholder="your@email.com"
					bind:value={email}
					required
				/>

				<Input
					label="Password"
					type="password"
					name="password"
					placeholder="Enter your password"
					bind:value={password}
					required
				/>
				{#if mode === 'register'}
					<Input
						label="Confirm Password"
						type="password"
						name="confirmPassword"
						placeholder="Confirm your password"
						bind:value={confirmPassword}
						required
					/>
				{/if}
				{#if mode === 'login'}
					<div class="form-options">
						<Checkbox id="remember" label="Remember for 30 days" bind:checked={rememberMe} />

						<Link color="primary">Forgot password?</Link>
					</div>
				{/if}

				<div class="form-buttons">
					<Button type="submit" variant="primary" disabled={loading}>
						{#if mode === 'register'}
							{loading ? 'Creating...' : 'Create account'}
						{:else}
							{loading ? 'Signing in...' : 'Sign in'}
						{/if}
					</Button>

					<Button type="button" variant="google" href="/login/google">
						<svg width="18" height="18" viewBox="0 0 18 18">
							<path
								fill="#4285F4"
								d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"
							/>
							<path
								fill="#34A853"
								d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.53H1.83v2.07A8 8 0 0 0 8.98 17z"
							/>
							<path
								fill="#FBBC05"
								d="M4.5 10.49a4.8 4.8 0 0 1 0-3.07V5.35H1.83a8 8 0 0 0 0 7.22l2.67-2.08z"
							/>
							<path
								fill="#EA4335"
								d="M8.98 4.72c1.16 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.35L4.5 7.42a4.77 4.77 0 0 1 4.48-2.7z"
							/>
						</svg>
						Sign in with Google
					</Button>
				</div>
			</form>

			<div class="form-footer">
				{#if mode === 'register'}
					<span>Already have an account?</span>
					<Link color="primary" onclick={(e) => switchMode(e, 'login')}>Sign in</Link>
				{:else}
					<span>Don't have an account?</span>
					<Link color="primary" onclick={(e) => switchMode(e, 'register')}>Create account</Link>
				{/if}
			</div>
		</div>
	</div>

	<div class="logo-wrapper">
		<div class="dashboard-preview">
			<div class="preview-placeholder">
				<h2>PDM</h2>
				<p>Music revolution is here</p>
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.login-wrapper {
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
	}

	.form-container {
		width: 100%;
		max-width: 400px;

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

		.form-options {
			display: flex;
			justify-content: space-between;
			align-items: center;
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

			span {
				margin-right: 0.5rem;
			}
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
			align-items: center;
			justify-content: center;
			flex-direction: column;
			h2 {
				@include text-display-2xl();
			}
		}
	}

	/* Responsive */
	@media (max-width: 768px) {
		.login-wrapper {
			flex-direction: column;

			.logo-wrapper {
				order: -1;
				min-height: 200px;
				display: none;
			}
		}
	}
</style>
