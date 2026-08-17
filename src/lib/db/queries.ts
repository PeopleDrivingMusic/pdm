import { db, withDbLogging } from './index';
import {
	users,
	artists,
	albums,
	tracks,
	playlists,
	userFavorites,
	trackStats,
	playlistTracks,
	artistOnboardingRequests,
	artistAccounts,
	genres,
	albumTracks
} from './schema';
import { eq, like, and, or, desc, count, sql } from 'drizzle-orm';
import type {
	User,
	NewUser,
	Artist,
	NewArtist,
	Track,
	NewTrack,
	NewAlbum,
	Album,
	ArtistOnboardingRequest,
	NewArtistOnboardingRequest,
	ArtistAccount,
	NewArtistAccount,
	Genre,
	AlbumTrack
} from './index';
import { logger } from '$lib/utils/logger';
import { deleteFileFromR2 } from './services/R2Service';

function playableTrackStatus() {
	return or(eq(tracks.status, 'uploaded'), eq(tracks.status, 'ready'));
}

// Anonymous viewers have no userId; joining an empty string against a uuid column
// makes Postgres reject the whole query (22P02), so match no rows instead.
function favoritesJoinFor(userId: string) {
	return userId
		? and(eq(tracks.id, userFavorites.trackId), eq(userFavorites.userId, userId))
		: sql`false`;
}

// User operations
export class UserService {
	static async createUser(data: NewUser): Promise<User> {
		return await withDbLogging('UserService.createUser', async () => {
			// Generate username if not provided
			let username = data.username;
			if (!username) {
				const emailPrefix = data.email.split('@')[0];
				username = `${emailPrefix}_${Date.now()}`;
			}

			const newUser: NewUser = {
				email: data.email,
				username,
				displayName: data.displayName || data.email.split('@')[0],
				googleId: data.googleId,
				avatarUrl: data.avatarUrl,
				hashedPassword: data.hashedPassword
			};

			const [user] = await db.insert(users).values(newUser).returning();

			logger.info('User created successfully', {
				component: 'database',
				metadata: {
					userId: user.id,
					email: user.email,
					provider: data.googleId ? 'google' : 'email'
				}
			});

			return user;
		});
	}

	static async getUserById(id: string): Promise<User | undefined> {
		return await withDbLogging('UserService.getUserById', async () => {
			try {
				const result = await db.select().from(users).where(eq(users.id, id));
				const user = result[0] ?? null;

				logger.debug('User retrieved by ID', {
					component: 'database',
					metadata: {
						id,
						found: !!user
					}
				});

				return user;
			} catch (error) {
				logger.error('Failed to get user by ID', {
					component: 'database',
					userId: id,
					metadata: { error }
				});
				return;
			}
		});
	}

	static async getUserByEmail(email: string): Promise<User | null> {
		return await withDbLogging('UserService.getUserByEmail', async () => {
			try {
				const result = await db.select().from(users).where(eq(users.email, email));
				const user = result[0] ?? null;

				logger.debug('User retrieved by email', {
					component: 'database',
					metadata: {
						email,
						found: !!user
					}
				});

				return user;
			} catch (error) {
				logger.error('Failed to get user by email', {
					component: 'database',
					metadata: { error, email }
				});
				return null;
			}
		});
	}

	static async getUserFromGoogleId(googleId: string): Promise<User | null> {
		return await withDbLogging('UserService.getUserFromGoogleId', async () => {
			try {
				const result = await db.select().from(users).where(eq(users.googleId, googleId));
				const user = result[0] ?? null;

				logger.debug('User retrieved by Google ID', {
					component: 'database',
					metadata: {
						googleId,
						found: !!user
					}
				});

				return user;
			} catch (error) {
				logger.error('Failed to get user by Google ID', {
					component: 'database',
					metadata: { error, googleId }
				});
				return null;
			}
		});
	}

