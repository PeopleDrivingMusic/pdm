--
-- PostgreSQL database dump
--


-- Dumped from database version 15.18 (Debian 15.18-1.pgdg13+1)
-- Dumped by pg_dump version 15.18 (Debian 15.18-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: artist; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA artist;


--
-- Name: catalog; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA catalog;


--
-- Name: content; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA content;


--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA drizzle;


--
-- Name: engagement; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA engagement;


--
-- Name: finance; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA finance;


--
-- Name: messages; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA messages;


--
-- Name: users; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA users;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: artist_accounts; Type: TABLE; Schema: artist; Owner: -
--

CREATE TABLE artist.artist_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    artist_id uuid NOT NULL,
    login character varying(100) NOT NULL,
    hashed_password text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: artist_onboarding_requests; Type: TABLE; Schema: artist; Owner: -
--

CREATE TABLE artist.artist_onboarding_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    listeners_count integer DEFAULT 0 NOT NULL,
    social_links jsonb,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    reviewed_at timestamp without time zone,
    reviewer_note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: artist_sessions; Type: TABLE; Schema: artist; Owner: -
--

CREATE TABLE artist.artist_sessions (
    id text NOT NULL,
    artist_account_id uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: artists; Type: TABLE; Schema: artist; Owner: -
--

CREATE TABLE artist.artists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    cover_img text,
    avatar text,
    genre character varying(50),
    description text,
    social_links jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    trust_score numeric(3,2) DEFAULT 3.00 NOT NULL
);


--
-- Name: album_tracks; Type: TABLE; Schema: catalog; Owner: -
--

CREATE TABLE catalog.album_tracks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    album_id uuid NOT NULL,
    track_id uuid NOT NULL,
    track_number integer NOT NULL,
    added_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: albums; Type: TABLE; Schema: catalog; Owner: -
--

CREATE TABLE catalog.albums (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    artist_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    cover_image_url text,
    release_date timestamp without time zone,
    price integer,
    is_published boolean DEFAULT false,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    genres jsonb,
    visibility character varying(16) DEFAULT 'public'::character varying NOT NULL
);


--
-- Name: genres; Type: TABLE; Schema: catalog; Owner: -
--

CREATE TABLE catalog.genres (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: tracks; Type: TABLE; Schema: catalog; Owner: -
--

CREATE TABLE catalog.tracks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    album_id uuid,
    artist_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    duration integer,
    audio_url text,
    lyrics text,
    clip_url text,
    image_url text,
    track_number integer,
    genres jsonb,
    is_published boolean DEFAULT false,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    visibility character varying(16) DEFAULT 'public'::character varying NOT NULL,
    content_id uuid
);


--
-- Name: artist_feed_items; Type: TABLE; Schema: content; Owner: -
--

CREATE TABLE content.artist_feed_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    artist_id uuid NOT NULL,
    source_type character varying(32) NOT NULL,
    source_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    preview_text text,
    cover_url text,
    visibility character varying(24) DEFAULT 'public'::character varying NOT NULL,
    status character varying(24) DEFAULT 'draft'::character varying NOT NULL,
    published_at timestamp without time zone,
    scheduled_at timestamp without time zone,
    pinned boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: content_media; Type: TABLE; Schema: content; Owner: -
--

CREATE TABLE content.content_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    artist_id uuid NOT NULL,
    type character varying(24) NOT NULL,
    file_url text NOT NULL,
    thumbnail_url text,
    alt character varying(240),
    caption text,
    duration integer,
    width integer,
    height integer,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: photo_albums; Type: TABLE; Schema: content; Owner: -
--

CREATE TABLE content.photo_albums (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    artist_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    slug character varying(220) NOT NULL,
    description text,
    cover_photo_id uuid,
    visibility character varying(24) DEFAULT 'public'::character varying NOT NULL,
    status character varying(24) DEFAULT 'draft'::character varying NOT NULL,
    published_at timestamp without time zone,
    scheduled_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: photos; Type: TABLE; Schema: content; Owner: -
--

CREATE TABLE content.photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    album_id uuid NOT NULL,
    media_id uuid NOT NULL,
    alt character varying(240),
    caption text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: post_media; Type: TABLE; Schema: content; Owner: -
--

CREATE TABLE content.post_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    media_id uuid NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: post_music_attachments; Type: TABLE; Schema: content; Owner: -
--

CREATE TABLE content.post_music_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    track_id uuid,
    album_id uuid,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: post_poll_options; Type: TABLE; Schema: content; Owner: -
--

CREATE TABLE content.post_poll_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    poll_id uuid NOT NULL,
    label character varying(160) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: post_poll_votes; Type: TABLE; Schema: content; Owner: -
--

CREATE TABLE content.post_poll_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    poll_id uuid NOT NULL,
    option_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: post_polls; Type: TABLE; Schema: content; Owner: -
--

CREATE TABLE content.post_polls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    question character varying(280) NOT NULL,
    mode character varying(16) DEFAULT 'single'::character varying NOT NULL,
    closes_at timestamp without time zone,
    show_results character varying(24) DEFAULT 'after_vote'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: posts; Type: TABLE; Schema: content; Owner: -
--

CREATE TABLE content.posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    artist_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    slug character varying(220) NOT NULL,
    body_json jsonb,
    body_html text,
    excerpt text,
    cover_media_id uuid,
    visibility character varying(24) DEFAULT 'public'::character varying NOT NULL,
    status character varying(24) DEFAULT 'draft'::character varying NOT NULL,
    published_at timestamp without time zone,
    scheduled_at timestamp without time zone,
    comments_enabled boolean DEFAULT true NOT NULL,
    reactions_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: video_collection_items; Type: TABLE; Schema: content; Owner: -
--

CREATE TABLE content.video_collection_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    collection_id uuid NOT NULL,
    video_id uuid NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: video_collections; Type: TABLE; Schema: content; Owner: -
--

CREATE TABLE content.video_collections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    artist_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    slug character varying(220) NOT NULL,
    description text,
    cover_video_id uuid,
    visibility character varying(24) DEFAULT 'public'::character varying NOT NULL,
    status character varying(24) DEFAULT 'draft'::character varying NOT NULL,
    published_at timestamp without time zone,
    scheduled_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: videos; Type: TABLE; Schema: content; Owner: -
--

CREATE TABLE content.videos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    artist_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    slug character varying(220) NOT NULL,
    description text,
    video_media_id uuid,
    thumbnail_url text,
    duration integer,
    processing_status character varying(24) DEFAULT 'ready'::character varying NOT NULL,
    visibility character varying(24) DEFAULT 'public'::character varying NOT NULL,
    status character varying(24) DEFAULT 'draft'::character varying NOT NULL,
    published_at timestamp without time zone,
    scheduled_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: -
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: -
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: -
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: comment_likes; Type: TABLE; Schema: engagement; Owner: -
--

CREATE TABLE engagement.comment_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: post_likes; Type: TABLE; Schema: engagement; Owner: -
--

CREATE TABLE engagement.post_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: track_stats; Type: TABLE; Schema: engagement; Owner: -
--

CREATE TABLE engagement.track_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    track_id uuid NOT NULL,
    like_count integer DEFAULT 0 NOT NULL,
    play_count integer DEFAULT 0 NOT NULL,
    save_count integer DEFAULT 0 NOT NULL,
    comment_count integer DEFAULT 0 NOT NULL,
    last_updated timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: purchases; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    track_id uuid,
    album_id uuid,
    price integer NOT NULL,
    currency character varying(10) DEFAULT 'USD'::character varying,
    transaction_hash character varying(100),
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: subscriptions; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    artist_id uuid NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    canceled_at timestamp without time zone
);


--
-- Name: comments; Type: TABLE; Schema: messages; Owner: -
--

CREATE TABLE messages.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_type character varying(16) NOT NULL,
    target_id uuid NOT NULL,
    author_id uuid NOT NULL,
    body text NOT NULL,
    parent_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone,
    edited_at timestamp without time zone
);


