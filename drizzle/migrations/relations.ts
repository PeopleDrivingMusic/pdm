import { relations } from 'drizzle-orm/relations';
import {
	users,
	artists,
	albums,
	tracks,
	trackStats,
	purchases,
	playlists,
	playlistTracks,
	sessions,
	userFavorites,
	artistAccounts,
	artistOnboardingRequests,
	artistSessions,
	albumTracks,
	artistTags,
	artistVideos,
	artistPhotos,
	artistPosts
} from './schema';

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

export const usersRelations = relations(users, ({ many }) => ({
	artists: many(artists),
	purchases: many(purchases),
	playlists: many(playlists),
	sessions: many(sessions),
	userFavorites: many(userFavorites),
	artistOnboardingRequests: many(artistOnboardingRequests)
}));

export const tracksRelations = relations(tracks, ({ one, many }) => ({
	album: one(albums, {
		fields: [tracks.albumId],
		references: [albums.id]
	}),
	artist: one(artists, {
		fields: [tracks.artistId],
		references: [artists.id]
	}),
	trackStats: many(trackStats),
	purchases: many(purchases),
	playlistTracks: many(playlistTracks),
	userFavorites: many(userFavorites),
	albumTracks: many(albumTracks)
}));

export const albumsRelations = relations(albums, ({ one, many }) => ({
	tracks: many(tracks),
	purchases: many(purchases),
	artist: one(artists, {
		fields: [albums.artistId],
		references: [artists.id]
	}),
	albumTracks: many(albumTracks)
}));

export const trackStatsRelations = relations(trackStats, ({ one }) => ({
	track: one(tracks, {
		fields: [trackStats.trackId],
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

export const playlistsRelations = relations(playlists, ({ one, many }) => ({
	user: one(users, {
		fields: [playlists.userId],
		references: [users.id]
	}),
	playlistTracks: many(playlistTracks)
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

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
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

export const artistAccountsRelations = relations(artistAccounts, ({ one, many }) => ({
	artist: one(artists, {
		fields: [artistAccounts.artistId],
		references: [artists.id]
	}),
	artistSessions: many(artistSessions)
}));

export const artistOnboardingRequestsRelations = relations(artistOnboardingRequests, ({ one }) => ({
	user: one(users, {
		fields: [artistOnboardingRequests.userId],
		references: [users.id]
	})
}));

export const artistSessionsRelations = relations(artistSessions, ({ one }) => ({
	artistAccount: one(artistAccounts, {
		fields: [artistSessions.artistAccountId],
		references: [artistAccounts.id]
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
