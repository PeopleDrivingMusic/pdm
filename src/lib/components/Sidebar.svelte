<script lang="ts">
	import { page } from '$app/state';
	import Avatar from '$lib/ui/Avatar.svelte';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import { mdiLoginVariant, mdiMagnify } from '@mdi/js/mdi.js';
	import Input from '$lib/ui/Input.svelte';

	type SidebarItem = {
		label?: string;
		icon?: string;
		href?: string;
		section?: boolean;
		space?: boolean;
	};

	type SidebarAccount = {
		name: string;
		avatarUrl?: string | null;
		profileHref?: string;
	};

	let {
		expand = $bindable(),
		items = [],
		showSearch = true,
		account,
		showLogin = false
	} = $props<{
		expand?: boolean;
		items?: SidebarItem[];
		showSearch?: boolean;
		account?: SidebarAccount | null;
		showLogin?: boolean;
	}>();

	const pathname = $derived(page.url.pathname);
</script>

<div class="sidebar-wrapper" class:expand>
	<button class="logo" onclick={() => (expand = !expand)}>
		<h2>{expand ? 'PDM' : 'P'}</h2>
	</button>
	{#if showSearch}
		<div class="sidebar-item search">
			{#if expand}
				<Input placeholder="Search" />
			{:else}
				<button onclick={() => (expand = true)}>
					<SvgIcon path={mdiMagnify} size={24} />
				</button>
			{/if}
		</div>
	{/if}
	<div class="nav-wrapper">
		{#each items as item}
			{#if item.section}
				<div class="divider">
					<div class="line"></div>
				</div>
			{:else if item.space}
				<div class="nav-space"></div>
			{:else}
				<a
					class="sidebar-item"
					class:active={(item.href !== '/' && pathname.startsWith(item.href || '')) ||
						item.href === pathname}
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
	{#if account}
		<a class="avatar-wrapper" href={account.profileHref || '#'}>
			<div class="avatar">
				<Avatar name={account.name} src={account.avatarUrl || ''} size="s" />
			</div>
			{#if expand}
				<div class="name">{account.name}</div>
			{/if}
		</a>
	{:else if showLogin}
		<a class="avatar-wrapper" href="/login" title="Log in">
			<div class="avatar login-icon">
				<SvgIcon path={mdiLoginVariant} size={24} />
			</div>
			{#if expand}
				<div class="name">Log in</div>
			{/if}
		</a>
	{/if}
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
			padding-bottom: var(--space-3);
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
			}

			&:hover {
				background: var(--bg-hover);
				color: var(--text-primary);
			}

			&.search {
				padding-top: 0;
				min-height: 44px;
				display: flex;
				align-items: center;
				justify-content: flex-start;

				button {
					padding: 0;
					display: flex;
					align-items: center;
					justify-content: center;
					width: 24px;
					height: 24px;
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

				&.login-icon {
					display: flex;
					align-items: center;
					justify-content: center;
					width: 32px;
					height: 32px;
					color: var(--text-tertiary);
				}
			}

			&:hover .avatar.login-icon {
				color: var(--primary);
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