	static async getUserByUsername(username: string): Promise<User | null> {
		return await withDbLogging('UserService.getUserByUsername', async () => {
			try {
				const result = await db.select().from(users).where(eq(users.username, username));
				const user = result[0] ?? null;

				logger.debug('User retrieved by username', {
					component: 'database',
					metadata: {
						username,
						found: !!user
					}
				});

				return user;
			} catch (error) {
				logger.error('Failed to get user by username', {
					component: 'database',
					metadata: { error, username }
				});
				return null;
			}
		});
	}

	static async updateUser(userId: string, data: Partial<NewUser>): Promise<User | null> {
		return await withDbLogging('UserService.updateUser', async () => {
			try {
				const result = await db
					.update(users)
					.set({
						...data,
						updatedAt: new Date()
					})
					.where(eq(users.id, userId))
					.returning();

				const user = result[0] ?? null;

				if (user) {
					logger.info('User updated successfully', {
						component: 'database',
						userId: user.id,
						metadata: {
							updatedFields: Object.keys(data)
						}
					});
				}

				return user;
			} catch (error) {
				logger.error('Failed to update user', {
					component: 'database',
					userId,
					metadata: { error }
				});
				throw error;
			}
		});
	}

	static async deleteUser(id: string): Promise<boolean> {
		return await withDbLogging('UserService.deleteUser', async () => {
			try {
				const result = await db.delete(users).where(eq(users.id, id));
				const deleted = result.length > 0;

				logger.info('User deletion attempt', {
					component: 'database',
					metadata: {
						userId: id,
						deleted
					}
				});

				return deleted;
			} catch (error) {
				logger.error('Failed to delete user', {
					component: 'database',
					metadata: { error, userId: id }
				});
				return false;
			}
		});
	}
}

// Artist operations
export class ArtistService {
	static async createArtist(artistData: NewArtist): Promise<Artist> {
		const [artist] = await db.insert(artists).values(artistData).returning();
		return artist;
	}

	static async getArtistBySlug(slug: string): Promise<Artist | undefined> {
		const [artist] = await db.select().from(artists).where(eq(artists.slug, slug));
		return artist;
	}

	static async getArtistById(id: string): Promise<Artist | undefined> {
		const [artist] = await db.select().from(artists).where(eq(artists.id, id));
		return artist;
	}

	static async getArtistByUserId(userId: string): Promise<Artist | undefined> {
		const [artist] = await db.select().from(artists).where(eq(artists.userId, userId));
		return artist;
	}

	static async searchArtists(query: string, limit = 10) {
		return await db
			.select()
			.from(artists)
			.where(or(like(artists.name, `%${query}%`), like(artists.genre, `%${query}%`)))
			.limit(limit);
	}

	static async getActiveArtists(limit = 20) {
		return await db
			.select()
			.from(artists)
			.where(eq(artists.isActive, true))
			.orderBy(desc(artists.createdAt))
			.limit(limit);
	}
}

// Artist onboarding requests
export class ArtistOnboardingService {
	static async createRequest(data: NewArtistOnboardingRequest): Promise<ArtistOnboardingRequest> {
		return await withDbLogging('ArtistOnboardingService.createRequest', async () => {
			const [request] = await db.insert(artistOnboardingRequests).values(data).returning();
			return request;
		});
	}

	static async getLatestByUserId(userId: string): Promise<ArtistOnboardingRequest | null> {
		return await withDbLogging('ArtistOnboardingService.getLatestByUserId', async () => {
			const [request] = await db
				.select()
				.from(artistOnboardingRequests)
				.where(eq(artistOnboardingRequests.userId, userId))
				.orderBy(desc(artistOnboardingRequests.createdAt))
				.limit(1);
			return request ?? null;
		});
	}

	static async updateStatus(
		id: string,
		status: 'pending' | 'approved' | 'rejected',
		reviewerNote?: string | null
	): Promise<ArtistOnboardingRequest | null> {
		return await withDbLogging('ArtistOnboardingService.updateStatus', async () => {
			const [request] = await db
				.update(artistOnboardingRequests)
				.set({
					status,
					reviewerNote: reviewerNote ?? null,
					reviewedAt: new Date(),
					updatedAt: new Date()
				})
				.where(eq(artistOnboardingRequests.id, id))
				.returning();
			return request ?? null;
		});
	}
}

