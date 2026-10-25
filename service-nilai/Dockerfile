# Dockerfile Service Nilai. Sama polanya dengan gateway: schema disalin dari database/prisma.
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY service-nilai/package.json service-nilai/package-lock.json ./
COPY database/prisma/schema.prisma ./prisma/schema.prisma
RUN npm install && npx prisma generate

COPY service-nilai/src ./src
COPY service-nilai/healthcheck.js ./healthcheck.js

EXPOSE 3001
CMD ["node", "src/server.js"]