--
-- Name: playlist_tracks; Type: TABLE; Schema: users; Owner: -
--

CREATE TABLE users.playlist_tracks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    playlist_id uuid NOT NULL,
    track_id uuid NOT NULL,
    "position" integer NOT NULL,
    added_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: playlists; Type: TABLE; Schema: users; Owner: -
--

CREATE TABLE users.playlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    cover_image_url text,
    is_public boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: users; Owner: -
--

CREATE TABLE users.sessions (
    id text NOT NULL,
    user_id uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: user_favorites; Type: TABLE; Schema: users; Owner: -
--

CREATE TABLE users.user_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    track_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: users; Owner: -
--

CREATE TABLE users.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    username character varying(50),
    display_name character varying(100),
    avatar_url text,
    bio text,
    wallet_address character varying(100),
    is_verified boolean DEFAULT false,
    google_id character varying(255),
    hashed_password text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    trust_score numeric(3,2) DEFAULT 0.00 NOT NULL
);


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: artist_accounts artist_accounts_login_unique; Type: CONSTRAINT; Schema: artist; Owner: -
--

ALTER TABLE ONLY artist.artist_accounts
    ADD CONSTRAINT artist_accounts_login_unique UNIQUE (login);


--
-- Name: artist_accounts artist_accounts_pkey; Type: CONSTRAINT; Schema: artist; Owner: -
--

