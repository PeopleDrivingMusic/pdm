<script lang="ts">
	// Sample data for design system demo
	const colorTokens = [
		{ name: 'Primary', value: '--primary', description: 'Primary brand color' },
		{ name: 'Primary Hover', value: '--primary-hover', description: 'Primary hover state' },
		{ name: 'Success', value: '--success', description: 'Success state color' },
		{ name: 'Warning', value: '--warning', description: 'Warning state color' },
		{ name: 'Error', value: '--error', description: 'Error state color' },
		{ name: 'Info', value: '--info', description: 'Information color' }
	];

	const backgroundTokens = [
		{ name: 'Primary', value: '--bg-primary', description: 'Main background' },
		{ name: 'Secondary', value: '--bg-secondary', description: 'Secondary background' },
		{ name: 'Surface', value: '--bg-surface', description: 'Surface background' },
		{ name: 'Tertiary', value: '--bg-tertiary', description: 'Tertiary background' }
	];

	const textTokens = [
		{ name: 'Primary', value: '--text-primary', description: 'Primary text' },
		{ name: 'Secondary', value: '--text-secondary', description: 'Secondary text' },
		{ name: 'Tertiary', value: '--text-tertiary', description: 'Tertiary text' },
		{ name: 'On Primary', value: '--text-on-primary', description: 'Text on primary' }
	];

	const spacingTokens = [
		{ name: 'Space 1', value: '--space-1', size: '4px' },
		{ name: 'Space 2', value: '--space-2', size: '8px' },
		{ name: 'Space 3', value: '--space-3', size: '12px' },
		{ name: 'Space 4', value: '--space-4', size: '16px' },
		{ name: 'Space 6', value: '--space-6', size: '24px' },
		{ name: 'Space 8', value: '--space-8', size: '32px' }
	];

	let sampleText = $state('Sample input text');
</script>

