# Dockerfile gateway. node:22-slim (bukan alpine) karena Prisma butuh OpenSSL yang lengkap.
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Depedensi di-install lebih dulu agar layer build ter-cache saat kode berubah.
COPY gateway/package.json gateway/package-lock.json ./
COPY database/prisma/schema.prisma ./prisma/schema.prisma
RUN npm install && npx prisma generate

COPY gateway/src ./src
COPY gateway/healthcheck.js ./healthcheck.js

EXPOSE 3000
CMD ["node", "src/server.js"]
