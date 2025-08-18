# PDM Database Setup

This document describes the database setup for the People Driving Music (PDM) project using PostgreSQL and Drizzle ORM.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ installed
- npm or yarn package manager

## Quick Start

### 1. Start PostgreSQL with Docker

```bash
# Start PostgreSQL and pgAdmin containers
docker-compose up -d

# Check if containers are running
docker-compose ps
```

The setup includes:
- **PostgreSQL**: Available at `localhost:5433`
  - Username: `postgres`
  - Password: `password`
  - Database: `pdm_db`
- **pgAdmin**: Available at `http://localhost:8080`
  - Email: `admin@pdm.com`
  - Password: `admin`

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Create a `.env` file in the root directory (already exists):

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/pdm_db"
```

### 4. Generate and Run Migrations

```bash
# Generate migration files
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Or push schema directly (for development)
npm run db:push
```

### 5. Access Drizzle Studio (Optional)

```bash
# Open Drizzle Studio for database management
npm run db:studio
```

## Database Schema

The database includes the following main tables:

### Core Tables
- **users**: User accounts and profiles
- **artists**: Artist profiles linked to users
- **albums**: Music albums
- **tracks**: Individual music tracks
- **playlists**: User-created playlists
- **playlist_tracks**: Many-to-many relationship between playlists and tracks

### Additional Tables
- **user_favorites**: User favorite tracks
- **purchases**: Purchase history and blockchain transactions

### Key Features
- UUID primary keys for all tables
- JSON fields for metadata and social links
- Blockchain integration fields (wallet addresses, transaction hashes)
- Timestamps for created/updated tracking
- Proper foreign key relationships

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run db:generate` | Generate migration files from schema changes |
| `npm run db:migrate` | Apply pending migrations to database |
| `npm run db:push` | Push schema changes directly (development) |
| `npm run db:studio` | Open Drizzle Studio web interface |
| `npm run db:drop` | Drop database objects (use with caution) |

## Usage Examples

### Import Database Services

```typescript
import { UserService, ArtistService, TrackService } from '$lib/db/queries';
import { db } from '$lib/db';
```

### Create a User

```typescript
const user = await UserService.createUser({
  email: 'user@example.com',
  username: 'musiclover',
  displayName: 'Music Lover',
  walletAddress: '0x...'
});
```

### Create an Artist Profile

```typescript
const artist = await ArtistService.createArtist({
  userId: user.id,
  stageName: 'DJ Example',
  genre: 'Electronic',
  description: 'Electronic music producer'
});
```

### Search Tracks

```typescript
const tracks = await TrackService.searchTracks('electronic');
const popularTracks = await TrackService.getPopularTracks(10);
```

### Raw SQL Queries

```typescript
import { db } from '$lib/db';

const result = await db.execute(sql`
  SELECT COUNT(*) as total_users FROM users WHERE created_at > NOW() - INTERVAL '7 days'
`);
```

## Development Workflow

### 1. Schema Changes

1. Modify `src/lib/db/schema.ts`
2. Generate migration: `npm run db:generate`
3. Review generated migration in `drizzle/migrations/`
4. Apply migration: `npm run db:migrate`

### 2. Testing

Use the example functions in `src/lib/db/examples.ts` to test database functionality:

```typescript
import { runCompleteExample } from '$lib/db/examples';

// Test all database operations
await runCompleteExample();
```

### 3. Production Deployment

1. Set production `DATABASE_URL` in environment variables
2. Run migrations: `npm run db:migrate`
3. Ensure SSL is properly configured for production connections

## Troubleshooting

### Connection Issues

1. **Check Docker containers**:
   ```bash
   docker-compose logs postgres
   ```

2. **Test database connection**:
   ```typescript
   import { testDatabaseConnection } from '$lib/db/queries';
   await testDatabaseConnection();
   ```

3. **Verify environment variables**:
   ```bash
   echo $DATABASE_URL
   ```

### Migration Issues

1. **Reset database** (development only):
   ```bash
   docker-compose down -v
   docker-compose up -d
   npm run db:push
   ```

2. **Check migration status**:
   ```bash
   npm run db:studio
   # Check the __drizzle_migrations table
   ```

## Security Considerations

### Production Setup
- Use strong passwords for database users
- Enable SSL connections (`?sslmode=require`)
- Use connection pooling for high-traffic applications
- Regularly backup your database
- Use environment variables for sensitive configuration

### Example Production Configuration

```env
DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"
NODE_ENV=production
```

## Additional Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
