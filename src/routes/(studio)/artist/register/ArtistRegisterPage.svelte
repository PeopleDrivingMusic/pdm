<script lang="ts">
	import { Button, Input, Link, Select, notificationStore } from '$lib/ui';
	import { page } from '$app/state';
	import { enhance, applyAction } from '$app/forms';

	const form = $derived(page.form);
	const formError = $derived(form?.error as string | undefined);
	const hasError = $derived(!!formError);
	let step = $state(1);
	let name = $state('');
	let listenersCount = $state('');
	let instagram = $state('');
	let spotify = $state('');
	let youtube = $state('');
	let login = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);

	const isStepOneValid = $derived(!!name.trim() && !!listenersCount);
	const isStepTwoValid = $derived(
		!!instagram.trim() || !!spotify.trim() || !!youtube.trim()
	);
	const isStepThreeValid = $derived(
		!!login.trim() && !!password && !!confirmPassword && password === confirmPassword
	);
	const canProceed = $derived(
		step === 1 ? isStepOneValid : step === 2 ? isStepTwoValid : isStepThreeValid
	);
	const canSubmit = $derived(isStepThreeValid && !loading);

	const goNext = () => {
		if (step === 1 && isStepOneValid) {
			step = 2;
			return;
		}
		if (step === 2 && isStepTwoValid) {
			step = 3;
		}
	};

	const goBack = () => {
		if (step > 1) {
			step -= 1;
		}
	};

	const handleSubmit = (event: SubmitEvent) => {
		if (!isStepThreeValid || loading) {
			event.preventDefault();
		}
	};

	const listenersOptions = [
		{ label: '0 - 1k', value: '0-1k' },
		{ label: '1k - 10k', value: '1k-10k' },
		{ label: '10k - 100k', value: '10k-100k' },
		{ label: '100k - 1M', value: '100k-1m' },
		{ label: '1M+', value: '1m-plus' }
	];
</script>

<svelte:head>
	<title>Artist Registration - PDM</title>
	<meta name="description" content="Register your artist account" />
</svelte:head>

<div class="artist-register-wrapper">
	<div class="form-wrapper">
		<div class="form-container">
			<div class="form-header">
				<h1>Artist registration</h1>
                <p>Build your fanbase and grow your sound</p>
			</div>

			<form
				method="POST"
				action="?/register"
				on:submit={handleSubmit}
				use:enhance={() => {
					loading = true;
					return async ({ result }) => {
						loading = false;
						if (result.type === 'redirect') {
							notificationStore.success('Artist account created. Redirecting...');
						} else if (result.type === 'failure') {
							notificationStore.error(result.data?.error || 'An error occurred');
						}
						await applyAction(result);
					};
				}}
			>
				<div class="step-indicator">Step {step} of 3</div>

				{#if step === 1}
					<div class="form-grid">
						<div class="form-column">
							<Input
								label="Name"
								type="text"
								name="name"
								placeholder="Artist name"
								bind:value={name}
								error={hasError}
							/>

							<Select
								label="Listeners"
								name="listenersCount"
								placeholder="Select range"
								options={listenersOptions}
								bind:value={listenersCount}
								error={hasError}
							/>
						</div>
					</div>
				{:else if step === 2}
					<div class="form-column">
						<Input
							label="Instagram"
							type="url"
							name="instagram"
							placeholder="https://instagram.com/artist"
							bind:value={instagram}
							error={hasError}
						/>

						<Input
							label="Spotify"
							type="url"
							name="spotify"
							placeholder="https://open.spotify.com/artist/..."
							bind:value={spotify}
							error={hasError}
						/>

						<Input
							label="YouTube"
							type="url"
							name="youtube"
							placeholder="https://youtube.com/@artist"
							bind:value={youtube}
							error={hasError}
						/>
					</div>
				{:else}
					<input type="hidden" name="name" value={name} />
					<input type="hidden" name="listenersCount" value={listenersCount} />
					<input type="hidden" name="instagram" value={instagram} />
					<input type="hidden" name="spotify" value={spotify} />
					<input type="hidden" name="youtube" value={youtube} />

					<div class="form-column">
						<Input
							label="Login"
							type="text"
							name="login"
							placeholder="artist_login"
							bind:value={login}
							error={hasError}
						/>

						<Input
							label="Password"
							type="password"
							name="password"
							placeholder="••••••••"
							bind:value={password}
							error={hasError}
						/>

						<Input
							label="Confirm password"
							type="password"
							name="confirmPassword"
							placeholder="••••••••"
							bind:value={confirmPassword}
							error={hasError}
						/>
					</div>
				{/if}

				<div class="form-actions" class:single-action={step === 1}>
					{#if step > 1}
						<Button type="button" variant="secondary" full={true} disabled={loading} onClick={goBack}>
							Back
						</Button>
					{/if}

					{#if step < 3}
						<Button type="button" variant="primary" full={true} disabled={!canProceed || loading} onClick={goNext}>
							Next
						</Button>
					{:else}
						<Button type="submit" variant="primary" full={true} disabled={!canSubmit}>
							{loading ? 'Creating...' : 'Register'}
						</Button>
					{/if}
				</div>

				{#if hasError}
					<div class="error-message">{formError}</div>
				{/if}
			</form>

			<div class="form-footer">
				<span>Already have an account?</span>
				<Link color="primary" href="/login">Sign in</Link>
			</div>
		</div>
	</div>

	<div class="logo-wrapper">
		<div class="dashboard-preview">
			<div class="preview-placeholder">
				<h2>PDM</h2>
				<p>Build your fanbase and grow your sound</p>
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.artist-register-wrapper {
		display: flex;
		min-height: 100vh;
		height: 100vh;
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

		.form-wrapper {
			align-items: flex-start;
			overflow-y: auto;
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
		padding: var(--space-6, 3rem) 0;

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

		.step-indicator {
			text-align: center;
			font-size: 0.75rem;
			letter-spacing: 0.12em;
			text-transform: uppercase;
			color: var(--text-tertiary);
		}

		.form-grid {
			// display: grid;
			// grid-template-columns: repeat(2, minmax(0, 1fr));
			// gap: 1.5rem;
		}

		.form-column {
			display: flex;
			flex-direction: column;
			gap: 1.5rem;
		}

		.form-actions {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 1rem;
		}

		.form-actions.single-action {
			grid-template-columns: 1fr;
		}

		.form-actions > :only-child {
			grid-column: 1 / -1;
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

	@media (max-width: 768px) {
		.artist-register-wrapper {
			flex-direction: column;

			.logo-wrapper {
				order: -1;
				min-height: 200px;
				display: none;
			}
		}

		.form-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
