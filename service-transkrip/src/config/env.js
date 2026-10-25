// Config Service Transkrip: validasi env wajib sekali di awal.
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  GATEWAY_SECRET: z.string().min(32),
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().min(1),
  PORT: z.coerce.number().default(3002),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('[service-transkrip] konfigurasi env tidak valid:');
  for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

export const env = {
  databaseUrl: parsed.data.DATABASE_URL,
  gatewaySecret: parsed.data.GATEWAY_SECRET,
  jwtSecret: parsed.data.JWT_SECRET,
  jwtIssuer: parsed.data.JWT_ISSUER,
  port: parsed.data.PORT,
};
