-- Init script for PDM database
-- This script runs when the container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';

-- Create database user if needed (optional)

-- CREATE USER pdm_user WITH PASSWORD 'pdm_password';
-- GRANT ALL PRIVILEGES ON DATABASE pdm_db TO pdm_user;
