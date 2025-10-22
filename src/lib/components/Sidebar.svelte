<script lang="ts">
	import { page } from '$app/state';
	import Avatar from '$lib/ui/Avatar.svelte';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import {
		mdiAccountMusic,
		mdiCog,
		mdiHandCoin,
		mdiHome,
		mdiMagnify,
		mdiMusicNoteEighth,
		mdiPlaylistMusic,
		mdiTicketConfirmation
	} from '@mdi/js/mdi.js';
	import type { PageData } from '../../routes/$types';

	let { expand = $bindable() } = $props();

	const pathname = $derived(page.url.pathname);
	const user = $derived(page.data.user) as PageData['user'];

	const sidebarItems = [
		{ label: 'Search', icon: mdiMagnify, href: '/search' },
		{ label: 'Home', icon: mdiHome, href: '/' },
		{ label: 'Music', icon: mdiMusicNoteEighth, href: '/listen' },
		{ label: 'Artists', icon: mdiAccountMusic, href: '/artists' },
		{ label: 'My Playlists', icon: mdiPlaylistMusic, href: '/playlists' },

		{ section: true },

		{ label: 'NFT Tickets', icon: mdiTicketConfirmation, href: '/tickets' },
		{ label: 'Crowdfunding', icon: mdiHandCoin, href: '/crowdfunding' },
		{ space: true },

		{ label: 'Settings', icon: mdiCog, href: '/settings' },
		{ section: true }
	];
</script>

<div class="sidebar-wrapper" class:expand>
	<button class="logo" onclick={() => (expand = !expand)}>
		<h2>PDM</h2>
	</button>
	<div class="nav-wrapper">
		{#each sidebarItems as item}
			{#if item.section}
				<div class="divider">
					<div class="line"></div>
				</div>
			{:else if item.space}
				<div class="nav-space"></div>
			{:else}
				<a
					class="sidebar-item"
					class:active={item.href === pathname}
					href={item.href}
					title={item.label}
				>
					{#if item.icon}
						<div class="icon">
							<SvgIcon path={item.icon} size={24} />
						</div>
					{/if}
					{#if expand}
						<span class="label">{item.label}</span>
					{/if}
				</a>
			{/if}
		{/each}
	</div>
	<button class="avatar-wrapper">
		<div class="avatar">
			<Avatar name={user?.displayName || ''} src={user?.avatarUrl || ''} size="s" />
		</div>
		{#if expand}
			<div class="name">{user?.displayName}</div>
		{/if}
	</button>
</div>

<style lang="scss">
	.sidebar-wrapper {
		width: 80px;
		display: flex;
		flex-direction: column;
		background: var(--bg-secondary);
		border-right: 1px solid var(--border-subtle);
		min-height: 100%;
		box-shadow: var(--shadow-sm);
		transition: width 0.3s ease;

		.logo {
			padding: var(--space-6);
			width: 100%;
			text-align: left;
			cursor: pointer;
			h2 {
				@include text-display-md();
				background: linear-gradient(
					135deg,
					var(--color-brand-600) 0%,
					var(--color-brand-800) 50%,
					var(--bg-tertiary) 100%
				);
				-webkit-background-clip: text;
				-webkit-text-fill-color: transparent;
				background-clip: text;
			}
		}
		.nav-wrapper {
			flex-grow: 1;
			display: flex;
			flex-direction: column;
			.nav-space {
				flex-grow: 1;
			}
			.divider {
				padding-inline: var(--space-6);
				padding-block: var(--space-2);
				width: 100%;
				.line {
					width: 25px;
					height: 1px;
					background: var(--border-primary);
				}
			}

			.sidebar-item {
				padding-inline: var(--space-6);
				padding-block: var(--space-2);
				color: var(--text-tertiary);
				text-decoration: none;
				display: flex;
				gap: var(--space-1);
                .icon {
                    flex-shrink: 0;
                }
				span {
					white-space: nowrap;
					overflow: hidden;
					word-break: normal;
					text-overflow: clip;
				}

				&.active {
					color: var(--color-brand-600);
					text-shadow: 0 0 3px rgba(255, 179, 0, 0.5);
				}

				&:hover {
					background: var(--bg-hover);
					color: var(--text-primary);
				}
			}
		}
		.avatar-wrapper {
			cursor: pointer;
			width: 100%;
			display: flex;
			justify-content: start;
			align-items: center;
			padding-inline: var(--space-6);
			padding-block: var(--space-2);
			margin-left: -4px;
			gap: var(--space-2);
			.avatar {
				flex-shrink: 0;
			}

			.name {
				color: var(--text-primary);
				@include text-md();
				@include font-bold();
			}
		}
		&.expand {
			width: 250px;

			.divider .line {
				width: 100%;
			}
		}
	}
</style>
