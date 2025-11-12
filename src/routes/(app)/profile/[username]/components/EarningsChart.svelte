<script lang="ts">
    interface Props {
        data: Array<{ month: string; earnings: number; referrals: number }>;
    }

    const { data }: Props = $props();

    const maxEarnings = Math.max(...data.map((d) => d.earnings));
    const maxReferrals = Math.max(...data.map((d) => d.referrals));
</script>

<div class="chart-container">
    <div class="chart-legend">
        <div class="legend-item">
            <div class="legend-color legend-color--earnings"></div>
            <span>Earnings ($)</span>
        </div>
        <div class="legend-item">
            <div class="legend-color legend-color--referrals"></div>
            <span>Referrals</span>
        </div>
    </div>

    <div class="chart">
        {#each data as item (item.month)}
            <div class="chart-bar-group">
                <div class="chart-bars">
                    <div
                        class="chart-bar chart-bar--earnings"
                        style="height: {(item.earnings / maxEarnings) * 100}%"
                        title="${item.earnings}"
                    >
                        <span class="chart-value">${item.earnings}</span>
                    </div>
                    <div
                        class="chart-bar chart-bar--referrals"
                        style="height: {(item.referrals / maxReferrals) * 100}%"
                        title="{item.referrals} referrals"
                    >
                        <span class="chart-value">{item.referrals}</span>
                    </div>
                </div>
                <div class="chart-label">{item.month}</div>
            </div>
        {/each}
    </div>
</div>

<style lang="scss">
    .chart-container {
        display: flex;
        flex-direction: column;
        gap: var(--space-6);
    }

    .chart-legend {
        display: flex;
        gap: var(--space-6);
        flex-wrap: wrap;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        @include text-sm();
        color: var(--color-gray-600);

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-400);
        }
    }

    .legend-color {
        width: 12px;
        height: 12px;
        border-radius: 2px;

        &--earnings {
            background-color: var(--color-brand-500);
        }

        &--referrals {
            background-color: var(--color-green-500);
        }
    }

    .chart {
        display: flex;
        align-items: flex-end;
        justify-content: space-around;
        gap: var(--space-4);
        height: 300px;
        padding: var(--space-4) 0;
        border-top: 2px solid var(--color-gray-200);
        border-bottom: 2px solid var(--color-gray-200);

        @media (prefers-color-scheme: dark) {
            border-color: var(--color-gray-800);
        }
    }

    .chart-bar-group {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-2);
        flex: 1;
        height: 100%;
    }

    .chart-bars {
        display: flex;
        gap: var(--space-2);
        align-items: flex-end;
        height: 100%;
        width: 100%;
    }

    .chart-bar {
        flex: 1;
        border-radius: var(--radius-md) var(--radius-md) 0 0;
        min-height: 4px;
        position: relative;
        transition: all var(--duration-normal) var(--easing-ease-out);
        display: flex;
        align-items: flex-end;
        justify-content: center;

        &:hover {
            opacity: 0.8;
            transform: scaleY(1.05);
            transform-origin: bottom;

            .chart-value {
                opacity: 1;
                visibility: visible;
            }
        }

        &--earnings {
            background: linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-brand-600) 100%);
        }

        &--referrals {
            background: linear-gradient(135deg, var(--color-green-500) 0%, var(--color-green-600) 100%);
        }
    }

    .chart-value {
        position: absolute;
        bottom: 100%;
        margin-bottom: var(--space-2);
        background-color: var(--color-gray-900);
        color: var(--color-white);
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
        @include text-xs();
        font-weight: 600;
        opacity: 0;
        visibility: hidden;
        transition: all var(--duration-normal) var(--easing-ease-out);
        white-space: nowrap;

        @media (prefers-color-scheme: dark) {
            background-color: var(--color-white);
            color: var(--color-gray-900);
        }
    }

    .chart-label {
        @include text-sm();
        font-weight: 500;
        color: var(--color-gray-600);
        margin-top: var(--space-2);

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-400);
        }
    }
</style>