// Kebutuhan 5 (soal): data awal 1 admin, 2 dosen, 3 mahasiswa, 2 kelas, 1 device/user, service client.
// Idempotent: semua tulis memakai upsert pada kolom unik, boleh dijalankan berulang.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Password semua akun dev (dicantumkan juga di README).
const DEV_PASSWORD = 'Password123!';

const USERS = [
  { email: 'admin@unsil.test', name: 'Admin Prodi', role: 'ADMIN', deviceId: 'ADMIN-LAPTOP-01' },
  { email: 'dosen1@unsil.test', name: 'Dosen Satu', role: 'DOSEN', nidn: '0001000001', deviceId: 'DOSEN1-LAPTOP-01' },
  { email: 'dosen2@unsil.test', name: 'Dosen Dua', role: 'DOSEN', nidn: '0001000002', deviceId: 'DOSEN2-LAPTOP-01' },
  { email: 'mhs1@unsil.test', name: 'Mahasiswa Satu', role: 'MAHASISWA', nim: '247006111001', deviceId: 'MHS1-HP-01' },
  { email: 'mhs2@unsil.test', name: 'Mahasiswa Dua', role: 'MAHASISWA', nim: '247006111002', deviceId: 'MHS2-HP-01' },
  { email: 'mhs3@unsil.test', name: 'Mahasiswa Tiga', role: 'MAHASISWA', nim: '247006111003', deviceId: 'MHS3-HP-01' },
];

const main = async () => {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
  const userIds = {};

  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, nim: u.nim ?? null, nidn: u.nidn ?? null },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        nim: u.nim ?? null,
        nidn: u.nidn ?? null,
        passwordHash,
      },
    });
    userIds[u.email] = user.id;

    await prisma.device.upsert({
      where: { userId_deviceId: { userId: user.id, deviceId: u.deviceId } },
      update: {},
      create: { userId: user.id, deviceId: u.deviceId, label: 'device demo' },
    });
  }

  // Service client untuk komunikasi Service Nilai → gateway (kebutuhan 4.1).
  const clientSecret = process.env.SERVICE_NILAI_CLIENT_SECRET;
  if (!clientSecret) throw new Error('Seed gagal: SERVICE_NILAI_CLIENT_SECRET wajib ada di env');
  await prisma.serviceClient.upsert({
    where: { clientId: process.env.SERVICE_NILAI_CLIENT_ID || 'service-nilai' },
    update: { secretHash: await bcrypt.hash(clientSecret, 10) },
    create: {
      clientId: process.env.SERVICE_NILAI_CLIENT_ID || 'service-nilai',
      secretHash: await bcrypt.hash(clientSecret, 10),
      name: 'Service Nilai',
    },
  });

  // Dua kelas + nilai awal berstatus DRAFT (DATABASE.md §4).
  const kelasA = await prisma.kelas.upsert({
    where: { kode: 'IF301-A' },
    update: { dosenId: userIds['dosen1@unsil.test'] },
    create: {
      kode: 'IF301-A', kodeMk: 'IF301', mataKuliah: 'Keamanan Informasi', sks: 3,
      semester: '2026/Ganjil', dosenId: userIds['dosen1@unsil.test'],
    },
  });
  const kelasB = await prisma.kelas.upsert({
    where: { kode: 'IF302-A' },
    update: { dosenId: userIds['dosen2@unsil.test'] },
    create: {
      kode: 'IF302-A', kodeMk: 'IF302', mataKuliah: 'Basis Data', sks: 3,
      semester: '2026/Ganjil', dosenId: userIds['dosen2@unsil.test'],
    },
  });

  const NILAI = [
    { kelasId: kelasA.id, email: 'mhs1@unsil.test', score: 88 },
    { kelasId: kelasA.id, email: 'mhs2@unsil.test', score: 76 },
    { kelasId: kelasA.id, email: 'mhs3@unsil.test', score: 64 },
    { kelasId: kelasB.id, email: 'mhs1@unsil.test', score: 90 },
    { kelasId: kelasB.id, email: 'mhs2@unsil.test', score: 72 },
    // mhs3 sengaja tidak terdaftar di kelas B (skenario uji transkrip kosong).
  ];
  for (const n of NILAI) {
    await prisma.nilai.upsert({
      where: { kelasId_mahasiswaId: { kelasId: n.kelasId, mahasiswaId: userIds[n.email] } },
      update: {},
      create: { kelasId: n.kelasId, mahasiswaId: userIds[n.email], score: n.score },
    });
  }

  console.log('[seed] selesai: 6 user, 6 device, 1 service client, 2 kelas, 5 nilai');
};

main()
  .catch((e) => { console.error('[seed] gagal:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