// Artist accounts (studio login)
export class ArtistAccountService {
	static async createAccount(data: NewArtistAccount): Promise<ArtistAccount> {
		return await withDbLogging('ArtistAccountService.createAccount', async () => {
			const [account] = await db.insert(artistAccounts).values(data).returning();
			return account;
		});
	}

	static async getByLogin(login: string): Promise<ArtistAccount | null> {
		return await withDbLogging('ArtistAccountService.getByLogin', async () => {
			const [account] = await db
				.select()
				.from(artistAccounts)
				.where(eq(artistAccounts.login, login));
			return account ?? null;
		});
	}

	static async getByArtistId(artistId: string): Promise<ArtistAccount | null> {
		return await withDbLogging('ArtistAccountService.getByArtistId', async () => {
			const [account] = await db
				.select()
				.from(artistAccounts)
				.where(eq(artistAccounts.artistId, artistId));
			return account ?? null;
		});
	}

	static async getById(id: string): Promise<ArtistAccount | null> {
		return await withDbLogging('ArtistAccountService.getById', async () => {
			const [account] = await db.select().from(artistAccounts).where(eq(artistAccounts.id, id));
			return account ?? null;
		});
	}
}

// Track operations
export class TrackService {
	static async createTrack(trackData: NewTrack): Promise<Track> {
		const [track] = await db.insert(tracks).values(trackData).returning();
		return track;
	}

	static async getTrackById(id: string): Promise<Track | undefined> {
		const [track] = await db.select().from(tracks).where(eq(tracks.id, id));
		return track;
	}

	static async getTracksByArtist({ artistId = '', userId = '', limit = 50 }) {
		return await withDbLogging('TrackService.getTracksByArtist', async () => {
			try {
				const query = db
					.select({
						track: tracks,
						isLiked: sql<boolean>`CASE WHEN ${userFavorites.id} IS NOT NULL THEN true ELSE false END`
					})
					.from(tracks)
					.leftJoin(userFavorites, favoritesJoinFor(userId));
				const result = await query
					.where(
						and(eq(tracks.artistId, artistId), eq(tracks.isPublished, true), playableTrackStatus())
					)
					.orderBy(desc(tracks.createdAt))
					.limit(limit);
				return result;
			} catch (error) {
				logger.error('Failed to get tracks by artist', {
					component: 'database',
					metadata: { error, limit, artistId }
				});
				throw error;
			}
		});
	}

	static async getTracksByAlbum(albumId: string) {
		return await db
			.select()
			.from(tracks)
			.where(and(eq(tracks.albumId, albumId), eq(tracks.isPublished, true), playableTrackStatus()))
			.orderBy(tracks.trackNumber);
	}

	static async searchTracks(query: string, limit = 20) {
		return await db
			.select()
			.from(tracks)
			.where(
				and(
					eq(tracks.isPublished, true),
					playableTrackStatus(),
					or(like(tracks.title, `%${query}%`), like(tracks.genre, `%${query}%`))
				)
			)
			.limit(limit);
	}

	static async getPopularTracks({ limit = 10, offset = 0, userId = '' }) {
		return await withDbLogging('TrackService.getPopularTracks', async () => {
			try {
				const query = db
					.select({
						tracks,
						artists: artists,
						albums: albums,
						isLiked: sql<boolean>`CASE WHEN ${userFavorites.id} IS NOT NULL THEN true ELSE false END`
					})
					.from(tracks)
					.leftJoin(trackStats, eq(tracks.id, trackStats.trackId))
					.leftJoin(artists, eq(tracks.artistId, artists.id))
					.leftJoin(albums, eq(tracks.albumId, albums.id))
					.leftJoin(userFavorites, favoritesJoinFor(userId));

				const result = await query
					.where(and(eq(tracks.isPublished, true), playableTrackStatus()))
					.orderBy(desc(trackStats.playCount))
					.limit(limit)
					.offset(offset);
				return result;
			} catch (error) {
				logger.error('Failed to get popular tracks', {
					component: 'database',
					metadata: { error, limit, offset }
				});
				throw error;
			}
		});
	}

