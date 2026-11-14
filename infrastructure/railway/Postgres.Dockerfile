FROM postgres:18-alpine
COPY infrastructure/railway/init-db.sh /docker-entrypoint-initdb.d/10-keycloak.sh
