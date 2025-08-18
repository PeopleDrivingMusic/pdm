# PDM Monitoring & Logging System

Comprehensive monitoring and logging system for the PDM (People Driving Music) project, including Prometheus, Loki, Grafana and modern tools for collecting metrics and logs.

## 🏗️ Architecture

### System Components:

1. **Prometheus** - Metrics collection and storage
2. **Loki** - Log aggregation and storage
3. **Promtail** - Log collection agent
4. **Grafana** - Metrics and logs visualization
5. **Node Exporter** - Host system metrics
6. **cAdvisor** - Docker container metrics

### Service Ports:

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Loki**: http://localhost:3100
- **Node Exporter**: http://localhost:9100
- **cAdvisor**: http://localhost:8080
- **PDM App Metrics**: http://localhost:4173/api/metrics
- **Promtail**: http://localhost:9080

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Complete Monitoring System

```bash
# Start all services (DB + monitoring)
npm run docker:up

# Or just monitoring and logging
npm run logging:up
```

### 3. Start Only Metrics (without logs)

```bash
npm run monitoring:up
```

## 📊 Dashboard Access

After startup, open Grafana: http://localhost:3000

**Login credentials:**
- Username: `admin`
- Password: `admin`

### Ready-made Dashboards:

1. **PDM Application Overview** - Application overview
   - Application status
   - HTTP requests and performance
   - Active users
   - DB connections
   - Application logs

2. **System & Docker Monitoring** - System monitoring
   - Host CPU and memory
   - Docker container metrics
   - Disk I/O
   - Network traffic

## 📈 Application Metrics

### HTTP Metrics:
- `http_requests_total` - Total HTTP requests count
- `http_request_duration_seconds` - HTTP request response time

### Database Metrics:
- `db_connections_active` - Active DB connections
- `db_queries_total` - Total database queries count
- `db_query_duration_seconds` - Query execution time

### User Metrics:
- `active_users` - Active users count
- `user_actions_total` - Total user actions count

### PDM Business Metrics:
- `songs_played_total` - Songs played count
- `playlists_created_total` - Playlists created
- `music_uploads_total` - Music uploaded
- `streaming_duration_seconds` - Streaming duration

## 📝 Logging

### Log Structure:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "HTTP GET /api/users - 200 (45ms)",
  "component": "http",
  "request_id": "uuid-string",
  "metadata": {
    "method": "GET",
    "path": "/api/users",
    "status_code": 200,
    "duration": 45
  }
}
```

### Log Levels:
- `debug` - Detailed debugging information
- `info` - General operational information
- `warn` - Warnings
- `error` - Errors

## 🔧 Management Commands

### Logging and Monitoring:
```bash
# Start logging services
npm run logging:up

# Stop logging services
npm run logging:down

# View service logs
npm run logging:logs

# Restart logging services
npm run logging:restart
```

### Metrics Monitoring Only:
```bash
# Start Prometheus and exporters
npm run monitoring:up

# Stop monitoring system
npm run monitoring:down

# Monitoring logs
npm run monitoring:logs
```

### Docker:
```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# Full cleanup (remove volumes)
npm run docker:clean
```

## 🎯 Alerts

The following alerts are configured in Prometheus:

### Application Alerts:
- **PDMApplicationDown** - Application unavailable (>1 min)
- **PDMHighResponseTime** - High response time (>1 sec)
- **PDMHighErrorRate** - High error rate (>10%)
- **PDMHighMemoryUsage** - High memory usage (>500MB)

### System Alerts:
- **HighCPUUsage** - High CPU load (>80%)
- **HighMemoryUsage** - High memory usage (>85%)
- **LowDiskSpace** - Low disk space (<15%)

### Docker Alerts:
- **ContainerDown** - Container unavailable
- **ContainerHighCPU** - High container CPU load
- **ContainerHighMemory** - High container memory usage

## 🔍 Using Metrics in Code

### Recording Metrics:

```typescript
import { MetricsCollector } from '$lib/utils/metrics';

// Record user action
MetricsCollector.recordUserAction('login', 'premium');

// Record song play
MetricsCollector.recordSongPlayed('rock', 'spotify');

// Record playlist creation
MetricsCollector.recordPlaylistCreated('premium');

// Record music upload
MetricsCollector.recordMusicUpload('mp3', true);
```

### Logging:

```typescript
import { logger } from '$lib/utils/logger';

// Regular logging
logger.info('User logged in', { userId: '123', component: 'auth' });

// Error logging
logger.error('Database connection failed', { 
  component: 'database',
  metadata: { error: err, connectionString: 'postgres://...' }
});

// Special methods
logger.userAction('created_playlist', userId);
logger.security('failed_login_attempt', 'warn');
```

## 📁 Configuration Structure

```
pdm/
├── docker-compose.yml          # Main Docker configuration
├── prometheus.yml              # Prometheus configuration
├── loki-config.yaml           # Loki configuration
├── promtail-config.yaml       # Promtail configuration
├── prometheus/
│   └── alerts/
│       └── pdm-alerts.yml     # Alert rules
└── grafana/
    ├── provisioning/
    │   ├── datasources/       # Data sources
    │   └── dashboards/        # Dashboard provisioning
    └── dashboards/
        ├── app/               # Application dashboards
        └── system/            # System dashboards
```

## 🛠️ Customization

### Adding new metrics:

1. Define metric in `src/lib/utils/metrics.ts`
2. Add method to `MetricsCollector`
3. Use in application code
4. Update Grafana dashboards

### Adding new alerts:

1. Edit `prometheus/alerts/pdm-alerts.yml`
2. Restart Prometheus: `docker-compose restart prometheus`

### Retention settings:

- **Prometheus**: 15 days (in docker-compose.yml)
- **Loki**: 168 hours (in loki-config.yaml)

## 🐛 Troubleshooting

### Loki issues:
```bash
# Check configuration
docker-compose logs loki

# Check availability
curl http://localhost:3100/ready
```

### Prometheus issues:
```bash
# Check configuration
docker-compose logs prometheus

# Check targets
# Open http://localhost:9090/targets
```

### Application metrics issues:
```bash
# Check metrics endpoint
curl http://localhost:4173/api/metrics
```

## 📚 Additional resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [Grafana Documentation](https://grafana.com/docs/grafana/)
- [Docker Monitoring Best Practices](https://docs.docker.com/config/containers/logging/)