	static async incrementPlayCount(trackId: string) {
		return await withDbLogging('TrackService.incrementPlayCount', async () => {
			try {
				await db
					.insert(trackStats)
					.values({
						trackId,
						playCount: 1,
						lastUpdated: new Date()
					})
					.onConflictDoUpdate({
						target: trackStats.trackId,
						set: {
							playCount: sql`${trackStats.playCount} + 1`,
							lastUpdated: new Date()
						}
					});
			} catch (error) {
				logger.error('Failed to increment play count', {
					component: 'database',
					metadata: { error, trackId }
				});
			}
		});
	}

	static async toggleLike(userId: string, trackId: string): Promise<boolean> {
		return await withDbLogging('TrackService.toggleLike', async () => {
			try {
				const isLiked = await this.isTrackLikedByUser(userId, trackId);

				return isLiked
					? await this.unlikeTrack(userId, trackId, false)
					: await this.likeTrack(userId, trackId, false);
			} catch (error) {
				logger.error('Failed to toggle like track', {
					component: 'database',
					metadata: { error, userId, trackId }
				});
				return false;
			}
		});
	}

	static async likeTrack(userId: string, trackId: string, needCheck = true): Promise<boolean> {
		return await withDbLogging('TrackService.likeTrack', async () => {
			try {
				const isLiked = needCheck ? await this.isTrackLikedByUser(userId, trackId) : false;

				if (isLiked) {
					return false;
				}

				await db.insert(userFavorites).values({
					userId,
					trackId
				});

				// Upsert track stat
				await db
					.insert(trackStats)
					.values({
						trackId,
						likeCount: 1,
						lastUpdated: new Date()
					})
					.onConflictDoUpdate({
						target: trackStats.trackId,
						set: {
							likeCount: sql`${trackStats.likeCount} + 1`,
							lastUpdated: new Date()
						}
					});

				logger.info('Track liked', {
					component: 'database',
					metadata: { userId, trackId }
				});

				return true;
			} catch (error) {
				logger.error('Failed to like track', {
					component: 'database',
					metadata: { error, userId, trackId }
				});
				return false;
			}
		});
	}

	static async unlikeTrack(userId: string, trackId: string, needCheck = true): Promise<boolean> {
		return await withDbLogging('TrackInteractionService.unlikeTrack', async () => {
			try {
				const isLiked = needCheck ? await this.isTrackLikedByUser(userId, trackId) : true;

				if (isLiked) {
					// Upsert track stat -
					await db
						.insert(trackStats)
						.values({
							trackId,
							likeCount: 0,
							lastUpdated: new Date()
						})
						.onConflictDoUpdate({
							target: trackStats.trackId,
							set: {
								likeCount: sql`CASE WHEN ${trackStats.likeCount} > 0 THEN ${trackStats.likeCount} - 1 ELSE 0 END`,
								lastUpdated: new Date()
							}
						});

					await db
						.delete(userFavorites)
						.where(and(eq(userFavorites.userId, userId), eq(userFavorites.trackId, trackId)));
				}

				return isLiked;
			} catch (error) {
				logger.error('Failed to unlike track', {
					component: 'database',
					metadata: { error, userId, trackId }
				});
				return false;
			}
		});
	}

