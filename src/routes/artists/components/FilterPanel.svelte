<script lang="ts">
    import { Checkbox } from '$lib/ui';

    interface Props {
        genres: string[];
        selectedGenre: string;
        handleGenreChange: (genre: string) => void;
    }

    const { genres, selectedGenre, handleGenreChange }: Props = $props();

    let showVerified = $state(false);
    let sortBy = $state('trending');
</script>

<div class="filter-panel">
    <div class="filter-section">
        <h3 class="filter-section__title">Genres</h3>
        <div class="filter-options">
            {#each genres as genre (genre)}
                <label class="filter-option">
                    <input
                        type="radio"
                        name="genre"
                        value={genre}
                        checked={selectedGenre === genre}
                        onchange={() => handleGenreChange(genre)}
                    />
                    <span>{genre === 'all' ? 'All Genres' : genre}</span>
                </label>
            {/each}
        </div>
    </div>

    <div class="filter-section">
        <h3 class="filter-section__title">Sort By</h3>
        <select class="filter-select" bind:value={sortBy}>
            <option value="trending">Trending</option>
            <option value="followers">Most Followers</option>
            <option value="newest">Newest</option>
            <option value="verified">Verified First</option>
        </select>
    </div>

    <div class="filter-section">
        <h3 class="filter-section__title">Status</h3>
        <label class="filter-checkbox">
            <input type="checkbox" bind:checked={showVerified} />
            <span>Verified Artists Only</span>
        </label>
    </div>

    <button class="filter-reset">Reset Filters</button>
</div>

<style lang="scss">
    .filter-panel {
        display: flex;
        flex-direction: column;
        gap: var(--space-6);
    }

    .filter-section {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
    }

    .filter-section__title {
        margin: 0;
        @include text-md();
        font-weight: 600;
        color: var(--color-gray-900);

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
        border: 1px solid var(--color-gray-300);
        border-radius: var(--radius-md);
        background-color: var(--color-white);
        color: var(--color-gray-900);
        font-family: var(--font-family-sans);
        @include text-sm();
        cursor: pointer;
        transition: all var(--duration-normal) var(--easing-ease-out);

        @media (prefers-color-scheme: dark) {
            background-color: var(--color-gray-800);
            border-color: var(--color-gray-700);
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

    .filter-reset {
        padding: var(--space-2) var(--space-3);
        background-color: var(--color-gray-100);
        border: 1px solid var(--color-gray-300);
        border-radius: var(--radius-md);
        color: var(--color-gray-900);
        font-weight: 500;
        @include text-sm();
        cursor: pointer;
        transition: all var(--duration-normal) var(--easing-ease-out);

        @media (prefers-color-scheme: dark) {
            background-color: var(--color-gray-800);
            border-color: var(--color-gray-700);
            color: var(--color-white);
        }

        &:hover {
            background-color: var(--color-gray-200);
            border-color: var(--color-gray-400);

            @media (prefers-color-scheme: dark) {
                background-color: var(--color-gray-700);
                border-color: var(--color-gray-600);
            }
        }
    }
</style>