ALTER TABLE ONLY artist.artist_accounts
    ADD CONSTRAINT artist_accounts_pkey PRIMARY KEY (id);


--
-- Name: artist_onboarding_requests artist_onboarding_requests_pkey; Type: CONSTRAINT; Schema: artist; Owner: -
--

ALTER TABLE ONLY artist.artist_onboarding_requests
    ADD CONSTRAINT artist_onboarding_requests_pkey PRIMARY KEY (id);


--
-- Name: artist_sessions artist_sessions_pkey; Type: CONSTRAINT; Schema: artist; Owner: -
--

ALTER TABLE ONLY artist.artist_sessions
    ADD CONSTRAINT artist_sessions_pkey PRIMARY KEY (id);


--
-- Name: artists artists_pkey; Type: CONSTRAINT; Schema: artist; Owner: -
--

ALTER TABLE ONLY artist.artists
    ADD CONSTRAINT artists_pkey PRIMARY KEY (id);


--
-- Name: artists artists_slug_unique; Type: CONSTRAINT; Schema: artist; Owner: -
--

ALTER TABLE ONLY artist.artists
    ADD CONSTRAINT artists_slug_unique UNIQUE (slug);


--
-- Name: album_tracks album_tracks_pkey; Type: CONSTRAINT; Schema: catalog; Owner: -
--

ALTER TABLE ONLY catalog.album_tracks
    ADD CONSTRAINT album_tracks_pkey PRIMARY KEY (id);


--
-- Name: albums albums_pkey; Type: CONSTRAINT; Schema: catalog; Owner: -
--

ALTER TABLE ONLY catalog.albums
    ADD CONSTRAINT albums_pkey PRIMARY KEY (id);


--
-- Name: genres genres_name_unique; Type: CONSTRAINT; Schema: catalog; Owner: -
--

ALTER TABLE ONLY catalog.genres
    ADD CONSTRAINT genres_name_unique UNIQUE (name);


--
-- Name: genres genres_pkey; Type: CONSTRAINT; Schema: catalog; Owner: -
--

ALTER TABLE ONLY catalog.genres
    ADD CONSTRAINT genres_pkey PRIMARY KEY (id);


--
-- Name: tracks tracks_pkey; Type: CONSTRAINT; Schema: catalog; Owner: -
--

ALTER TABLE ONLY catalog.tracks
    ADD CONSTRAINT tracks_pkey PRIMARY KEY (id);


--
-- Name: artist_feed_items artist_feed_items_pkey; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.artist_feed_items
    ADD CONSTRAINT artist_feed_items_pkey PRIMARY KEY (id);


--
-- Name: artist_feed_items artist_feed_items_source_unique; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.artist_feed_items
    ADD CONSTRAINT artist_feed_items_source_unique UNIQUE (source_type, source_id);


--
-- Name: content_media content_media_pkey; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.content_media
    ADD CONSTRAINT content_media_pkey PRIMARY KEY (id);


--
-- Name: photo_albums photo_albums_artist_id_slug_unique; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.photo_albums
    ADD CONSTRAINT photo_albums_artist_id_slug_unique UNIQUE (artist_id, slug);


--
-- Name: photo_albums photo_albums_pkey; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.photo_albums
    ADD CONSTRAINT photo_albums_pkey PRIMARY KEY (id);


--
-- Name: photos photos_pkey; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.photos
    ADD CONSTRAINT photos_pkey PRIMARY KEY (id);


