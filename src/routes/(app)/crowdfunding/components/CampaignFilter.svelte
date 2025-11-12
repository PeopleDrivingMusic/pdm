<script lang="ts">
    import SvgIcon from '$lib/ui/SvgIcon.svelte';
    import { mdiClose } from '@mdi/js';

    interface Props {
        selectedType: string;
        sortBy: string;
        handleFilterChange: (type: string) => void;
        handleSort: (sort: string) => void;
        onClose?: () => void;
    }

    const { selectedType, sortBy, handleFilterChange, handleSort, onClose }: Props = $props();

    const types = [
        { value: 'all', label: 'All Campaigns' },
        { value: 'song', label: 'Songs' },
        { value: 'album', label: 'Albums' },
        { value: 'concert', label: 'Concerts' },
        { value: 'festival', label: 'Festivals' }
    ];

    const sorts = [
        { value: 'trending', label: 'Trending' },
        { value: 'newest', label: 'Newest' },
        { value: 'ending-soon', label: 'Ending Soon' },
        { value: 'most-backed', label: 'Most Backed' }
    ];

    const fundingStages = [
        { value: 'all', label: 'All Stages' },
        { value: 'just-started', label: 'Just Started' },
        { value: 'half-way', label: 'Half Way' },
        { value: 'nearly-funded', label: 'Nearly Funded' }
    ];
</script>

<div class="campaign-filter">
    <div class="filter-header">
        <h3>Filters</h3>
        {#if onClose}
            <button class="filter-close" onclick={onClose}>
                <SvgIcon path={mdiClose} size={24} />
            </button>
        {/if}
    </div>

    <!-- Campaign Type -->
    <div class="filter-section">
        <h4 class="filter-title">Campaign Type</h4>
        <div class="filter-options">
            {#each types as type (type.value)}
                <label class="filter-option">
                    <input
                        type="radio"
                        name="type"
                        value={type.value}
                        checked={selectedType === type.value}
                        onchange={() => handleFilterChange(type.value)}
                    />
                    <span>{type.label}</span>
                </label>
            {/each}
        </div>
    </div>

    <!-- Sort By -->
    <div class="filter-section">
        <h4 class="filter-title">Sort By</h4>
        <select class="filter-select" value={sortBy} onchange={(e) => handleSort((e.target as HTMLSelectElement).value)}>
            {#each sorts as sort (sort.value)}
                <option value={sort.value}>{sort.label}</option>
            {/each}
        </select>
    </div>

    <!-- Funding Stage -->
    <div class="filter-section">
        <h4 class="filter-title">Funding Stage</h4>
        <select class="filter-select">
            {#each fundingStages as stage (stage.value)}
                <option value={stage.value}>{stage.label}</option>
            {/each}
        </select>
    </div>

    <!-- Status -->
    <div class="filter-section">
        <h4 class="filter-title">Status</h4>
        <label class="filter-checkbox">
            <input type="checkbox" />
            <span>Verified Artists Only</span>
        </label>
        <label class="filter-checkbox">
            <input type="checkbox" />
            <span>Ending Soon</span>
        </label>
    </div>
</div>

<style lang="scss">
    .campaign-filter {
        display: flex;
        flex-direction: column;
        gap: var(--space-6);
    }

    .filter-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-3);

        h3 {
            margin: 0;
            @include text-lg();
            font-weight: 600;
            color: var(--color-gray-900);

            @media (prefers-color-scheme: dark) {
                color: var(--color-white);
            }
        }
    }

    .filter-close {
        display: none;
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--color-gray-600);

        @media (max-width: 1024px) {
            display: flex;
            align-items: center;
            justify-content: center;
        }
    }

    .filter-section {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
    }

    .filter-title {
        margin: 0;
        @include text-sm();
        font-weight: 600;
        color: var(--color-gray-900);
        text-transform: uppercase;
        letter-spacing: var(--letter-spacing-wide);

        @media (prefers-color-scheme: dark) {
            color: var(--color-white);
        }
    }

    .filter-options {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .filter-option {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        cursor: pointer;
        @include text-sm();
        color: var(--color-gray-700);
        transition: color var(--duration-normal) var(--easing-ease-out);

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-300);
        }

        input[type='radio'] {
            cursor: pointer;
            accent-color: var(--color-brand-500);
        }

        &:hover {
            color: var(--color-gray-900);

            @media (prefers-color-scheme: dark) {
                color: var(--color-white);
            }
        }
    }

    .filter-select {
        padding: var(--space-2) var(--space-3);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        background-color: var(--bg-primary);
        color: var(--color-gray-900);
        font-family: var(--font-family-sans);
        @include text-sm();
        cursor: pointer;
        transition: all var(--duration-normal) var(--easing-ease-out);

        @media (prefers-color-scheme: dark) {
            color: var(--color-white);
        }

        &:focus {
            outline: none;
            border-color: var(--color-brand-500);
            box-shadow: 0 0 0 3px var(--color-brand-50);

            @media (prefers-color-scheme: dark) {
                box-shadow: 0 0 0 3px var(--color-brand-900);
            }
        }
    }

    .filter-checkbox {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        cursor: pointer;
        @include text-sm();
        color: var(--color-gray-700);

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-300);
        }

        input[type='checkbox'] {
            cursor: pointer;
            accent-color: var(--color-brand-500);
        }
    }
</style>