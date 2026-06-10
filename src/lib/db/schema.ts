import { relations } from 'drizzle-orm';
export { users, sessions } from './schemas/users';
export {
	artists,
	artistOnboardingRequests,
	artistAccounts,
	artistSessions
} from './schemas/artist';
export { artistVideos, artistPhotos, artistPosts, artistTags } from './schemas/content';
export { genres, albums, tracks, albumTracks } from './schemas/catalog';
export { trackStats } from './schemas/engagement';
export { playlists, playlistTracks, userFavorites } from './schemas/user-library';
export { purchases } from './schemas/finance';
import { users, sessions } from './schemas/users';
import {
	artists,
	artistOnboardingRequests,
	artistAccounts,
	artistSessions
} from './schemas/artist';
import { artistVideos, artistPhotos, artistPosts, artistTags } from './schemas/content';
import { genres, albums, tracks, albumTracks } from './schemas/catalog';
import { trackStats } from './schemas/engagement';
import { playlists, playlistTracks, userFavorites } from './schemas/user-library';
import { purchases } from './schemas/finance';

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
	artist: one(artists),
	artistOnboardingRequests: many(artistOnboardingRequests),
	playlists: many(playlists),
	favorites: many(userFavorites),
	purchases: many(purchases)
}));

export const artistOnboardingRequestsRelations = relations(artistOnboardingRequests, ({ one }) => ({
	user: one(users, {
		fields: [artistOnboardingRequests.userId],
		references: [users.id]
	})
}));

export const artistAccountsRelations = relations(artistAccounts, ({ one, many }) => ({
	artist: one(artists, {
		fields: [artistAccounts.artistId],
		references: [artists.id]
	}),
	sessions: many(artistSessions)
}));

export const artistSessionsRelations = relations(artistSessions, ({ one }) => ({
	artistAccount: one(artistAccounts, {
		fields: [artistSessions.artistAccountId],
		references: [artistAccounts.id]
	})
}));

export const albumsRelations = relations(albums, ({ one, many }) => ({
	artist: one(artists, {
		fields: [albums.artistId],
		references: [artists.id]
	}),
	albumTracks: many(albumTracks),
	purchases: many(purchases)
}));

export const tracksRelations = relations(tracks, ({ one, many }) => ({
	artist: one(artists, {
		fields: [tracks.artistId],
		references: [artists.id]
	}),
	album: one(albums, {
		fields: [tracks.albumId],
		references: [albums.id]
	}),
	albumTracks: many(albumTracks),
	playlistTracks: many(playlistTracks),
	favorites: many(userFavorites),
	purchases: many(purchases),
	stats: one(trackStats)
}));

export const playlistsRelations = relations(playlists, ({ one, many }) => ({
	user: one(users, {
		fields: [playlists.userId],
		references: [users.id]
	}),
	tracks: many(playlistTracks)
}));

export const playlistTracksRelations = relations(playlistTracks, ({ one }) => ({
	playlist: one(playlists, {
		fields: [playlistTracks.playlistId],
		references: [playlists.id]
	}),
	track: one(tracks, {
		fields: [playlistTracks.trackId],
		references: [tracks.id]
	})
}));

export const albumTracksRelations = relations(albumTracks, ({ one }) => ({
	album: one(albums, {
		fields: [albumTracks.albumId],
		references: [albums.id]
	}),
	track: one(tracks, {
		fields: [albumTracks.trackId],
		references: [tracks.id]
	})
}));

export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
	user: one(users, {
		fields: [userFavorites.userId],
		references: [users.id]
	}),
	track: one(tracks, {
		fields: [userFavorites.trackId],
		references: [tracks.id]
	})
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
	user: one(users, {
		fields: [purchases.userId],
		references: [users.id]
	}),
	track: one(tracks, {
		fields: [purchases.trackId],
		references: [tracks.id]
	}),
	album: one(albums, {
		fields: [purchases.albumId],
		references: [albums.id]
	})
}));

// Session relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	})
}));

export const trackStatsRelations = relations(trackStats, ({ one }) => ({
	track: one(tracks, {
		fields: [trackStats.trackId],
		references: [tracks.id]
	})
}));

export const artistsRelations = relations(artists, ({ one, many }) => ({
	user: one(users, {
		fields: [artists.userId],
		references: [users.id]
	}),
	tracks: many(tracks),
	albums: many(albums),
	artistAccounts: many(artistAccounts),
	artistTags: many(artistTags),
	artistVideos: many(artistVideos),
	artistPhotos: many(artistPhotos),
	artistPosts: many(artistPosts)
}));
export const artistTagsRelations = relations(artistTags, ({ one }) => ({
	artist: one(artists, {
		fields: [artistTags.artistId],
		references: [artists.id]
	})
}));

export const artistVideosRelations = relations(artistVideos, ({ one }) => ({
	artist: one(artists, {
		fields: [artistVideos.artistId],
		references: [artists.id]
	})
}));

export const artistPhotosRelations = relations(artistPhotos, ({ one }) => ({
	artist: one(artists, {
		fields: [artistPhotos.artistId],
		references: [artists.id]
	})
}));

export const artistPostsRelations = relations(artistPosts, ({ one }) => ({
	artist: one(artists, {
		fields: [artistPosts.artistId],
		references: [artists.id]
	})
}));

// User type exports for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Artist = typeof artists.$inferSelect;
export type NewArtist = typeof artists.$inferInsert;
export type ArtistOnboardingRequest = typeof artistOnboardingRequests.$inferSelect;
export type NewArtistOnboardingRequest = typeof artistOnboardingRequests.$inferInsert;
export type ArtistAccount = typeof artistAccounts.$inferSelect;
export type NewArtistAccount = typeof artistAccounts.$inferInsert;
export type ArtistSession = typeof artistSessions.$inferSelect;
export type Album = typeof albums.$inferSelect;
export type NewAlbum = typeof albums.$inferInsert;
export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;
export type TrackStats = typeof trackStats.$inferSelect;
export type Genre = typeof genres.$inferSelect;
export type NewGenre = typeof genres.$inferInsert;
export type AlbumTrack = typeof albumTracks.$inferSelect;
export type NewAlbumTrack = typeof albumTracks.$inferInsert;
export type Playlist = typeof playlists.$inferInsert;
export type PlaylistTrack = typeof playlistTracks.$inferInsert;
export type ArtistVideo = typeof artistVideos.$inferSelect;
export type ArtistPhoto = typeof artistPhotos.$inferSelect;
export type ArtistPost = typeof artistPosts.$inferSelect;
export type ArtistTag = typeof artistTags.$inferSelect;

// Export all tables for migrations
export const schema = {
	users,
	sessions,
	artists,
	artistOnboardingRequests,
	artistAccounts,
	artistSessions,
	artistVideos,
	artistPhotos,
	artistPosts,
	artistTags,
	genres,
	albums,
	tracks,
	trackStats,
	albumTracks,
	playlists,
	playlistTracks,
	userFavorites,
	purchases
};
