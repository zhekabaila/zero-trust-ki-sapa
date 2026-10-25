// Kebutuhan 4.3: subjek USER wajib mengirim X-Device-ID yang terdaftar atas namanya.
import * as deviceRepository from '../../repositories/device.repository.js';
import { R, deny } from '../reasons.js';

export async function checkDevice({ subject, request }) {
  if (!request.deviceId) return deny(R.DEVICE_HEADER_MISSING);
  const registered = await deviceRepository.exists(subject.id, request.deviceId);
  if (!registered) return deny(R.DEVICE_NOT_REGISTERED);
  return null; // lolos
}