<div class="design-system">
	<h1>PDM Design System</h1>
	<p>Modern CSS Custom Properties Design System based on Figma Untitled UI</p>

	<!-- Typography Section -->
	<section>
		<h2>Typography</h2>
		<div class="typography-grid">
			<div class="typography-sample">
				<h4>Display 2XL</h4>
				<div class="display-2xl">The quick brown fox</div>
			</div>
			<div class="typography-sample">
				<h4>Display XL</h4>
				<div class="display-xl">The quick brown fox</div>
			</div>
			<div class="typography-sample">
				<h4>Display LG</h4>
				<div class="display-lg">The quick brown fox</div>
			</div>
			<div class="typography-sample">
				<h4>Display MD</h4>
				<div class="display-md">The quick brown fox</div>
			</div>
			<div class="typography-sample">
				<h4>Text XL</h4>
				<div class="text-xl">The quick brown fox jumps over the lazy dog</div>
			</div>
			<div class="typography-sample">
				<h4>Text LG</h4>
				<div class="text-lg">The quick brown fox jumps over the lazy dog</div>
			</div>
			<div class="typography-sample">
				<h4>Text MD</h4>
				<div class="text-md">The quick brown fox jumps over the lazy dog</div>
			</div>
			<div class="typography-sample">
				<h4>Text SM</h4>
				<div class="text-sm">The quick brown fox jumps over the lazy dog</div>
			</div>
		</div>
	</section>

	<!-- Color Tokens -->
	<section>
		<h2>Color Tokens</h2>
		
		<h3>Brand Colors</h3>
		<div class="color-grid">
			{#each colorTokens as color}
				<div class="color-swatch">
					<div class="color-preview" style="background-color: var({color.value})"></div>
					<div class="color-info">
						<div class="color-name">{color.name}</div>
						<div class="color-value">{color.value}</div>
					</div>
				</div>
			{/each}
		</div>

		<h3>Background Colors</h3>
		<div class="color-grid">
			{#each backgroundTokens as color}
				<div class="color-swatch">
					<div class="color-preview" style="background-color: var({color.value})"></div>
					<div class="color-info">
						<div class="color-name">{color.name}</div>
						<div class="color-value">{color.value}</div>
					</div>
				</div>
			{/each}
		</div>

		<h3>Text Colors</h3>
		<div class="color-grid">
			{#each textTokens as color}
				<div class="color-swatch">
					<div class="color-preview" style="background-color: var({color.value})"></div>
					<div class="color-info">
						<div class="color-name">{color.name}</div>
						<div class="color-value">{color.value}</div>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Component Examples -->
	<section>
		<h2>Components</h2>
		<div class="component-grid">
			<div class="component-demo">
				<h4>Buttons</h4>
				<div class="component-examples">
					<button class="button primary">Primary Button</button>
					<button class="button secondary">Secondary Button</button>
					<button class="button outline">Outline Button</button>
					<button class="button primary" disabled>Disabled Button</button>
				</div>
			</div>

			<div class="component-demo">
				<h4>Form Elements</h4>
				<div class="component-examples">
					<input 
						class="input" 
						type="text" 
						placeholder="Enter your text..."
						bind:value={sampleText}
					/>
					<input 
						class="input" 
						type="email" 
						placeholder="email@example.com"
					/>
					<input 
						class="input" 
						type="password" 
						placeholder="Password"
					/>
				</div>
			</div>
		</div>
	</section>

	<!-- Spacing System -->
	<section>
		<h2>Spacing System</h2>
		<div class="spacing-demo">
			{#each spacingTokens as space}
				<div class="spacing-item">
					<div class="spacing-visual" style="width: var({space.value}); height: var({space.value});"></div>
					<div class="spacing-label">{space.name}</div>
					<div class="spacing-label">{space.size}</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Shadow System -->
	<section>
		<h2>Shadow System</h2>
		<div class="shadow-demo">
			<div class="shadow-item shadow-xs">
				<div class="shadow-label">shadow-xs</div>
			</div>
			<div class="shadow-item shadow-sm">
				<div class="shadow-label">shadow-sm</div>
			</div>
			<div class="shadow-item shadow-md">
				<div class="shadow-label">shadow-md</div>
			</div>
			<div class="shadow-item shadow-lg">
				<div class="shadow-label">shadow-lg</div>
			</div>
			<div class="shadow-item shadow-xl">
				<div class="shadow-label">shadow-xl</div>
			</div>
			<div class="shadow-item shadow-2xl">
				<div class="shadow-label">shadow-2xl</div>
			</div>
		</div>
	</section>

	<!-- Theme Toggle Demo -->
	<section>
		<h2>Theme System</h2>
		<p>Use the theme toggle in the top-right corner to see how CSS custom properties enable dynamic theming.</p>
		<div class="theme-demo">
			<div class="theme-card">
				<h4>Theme-aware Card</h4>
				<p>This card automatically adapts to the current theme using CSS custom properties.</p>
				<button class="button primary">Action Button</button>
			</div>
		</div>
	</section>
</div>

<style lang="scss">
	@use '../../styles/variables' as mixins;
	
	.design-system {
		padding: var(--space-8);
		max-width: 1200px;
		margin: 0 auto;
		
		h1 {
			@include mixins.text-display-lg();
			@include mixins.font-bold();
			color: var(--text-primary);
			margin-bottom: var(--space-4);
			text-align: center;
		}
		
		> p {
			@include mixins.text-lg();
			color: var(--text-secondary);
			text-align: center;
			margin-bottom: var(--space-12);
		}
		
		section {
			margin-bottom: var(--space-12);
		}
		
		h2 {
			@include mixins.text-display-md();
			@include mixins.font-semibold();
			color: var(--text-primary);
			margin-bottom: var(--space-6);
			border-bottom: 1px solid var(--border-primary);
			padding-bottom: var(--space-3);
		}
		
		h3 {
			@include mixins.text-xl();
			@include mixins.font-semibold();
			color: var(--text-primary);
			margin: var(--space-8) 0 var(--space-4) 0;
		}
		
		h4 {
			@include mixins.text-sm();
			@include mixins.font-semibold();
			color: var(--text-tertiary);
			margin-bottom: var(--space-3);
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}
		
		p {
			@include mixins.text-md();
			color: var(--text-secondary);
			margin-bottom: var(--space-4);
			line-height: 1.6;
		}
	}
	
	.typography-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
		gap: var(--space-6);
		margin-bottom: var(--space-8);
	}
	
	.typography-sample {
		@include mixins.card();
		
		.display-2xl { @include mixins.text-display-2xl(); @include mixins.font-bold(); color: var(--text-primary); }
		.display-xl { @include mixins.text-display-xl(); @include mixins.font-bold(); color: var(--text-primary); }
		.display-lg { @include mixins.text-display-lg(); @include mixins.font-bold(); color: var(--text-primary); }
		.display-md { @include mixins.text-display-md(); @include mixins.font-bold(); color: var(--text-primary); }
		.text-xl { @include mixins.text-xl(); color: var(--text-primary); }
		.text-lg { @include mixins.text-lg(); color: var(--text-primary); }
		.text-md { @include mixins.text-md(); color: var(--text-primary); }
		.text-sm { @include mixins.text-sm(); color: var(--text-primary); }
	}
	
	.color-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-8);
	}
	
	.color-swatch {
		background: var(--bg-surface);
		border: 1px solid var(--border-secondary);
		border-radius: var(--radius-lg);
		overflow: hidden;
		box-shadow: var(--shadow-sm);
		transition: all var(--duration-normal) var(--easing-ease-out);
		
		&:hover {
			box-shadow: var(--shadow-md);
			transform: translateY(-2px);
		}
		
		.color-preview {
			height: 80px;
			width: 100%;
		}
		
		.color-info {
			padding: var(--space-3);
			
			.color-name {
				@include mixins.text-sm();
				@include mixins.font-semibold();
				color: var(--text-primary);
				margin-bottom: var(--space-1);
			}
			
			.color-value {
				@include mixins.text-xs();
				color: var(--text-tertiary);
				font-family: var(--font-family-mono);
			}
		}
	}
	
	.component-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-6);
		margin-bottom: var(--space-8);
	}
	
	.component-demo {
		@include mixins.card();
		
		.component-examples {
			display: flex;
			flex-direction: column;
			gap: var(--space-3);
		}
	}
	
	.button {
		@include mixins.button-base();
		
		&.primary { @include mixins.button-primary(); }
		&.secondary { @include mixins.button-secondary(); }
		&.outline { @include mixins.button-outline(); }
	}
	
	.input {
		@include mixins.input-base();
	}
	
	.spacing-demo {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-6);
		margin-bottom: var(--space-8);
		
		.spacing-item {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: var(--space-2);
			
			.spacing-visual {
				background: var(--primary);
				border-radius: var(--radius-sm);
				opacity: 0.7;
			}
			
			.spacing-label {
				@include mixins.text-xs();
				color: var(--text-tertiary);
				font-family: var(--font-family-mono);
				text-align: center;
			}
		}
	}
	
	.shadow-demo {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: var(--space-6);
		margin-bottom: var(--space-8);
		
		.shadow-item {
			background: var(--bg-surface);
			border-radius: var(--radius-lg);
			padding: var(--space-6);
			text-align: center;
			transition: all var(--duration-normal) var(--easing-ease-out);
			
			.shadow-label {
				@include mixins.text-sm();
				@include mixins.font-medium();
				color: var(--text-secondary);
				font-family: var(--font-family-mono);
			}
			
			&.shadow-xs { box-shadow: var(--shadow-xs); }
			&.shadow-sm { box-shadow: var(--shadow-sm); }
			&.shadow-md { box-shadow: var(--shadow-md); }
			&.shadow-lg { box-shadow: var(--shadow-lg); }
			&.shadow-xl { box-shadow: var(--shadow-xl); }
			&.shadow-2xl { box-shadow: var(--shadow-2xl); }
		}
	}
	
	.theme-demo {
		margin-top: var(--space-6);
		
		.theme-card {
			@include mixins.card();
			max-width: 400px;
			text-align: center;
			
			h4 {
				@include mixins.text-lg();
				@include mixins.font-semibold();
				color: var(--text-primary);
				margin-bottom: var(--space-3);
				text-transform: none;
				letter-spacing: normal;
			}
			
			p {
				margin-bottom: var(--space-4);
			}
		}
	}
	
	@include mixins.mobile-only {
		.design-system {
			padding: var(--space-4);
		}
		
		.typography-grid,
		.color-grid,
		.component-grid {
			grid-template-columns: 1fr;
		}
		
		.shadow-demo {
			grid-template-columns: repeat(2, 1fr);
		}
		
		.spacing-demo {
			justify-content: center;
		}
	}
</style>
