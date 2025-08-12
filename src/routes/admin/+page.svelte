<script lang="ts">
	import { onMount } from 'svelte';
	 import { PUBLIC_PGADMIN_URL } from '$env/static/public';
    
	
	let { data } = $props();
	let refreshing = $state(false);
	let dbHealth = $state(data.dbHealth);
	
	async function refreshHealth() {
		refreshing = true;
		try {
			const response = await fetch('/api/db/health');
			dbHealth = await response.json();
		} catch (error) {
			console.error('Failed to refresh database health:', error);
		} finally {
			refreshing = false;
		}
	}
	
	// Auto-refresh every 30 seconds
	onMount(() => {
		const interval = setInterval(refreshHealth, 30000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>PDM - Database Admin</title>
</svelte:head>

<div class="admin-container">
	<header class="admin-header">
		<h1>PDM Database Administration</h1>
		<button 
			class="refresh-btn" 
			onclick={refreshHealth} 
			disabled={refreshing}
		>
			{refreshing ? 'Refreshing...' : 'Refresh Status'}
		</button>
	</header>

	<div class="status-grid">
		<!-- Connection Status -->
		<div class="status-card {dbHealth.connected ? 'connected' : 'disconnected'}">
			<div class="status-header">
				<h2>Database Connection</h2>
				<div class="status-indicator {dbHealth.connected ? 'success' : 'error'}">
					{dbHealth.connected ? '🟢' : '🔴'}
				</div>
			</div>
			<p class="status-message">{dbHealth.message}</p>
			<p class="timestamp">Last checked: {new Date(dbHealth.timestamp).toLocaleString()}</p>
		</div>

		<!-- Statistics -->
		{#if dbHealth.connected && dbHealth.statistics}
			<div class="stats-card">
				<h2>Database Statistics</h2>
				<div class="stats-grid">
					<div class="stat-item">
						<span class="stat-value">{dbHealth.statistics.totalUsers}</span>
						<span class="stat-label">Total Users</span>
					</div>
					<div class="stat-item">
						<span class="stat-value">{dbHealth.statistics.totalArtists}</span>
						<span class="stat-label">Total Artists</span>
					</div>
					<div class="stat-item">
						<span class="stat-value">{dbHealth.statistics.activeArtists}</span>
						<span class="stat-label">Active Artists</span>
					</div>
					<div class="stat-item">
						<span class="stat-value">{dbHealth.statistics.totalTracks}</span>
						<span class="stat-label">Total Tracks</span>
					</div>
					<div class="stat-item">
						<span class="stat-value">{dbHealth.statistics.publishedTracks}</span>
						<span class="stat-label">Published Tracks</span>
					</div>
				</div>
			</div>
		{/if}

		<!-- Actions -->
		<div class="actions-card">
			<h2>Database Actions</h2>
			<div class="actions-grid">
				<a href={PUBLIC_PGADMIN_URL} target="_blank" class="action-btn">
					Open pgAdmin
				</a>
				<button class="action-btn" onclick={() => window.open('/api/db/health', '_blank')}>
					View Raw Health Check
				</button>
				<button class="action-btn secondary" onclick={() => alert('Drizzle Studio: npm run db:studio')}>
					Open Drizzle Studio
				</button>
			</div>
		</div>

		<!-- Database Schema Info -->
		<div class="schema-card">
			<h2>Schema Information</h2>
			<div class="schema-info">
				<p><strong>Tables:</strong> users, artists, albums, tracks, playlists, playlist_tracks, user_favorites, purchases</p>
				<p><strong>ORM:</strong> Drizzle ORM</p>
				<p><strong>Database:</strong> PostgreSQL 15</p>
				<p><strong>Migrations:</strong> Generated and ready to apply</p>
			</div>
		</div>
	</div>

	<div class="help-section">
		<h2>Quick Commands</h2>
		<div class="commands">
			<code>docker-compose up -d</code> - Start database
			<code>npm run db:generate</code> - Generate migrations
			<code>npm run db:migrate</code> - Apply migrations
			<code>npm run db:push</code> - Push schema (development)
			<code>npm run db:studio</code> - Open Drizzle Studio
		</div>
	</div>
</div>

<style lang="scss">
	@use '../../styles/variables' as mixins;
	
	.admin-container {
		@include mixins.container();
		padding: var(--space-8);
		min-height: 100vh;
	}
	
	.admin-header {
		@include mixins.flex-between();
		margin-bottom: var(--space-8);
		padding-bottom: var(--space-4);
		border-bottom: 1px solid var(--border-primary);
		
		h1 {
			@include mixins.text-display-md();
			@include mixins.font-bold();
			color: var(--text-primary);
		}
	}
	
	.refresh-btn {
		@include mixins.button-secondary();
		
		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}
	
	.status-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-6);
		margin-bottom: var(--space-8);
	}
	
	.status-card, .stats-card, .actions-card, .schema-card {
		@include mixins.card();
		
		h2 {
			@include mixins.text-xl();
			@include mixins.font-semibold();
			color: var(--text-primary);
			margin-bottom: var(--space-4);
		}
	}
	
	.status-card {
		&.connected {
			border-left: 4px solid var(--success);
		}
		
		&.disconnected {
			border-left: 4px solid var(--error);
		}
	}
	
	.status-header {
		@include mixins.flex-between();
		margin-bottom: var(--space-3);
	}
	
	.status-indicator {
		font-size: 1.5rem;
		
		&.success {
			color: var(--success);
		}
		
		&.error {
			color: var(--error);
		}
	}
	
	.status-message {
		@include mixins.text-md();
		color: var(--text-secondary);
		margin-bottom: var(--space-2);
	}
	
	.timestamp {
		@include mixins.text-sm();
		color: var(--text-tertiary);
	}
	
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: var(--space-4);
	}
	
	.stat-item {
		text-align: center;
		padding: var(--space-3);
		background: var(--bg-secondary);
		border-radius: var(--radius-md);
		
		.stat-value {
			@include mixins.text-xl();
			@include mixins.font-bold();
			color: var(--primary);
			display: block;
		}
		
		.stat-label {
			@include mixins.text-sm();
			color: var(--text-tertiary);
		}
	}
	
	.actions-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	
	.action-btn {
		@include mixins.button-primary();
		text-decoration: none;
		text-align: center;
		
		&.secondary {
			@include mixins.button-secondary();
		}
	}
	
	.schema-info {
		@include mixins.text-sm();
		color: var(--text-secondary);
		line-height: 1.6;
		
		p {
			margin-bottom: var(--space-2);
		}
		
		strong {
			color: var(--text-primary);
		}
	}
	
	.help-section {
		margin-top: var(--space-8);
		padding: var(--space-6);
		background: var(--bg-secondary);
		border-radius: var(--radius-lg);
		
		h2 {
			@include mixins.text-lg();
			@include mixins.font-semibold();
			color: var(--text-primary);
			margin-bottom: var(--space-4);
		}
	}
	
	.commands {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		
		code {
			@include mixins.text-sm();
			font-family: var(--font-family-mono);
			background: var(--bg-tertiary);
			color: var(--primary);
			padding: var(--space-2) var(--space-3);
			border-radius: var(--radius-sm);
			border: 1px solid var(--border-primary);
		}
	}
	
	@include mixins.mobile-only {
		.admin-header {
			flex-direction: column;
			gap: var(--space-4);
			text-align: center;
		}
		
		.status-grid {
			grid-template-columns: 1fr;
		}
		
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
