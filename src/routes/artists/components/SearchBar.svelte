<script lang="ts">
    import SvgIcon from '$lib/ui/SvgIcon.svelte';
    import { mdiMagnify } from '@mdi/js';

    interface Props {
        handleSearch: (query: string) => void;
    }

    const { handleSearch }: Props = $props();

    let query = $state('');

    function onInput(e: Event) {
        const input = e.target as HTMLInputElement;
        query = input.value;
        handleSearch(query);
    }
</script>

<div class="search-bar">
    <SvgIcon path={mdiMagnify} size={20} class="search-bar__icon" />
    <input
        type="text"
        class="search-bar__input"
        placeholder="Search artists, genres..."
        value={query}
        oninput={onInput}
    />
</div>

<style lang="scss">
    .search-bar {
        position: relative;
        display: flex;
        align-items: center;
        background-color: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: var(--radius-md);
        padding: var(--space-3) var(--space-4);
        backdrop-filter: blur(8px);
        transition: all var(--duration-normal) var(--easing-ease-out);

        &:focus-within {
            background-color: rgba(255, 255, 255, 0.25);
            border-color: rgba(255, 255, 255, 0.5);
        }
    }

    .search-bar__icon {
        color: rgba(255, 255, 255, 0.8);
        flex-shrink: 0;
        margin-right: var(--space-3);
    }

    .search-bar__input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--color-white);
        @include text-md();
        font-family: var(--font-family-sans);

        &::placeholder {
            color: rgba(255, 255, 255, 0.7);
        }

        &:-webkit-autofill {
            -webkit-box-shadow: 0 0 0 1000px transparent inset;
            -webkit-text-fill-color: var(--color-white);
        }
    }
</style>