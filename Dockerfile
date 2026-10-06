FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:local

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8788
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/dist-static ./dist-static
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/app/data ./app/data
COPY --from=build --chown=node:node /app/app/lib/flight.ts /app/app/lib/lab.ts /app/app/lib/simulation.ts /app/app/lib/learning.ts ./app/lib/
USER node
EXPOSE 8788
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:8788/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--experimental-strip-types", "server/index.ts"]
