# syntax=docker/dockerfile:1

FROM node:22-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY tsconfig.json eslint.config.js ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000
CMD ["npm", "run", "start"]

