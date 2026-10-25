// Skema body POST /transkrip/sinkron (API.md §5).
import { z } from 'zod';

export const sinkronSchema = z.object({
  kelasId: z.string().min(1),
  kodeMk: z.string().min(1).max(20),
  mataKuliah: z.string().min(1).max(100),
  sks: z.number().int().min(1).max(6),
  semester: z.string().min(1).max(20),
  entries: z.array(z.object({
    mahasiswaId: z.string().min(1),
    nilaiAngka: z.number().min(0).max(100),
  })).min(1),
});
