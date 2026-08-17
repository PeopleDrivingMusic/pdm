<script lang="ts">
	import Avatar from '$lib/ui/Avatar.svelte';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import { mdiCheckCircle, mdiClockOutline } from '@mdi/js';

	interface Referral {
		id: number;
		name: string;
		joinDate: string;
		earnings: number;
		status: 'active' | 'pending';
	}

	interface Props {
		referrals: Referral[];
	}

	const { referrals }: Props = $props();

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<div class="referrals-table">
	<div class="table-header">
		<div class="table-col table-col--name">Name</div>
		<div class="table-col table-col--join">Join Date</div>
		<div class="table-col table-col--earnings">Earnings</div>
		<div class="table-col table-col--status">Status</div>
	</div>

	{#each referrals as referral (referral.id)}
		<div class="table-row">
			<div class="table-col table-col--name">
				<div class="referral-name">
					<Avatar name={referral.name} />
					<div>
						<p class="referral-full-name">{referral.name}</p>
					</div>
				</div>
			</div>
			<div class="table-col table-col--join">
				<p class="table-text">{formatDate(referral.joinDate)}</p>
			</div>
			<div class="table-col table-col--earnings">
				<p class="table-text table-text--earnings">${referral.earnings.toFixed(2)}</p>
			</div>
			<div class="table-col table-col--status">
				<div class="status-badge status-badge--{referral.status}">
					<SvgIcon
						path={referral.status === 'active' ? mdiCheckCircle : mdiClockOutline}
						size={16}
					/>
					<span>{referral.status === 'active' ? 'Active' : 'Pending'}</span>
				</div>
			</div>
		</div>
	{/each}
</div>

<style lang="scss">
	.referrals-table {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-gray-200);
		border-radius: var(--radius-md);
		overflow: hidden;

		@media (prefers-color-scheme: dark) {
			border-color: var(--color-gray-800);
		}
	}

	.table-header {
		display: grid;
		grid-template-columns: 2fr 1.5fr 1fr 1fr;
		gap: var(--space-4);
		padding: var(--space-4);
		background-color: var(--color-gray-50);
		border-bottom: 1px solid var(--color-gray-200);
		font-weight: 600;
		@include text-sm();

		@media (prefers-color-scheme: dark) {
			background-color: var(--color-gray-900);
			border-bottom-color: var(--color-gray-800);
		}

		@media (max-width: 768px) {
			display: none;
		}
	}

	.table-row {
		display: grid;
		grid-template-columns: 2fr 1.5fr 1fr 1fr;
		gap: var(--space-4);
		padding: var(--space-4);
		border-bottom: 1px solid var(--color-gray-200);
		align-items: center;
		transition: background-color var(--duration-normal) var(--easing-ease-out);

		@media (prefers-color-scheme: dark) {
			border-bottom-color: var(--color-gray-800);
		}

		&:last-child {
			border-bottom: none;
		}

		&:hover {
			background-color: var(--color-gray-50);

			@media (prefers-color-scheme: dark) {
				background-color: var(--color-gray-800);
			}
		}

		@media (max-width: 768px) {
			display: flex;
			flex-direction: column;
			gap: var(--space-3);
		}
	}

	.table-col {
		display: flex;
		align-items: center;

		&--name {
			@media (max-width: 768px) {
				&::before {
					content: 'Name: ';
					font-weight: 600;
					margin-right: var(--space-2);
					color: var(--color-gray-600);
				}
			}
		}

		&--join {
			@media (max-width: 768px) {
				&::before {
					content: 'Join Date: ';
					font-weight: 600;
					margin-right: var(--space-2);
					color: var(--color-gray-600);
				}
			}
		}

		&--earnings {
			@media (max-width: 768px) {
				&::before {
					content: 'Earnings: ';
					font-weight: 600;
					margin-right: var(--space-2);
					color: var(--color-gray-600);
				}
			}
		}

		&--status {
			@media (max-width: 768px) {
				&::before {
					content: 'Status: ';
					font-weight: 600;
					margin-right: var(--space-2);
					color: var(--color-gray-600);
				}
			}
		}
	}

	.referral-name {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.referral-avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-brand-600) 100%);
		color: var(--color-white);
		font-weight: 600;
		flex-shrink: 0;
	}

	.referral-full-name {
		margin: 0;
		@include text-md();
		font-weight: 500;
		color: var(--color-gray-900);

		@media (prefers-color-scheme: dark) {
			color: var(--color-white);
		}
	}

	.table-text {
		margin: 0;
		@include text-sm();
		color: var(--color-gray-600);

		@media (prefers-color-scheme: dark) {
			color: var(--color-gray-400);
		}

		&--earnings {
			font-weight: 600;
			color: var(--color-brand-600);

			@media (prefers-color-scheme: dark) {
				color: var(--color-brand-400);
			}
		}
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-full);
		@include text-xs();
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: var(--letter-spacing-wide);

		&--active {
			background-color: rgba(34, 197, 94, 0.1);
			color: var(--color-green-700);

			@media (prefers-color-scheme: dark) {
				background-color: rgba(34, 197, 94, 0.15);
				color: var(--color-green-300);
			}
		}

		&--pending {
			background-color: rgba(251, 146, 60, 0.1);
			color: var(--color-orange-700);

			@media (prefers-color-scheme: dark) {
				background-color: rgba(251, 146, 60, 0.15);
				color: var(--color-orange-300);
			}
		}
	}
</style>
