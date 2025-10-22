<script lang="ts">
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import DesignSystemDemo from '$lib/components/DesignSystemDemo.svelte';
	import Button from '$lib/ui/Button.svelte';
	import type { PageData } from './$types';
	
	export let data: PageData;
	
</script>



<style lang="scss">
	@use '../styles/variables' as mixins;
	
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
