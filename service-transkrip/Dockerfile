# Dockerfile Service Transkrip. Sama polanya dengan service-nilai.
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY service-transkrip/package.json service-transkrip/package-lock.json ./
COPY database/prisma/schema.prisma ./prisma/schema.prisma
RUN npm install && npx prisma generate

COPY service-transkrip/src ./src
COPY service-transkrip/healthcheck.js ./healthcheck.js

EXPOSE 3002
CMD ["node", "src/server.js"]
