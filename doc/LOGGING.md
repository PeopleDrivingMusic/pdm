# PDM Logging System

This project is configured with a complete logging system based on the Loki + Promtail + Grafana stack for centralized log collection, storage and visualization.

## System Components

### 🔍 Loki
- **Purpose**: Centralized log storage
- **Port**: 3100
- **Configuration**: `loki-config.yaml`

### 📊 Promtail
- **Purpose**: Agent for collecting logs from various sources
- **Configuration**: `promtail-config.yaml`
- **Log Sources**:
  - Docker containers
  - System logs
  - Application logs

### 📈 Grafana
- **Purpose**: Log visualization and monitoring
- **Port**: 3000
- **Login**: admin / admin
- **Dashboards**: Automatically loaded from `grafana/dashboards/`

## Quick Start

### 1. Start Monitoring System

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f loki
docker-compose logs -f promtail
docker-compose logs -f grafana
```

### 2. Access Interfaces

- **Grafana**: http://localhost:3000 (admin/admin)
- **Loki API**: http://localhost:3100
- **PgAdmin**: http://localhost:8080
- **Application**: http://localhost:4173

### 3. Dashboard Setup

1. Open Grafana: http://localhost:3000
2. Login with credentials: admin/admin
3. Go to "Dashboards" section
4. Find the "PDM - Log Monitoring" dashboard

## Logging Usage in Code

### Basic Logging

```typescript
import { logger } from '$lib/utils/logger';

// Different logging levels
logger.debug('Debug information', { component: 'auth' });
logger.info('Informational message', { component: 'api' });
logger.warn('Warning', { component: 'database' });
logger.error('Error', { component: 'payment', metadata: { error: new Error('Payment failed') } });
```

### HTTP Requests

```typescript
// Automatic logging via middleware
// Each HTTP request is automatically logged with:
// - Method and URL
// - Execution time
// - Response status
// - User Agent and IP

// Manual HTTP request logging
logger.httpRequest('GET', '/api/users', 200, 150, { 
  requestId: 'req-123',
  userId: 'user-456' 
});
```

### User Actions

```typescript
logger.userAction('login', 'user-123', {
  metadata: { 
    method: 'email',
    ip: '192.168.1.1' 
  }
});
```

### Database

```typescript
logger.dbQuery('SELECT * FROM users WHERE id = $1', 45, {
  metadata: { 
    params: ['123'],
    rowCount: 1 
  }
});
```

### Security Events

```typescript
logger.security('failed_login_attempt', 'warn', {
  metadata: { 
    username: 'admin',
    ip: '192.168.1.100' 
  }
});
```

## Configuration

### Log Levels

Set the `LOG_LEVEL` environment variable:

```bash
# In .env file or docker-compose.yml
LOG_LEVEL=debug   # debug, info, warn, error
LOG_FORMAT=json   # json, pretty
```

### Promtail Configuration

Edit `promtail-config.yaml` to add new log sources:

```yaml
scrape_configs:
  - job_name: my-app-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: my-app
          __path__: /path/to/app/logs/*.log
```

### Loki Configuration

Main settings in `loki-config.yaml`:

- **Retention**: Log retention time
- **Limits**: Ingestion rate limits
- **Storage**: Storage configuration

## Monitoring and Alerts

### Built-in Dashboards

1. **PDM - Log Monitoring**: Main dashboard with:
   - Log distribution by containers
   - Log frequency over time
   - Application logs
   - PostgreSQL errors
   - All system errors

### Useful LogQL Queries

```bash
# All application logs for the last hour
{container_name="pdm-app"}

# Errors in the last 5 minutes
{container_name=~".+"} |= "error" or {container_name=~".+"} |= "ERROR"

# Logs for specific user
{container_name="pdm-app"} | json | userId="user-123"

# Slow database queries
{container_name="pdm-app"} | json | component="database" | duration > 1000

# HTTP 5xx errors
{container_name="pdm-app"} | json | statusCode >= 500

# Text search
{container_name="pdm-app"} |= "payment" |= "failed"
```

## Performance

### Recommendations

1. **Use appropriate logging levels**:
   - `debug`: Development only
   - `info`: Important application events
   - `warn`: Potential issues
   - `error`: Actual errors

2. **Structured logging**:
   - Use metadata fields for structured data
   - Add context (requestId, userId, sessionId)

3. **Avoid excessive logging**:
   - Don't log sensitive data
   - Use sampling for high-frequency events

## Debugging

### Service health check

```bash
# Check Loki
curl http://localhost:3100/ready

# Check Promtail metrics
curl http://localhost:9080/metrics

# View Promtail configuration
curl http://localhost:9080/config
```

### Common problems

1. **Promtail not collecting logs**:
   - Check access rights to `/var/lib/docker/containers`
   - Ensure Promtail can connect to Loki

2. **Grafana not showing data**:
   - Check Loki connection in Data Sources settings
   - Ensure time range is correct

3. **High disk usage**:
   - Configure retention in Loki
   - Limit Docker logs size

## Security

- Logs may contain sensitive information
- Configure rotation and cleanup of old logs
- Restrict access to Grafana and Loki
- Use HTTPS in production

## Development

For development use simplified logging:

```bash
# In development mode
LOG_LEVEL=debug
LOG_FORMAT=pretty

# Run only necessary services
docker-compose up postgres pgadmin
npm run dev
```

## Additional information

- [Loki Documentation](https://grafana.com/docs/loki/latest/)
- [Promtail Documentation](https://grafana.com/docs/loki/latest/clients/promtail/)
- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
- [LogQL Query Language](https://grafana.com/docs/loki/latest/logql/)
