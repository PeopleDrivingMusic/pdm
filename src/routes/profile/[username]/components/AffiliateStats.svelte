<script lang="ts">
    import SvgIcon from '$lib/ui/SvgIcon.svelte';
    import { mdiAccountGroup, mdiCurrencyUsd, mdiTrendingUp, mdiCalendarMonth } from '@mdi/js';

    interface Props {
        referralData: any;
    }

    const { referralData }: Props = $props();
</script>

<section class="stats-grid">
    <div class="stat-box">
        <div class="stat-box__icon">
            <SvgIcon path={mdiAccountGroup} size={24} />
        </div>
        <div class="stat-box__content">
            <h3 class="stat-box__label">Total Referrals</h3>
            <p class="stat-box__value">{referralData.totalReferrals}</p>
            <p class="stat-box__info">{referralData.activeReferrals} active</p>
        </div>
    </div>

    <div class="stat-box">
        <div class="stat-box__icon">
            <SvgIcon path={mdiCurrencyUsd} size={24} />
        </div>
        <div class="stat-box__content">
            <h3 class="stat-box__label">Total Earnings</h3>
            <p class="stat-box__value">${referralData.totalEarnings.toFixed(2)}</p>
            <p class="stat-box__info">All time</p>
        </div>
    </div>

    <div class="stat-box">
        <div class="stat-box__icon">
            <SvgIcon path={mdiCalendarMonth} size={24} />
        </div>
        <div class="stat-box__content">
            <h3 class="stat-box__label">Monthly Earnings</h3>
            <p class="stat-box__value">${referralData.monthlyEarnings.toFixed(2)}</p>
            <p class="stat-box__info">This month</p>
        </div>
    </div>

    <div class="stat-box">
        <div class="stat-box__icon">
            <SvgIcon path={mdiTrendingUp} size={24} />
        </div>
        <div class="stat-box__content">
            <h3 class="stat-box__label">Commission Rate</h3>
            <p class="stat-box__value">{referralData.commissionRate}%</p>
            <p class="stat-box__info">Per referral</p>
        </div>
    </div>
</section>

<style lang="scss">
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--space-4);
    }

    .stat-box {
        display: flex;
        align-items: flex-start;
        gap: var(--space-4);
        background-color: var(--color-gray-50);
        border: 1px solid var(--color-gray-200);
        border-radius: var(--radius-md);
        padding: var(--space-4);
        transition: all var(--duration-normal) var(--easing-ease-out);

        @media (prefers-color-scheme: dark) {
            background-color: var(--color-gray-900);
            border-color: var(--color-gray-800);
        }

        &:hover {
            border-color: var(--color-brand-500);
            background-color: var(--color-gray-100);

            @media (prefers-color-scheme: dark) {
                background-color: var(--color-gray-800);
                border-color: var(--color-brand-400);
            }
        }
    }

    .stat-box__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: var(--radius-md);
        background: linear-gradient(135deg, var(--color-brand-100) 0%, var(--color-brand-50) 100%);
        color: var(--color-brand-600);
        flex-shrink: 0;

        @media (prefers-color-scheme: dark) {
            background: linear-gradient(135deg, var(--color-brand-900) 0%, var(--color-brand-800) 100%);
            color: var(--color-brand-300);
        }
    }

    .stat-box__content {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        flex: 1;
    }

    .stat-box__label {
        margin: 0;
        @include text-xs();
        @include font-semibold();
        color: var(--color-gray-600);
        text-transform: uppercase;
        letter-spacing: var(--letter-spacing-wide);

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-400);
        }
    }

    .stat-box__value {
        margin: 0;
        @include text-display-sm();
        @include font-bold();
        color: var(--color-gray-900);

        @media (prefers-color-scheme: dark) {
            color: var(--color-white);
        }
    }

    .stat-box__info {
        margin: 0;
        @include text-xs();
        color: var(--color-gray-500);
    }
</style>