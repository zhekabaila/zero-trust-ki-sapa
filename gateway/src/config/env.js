// Kebutuhan 4.1-4.4: satu tempat membaca & memvalidasi env gateway.
// Berkas lain hanya boleh memakai objek `env` ini, tidak membaca process.env langsung (CONVENTIONS §5).
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET minimal 32 karakter'),
  JWT_ISSUER: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().default('10m'),
  JWT_SERVICE_EXPIRES_IN: z.string().default('5m'),
  REFRESH_TOKEN_TTL_HOURS: z.coerce.number().int().positive(),
  GATEWAY_SECRET: z.string().min(32, 'GATEWAY_SECRET minimal 32 karakter'),
  SERVICE_NILAI_CLIENT_ID: z.string().min(1),
  ACCESS_HOURS_START: z.coerce.number().int().min(0).max(24),
  ACCESS_HOURS_END: z.coerce.number().int().min(0).max(24),
  ACCESS_TIMEZONE: z.string().min(1),
  EXPOSE_DENY_REASON: z.enum(['true', 'false']).default('true'),
  SWAGGER_ENABLED: z.enum(['true', 'false']).default('false'),
  NILAI_URL: z.string().url(),
  TRANSKRIP_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Berhenti dengan pesan jelas agar penyebabnya langsung terlihat.
  console.error('[gateway] konfigurasi env tidak valid:');
  for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

// Mengubah "10m" / "300s" / "1h" menjadi jumlah detik (dipakai di respons login).
const toSeconds = (value) => {
  const m = /^(\d+)([smh])$/.exec(value);
  if (!m) throw new Error(`Format durasi env salah: ${value}`);
  const mult = { s: 1, m: 60, h: 3600 }[m[2]];
  return Number(m[1]) * mult;
};

export const env = {
  databaseUrl: parsed.data.DATABASE_URL,
  jwtSecret: parsed.data.JWT_SECRET,
  jwtIssuer: parsed.data.JWT_ISSUER,
  accessExpiresIn: parsed.data.JWT_ACCESS_EXPIRES_IN,
  accessExpiresSeconds: toSeconds(parsed.data.JWT_ACCESS_EXPIRES_IN),
  serviceExpiresIn: parsed.data.JWT_SERVICE_EXPIRES_IN,
  serviceExpiresSeconds: toSeconds(parsed.data.JWT_SERVICE_EXPIRES_IN),
  refreshTokenTtlHours: parsed.data.REFRESH_TOKEN_TTL_HOURS,
  gatewaySecret: parsed.data.GATEWAY_SECRET,
  serviceNilaiClientId: parsed.data.SERVICE_NILAI_CLIENT_ID,
  accessHours: { start: parsed.data.ACCESS_HOURS_START, end: parsed.data.ACCESS_HOURS_END },
  accessTimezone: parsed.data.ACCESS_TIMEZONE,
  exposeDenyReason: parsed.data.EXPOSE_DENY_REASON === 'true',
  swaggerEnabled: parsed.data.SWAGGER_ENABLED === 'true',
  nilaiUrl: parsed.data.NILAI_URL,
  transkripUrl: parsed.data.TRANSKRIP_URL,
  port: parsed.data.PORT,
};