--
-- Name: post_media post_media_pkey; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.post_media
    ADD CONSTRAINT post_media_pkey PRIMARY KEY (id);


--
-- Name: post_media post_media_post_id_media_id_unique; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.post_media
    ADD CONSTRAINT post_media_post_id_media_id_unique UNIQUE (post_id, media_id);


--
-- Name: post_music_attachments post_music_attachments_pkey; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.post_music_attachments
    ADD CONSTRAINT post_music_attachments_pkey PRIMARY KEY (id);


--
-- Name: post_poll_options post_poll_options_pkey; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.post_poll_options
    ADD CONSTRAINT post_poll_options_pkey PRIMARY KEY (id);


--
-- Name: post_poll_votes post_poll_votes_pkey; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.post_poll_votes
    ADD CONSTRAINT post_poll_votes_pkey PRIMARY KEY (id);


--
-- Name: post_poll_votes post_poll_votes_poll_id_user_id_option_id_unique; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.post_poll_votes
    ADD CONSTRAINT post_poll_votes_poll_id_user_id_option_id_unique UNIQUE (poll_id, user_id, option_id);


--
-- Name: post_polls post_polls_pkey; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.post_polls
    ADD CONSTRAINT post_polls_pkey PRIMARY KEY (id);


--
-- Name: posts posts_artist_id_slug_unique; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.posts
    ADD CONSTRAINT posts_artist_id_slug_unique UNIQUE (artist_id, slug);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: video_collection_items video_collection_items_collection_id_video_id_unique; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.video_collection_items
    ADD CONSTRAINT video_collection_items_collection_id_video_id_unique UNIQUE (collection_id, video_id);


--
-- Name: video_collection_items video_collection_items_pkey; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.video_collection_items
    ADD CONSTRAINT video_collection_items_pkey PRIMARY KEY (id);


--
-- Name: video_collections video_collections_artist_id_slug_unique; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.video_collections
    ADD CONSTRAINT video_collections_artist_id_slug_unique UNIQUE (artist_id, slug);


--
-- Name: video_collections video_collections_pkey; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.video_collections
    ADD CONSTRAINT video_collections_pkey PRIMARY KEY (id);


--
-- Name: videos videos_artist_id_slug_unique; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.videos
    ADD CONSTRAINT videos_artist_id_slug_unique UNIQUE (artist_id, slug);


--
-- Name: videos videos_pkey; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.videos
    ADD CONSTRAINT videos_pkey PRIMARY KEY (id);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: comment_likes comment_likes_comment_user_unique; Type: CONSTRAINT; Schema: engagement; Owner: -
--

ALTER TABLE ONLY engagement.comment_likes
    ADD CONSTRAINT comment_likes_comment_user_unique UNIQUE (comment_id, user_id);


--
-- Name: comment_likes comment_likes_pkey; Type: CONSTRAINT; Schema: engagement; Owner: -
--

ALTER TABLE ONLY engagement.comment_likes
    ADD CONSTRAINT comment_likes_pkey PRIMARY KEY (id);


--
-- Name: post_likes post_likes_pkey; Type: CONSTRAINT; Schema: engagement; Owner: -
--

ALTER TABLE ONLY engagement.post_likes
    ADD CONSTRAINT post_likes_pkey PRIMARY KEY (id);


--
-- Name: post_likes post_likes_post_user_unique; Type: CONSTRAINT; Schema: engagement; Owner: -
--

ALTER TABLE ONLY engagement.post_likes
    ADD CONSTRAINT post_likes_post_user_unique UNIQUE (post_id, user_id);


--
-- Name: track_stats track_stats_pkey; Type: CONSTRAINT; Schema: engagement; Owner: -
--

ALTER TABLE ONLY engagement.track_stats
    ADD CONSTRAINT track_stats_pkey PRIMARY KEY (id);


--
-- Name: track_stats track_stats_track_id_unique; Type: CONSTRAINT; Schema: engagement; Owner: -
--

