FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install --ignore-scripts --no-audit --no-fund
COPY src ./src
RUN npm run build && npm prune --omit=dev --ignore-scripts --no-audit --no-fund

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY src ./src
COPY public ./public
COPY tools/migrate.mjs ./tools/migrate.mjs
COPY migrations ./migrations
USER node
CMD ["node", "src/server.mjs"]
