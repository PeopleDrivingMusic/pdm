<script lang="ts">
    import ArtistCard from './ArtistCard.svelte';

    interface Artist {
        id: string;
        name: string;
        avatar: string;
        genre: string;
        followers: number;
        tracks: number;
        isVerified: boolean;
        coverImg: string;
        description: string;
    }

    interface Props {
        artists: Artist[];
    }

    const { artists }: Props = $props();
</script>

<div class="artist-grid">
    {#each artists as artist (artist.id)}
        <ArtistCard {artist} />
    {/each}
</div>

<style lang="scss">
    .artist-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: var(--space-6);

        @media (max-width: 1024px) {
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        }

        @media (max-width: 768px) {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: var(--space-4);
        }

        @media (max-width: 480px) {
            grid-template-columns: 1fr;
        }
    }
</style>