ALTER TABLE ONLY engagement.track_stats
    ADD CONSTRAINT track_stats_track_id_unique UNIQUE (track_id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_user_artist_unique; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.subscriptions
    ADD CONSTRAINT subscriptions_user_artist_unique UNIQUE (user_id, artist_id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: messages; Owner: -
--

ALTER TABLE ONLY messages.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: playlist_tracks playlist_tracks_pkey; Type: CONSTRAINT; Schema: users; Owner: -
--

ALTER TABLE ONLY users.playlist_tracks
    ADD CONSTRAINT playlist_tracks_pkey PRIMARY KEY (id);


--
-- Name: playlists playlists_pkey; Type: CONSTRAINT; Schema: users; Owner: -
--

ALTER TABLE ONLY users.playlists
    ADD CONSTRAINT playlists_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: users; Owner: -
--

ALTER TABLE ONLY users.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: user_favorites user_favorites_pkey; Type: CONSTRAINT; Schema: users; Owner: -
--

ALTER TABLE ONLY users.user_favorites
    ADD CONSTRAINT user_favorites_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: users; Owner: -
--

ALTER TABLE ONLY users.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: users; Owner: -
--

ALTER TABLE ONLY users.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: users; Owner: -
--

ALTER TABLE ONLY users.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: tracks_artist_status_idx; Type: INDEX; Schema: catalog; Owner: -
--

CREATE INDEX tracks_artist_status_idx ON catalog.tracks USING btree (artist_id, status);


--
-- Name: tracks_published_status_idx; Type: INDEX; Schema: catalog; Owner: -
--

CREATE INDEX tracks_published_status_idx ON catalog.tracks USING btree (is_published, status);


--
-- Name: artist_feed_items_artist_id_published_at_idx; Type: INDEX; Schema: content; Owner: -
--

CREATE INDEX artist_feed_items_artist_id_published_at_idx ON content.artist_feed_items USING btree (artist_id, published_at);


--
-- Name: artist_feed_items_artist_id_status_idx; Type: INDEX; Schema: content; Owner: -
--

CREATE INDEX artist_feed_items_artist_id_status_idx ON content.artist_feed_items USING btree (artist_id, status);


--
-- Name: content_media_artist_id_type_idx; Type: INDEX; Schema: content; Owner: -
--

CREATE INDEX content_media_artist_id_type_idx ON content.content_media USING btree (artist_id, type);


--
-- Name: content_media_metadata_gin_idx; Type: INDEX; Schema: content; Owner: -
--

CREATE INDEX content_media_metadata_gin_idx ON content.content_media USING gin (metadata);


--
-- Name: posts_artist_id_published_at_idx; Type: INDEX; Schema: content; Owner: -
--

CREATE INDEX posts_artist_id_published_at_idx ON content.posts USING btree (artist_id, published_at);


--
-- Name: posts_artist_id_status_idx; Type: INDEX; Schema: content; Owner: -
--

CREATE INDEX posts_artist_id_status_idx ON content.posts USING btree (artist_id, status);


--
-- Name: video_collections_artist_id_status_idx; Type: INDEX; Schema: content; Owner: -
--

CREATE INDEX video_collections_artist_id_status_idx ON content.video_collections USING btree (artist_id, status);


--
-- Name: comments_author_idx; Type: INDEX; Schema: messages; Owner: -
--

CREATE INDEX comments_author_idx ON messages.comments USING btree (author_id);


--
-- Name: comments_target_idx; Type: INDEX; Schema: messages; Owner: -
--

CREATE INDEX comments_target_idx ON messages.comments USING btree (target_type, target_id, created_at);


--
-- Name: set_artist_active_on_approved(); Type: FUNCTION; Schema: public; Owner: -
--
-- Not covered by the --schema=... scoped pg_dump above (it lives in `public`,
-- not one of PDM's 8 named schemas) — pulled from drizzle/migrations/0000_baseline.sql
-- instead, which is the canonical source. `supabase db push` caught the gap: this
-- migration failed on first attempt (function did not exist) with a clean rollback.
--

CREATE OR REPLACE FUNCTION public.set_artist_active_on_approved()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = artist, public
AS $$
BEGIN
	IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
		UPDATE "artist"."artists"
		SET "is_active" = TRUE,
			"updated_at" = now()
		WHERE "user_id" = NEW.user_id;
	END IF;

	RETURN NEW;
END;
$$;

--
-- Name: artist_onboarding_requests artist_onboarding_approved_activate; Type: TRIGGER; Schema: artist; Owner: -
--

CREATE TRIGGER artist_onboarding_approved_activate AFTER UPDATE OF status ON artist.artist_onboarding_requests FOR EACH ROW WHEN (((new.status)::text = 'approved'::text)) EXECUTE FUNCTION public.set_artist_active_on_approved();


--
-- Name: artist_accounts artist_accounts_artist_id_artists_id_fk; Type: FK CONSTRAINT; Schema: artist; Owner: -
--

ALTER TABLE ONLY artist.artist_accounts
    ADD CONSTRAINT artist_accounts_artist_id_artists_id_fk FOREIGN KEY (artist_id) REFERENCES artist.artists(id) ON DELETE CASCADE;


--
-- Name: artist_onboarding_requests artist_onboarding_requests_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: artist; Owner: -
--

ALTER TABLE ONLY artist.artist_onboarding_requests
    ADD CONSTRAINT artist_onboarding_requests_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users.users(id) ON DELETE CASCADE;


--
-- Name: artist_sessions artist_sessions_artist_account_id_artist_accounts_id_fk; Type: FK CONSTRAINT; Schema: artist; Owner: -
--

ALTER TABLE ONLY artist.artist_sessions
    ADD CONSTRAINT artist_sessions_artist_account_id_artist_accounts_id_fk FOREIGN KEY (artist_account_id) REFERENCES artist.artist_accounts(id) ON DELETE CASCADE;


--
-- Name: artists artists_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: artist; Owner: -
--

ALTER TABLE ONLY artist.artists
    ADD CONSTRAINT artists_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users.users(id);


--
-- Name: album_tracks album_tracks_album_id_albums_id_fk; Type: FK CONSTRAINT; Schema: catalog; Owner: -
--

ALTER TABLE ONLY catalog.album_tracks
    ADD CONSTRAINT album_tracks_album_id_albums_id_fk FOREIGN KEY (album_id) REFERENCES catalog.albums(id) ON DELETE CASCADE;


--
-- Name: album_tracks album_tracks_track_id_tracks_id_fk; Type: FK CONSTRAINT; Schema: catalog; Owner: -
--

ALTER TABLE ONLY catalog.album_tracks
    ADD CONSTRAINT album_tracks_track_id_tracks_id_fk FOREIGN KEY (track_id) REFERENCES catalog.tracks(id) ON DELETE CASCADE;


--
-- Name: albums albums_artist_id_artists_id_fk; Type: FK CONSTRAINT; Schema: catalog; Owner: -
--

ALTER TABLE ONLY catalog.albums
    ADD CONSTRAINT albums_artist_id_artists_id_fk FOREIGN KEY (artist_id) REFERENCES artist.artists(id);


--
-- Name: tracks tracks_album_id_albums_id_fk; Type: FK CONSTRAINT; Schema: catalog; Owner: -
--

ALTER TABLE ONLY catalog.tracks
    ADD CONSTRAINT tracks_album_id_albums_id_fk FOREIGN KEY (album_id) REFERENCES catalog.albums(id);


--
-- Name: tracks tracks_artist_id_artists_id_fk; Type: FK CONSTRAINT; Schema: catalog; Owner: -
--

ALTER TABLE ONLY catalog.tracks
    ADD CONSTRAINT tracks_artist_id_artists_id_fk FOREIGN KEY (artist_id) REFERENCES artist.artists(id);


--
-- Name: artist_feed_items artist_feed_items_artist_id_artists_id_fk; Type: FK CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.artist_feed_items
    ADD CONSTRAINT artist_feed_items_artist_id_artists_id_fk FOREIGN KEY (artist_id) REFERENCES artist.artists(id);


--
-- Name: content_media content_media_artist_id_artists_id_fk; Type: FK CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.content_media
    ADD CONSTRAINT content_media_artist_id_artists_id_fk FOREIGN KEY (artist_id) REFERENCES artist.artists(id);


--
-- Name: photo_albums photo_albums_artist_id_artists_id_fk; Type: FK CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.photo_albums
    ADD CONSTRAINT photo_albums_artist_id_artists_id_fk FOREIGN KEY (artist_id) REFERENCES artist.artists(id);


--
-- Name: photos photos_album_id_photo_albums_id_fk; Type: FK CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.photos
    ADD CONSTRAINT photos_album_id_photo_albums_id_fk FOREIGN KEY (album_id) REFERENCES content.photo_albums(id) ON DELETE CASCADE;


--
-- Name: photos photos_media_id_content_media_id_fk; Type: FK CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.photos
    ADD CONSTRAINT photos_media_id_content_media_id_fk FOREIGN KEY (media_id) REFERENCES content.content_media(id) ON DELETE CASCADE;


--
-- Name: post_media post_media_media_id_content_media_id_fk; Type: FK CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.post_media
    ADD CONSTRAINT post_media_media_id_content_media_id_fk FOREIGN KEY (media_id) REFERENCES content.content_media(id) ON DELETE CASCADE;


--
-- Name: post_media post_media_post_id_posts_id_fk; Type: FK CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.post_media
    ADD CONSTRAINT post_media_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES content.posts(id) ON DELETE CASCADE;


--
-- Name: post_music_attachments post_music_attachments_album_id_albums_id_fk; Type: FK CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.post_music_attachments
    ADD CONSTRAINT post_music_attachments_album_id_albums_id_fk FOREIGN KEY (album_id) REFERENCES catalog.albums(id) ON DELETE CASCADE;


--
-- Name: post_music_attachments post_music_attachments_post_id_posts_id_fk; Type: FK CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.post_music_attachments
    ADD CONSTRAINT post_music_attachments_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES content.posts(id) ON DELETE CASCADE;


--
-- Name: post_music_attachments post_music_attachments_track_id_tracks_id_fk; Type: FK CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.post_music_attachments
    ADD CONSTRAINT post_music_attachments_track_id_tracks_id_fk FOREIGN KEY (track_id) REFERENCES catalog.tracks(id) ON DELETE CASCADE;


--
-- Name: post_poll_options post_poll_options_poll_id_post_polls_id_fk; Type: FK CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.post_poll_options
    ADD CONSTRAINT post_poll_options_poll_id_post_polls_id_fk FOREIGN KEY (poll_id) REFERENCES content.post_polls(id) ON DELETE CASCADE;


--
-- Name: post_poll_votes post_poll_votes_option_id_post_poll_options_id_fk; Type: FK CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.post_poll_votes
    ADD CONSTRAINT post_poll_votes_option_id_post_poll_options_id_fk FOREIGN KEY (option_id) REFERENCES content.post_poll_options(id) ON DELETE CASCADE;


--
-- Name: post_poll_votes post_poll_votes_poll_id_post_polls_id_fk; Type: FK CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.post_poll_votes
    ADD CONSTRAINT post_poll_votes_poll_id_post_polls_id_fk FOREIGN KEY (poll_id) REFERENCES content.post_polls(id) ON DELETE CASCADE;


--
-- Name: post_poll_votes post_poll_votes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.post_poll_votes
    ADD CONSTRAINT post_poll_votes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users.users(id) ON DELETE CASCADE;


--
-- Name: post_polls post_polls_post_id_posts_id_fk; Type: FK CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.post_polls
    ADD CONSTRAINT post_polls_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES content.posts(id) ON DELETE CASCADE;


--
-- Name: posts posts_artist_id_artists_id_fk; Type: FK CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.posts
    ADD CONSTRAINT posts_artist_id_artists_id_fk FOREIGN KEY (artist_id) REFERENCES artist.artists(id);


--
-- Name: video_collection_items video_collection_items_collection_id_video_collections_id_fk; Type: FK CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.video_collection_items
    ADD CONSTRAINT video_collection_items_collection_id_video_collections_id_fk FOREIGN KEY (collection_id) REFERENCES content.video_collections(id) ON DELETE CASCADE;


--
-- Name: video_collection_items video_collection_items_video_id_videos_id_fk; Type: FK CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.video_collection_items
    ADD CONSTRAINT video_collection_items_video_id_videos_id_fk FOREIGN KEY (video_id) REFERENCES content.videos(id) ON DELETE CASCADE;


--
-- Name: video_collections video_collections_artist_id_artists_id_fk; Type: FK CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.video_collections
    ADD CONSTRAINT video_collections_artist_id_artists_id_fk FOREIGN KEY (artist_id) REFERENCES artist.artists(id);


--
-- Name: videos videos_artist_id_artists_id_fk; Type: FK CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.videos
    ADD CONSTRAINT videos_artist_id_artists_id_fk FOREIGN KEY (artist_id) REFERENCES artist.artists(id);


--
-- Name: comment_likes comment_likes_comment_id_comments_id_fk; Type: FK CONSTRAINT; Schema: engagement; Owner: -
--

ALTER TABLE ONLY engagement.comment_likes
    ADD CONSTRAINT comment_likes_comment_id_comments_id_fk FOREIGN KEY (comment_id) REFERENCES messages.comments(id) ON DELETE CASCADE;


--
-- Name: comment_likes comment_likes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: engagement; Owner: -
--

ALTER TABLE ONLY engagement.comment_likes
    ADD CONSTRAINT comment_likes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users.users(id) ON DELETE CASCADE;


--
-- Name: post_likes post_likes_post_id_posts_id_fk; Type: FK CONSTRAINT; Schema: engagement; Owner: -
--

ALTER TABLE ONLY engagement.post_likes
    ADD CONSTRAINT post_likes_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES content.posts(id) ON DELETE CASCADE;


--
-- Name: post_likes post_likes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: engagement; Owner: -
--

ALTER TABLE ONLY engagement.post_likes
    ADD CONSTRAINT post_likes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users.users(id) ON DELETE CASCADE;


--
-- Name: track_stats track_stats_track_id_tracks_id_fk; Type: FK CONSTRAINT; Schema: engagement; Owner: -
--

ALTER TABLE ONLY engagement.track_stats
    ADD CONSTRAINT track_stats_track_id_tracks_id_fk FOREIGN KEY (track_id) REFERENCES catalog.tracks(id) ON DELETE CASCADE;


--
-- Name: purchases purchases_album_id_albums_id_fk; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.purchases
    ADD CONSTRAINT purchases_album_id_albums_id_fk FOREIGN KEY (album_id) REFERENCES catalog.albums(id);


--
-- Name: purchases purchases_track_id_tracks_id_fk; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.purchases
    ADD CONSTRAINT purchases_track_id_tracks_id_fk FOREIGN KEY (track_id) REFERENCES catalog.tracks(id);


--
-- Name: purchases purchases_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.purchases
    ADD CONSTRAINT purchases_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users.users(id);


--
-- Name: subscriptions subscriptions_artist_id_artists_id_fk; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.subscriptions
    ADD CONSTRAINT subscriptions_artist_id_artists_id_fk FOREIGN KEY (artist_id) REFERENCES artist.artists(id);


--
-- Name: subscriptions subscriptions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.subscriptions
    ADD CONSTRAINT subscriptions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users.users(id);


--
-- Name: comments comments_author_id_users_id_fk; Type: FK CONSTRAINT; Schema: messages; Owner: -
--

ALTER TABLE ONLY messages.comments
    ADD CONSTRAINT comments_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES users.users(id) ON DELETE CASCADE;


--
-- Name: playlist_tracks playlist_tracks_playlist_id_playlists_id_fk; Type: FK CONSTRAINT; Schema: users; Owner: -
--

ALTER TABLE ONLY users.playlist_tracks
    ADD CONSTRAINT playlist_tracks_playlist_id_playlists_id_fk FOREIGN KEY (playlist_id) REFERENCES users.playlists(id);


--
-- Name: playlist_tracks playlist_tracks_track_id_tracks_id_fk; Type: FK CONSTRAINT; Schema: users; Owner: -
--

ALTER TABLE ONLY users.playlist_tracks
    ADD CONSTRAINT playlist_tracks_track_id_tracks_id_fk FOREIGN KEY (track_id) REFERENCES catalog.tracks(id);


--
-- Name: playlists playlists_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: users; Owner: -
--

ALTER TABLE ONLY users.playlists
    ADD CONSTRAINT playlists_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users.users(id);


--
-- Name: sessions sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: users; Owner: -
--

ALTER TABLE ONLY users.sessions
    ADD CONSTRAINT sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users.users(id) ON DELETE CASCADE;


--
-- Name: user_favorites user_favorites_track_id_tracks_id_fk; Type: FK CONSTRAINT; Schema: users; Owner: -
--

ALTER TABLE ONLY users.user_favorites
    ADD CONSTRAINT user_favorites_track_id_tracks_id_fk FOREIGN KEY (track_id) REFERENCES catalog.tracks(id);


--
-- Name: user_favorites user_favorites_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: users; Owner: -
--

ALTER TABLE ONLY users.user_favorites
    ADD CONSTRAINT user_favorites_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users.users(id);


--
-- PostgreSQL database dump complete
--


