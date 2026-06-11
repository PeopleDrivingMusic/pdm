import { relations } from 'drizzle-orm';
export { users, sessions } from './schemas/users';
export {
	artists,
	artistOnboardingRequests,
	artistAccounts,
	artistSessions
} from './schemas/artist';
export {
	posts,
	contentMedia,
	postMedia,
	postMusicAttachments,
	postPolls,
	postPollOptions,
	postPollVotes,
	photoAlbums,
	photos,
	videos,
	videoCollections,
	videoCollectionItems,
	artistFeedItems
} from './schemas/content';
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
import {
	posts,
	contentMedia,
	postMedia,
	postMusicAttachments,
	postPolls,
	postPollOptions,
	postPollVotes,
	photoAlbums,
	photos,
	videos,
	videoCollections,
	videoCollectionItems,
	artistFeedItems
} from './schemas/content';
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
	posts: many(posts),
	contentMedia: many(contentMedia),
	photoAlbums: many(photoAlbums),
	videos: many(videos),
	videoCollections: many(videoCollections),
	artistFeedItems: many(artistFeedItems)
}));
export const postsRelations = relations(posts, ({ one, many }) => ({
	artist: one(artists, {
		fields: [posts.artistId],
		references: [artists.id]
	}),
	media: many(postMedia),
	musicAttachments: many(postMusicAttachments),
	polls: many(postPolls)
}));

export const contentMediaRelations = relations(contentMedia, ({ one, many }) => ({
	artist: one(artists, {
		fields: [contentMedia.artistId],
		references: [artists.id]
	}),
	postMedia: many(postMedia),
	photos: many(photos)
}));

export const postMediaRelations = relations(postMedia, ({ one }) => ({
	post: one(posts, {
		fields: [postMedia.postId],
		references: [posts.id]
	}),
	media: one(contentMedia, {
		fields: [postMedia.mediaId],
		references: [contentMedia.id]
	})
}));

export const postMusicAttachmentsRelations = relations(postMusicAttachments, ({ one }) => ({
	post: one(posts, {
		fields: [postMusicAttachments.postId],
		references: [posts.id]
	}),
	track: one(tracks, {
		fields: [postMusicAttachments.trackId],
		references: [tracks.id]
	}),
	album: one(albums, {
		fields: [postMusicAttachments.albumId],
		references: [albums.id]
	})
}));

export const postPollsRelations = relations(postPolls, ({ one, many }) => ({
	post: one(posts, {
		fields: [postPolls.postId],
		references: [posts.id]
	}),
	options: many(postPollOptions),
	votes: many(postPollVotes)
}));

export const postPollOptionsRelations = relations(postPollOptions, ({ one, many }) => ({
	poll: one(postPolls, {
		fields: [postPollOptions.pollId],
		references: [postPolls.id]
	}),
	votes: many(postPollVotes)
}));

export const postPollVotesRelations = relations(postPollVotes, ({ one }) => ({
	poll: one(postPolls, {
		fields: [postPollVotes.pollId],
		references: [postPolls.id]
	}),
	option: one(postPollOptions, {
		fields: [postPollVotes.optionId],
		references: [postPollOptions.id]
	}),
	user: one(users, {
		fields: [postPollVotes.userId],
		references: [users.id]
	})
}));

export const photoAlbumsRelations = relations(photoAlbums, ({ one, many }) => ({
	artist: one(artists, {
		fields: [photoAlbums.artistId],
		references: [artists.id]
	}),
	photos: many(photos)
}));

export const photosRelations = relations(photos, ({ one }) => ({
	album: one(photoAlbums, {
		fields: [photos.albumId],
		references: [photoAlbums.id]
	}),
	media: one(contentMedia, {
		fields: [photos.mediaId],
		references: [contentMedia.id]
	})
}));

export const videosRelations = relations(videos, ({ one }) => ({
	artist: one(artists, {
		fields: [videos.artistId],
		references: [artists.id]
	})
}));

export const videoCollectionsRelations = relations(videoCollections, ({ one, many }) => ({
	artist: one(artists, {
		fields: [videoCollections.artistId],
		references: [artists.id]
	}),
	items: many(videoCollectionItems)
}));

export const videoCollectionItemsRelations = relations(videoCollectionItems, ({ one }) => ({
	collection: one(videoCollections, {
		fields: [videoCollectionItems.collectionId],
		references: [videoCollections.id]
	}),
	video: one(videos, {
		fields: [videoCollectionItems.videoId],
		references: [videos.id]
	})
}));

export const artistFeedItemsRelations = relations(artistFeedItems, ({ one }) => ({
	artist: one(artists, {
		fields: [artistFeedItems.artistId],
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
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type ContentMedia = typeof contentMedia.$inferSelect;
export type NewContentMedia = typeof contentMedia.$inferInsert;
export type PostMedia = typeof postMedia.$inferSelect;
export type NewPostMedia = typeof postMedia.$inferInsert;
export type PostMusicAttachment = typeof postMusicAttachments.$inferSelect;
export type NewPostMusicAttachment = typeof postMusicAttachments.$inferInsert;
export type PostPoll = typeof postPolls.$inferSelect;
export type NewPostPoll = typeof postPolls.$inferInsert;
export type PostPollOption = typeof postPollOptions.$inferSelect;
export type NewPostPollOption = typeof postPollOptions.$inferInsert;
export type PostPollVote = typeof postPollVotes.$inferSelect;
export type NewPostPollVote = typeof postPollVotes.$inferInsert;
export type PhotoAlbum = typeof photoAlbums.$inferSelect;
export type NewPhotoAlbum = typeof photoAlbums.$inferInsert;
export type Photo = typeof photos.$inferSelect;
export type NewPhoto = typeof photos.$inferInsert;
export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
export type VideoCollection = typeof videoCollections.$inferSelect;
export type NewVideoCollection = typeof videoCollections.$inferInsert;
export type VideoCollectionItem = typeof videoCollectionItems.$inferSelect;
export type NewVideoCollectionItem = typeof videoCollectionItems.$inferInsert;
export type ArtistFeedItem = typeof artistFeedItems.$inferSelect;
export type NewArtistFeedItem = typeof artistFeedItems.$inferInsert;

// Export all tables for migrations
export const schema = {
	users,
	sessions,
	artists,
	artistOnboardingRequests,
	artistAccounts,
	artistSessions,
	posts,
	contentMedia,
	postMedia,
	postMusicAttachments,
	postPolls,
	postPollOptions,
	postPollVotes,
	photoAlbums,
	photos,
	videos,
	videoCollections,
	videoCollectionItems,
	artistFeedItems,
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
