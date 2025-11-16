import { db, withDbLogging } from '../index';
import { playlists, playlistTracks, tracks, trackStats } from '../schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import type { Playlist } from '../schema';
import { logger } from '$lib/utils/logger';

interface CreatePlaylistInput {
    userId: string;
    name: string;
    description?: string;
    isPublic?: boolean;
}

interface PlaylistWithStats extends Playlist {
    trackCount: number;
}

export class PlaylistService {
    static async createPlaylist(data: CreatePlaylistInput): Promise<Playlist> {
        return await withDbLogging('PlaylistService.createPlaylist', async () => {
            try {
                const [playlist] = await db
                    .insert(playlists)
                    .values({
                        userId: data.userId,
                        name: data.name,
                        description: data.description || null,
                        isPublic: data.isPublic ?? true,
                    })
                    .returning();

                logger.info('Playlist created successfully', {
                    component: 'database',
                    metadata: {
                        playlistId: playlist.id,
                        userId: data.userId,
                        name: data.name,
                    },
                });

                return playlist;
            } catch (error) {
                logger.error('Failed to create playlist', {
                    component: 'database',
                    metadata: { error, userId: data.userId },
                });
                throw error;
            }
        });
    }

    static async getPlaylistById(id: string): Promise<PlaylistWithStats | null> {
        return await withDbLogging('PlaylistService.getPlaylistById', async () => {
            try {
                const [result] = await db
                    .select({
                        playlist: playlists,
                        trackCount: count(playlistTracks.id),
                    })
                    .from(playlists)
                    .leftJoin(playlistTracks, eq(playlists.id, playlistTracks.playlistId))
                    .where(eq(playlists.id, id))
                    .groupBy(playlists.id);

                if (!result) {
                    return null;
                }

                logger.debug('Playlist retrieved by ID', {
                    component: 'database',
                    metadata: {
                        playlistId: id,
                        trackCount: result.trackCount,
                    },
                });

                return {
                    ...result.playlist,
                    trackCount: result.trackCount,
                };
            } catch (error) {
                logger.error('Failed to get playlist by ID', {
                    component: 'database',
                    metadata: { error, playlistId: id },
                });
                return null;
            }
        });
    }

    static async getUserPlaylists(
        userId: string,
        limit = 50,
        offset = 0
    ): Promise<PlaylistWithStats[]> {
        return await withDbLogging('PlaylistService.getUserPlaylists', async () => {
            try {
                const results = await db
                    .select({
                        playlist: playlists,
                        trackCount: count(playlistTracks.id),
                    })
                    .from(playlists)
                    .leftJoin(playlistTracks, eq(playlists.id, playlistTracks.playlistId))
                    .where(eq(playlists.userId, userId))
                    .groupBy(playlists.id)
                    .orderBy(desc(playlists.createdAt))
                    .limit(limit)
                    .offset(offset);

                logger.debug('User playlists retrieved', {
                    component: 'database',
                    metadata: {
                        userId,
                        count: results.length,
                    },
                });

                return results.map((r) => ({
                    ...r.playlist,
                    trackCount: r.trackCount,
                }));
            } catch (error) {
                logger.error('Failed to get user playlists', {
                    component: 'database',
                    metadata: { error, userId, limit, offset },
                });
                return [];
            }
        });
    }

