FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

ENV better_sqlite3_from_source=true
ENV npm_config_build_from_source=true

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

COPY . .

RUN cd /app/node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3 && \
    npm run install 2>&1 && \
    mkdir -p lib/binding/node-v115-linux-arm64 && \
    cp build/Release/better_sqlite3.node lib/binding/node-v115-linux-arm64/ && \
    cd /app && \
    pnpm rebuild bcrypt

RUN pnpm build && pnpm build:api

RUN mkdir -p /app/data

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "dist/api/server.js"]