	static async isTrackLikedByUser(userId: string, trackId: string): Promise<boolean> {
		const result = await db
			.select()
			.from(userFavorites)
			.where(and(eq(userFavorites.userId, userId), eq(userFavorites.trackId, trackId)));
		return result.length > 0;
	}
	static async saveTrackToPlaylist(
		userId: string,
		trackId: string,
		playlistId: string
	): Promise<boolean> {
		return await withDbLogging('TrackService.saveToPlaylist', async () => {
			try {
				// check if user own playlist
				const playlist = await db
					.select()
					.from(playlists)
					.where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)));

				if (!playlist.length) {
					throw new Error('Playlist not found or not owned by user');
				}

				const existing = await db
					.select()
					.from(playlistTracks)
					.where(
						and(eq(playlistTracks.playlistId, playlistId), eq(playlistTracks.trackId, trackId))
					);

				if (existing.length > 0) {
					return false;
				}

				const maxPosition = await db
					.select({ maxPos: sql<number>`MAX(${playlistTracks.position})` })
					.from(playlistTracks)
					.where(eq(playlistTracks.playlistId, playlistId));

				const nextPosition = (maxPosition[0]?.maxPos ?? 0) + 1;

				await db.insert(playlistTracks).values({
					playlistId,
					trackId,
					position: nextPosition
				});

				// Upsert track stat -
				await db
					.insert(trackStats)
					.values({
						trackId,
						saveCount: 1,
						lastUpdated: new Date()
					})
					.onConflictDoUpdate({
						target: trackStats.trackId,
						set: {
							saveCount: sql`${trackStats.saveCount} + 1`,
							lastUpdated: new Date()
						}
					});

				logger.info('Track saved to playlist', {
					component: 'database',
					metadata: { userId, trackId, playlistId }
				});

				return true;
			} catch (error) {
				logger.error('Failed to save track to playlist', {
					component: 'database',
					metadata: { error, userId, trackId, playlistId }
				});
				return false;
			}
		});
	}

	static async removeTrackFromPlaylist(
		playlistTrackId: string,
		userId: string,
		playlistId: string
	): Promise<boolean> {
		return await withDbLogging('TrackService.removeTrackFromPlaylist', async () => {
			try {
				const isOwner = await db
					.select()
					.from(playlists)
					.where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)));

				if (!isOwner.length) {
					throw new Error('Playlist not found or not owned by user');
				}

				const playlistTrack = await db
					.select({ trackId: playlistTracks.trackId })
					.from(playlistTracks)
					.where(eq(playlistTracks.id, playlistTrackId));

				const trackId = playlistTrack[0].trackId;

				const result = await db
					.delete(playlistTracks)
					.where(eq(playlistTracks.id, playlistTrackId));

				if (result.length) {
					// Upsert track stat -
					await db
						.insert(trackStats)
						.values({
							trackId,
							saveCount: 0,
							lastUpdated: new Date()
						})
						.onConflictDoUpdate({
							target: trackStats.trackId,
							set: {
								saveCount: sql`CASE WHEN ${trackStats.saveCount} > 0 THEN ${trackStats.saveCount} - 1 ELSE 0 END`,
								lastUpdated: new Date()
							}
						});

					logger.info('Track removed from playlist', {
						component: 'database',
						metadata: { userId, trackId, playlistId, playlistTrackId }
					});
				}

				return result.length > 0;
			} catch (error) {
				logger.error('Failed to remove track from playlist', {
					component: 'database',
					metadata: { error, playlistTrackId }
				});
				return false;
			}
		});
	}

	// ANALYTICS
	static async getTrackStats(trackId: string) {
		return await withDbLogging('TrackService.getTrackStats', async () => {
			try {
				const [stats] = await db.select().from(trackStats).where(eq(trackStats.trackId, trackId));
				return stats ?? null;
			} catch (error) {
				logger.error('Failed to get track stats', {
					component: 'database',
					metadata: { error, trackId }
				});
				return null;
			}
		});
	}

	static async getUserLikedTracks(userId: string, limit = 50, offset = 0) {
		return await withDbLogging('TrackService.getUserLikedTracks', async () => {
			try {
				return await db
					.select()
					.from(userFavorites)
					.innerJoin(tracks, eq(userFavorites.trackId, tracks.id))
					.where(eq(userFavorites.userId, userId))
					.orderBy(desc(userFavorites.createdAt))
					.limit(limit)
					.offset(offset);
			} catch (error) {
				logger.error('Failed to get user liked tracks', {
					component: 'database',
					metadata: { error, userId, limit, offset }
				});
			}
		});
	}

	static async updateTrack(id: string, data: Partial<NewTrack>): Promise<Track | null> {
		return await withDbLogging('TrackService.updateTrack', async () => {
			try {
				const [track] = await db
					.update(tracks)
					.set({
						...data,
						updatedAt: new Date()
					})
					.where(eq(tracks.id, id))
					.returning();

				if (track) {
					logger.info('Track updated', {
						component: 'database',
						metadata: { trackId: id, updatedFields: Object.keys(data) }
					});
				}

				return track ?? null;
			} catch (error) {
				logger.error('Failed to update track', {
					component: 'database',
					metadata: { error, trackId: id }
				});
				throw error;
			}
		});
	}

	static async deleteTrack(id: string): Promise<boolean> {
		return await withDbLogging('TrackService.deleteTrack', async () => {
			try {
				const track = await this.getTrackById(id);
				if (track?.audioUrl) {
					await deleteFileFromR2({ uniqueKey: track.audioUrl, bucket: 'music' });
				}
				if (track?.imageUrl) {
					await deleteFileFromR2({ uniqueKey: track.imageUrl, bucket: 'images' });
				}
				await db.delete(tracks).where(eq(tracks.id, id));
				logger.info('Track deleted', {
					component: 'database',
					metadata: { trackId: id }
				});
				return true;
			} catch (error) {
				logger.error('Failed to delete track', {
					component: 'database',
					metadata: { error, trackId: id }
				});
				return false;
			}
		});
	}

	static async getTracksByArtistForStudio(artistId: string) {
		return await withDbLogging('TrackService.getTracksByArtistForStudio', async () => {
			try {
				const result = await db
					.select({
						track: tracks,
						stats: trackStats
					})
					.from(tracks)
					.leftJoin(trackStats, eq(tracks.id, trackStats.trackId))
					.where(eq(tracks.artistId, artistId))
					.orderBy(desc(tracks.createdAt));

				return result;
			} catch (error) {
				logger.error('Failed to get tracks by artist for studio', {
					component: 'database',
					metadata: { error, artistId }
				});
				throw error;
			}
		});
	}
}