    static async updatePlaylist(
        playlistId: string,
        userId: string,
        data: Partial<CreatePlaylistInput>
    ): Promise<Playlist | null> {
        return await withDbLogging('PlaylistService.updatePlaylist', async () => {
            try {
                const [playlist] = await db
                    .select()
                    .from(playlists)
                    .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)));

                if (!playlist) {
                    throw new Error('Playlist not found or not owned by user');
                }

                const updateData: Record<string, any> = {
                    updatedAt: new Date(),
                };

                if (data.name) updateData.name = data.name;
                if (data.description !== undefined) updateData.description = data.description;
                if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

                const [updated] = await db
                    .update(playlists)
                    .set(updateData)
                    .where(eq(playlists.id, playlistId))
                    .returning();

                logger.info('Playlist updated successfully', {
                    component: 'database',
                    metadata: {
                        playlistId,
                        userId,
                        updatedFields: Object.keys(data),
                    },
                });

                return updated;
            } catch (error) {
                logger.error('Failed to update playlist', {
                    component: 'database',
                    metadata: { error, playlistId, userId },
                });
                return null;
            }
        });
    }

    static async deletePlaylist(playlistId: string, userId: string): Promise<boolean> {
        return await withDbLogging('PlaylistService.deletePlaylist', async () => {
            try {
                const [playlist] = await db
                    .select()
                    .from(playlists)
                    .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)));

                if (!playlist) {
                    throw new Error('Playlist not found or not owned by user');
                }

                await db.delete(playlistTracks).where(eq(playlistTracks.playlistId, playlistId));

                await db.delete(playlists).where(eq(playlists.id, playlistId));

                logger.info('Playlist deleted successfully', {
                    component: 'database',
                    metadata: {
                        playlistId,
                        userId,
                    },
                });

                return true;
            } catch (error) {
                logger.error('Failed to delete playlist', {
                    component: 'database',
                    metadata: { error, playlistId, userId },
                });
                return false;
            }
        });
    }

    static async getPlaylistTracks(playlistId: string, limit = 50, offset = 0) {
        return await withDbLogging('PlaylistService.getPlaylistTracks', async () => {
            try {
                const results = await db
                    .select({
                        playlistTrack: playlistTracks,
                        track: tracks,
                    })
                    .from(playlistTracks)
                    .innerJoin(tracks, eq(playlistTracks.trackId, tracks.id))
                    .where(eq(playlistTracks.playlistId, playlistId))
                    .orderBy(playlistTracks.position)
                    .limit(limit)
                    .offset(offset);

                logger.debug('Playlist tracks retrieved', {
                    component: 'database',
                    metadata: {
                        playlistId,
                        count: results.length,
                    },
                });

                return results;
            } catch (error) {
                logger.error('Failed to get playlist tracks', {
                    component: 'database',
                    metadata: { error, playlistId, limit, offset },
                });
                return [];
            }
        });
    }

    static async reorderPlaylistTracks(
        playlistId: string,
        userId: string,
        reorderMap: Record<string, number>
    ): Promise<boolean> {
        return await withDbLogging('PlaylistService.reorderPlaylistTracks', async () => {
            try {
                const [playlist] = await db
                    .select()
                    .from(playlists)
                    .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)));

                if (!playlist) {
                    throw new Error('Playlist not found or not owned by user');
                }

                for (const [trackId, position] of Object.entries(reorderMap)) {
                    await db
                        .update(playlistTracks)
                        .set({ position })
                        .where(
                            and(
                                eq(playlistTracks.playlistId, playlistId),
                                eq(playlistTracks.trackId, trackId)
                            )
                        );
                }

                logger.info('Playlist tracks reordered', {
                    component: 'database',
                    metadata: {
                        playlistId,
                        userId,
                        tracksCount: Object.keys(reorderMap).length,
                    },
                });

                return true;
            } catch (error) {
                logger.error('Failed to reorder playlist tracks', {
                    component: 'database',
                    metadata: { error, playlistId, userId },
                });
                return false;
            }
        });
    }

    static async getPlaylistStats(playlistId: string) {
        return await withDbLogging('PlaylistService.getPlaylistStats', async () => {
            try {
                const [stats] = await db
                    .select({
                        trackCount: count(playlistTracks.id),
                        totalDuration: sql<number>`SUM(${tracks.duration})`,
                    })
                    .from(playlistTracks)
                    .leftJoin(tracks, eq(playlistTracks.trackId, tracks.id))
                    .where(eq(playlistTracks.playlistId, playlistId));

                return {
                    trackCount: stats?.trackCount ?? 0,
                    totalDuration: stats?.totalDuration ?? 0,
                };
            } catch (error) {
                logger.error('Failed to get playlist stats', {
                    component: 'database',
                    metadata: { error, playlistId },
                });
                return {
                    trackCount: 0,
                    totalDuration: 0,
                };
            }
        });
    }

    static async addTrackToPlaylist(
        playlistId: string,
        trackId: string,
        userId: string
    ): Promise<PlaylistWithStats | null> {
        return await withDbLogging('PlaylistService.addTrackToPlaylist', async () => {
            try {
                const [playlist] = await db
                    .select()
                    .from(playlists)
                    .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)));

                if (!playlist) {
                    throw new Error('Playlist not found or not owned by user');
                }

                const [existingTrack] = await db
                    .select()
                    .from(playlistTracks)
                    .where(
                        and(
                            eq(playlistTracks.playlistId, playlistId),
                            eq(playlistTracks.trackId, trackId)
                        )
                    );

                if (existingTrack) {
                    logger.info('Track already in playlist', {
                        component: 'database',
                        metadata: {
                            playlistId,
                            trackId,
                        },
                    });
                    return await this.getPlaylistById(playlistId);
                }

                const [lastPosition] = await db
                    .select({
                        maxPosition: sql<number>`COALESCE(MAX(${playlistTracks.position}), 0)`,
                    })
                    .from(playlistTracks)
                    .where(eq(playlistTracks.playlistId, playlistId));

                await db.insert(playlistTracks).values({
                    playlistId,
                    trackId,
                    position: (lastPosition?.maxPosition ?? 0) + 1,
                });

                // Upsert track stats 
                await db
                    .insert(trackStats)
                    .values({
                        trackId,
                        saveCount: 1,
                        lastUpdated: new Date(),
                    })
                    .onConflictDoUpdate({
                        target: trackStats.trackId,
                        set: {
                            saveCount: sql`${trackStats.saveCount} + 1`,
                            lastUpdated: new Date(),
                        },
                    });

                logger.info('Track added to playlist', {
                    component: 'database',
                    metadata: {
                        playlistId,
                        trackId,
                        userId,
                    },
                });

                return await this.getPlaylistById(playlistId);
            } catch (error) {
                logger.error('Failed to add track to playlist', {
                    component: 'database',
                    metadata: { error, playlistId, trackId, userId },
                });
                return null;
            }
        });
    }

    static async removeTrackFromPlaylist(
        playlistId: string,
        trackId: string,
        userId: string
    ): Promise<PlaylistWithStats | null> {
        return await withDbLogging('PlaylistService.removeTrackFromPlaylist', async () => {
            try {
                const [playlist] = await db
                    .select()
                    .from(playlists)
                    .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)));

                if (!playlist) {
                    throw new Error('Playlist not found or not owned by user');
                }

                const [trackToRemove] = await db
                    .select()
                    .from(playlistTracks)
                    .where(
                        and(
                            eq(playlistTracks.playlistId, playlistId),
                            eq(playlistTracks.trackId, trackId)
                        )
                    );

                if (!trackToRemove) {
                    logger.info('Track not found in playlist', {
                        component: 'database',
                        metadata: {
                            playlistId,
                            trackId,
                        },
                    });
                    return null;
                }

                await db
                    .delete(playlistTracks)
                    .where(
                        and(
                            eq(playlistTracks.playlistId, playlistId),
                            eq(playlistTracks.trackId, trackId)
                        )
                    );

                await db
                    .update(playlistTracks)
                    .set({
                        position: sql`${playlistTracks.position} - 1`,
                    })
                    .where(
                        and(
                            eq(playlistTracks.playlistId, playlistId),
                            sql`${playlistTracks.position} > ${trackToRemove.position}`
                        )
                    );

                // Upsert track stats
                await db
                    .insert(trackStats)
                    .values({
                        trackId,
                        saveCount: 0,
                        lastUpdated: new Date(),
                    })
                    .onConflictDoUpdate({
                        target: trackStats.trackId,
                        set: {
                            saveCount: sql`CASE WHEN ${trackStats.saveCount} > 0 THEN ${trackStats.saveCount} - 1 ELSE 0 END`,
                            lastUpdated: new Date(),
                        },
                    });

                logger.info('Track removed from playlist', {
                    component: 'database',
                    metadata: {
                        playlistId,
                        trackId,
                        userId,
                        removedPosition: trackToRemove.position,
                    },
                });

                return await this.getPlaylistById(playlistId);
            } catch (error) {
                logger.error('Failed to remove track from playlist', {
                    component: 'database',
                    metadata: { error, playlistId, trackId, userId },
                });
                return null;
            }
        });
    }
}