// Kebutuhan 4.1: skema zod untuk body endpoint /auth/*.
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(16),
});

export const logoutSchema = refreshSchema;

export const serviceSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
});
