import type { Album, Artist, Track } from "$lib/db";
interface PlayerTrack { track: Track, artist?: Artist | null, album?: Album | null, isLiked?: boolean }
interface PlayerStore {
    que: Array<PlayerTrack>;
    currentTrackIndex: number;
    isPlaying: boolean;
    repeatMode: 'none' | 'one' | 'all';
    shuffle: boolean,
    volume: number, // 0.0 to 0.1
    currentTime: number,
    currentTrack: PlayerTrack | null;
}

export const playerStore = $state<PlayerStore>({
    que: [],
    currentTrackIndex: -1,
    isPlaying: false,
    repeatMode: 'none', // 'none' | 'one' | 'all'
    shuffle: false,
    volume: 1.0, // 0.0 to 1.0
    currentTime: 0, // in seconds
    get currentTrack() {
        return this.currentTrackIndex >= 0 && this.currentTrackIndex < this.que.length
            ? this.que[this.currentTrackIndex]
            : null;
    }
});