// Album operations
export class AlbumService {
	static async createAlbum(albumData: NewAlbum) {
		return await withDbLogging('AlbumService.createAlbum', async () => {
			try {
				const [album] = await db.insert(albums).values(albumData).returning();
				logger.info('Album created', {
					component: 'database',
					metadata: { albumId: album.id, title: album.title }
				});
				return album;
			} catch (error) {
				logger.error('Failed to create album', {
					component: 'database',
					metadata: { error }
				});
				throw error;
			}
		});
	}

	static async updateAlbum(id: string, data: Partial<NewAlbum>): Promise<Album | null> {
		return await withDbLogging('AlbumService.updateAlbum', async () => {
			try {
				const [album] = await db
					.update(albums)
					.set({
						...data,
						updatedAt: new Date()
					})
					.where(eq(albums.id, id))
					.returning();

				if (album) {
					logger.info('Album updated', {
						component: 'database',
						metadata: { albumId: id, updatedFields: Object.keys(data) }
					});
				}

				return album ?? null;
			} catch (error) {
				logger.error('Failed to update album', {
					component: 'database',
					metadata: { error, albumId: id }
				});
				throw error;
			}
		});
	}

	static async deleteAlbum(id: string): Promise<boolean> {
		return await withDbLogging('AlbumService.deleteAlbum', async () => {
			try {
				await db.delete(albums).where(eq(albums.id, id));
				logger.info('Album deleted', {
					component: 'database',
					metadata: { albumId: id }
				});
				return true;
			} catch (error) {
				logger.error('Failed to delete album', {
					component: 'database',
					metadata: { error, albumId: id }
				});
				return false;
			}
		});
	}

	static async getAlbumById(id: string) {
		const [album] = await db.select().from(albums).where(eq(albums.id, id));
		return album;
	}

	static async getAlbumsByArtist(artistId: string, limit = 50) {
		return await db
			.select()
			.from(albums)
			.where(eq(albums.artistId, artistId))
			.orderBy(desc(albums.createdAt))
			.limit(limit);
	}

