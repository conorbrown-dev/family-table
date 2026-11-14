FROM node:22-bookworm-slim AS build
WORKDIR /app/web
ENV NODE_PATH=/app/web/node_modules
COPY web/package.json web/package-lock.json web/.npmrc ./
RUN npm ci --no-audit --no-fund
COPY mobile/App.tsx mobile/global.css mobile/tailwind.config.js /app/mobile/
COPY mobile/src /app/mobile/src
COPY web/ /app/web/
ARG EXPO_PUBLIC_API_URL=https://api-development-62d4.up.railway.app
ARG EXPO_PUBLIC_AUTH_URL=https://keycloak-development-eb7c.up.railway.app/realms/familytable
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL EXPO_PUBLIC_AUTH_URL=$EXPO_PUBLIC_AUTH_URL EXPO_PUBLIC_DEMO=false EXPO_PUBLIC_EMAIL_ENABLED=false EXPO_NO_TELEMETRY=1
RUN npm run build
FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=build /app/web/dist ./dist
COPY web/server.mjs ./server.mjs
USER node
EXPOSE 8080
CMD ["node","server.mjs"]
