<script>
	import Button from '$lib/ui/Button.svelte';
</script>

<svelte:head>
	<title>Request Received - PDM</title>
	<meta name="description" content="Your artist onboarding request has been received" />
</svelte:head>

<div class="success-wrapper">
	<div class="success-card">
		<h1>Thanks! Your request has been received.</h1>
		<p>We will review your application and get back to you soon.</p>
		<Button variant="primary" href="/">Back to home</Button>
	</div>
</div>

<style lang="scss">
	.success-wrapper {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-primary);
		// background: radial-gradient(circle at top, #f6f4ff 0%, #eef1f8 45%, #e7edf2 100%);
		padding: var(--space-6, 3rem);
	}

	.success-card {
		max-width: 520px;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		background: var(--bg-secondary);
		border-radius: 20px;
		padding: var(--space-6, 3rem);
		box-shadow: 0 20px 50px rgba(15, 23, 42, 0.12);

		h1 {
			font-size: 2rem;
			margin: 0 0 1rem 0;
			color: var(--text-on-primary);
		}

		p {
			color: var(--text-tertiary);
			margin: 0 0 2rem 0;
			font-size: 1rem;
		}
	}

	@media (max-width: 600px) {
		.success-card {
			padding: var(--space-5, 2.5rem);
		}

		.success-card h1 {
			font-size: 1.75rem;
		}
	}
</style>