	static async getAlbumWithTracks(albumId: string) {
		return await withDbLogging('AlbumService.getAlbumWithTracks', async () => {
			try {
				const album = await this.getAlbumById(albumId);
				if (!album) return null;

				const albumTracksList = await db
					.select({
						track: tracks,
						trackNumber: albumTracks.trackNumber
					})
					.from(albumTracks)
					.innerJoin(tracks, eq(albumTracks.trackId, tracks.id))
					.where(eq(albumTracks.albumId, albumId))
					.orderBy(albumTracks.trackNumber);

				return {
					...album,
					tracks: albumTracksList
				};
			} catch (error) {
				logger.error('Failed to get album with tracks', {
					component: 'database',
					metadata: { error, albumId }
				});
				return null;
			}
		});
	}
}

// Genre operations
export class GenreService {
	static async createGenre(name: string): Promise<Genre> {
		return await withDbLogging('GenreService.createGenre', async () => {
			try {
				const normalizedName = name.toLowerCase().trim();

				// Check if genre already exists
				const existing = await this.getGenreByName(normalizedName);
				if (existing) {
					return existing;
				}

				const [genre] = await db
					.insert(genres)
					.values({
						name: normalizedName,
						displayName: normalizedName
					})
					.returning();

				logger.info('Genre created', {
					component: 'database',
					metadata: { genreName: normalizedName }
				});

				return genre;
			} catch (error) {
				logger.error('Failed to create genre', {
					component: 'database',
					metadata: { error, name }
				});
				throw error;
			}
		});
	}

	static async getGenreByName(name: string): Promise<Genre | null> {
		const normalizedName = name.toLowerCase().trim();
		const [genre] = await db.select().from(genres).where(eq(genres.name, normalizedName));
		return genre ?? null;
	}

	static async getAllGenres(): Promise<Genre[]> {
		return await db.select().from(genres).orderBy(genres.displayName);
	}

	static async getOrCreateGenres(genreNames: string[]): Promise<Genre[]> {
		return await withDbLogging('GenreService.getOrCreateGenres', async () => {
			try {
				const results: Genre[] = [];
				for (const name of genreNames) {
					const genre = await this.createGenre(name);
					results.push(genre);
				}
				return results;
			} catch (error) {
				logger.error('Failed to get or create genres', {
					component: 'database',
					metadata: { error, genreNames }
				});
				throw error;
			}
		});
	}
}

// Album-Track junction operations
export class AlbumTrackService {
	static async linkTrackToAlbum(
		albumId: string,
		trackId: string,
		trackNumber: number
	): Promise<AlbumTrack> {
		return await withDbLogging('AlbumTrackService.linkTrackToAlbum', async () => {
			try {
				// Check if this track is already linked to this album
				const existingLink = await db
					.select()
					.from(albumTracks)
					.where(and(eq(albumTracks.albumId, albumId), eq(albumTracks.trackId, trackId)));

				if (existingLink.length > 0) {
					throw new Error('Track is already linked to this album');
				}

				// Check if the trackNumber is already taken in this album
				const existingTrackNumber = await db
					.select()
					.from(albumTracks)
					.where(and(eq(albumTracks.albumId, albumId), eq(albumTracks.trackNumber, trackNumber)));

				// If track number is taken, shift all tracks with >= trackNumber by 1
				if (existingTrackNumber.length > 0) {
					// Get all tracks with trackNumber >= requested number, ordered DESC
					const tracksToShift = await db
						.select()
						.from(albumTracks)
						.where(
							and(
								eq(albumTracks.albumId, albumId),
								sql`${albumTracks.trackNumber} >= ${trackNumber}`
							)
						)
						.orderBy(desc(albumTracks.trackNumber));

					// Shift tracks recursively (update from highest to lowest to avoid conflicts)
					for (const track of tracksToShift) {
						await db
							.update(albumTracks)
							.set({ trackNumber: track.trackNumber + 1 })
							.where(eq(albumTracks.id, track.id));
					}
				}

				const [albumTrack] = await db
					.insert(albumTracks)
					.values({
						albumId,
						trackId,
						trackNumber
					})
					.returning();

				logger.info('Track linked to album', {
					component: 'database',
					metadata: { albumId, trackId, trackNumber }
				});

				return albumTrack;
			} catch (error) {
				logger.error('Failed to link track to album', {
					component: 'database',
					metadata: { error, albumId, trackId }
				});
				throw error;
			}
		});
	}

