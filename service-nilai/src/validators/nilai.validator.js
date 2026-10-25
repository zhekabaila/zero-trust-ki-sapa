// Validasi body PUT /nilai/:id (API.md §4): angka 0-100.
import { z } from 'zod';

export const updateNilaiSchema = z.object({
  score: z.number().min(0).max(100),
});
