<script lang="ts">
	import { onMount } from 'svelte';
	
	let currentTheme = $state('dark');
	
	// Load theme from localStorage on mount
	onMount(() => {
		const savedTheme = localStorage.getItem('pdm-theme') || 'dark';
		currentTheme = savedTheme;
		applyTheme(savedTheme);
	});
	
	function applyTheme(theme: string) {
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem('pdm-theme', theme);
	}
	
	function toggleTheme() {
		const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
		currentTheme = newTheme;
		applyTheme(newTheme);
	}
</script>

<button 
	class="theme-toggle" 
	onclick={toggleTheme}
	aria-label="Toggle theme"
	title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} theme`}
>
	{#if currentTheme === 'dark'}
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M12 3V4M12 20V21M4 12H3M6.31412 6.31412L5.5 5.5M17.6859 6.31412L18.5 5.5M6.31412 17.69L5.5 18.5M17.6859 17.69L18.5 18.5M21 12H20M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
	{:else}
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
	{/if}
</button>

<style lang="scss">
	@use '../../styles/variables' as vars;
	
	.theme-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border: 1px solid var(--border-primary);
		border-radius: vars.$radius-lg;
		background: var(--bg-card);
		color: var(--text-primary);
		cursor: pointer;
		transition: all 0.3s ease;
		
		&:hover {
			background: var(--bg-hover);
			border-color: var(--border-focus);
			transform: scale(1.05);
		}
		
		&:active {
			transform: scale(0.95);
		}
		
		svg {
			transition: transform 0.3s ease;
		}
		
		&:hover svg {
			transform: rotate(15deg);
		}
	}
</style>