	static async unlinkTrackFromAlbum(albumId: string, trackId: string): Promise<boolean> {
		return await withDbLogging('AlbumTrackService.unlinkTrackFromAlbum', async () => {
			try {
				await db
					.delete(albumTracks)
					.where(and(eq(albumTracks.albumId, albumId), eq(albumTracks.trackId, trackId)));

				logger.info('Track unlinked from album', {
					component: 'database',
					metadata: { albumId, trackId }
				});

				return true;
			} catch (error) {
				logger.error('Failed to unlink track from album', {
					component: 'database',
					metadata: { error, albumId, trackId }
				});
				return false;
			}
		});
	}

	static async updateTrackNumber(
		albumId: string,
		trackId: string,
		trackNumber: number
	): Promise<boolean> {
		return await withDbLogging('AlbumTrackService.updateTrackNumber', async () => {
			try {
				await db
					.update(albumTracks)
					.set({ trackNumber })
					.where(and(eq(albumTracks.albumId, albumId), eq(albumTracks.trackId, trackId)));

				logger.info('Track number updated', {
					component: 'database',
					metadata: { albumId, trackId, trackNumber }
				});

				return true;
			} catch (error) {
				logger.error('Failed to update track number', {
					component: 'database',
					metadata: { error, albumId, trackId, trackNumber }
				});
				return false;
			}
		});
	}

	static async getAlbumTracks(albumId: string) {
		return await withDbLogging('AlbumTrackService.getAlbumTracks', async () => {
			try {
				return await db
					.select({
						track: tracks,
						trackNumber: albumTracks.trackNumber
					})
					.from(albumTracks)
					.innerJoin(tracks, eq(albumTracks.trackId, tracks.id))
					.where(eq(albumTracks.albumId, albumId))
					.orderBy(albumTracks.trackNumber);
			} catch (error) {
				logger.error('Failed to get album tracks', {
					component: 'database',
					metadata: { error, albumId }
				});
				throw error;
			}
		});
	}

	static async getAlbumTracksByArtist(artistId: string) {
		return await withDbLogging('AlbumTrackService.getAlbumTracksByArtist', async () => {
			try {
				return await db
					.select({
						albumTrack: albumTracks,
						album: albums,
						track: tracks
					})
					.from(albumTracks)
					.innerJoin(albums, eq(albumTracks.albumId, albums.id))
					.innerJoin(tracks, eq(albumTracks.trackId, tracks.id))
					.where(and(eq(albums.artistId, artistId), eq(tracks.artistId, artistId)))
					.orderBy(albums.createdAt, albumTracks.trackNumber);
			} catch (error) {
				logger.error('Failed to get artist album tracks', {
					component: 'database',
					metadata: { error, artistId }
				});
				throw error;
			}
		});
	}
}

// Analytics utilities
export class AnalyticsService {
	static async getTotalUsers() {
		const [result] = await db.select({ count: count() }).from(users);
		return result.count;
	}

	static async getTotalArtists() {
		const [result] = await db.select({ count: count() }).from(artists);
		return result.count;
	}

	static async getTotalTracks() {
		const [result] = await db.select({ count: count() }).from(tracks);
		return result.count;
	}

	static async getActiveArtistsCount() {
		const [result] = await db
			.select({ count: count() })
			.from(artists)
			.where(eq(artists.isActive, true));
		return result.count;
	}

	static async getPublishedTracksCount() {
		const [result] = await db
			.select({ count: count() })
			.from(tracks)
			.where(and(eq(tracks.isPublished, true), playableTrackStatus()));
		return result.count;
	}
}

// Utility function to test database connection
export async function testDatabaseConnection() {
	try {
		await db.execute('SELECT 1');
		console.log('✅ Database connection successful');
		return true;
	} catch (error) {
		console.error('❌ Database connection failed:', error);
		return false;
	}
}
