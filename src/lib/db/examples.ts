// Example usage of the database
// This file demonstrates how to use the database utilities

import { UserService, ArtistService, TrackService, testDatabaseConnection } from '$lib/db/queries';
import type { NewUser, NewArtist, NewTrack } from '$lib/db';

// Test database connection
export async function checkDatabaseHealth() {
  return await testDatabaseConnection();
}

// Example: Create a new user
export async function createExampleUser() {
  const newUser: NewUser = {
    email: 'john.doe@example.com',
    username: 'johndoe',
    displayName: 'John Doe',
    bio: 'Music enthusiast and crypto lover',
    walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
  };

  try {
    const user = await UserService.createUser(newUser);
    console.log('Created user:', user);
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

// Example: Create an artist profile
export async function createExampleArtist(userId: string) {
  const newArtist: NewArtist = {
    userId,
    stageName: 'DJ Crypto',
    genre: 'Electronic',
    description: 'Electronic music producer exploring the intersection of music and blockchain',
    socialLinks: {
      twitter: '@djcrypto',
      instagram: '@djcrypto_music',
      spotify: 'https://open.spotify.com/artist/djcrypto'
    }
  };

  try {
    const artist = await ArtistService.createArtist(newArtist);
    console.log('Created artist:', artist);
    return artist;
  } catch (error) {
    console.error('Error creating artist:', error);
    throw error;
  }
}

// Example: Create a track
export async function createExampleTrack(artistId: string) {
  const newTrack: NewTrack = {
    artistId,
    title: 'Blockchain Symphony',
    duration: 245, // 4:05 in seconds
    genre: 'Electronic',
    price: 299, // $2.99 in cents
    metadata: {
      bpm: 128,
      key: 'C major',
      ipfsHash: 'QmYjh5NsDc5mRfw4tNstfSsFhxUqjP3Wg4QQnqNpKRzMpC'
    }
  };

  try {
    const track = await TrackService.createTrack(newTrack);
    console.log('Created track:', track);
    return track;
  } catch (error) {
    console.error('Error creating track:', error);
    throw error;
  }
}

// Example: Search functionality
export async function searchExample() {
  try {
    // Search for artists
    const artists = await ArtistService.searchArtists('electronic');
    console.log('Found artists:', artists);

    // Search for tracks
    const tracks = await TrackService.searchTracks('symphony');
    console.log('Found tracks:', tracks);

    // Get popular tracks
    const popularTracks = await TrackService.getPopularTracks(5);
    console.log('Popular tracks:', popularTracks);

    return { artists, tracks, popularTracks };
  } catch (error) {
    console.error('Error in search example:', error);
    throw error;
  }
}

// Example: Complete workflow
export async function runCompleteExample() {
  try {
    console.log('🚀 Starting database example...');

    // 1. Test connection
    const isConnected = await checkDatabaseHealth();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    // 2. Create user
    const user = await createExampleUser();

    // 3. Create artist profile
    const artist = await createExampleArtist(user.id);

    // 4. Create a track
    const track = await createExampleTrack(artist.id);

    // 5. Test search functionality
    await searchExample();

    console.log('✅ Database example completed successfully!');
    return { user, artist, track };
  } catch (error) {
    console.error('❌ Database example failed:', error);
    throw error;
  }
}
