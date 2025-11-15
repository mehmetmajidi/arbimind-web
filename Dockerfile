# Install deps
FROM node:22 AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Build
FROM node:22 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Run
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public ./public
EXPOSE 3000
ENV PORT=3000
CMD ["npx", "next", "start", "-H", "0.0.0.0"]
