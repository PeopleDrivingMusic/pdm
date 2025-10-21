<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	
	let form: HTMLFormElement;
	
	onMount(() => {
		// Automatically submit the form when the page loads
		if (form) {
			form.requestSubmit();
		}
	});
</script>

<svelte:head>
	<title>Logout...</title>
</svelte:head>

<div class="logout-container">
	<div class="logout-card">
		<h1>Logging out...</h1>
		<p>Please wait</p>
	</div>
	
	<form bind:this={form} method="POST" use:enhance style="display: none;">
		<!-- The form is hidden and will be submitted automatically -->
	</form>
</div>

<style lang="scss">
	.logout-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: var(--gradient-main);
	}

	.logout-card {
		background: var(--surface-elevated);
		border-radius: 12px;
		padding: 2rem;
		text-align: center;
		max-width: 400px;
		box-shadow: var(--shadow-lg);
		border: 1px solid var(--border-subtle);

		h1 {
			color: var(--text-primary);
			font-size: 1.5rem;
			font-weight: 600;
			margin: 0 0 1rem 0;
		}

		p {
			color: var(--text-secondary);
			margin: 0;
		}
	}
</style>
