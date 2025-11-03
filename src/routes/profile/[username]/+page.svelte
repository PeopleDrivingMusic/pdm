<script lang="ts">
  import { Avatar, Button, Link, StatCard, Tabs } from '$lib/ui';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import { mdiCalendarOutline, mdiMapMarkerOutline, mdiPinOutline, mdiShieldCrownOutline } from '@mdi/js';
  import type { PageData } from './$types';
	import { Tween } from 'svelte/motion';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  const trust_score = new Tween(0);
  trust_score.target = 4.8;
  // Mock user data
  const user = $state({
    username: 'johndoe',
    name: 'John Doe',
    email: 'john@example.com',
    bio: 'Music enthusiast and digital artist',
    avatar: '',
    followers: 2543,
    following: 487,
    playlists: 12,
    favoriteArtists: 45,
    joinedDate: 'January 2023',
    location: 'New York, USA',
    website: 'https://johndoe.com'
  });

  let activeTab = $state('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'playlists', label: 'Playlists' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'settings', label: 'Settings' }
  ];

  function handleTabChange(tabId: string) {
    activeTab = tabId;
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
</script>

<div class="profile-page">
  <!-- Header Section -->
  <section class="profile-header">
    <div class="profile-header__background"></div>
    
    <div class="profile-header__content">
      <div class="profile-header__avatar">
        <Avatar
          name={user.name}
          src={user.avatar}
          size="lg"
          alt={user.name}
        />
      </div>

      <div class="profile-header__info">
        <h1 class="profile-header__name">{user.name} </h1>
        <p class="profile-header__username">@{user.username}</p>
        
        {#if user.bio}
          <p class="profile-header__bio">{user.bio}</p>
        {/if}

        <div class="profile-header__meta">
          {#if user.location}
            <span class="profile-header__meta-item">{user.location} <SvgIcon path={mdiMapMarkerOutline} size={14} /></span>
          {/if}
          {#if user.joinedDate}
            <span class="profile-header__meta-item">Joined {user.joinedDate} <SvgIcon path={mdiCalendarOutline} size={14} /></span>
          {/if}
          <div class="trust_score">
            
          </div>
        </div>
      </div>

      <div class="profile-header__actions">
        <Button variant="primary">Follow</Button>
        <Button variant="secondary">Message</Button>
      </div>
    </div>
  </section>

  <!-- Stats Section -->
  <section class="profile-stats">
    <StatCard
      label="Followers"
      value={user.followers.toLocaleString()}
      icon="👥"
      description="People following this user"
    />
    <StatCard
      label="Following"
      value={user.following.toLocaleString()}
      icon="➕"
      description="Users being followed"
    />
    <StatCard
      label="Playlists"
      value={user.playlists}
      icon="🎵"
      description="Created playlists"
    />
    <StatCard
      label="Favorite Artists"
      value={user.favoriteArtists}
      icon="⭐"
      description="Saved artists"
    />
  </section>

  <!-- Tabs Section -->
  <section class="profile-content">
    <Tabs {tabs} {activeTab} onTabChange={handleTabChange}>
      {#if activeTab === 'overview'}
        <div class="tab-panel">
          <div class="profile-info-grid">
            <div class="info-card">
              <h3 class="info-card__title">About</h3>
              <div class="info-card__content">
                <div class="info-item">
                  <label>Email</label>
                  <p>{user.email}</p>
                </div>
                <div class="info-item">
                  <label>Member Since</label>
                  <p>{user.joinedDate}</p>
                </div>
                <div class="info-item">
                  <label>Bio</label>
                  <p>{user.bio}</p>
                </div>
              </div>
            </div>

            <div class="info-card">
              <h3 class="info-card__title">Quick Stats</h3>
              <div class="info-card__content">
                <div class="info-item">
                  <label>Total Playlists</label>
                  <p>{user.playlists}</p>
                </div>
                <div class="info-item">
                  <label>Favorite Artists</label>
                  <p>{user.favoriteArtists}</p>
                </div>
                <div class="info-item">
                  <label>Community Score</label>
                  <p>85%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      {:else if activeTab === 'playlists'}
        <div class="tab-panel">
          <div class="empty-state">
            <p>No playlists yet</p>
            <Button variant="primary">Create Your First Playlist</Button>
          </div>
        </div>
      {:else if activeTab === 'favorites'}
        <div class="tab-panel">
          <div class="empty-state">
            <p>No favorite items yet</p>
            <p class="empty-state__subtitle">Start adding artists and tracks to your favorites</p>
          </div>
        </div>
      {:else if activeTab === 'settings'}
        <div class="tab-panel">
          <div class="settings-form">
            <h3 class="settings-form__title">Profile Settings</h3>
            
            <div class="form-group">
              <label for="display-name">Display Name</label>
              <input
                id="display-name"
                type="text"
                class="form-input"
                value={user.name}
              />
            </div>

            <div class="form-group">
              <label for="bio">Bio</label>
              <textarea
                id="bio"
                class="form-input form-input--textarea"
                value={user.bio}
              ></textarea>
            </div>

            <div class="form-group">
              <label for="location">Location</label>
              <input
                id="location"
                type="text"
                class="form-input"
                value={user.location}
              />
            </div>

            <div class="form-group">
              <label for="website">Website</label>
              <input
                id="website"
                type="url"
                class="form-input"
                value={user.website}
              />
            </div>

            <div class="form-actions">
              <Button variant="primary">Save Changes</Button>
              <Button variant="secondary">Cancel</Button>
            </div>
          </div>
        </div>
      {/if}
    </Tabs>
  </section>
</div>

<style lang="scss">

  .profile-page {
    max-width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  // Header Section
  .profile-header {
    position: relative;
    width: 100%;

    p {
        margin: 0;
    }
  }

  .profile-header__background {
    padding-block: var(--space-8);
    width: 100%;
    height: 240px;
    background: linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-brand-600) 100%);
    position: relative;
    overflow: hidden;

    @media (prefers-color-scheme: dark) {
      background: linear-gradient(135deg, var(--color-brand-900) 0%, var(--color-brand-800) 100%);
    }

    &::before {
      content: '';
      position: absolute;
      width: 400px;
      height: 400px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      top: -100px;
      right: -50px;
    }
  }

  .profile-header__content {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: var(--space-6);
    align-items: flex-start;
    padding: 0 var(--space-6) var(--space-6) var(--space-6);
    transform: translateY(-60px);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
      align-items: center;
      text-align: center;
      transform: none;
      padding: var(--space-6);
    }
  }

  .profile-header__avatar {
    flex-shrink: 0;

    @media (max-width: 768px) {
      display: flex;
      justify-content: center;
    }
  }

  .profile-header__info {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .profile-header__name {
    margin: 0;
    @include text-display-md();
    color: var(--color-white);
  }

  .profile-header__username {
    margin: 0;
    @include text-md();
    color: rgba(255, 255, 255, 0.9);
  }

  .profile-header__bio {
    margin: var(--space-2) 0 0 0;
    @include text-sm();
    color: rgba(255, 255, 255, 0.85);
  }

  .profile-header__meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    margin-top: var(--space-3);
  }

  .profile-header__meta-item {
    @include text-sm();
    color: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .profile-header__actions {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;

    @media (max-width: 768px) {
      justify-content: center;
      width: 100%;
    }
  }

  // Stats Section
  .profile-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--space-4);
  }

  // Content Section
  .profile-content {
    background-color: var(--color-white);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-gray-200);
    padding: var(--space-6);

    @media (prefers-color-scheme: dark) {
      background-color: var(--color-gray-950);
      border-color: var(--color-gray-800);
    }
  }

  .tab-panel {
    animation: fadeIn var(--duration-normal) var(--easing-ease-out);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  // Profile Info Grid
  .profile-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-6);
  }

  .info-card {
    background-color: var(--color-gray-50);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-gray-200);
    padding: var(--space-5);

    @media (prefers-color-scheme: dark) {
      background-color: var(--color-gray-900);
      border-color: var(--color-gray-800);
    }
  }

  .info-card__title {
    margin: 0 0 var(--space-4) 0;
    @include text-lg();
    @include font-semibold();
    color: var(--color-gray-900);

    @media (prefers-color-scheme: dark) {
      color: var(--color-white);
    }
  }

  .info-card__content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);

    label {
      @include text-xs();
      @include font-semibold();
      color: var(--color-gray-600);
      text-transform: uppercase;
      letter-spacing: var(--letter-spacing-wide);

      @media (prefers-color-scheme: dark) {
        color: var(--color-gray-400);
      }
    }

    p {
      margin: 0;
      @include text-md();
      color: var(--color-gray-900);

      @media (prefers-color-scheme: dark) {
        color: var(--color-white);
      }
    }
  }

  // Empty State
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    padding: var(--space-12);
    text-align: center;

    p {
      margin: 0;
      @include text-lg();
      color: var(--color-gray-600);

      @media (prefers-color-scheme: dark) {
        color: var(--color-gray-400);
      }
    }
  }

  .empty-state__subtitle {
    @include text-sm();
    color: var(--color-gray-500) !important;
  }

  // Settings Form
  .settings-form {
    max-width: 600px;
  }

  .settings-form__title {
    margin: 0 0 var(--space-6) 0;
    @include text-display-sm();
    color: var(--color-gray-900);

    @media (prefers-color-scheme: dark) {
      color: var(--color-white);
    }
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-5);

    label {
      @include text-sm();
      @include font-medium();
      color: var(--color-gray-900);

      @media (prefers-color-scheme: dark) {
        color: var(--color-white);
      }
    }
  }

  .form-input {
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-gray-300);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-family: var(--font-family-sans);
    color: var(--color-gray-900);
    background-color: var(--color-white);
    transition: all var(--duration-normal) var(--easing-ease-out);

    &:focus {
      outline: none;
      border-color: var(--color-brand-500);
      box-shadow: 0 0 0 3px var(--color-brand-50);
    }

    &:disabled {
      background-color: var(--color-gray-100);
      cursor: not-allowed;
      opacity: 0.6;
    }

    @media (prefers-color-scheme: dark) {
      background-color: var(--color-gray-800);
      border-color: var(--color-gray-700);
      color: var(--color-white);

      &:focus {
        border-color: var(--color-brand-400);
        box-shadow: 0 0 0 3px var(--color-brand-900);
      }

      &:disabled {
        background-color: var(--color-gray-700);
      }
    }

    &--textarea {
      resize: vertical;
      min-height: 120px;
      font-family: var(--font-family-mono);
    }
  }

  .form-actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-6);
  }
</style>
