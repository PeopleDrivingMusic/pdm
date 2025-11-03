<script lang="ts">
    import SvgIcon from './SvgIcon.svelte';

    interface Props {
        label: string;
        value: string | number;
        icon?: string;
        description?: string;
    }

    const { label, value, icon, description }: Props = $props();
</script>

<div class="stat-card">
    {#if icon}
        <div class="stat-card__icon-wrapper">
            <SvgIcon path={icon} size={24} />
        </div>
    {/if}
    <div class="stat-card__content">
        <h3 class="stat-card__label">{label}</h3>
        <p class="stat-card__value">{value}</p>
        {#if description}
            <p class="stat-card__description">{description}</p>
        {/if}
    </div>
</div>

<style lang="scss">
    .stat-card {
        display: flex;
        align-items: flex-start;
        gap: var(--space-4);
        padding: var(--space-4);
        background-color: var(--color-gray-50);
        border: 1px solid var(--color-gray-200);
        border-radius: var(--radius-md);
        transition: all var(--duration-normal) var(--easing-ease-out);

        @media (prefers-color-scheme: dark) {
            background-color: var(--color-gray-900);
            border-color: var(--color-gray-800);
        }

        &:hover {
            background-color: var(--color-gray-100);
            border-color: var(--color-gray-300);
            transform: translateY(-2px);

            @media (prefers-color-scheme: dark) {
                background-color: var(--color-gray-800);
                border-color: var(--color-gray-700);
            }
        }
    }

    .stat-card__icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: var(--radius-md);
        // background: linear-gradient(135deg, var(--color-brand-100) 0%, var(--color-brand-50) 100%);
        color: var(--color-brand-600);
        flex-shrink: 0;

        @media (prefers-color-scheme: dark) {
            // background: linear-gradient(135deg, var(--color-brand-900) 0%, var(--color-brand-800) 100%);
            color: var(--color-brand-300);
        }
    }

    .stat-card__content {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        flex: 1;
    }

    .stat-card__label {
        margin: 0;
        @include text-sm();
        @include font-semibold();
        color: var(--color-gray-600);
        text-transform: uppercase;
        letter-spacing: var(--letter-spacing-wide);

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-400);
        }
    }

    .stat-card__value {
        margin: 0;
        @include text-display-sm();
        @include font-bold();
        color: var(--color-gray-900);

        @media (prefers-color-scheme: dark) {
            color: var(--color-white);
        }
    }

    .stat-card__description {
        margin: 0;
        @include text-xs();
        color: var(--color-gray-500);

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-500);
        }
    }
</style>
