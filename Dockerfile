FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./
COPY packages/spark-tools/package*.json ./packages/spark-tools/
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend ./backend
COPY --from=build /app/dist ./dist

EXPOSE 8787
CMD ["node", "backend/server.js"]
