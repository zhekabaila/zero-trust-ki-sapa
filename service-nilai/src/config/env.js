// Config Service Nilai: validasi env wajib sekali di awal (CONVENTIONS §5).
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  GATEWAY_SECRET: z.string().min(32),
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().min(1),
  GATEWAY_URL: z.string().url(),
  SERVICE_NILAI_CLIENT_ID: z.string().min(1),
  SERVICE_NILAI_CLIENT_SECRET: z.string().min(1),
  PORT: z.coerce.number().default(3001),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('[service-nilai] konfigurasi env tidak valid:');
  for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

export const env = {
  databaseUrl: parsed.data.DATABASE_URL,
  gatewaySecret: parsed.data.GATEWAY_SECRET,
  jwtSecret: parsed.data.JWT_SECRET,
  jwtIssuer: parsed.data.JWT_ISSUER,
  gatewayUrl: parsed.data.GATEWAY_URL,
  serviceClientId: parsed.data.SERVICE_NILAI_CLIENT_ID,
  serviceClientSecret: parsed.data.SERVICE_NILAI_CLIENT_SECRET,
  port: parsed.data.PORT,
};
