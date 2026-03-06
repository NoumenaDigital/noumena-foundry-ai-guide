#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER engine WITH PASSWORD 'secret';
    CREATE USER history WITH PASSWORD 'secret';
    CREATE USER "read-model" WITH PASSWORD 'secret';

    GRANT ALL PRIVILEGES ON DATABASE engine TO engine;
    GRANT ALL PRIVILEGES ON DATABASE engine TO history;
    GRANT ALL PRIVILEGES ON DATABASE engine TO "read-model";
EOSQL
