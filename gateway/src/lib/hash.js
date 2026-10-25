// Kebutuhan 4.1: refresh token disimpan sebagai hash SHA-256, bukan teks asli (keputusan D7).
import { createHash } from 'node:crypto';

export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
