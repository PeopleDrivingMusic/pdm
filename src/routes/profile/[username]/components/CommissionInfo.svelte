<script lang="ts">
    import SvgIcon from '$lib/ui/SvgIcon.svelte';
    import { mdiInformationOutline } from '@mdi/js';

    interface Props {
        commissionRate: number;
    }

    const { commissionRate }: Props = $props();
</script>

<section class="commission-info">
    <div class="commission-info__header">
        <SvgIcon path={mdiInformationOutline} size={24} />
        <h3>Commission Breakdown</h3>
    </div>

    <div class="commission-info__content">
        <div class="commission-item">
            <div class="commission-item__label">Artist Subscriptions</div>
            <div class="commission-item__value">{commissionRate}% per subscription</div>
        </div>
        <div class="commission-item">
            <div class="commission-item__label">In-App Purchases</div>
            <div class="commission-item__value">{commissionRate}% per purchase</div>
        </div>
        <div class="commission-item">
            <div class="commission-item__label">Other</div>
            <div class="commission-item__value">{commissionRate}% per feature</div>
        </div>
    </div>

    <div class="commission-info__note">
        <p>
            <strong>Important Note:</strong> Commission is calculated from the platform's revenue share, not the full payment amount. For example, with a $1 artist subscription: the artist receives 80% ($0.80), the platform receives 20% ($0.20). Your 10% commission is calculated from this $0.20 platform share, meaning you earn $0.02, not 10% of the full $1.
        </p>
    </div>
</section>

<style lang="scss">
    .commission-info {
        background: linear-gradient(135deg, var(--color-blue-50) 0%, var(--color-purple-50) 100%);
        border: 1px solid var(--color-blue-200);
        border-radius: var(--radius-lg);
        padding: var(--space-6);

        @media (prefers-color-scheme: dark) {
            background: linear-gradient(135deg, var(--color-blue-900) 0%, var(--color-purple-900) 100%);
            border-color: var(--color-blue-800);
        }
    }

    .commission-info__header {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        margin-bottom: var(--space-6);
        color: var(--color-blue-600);

        h3 {
            margin: 0;
            @include text-lg();
            font-weight: 600;
        }

        @media (prefers-color-scheme: dark) {
            color: var(--color-blue-300);
        }
    }

    .commission-info__content {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-4);
        margin-bottom: var(--space-6);
    }

    .commission-item {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        padding: var(--space-3);
        background-color: rgba(255, 255, 255, 0.7);
        border-radius: var(--radius-md);

        @media (prefers-color-scheme: dark) {
            background-color: rgba(0, 0, 0, 0.2);
        }
    }

    .commission-item__label {
        @include text-sm();
        font-weight: 500;
        color: var(--color-gray-700);

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-300);
        }
    }

    .commission-item__value {
        @include text-md();
        font-weight: 600;
        color: var(--color-blue-600);

        @media (prefers-color-scheme: dark) {
            color: var(--color-blue-300);
        }
    }

    .commission-info__note {
        padding: var(--space-3);
        background-color: rgba(255, 255, 255, 0.5);
        border-radius: var(--radius-md);
        border-left: 3px solid var(--color-blue-600);

        @media (prefers-color-scheme: dark) {
            background-color: rgba(0, 0, 0, 0.1);
            border-left-color: var(--color-blue-300);
        }

        p {
            margin: 0;
            @include text-sm();
            color: var(--color-gray-700);

            @media (prefers-color-scheme: dark) {
                color: var(--color-gray-300);
            }
        }
    }
</style>