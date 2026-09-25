-- Create user if not exists
DO $$ BEGIN
  CREATE USER stock_analyst_user WITH PASSWORD 'postgres_pass_123';
EXCEPTION WHEN DUPLICATE_OBJECT THEN
  ALTER USER stock_analyst_user WITH PASSWORD 'postgres_pass_123';
END $$;

-- Create database if not exists
SELECT 'CREATE DATABASE stock_analyst OWNER stock_analyst_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'stock_analyst')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE stock_analyst TO stock_analyst_user;
