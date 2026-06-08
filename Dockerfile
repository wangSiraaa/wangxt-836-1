FROM node:20-slim

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

COPY . .

RUN pnpm rebuild bcrypt better-sqlite3

RUN pnpm run build

EXPOSE 3001

CMD ["node", "dist/api/server.js"]
