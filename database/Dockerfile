# Container db-init: menjalankan `prisma migrate deploy` + seed satu kali lalu berhenti.
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY database/package.json database/package-lock.json ./
COPY database/prisma ./prisma
RUN npm install

# DATABASE_URL dibaca dari env (lihat .env.example).
# Ulangi maks 10x: DB kadang masih siap-siap walau healthcheck sudah hijau.
CMD ["sh", "-c", "for i in $(seq 1 10); do npx prisma migrate deploy && node prisma/seed.js && exit 0; echo '[db-init] percobaan ke-'$i' gagal, tunggu 3 detik'; sleep 3; done; exit 1"]
