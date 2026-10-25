// Kebutuhan 4.2: daftar kode alasan dipusatkan di sini agar tidak ada string liar (POLICY.md §4).
export const R = {
  ALLOWED: 'ALLOWED',
  TOKEN_MISSING: 'TOKEN_MISSING',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_TYPE_INVALID: 'TOKEN_TYPE_INVALID',
  LOGIN_INVALID_CREDENTIALS: 'LOGIN_INVALID_CREDENTIALS',
  SERVICE_CLIENT_INVALID: 'SERVICE_CLIENT_INVALID',
  REFRESH_INVALID: 'REFRESH_INVALID',
  REFRESH_REVOKED: 'REFRESH_REVOKED',
  REFRESH_EXPIRED: 'REFRESH_EXPIRED',
  USER_INACTIVE: 'USER_INACTIVE',
  DEVICE_HEADER_MISSING: 'DEVICE_HEADER_MISSING',
  DEVICE_NOT_REGISTERED: 'DEVICE_NOT_REGISTERED',
  ROLE_NOT_ALLOWED: 'ROLE_NOT_ALLOWED',
  SERVICE_ONLY: 'SERVICE_ONLY',
  NOT_OWNER: 'NOT_OWNER',
  CLASS_NOT_OWNED: 'CLASS_NOT_OWNED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  NILAI_ALREADY_FINAL: 'NILAI_ALREADY_FINAL',
  OUTSIDE_ACCESS_HOURS: 'OUTSIDE_ACCESS_HOURS',
  ROUTE_NOT_ALLOWED: 'ROUTE_NOT_ALLOWED',
  AUDIT_WRITE_FAILED: 'AUDIT_WRITE_FAILED',
};

// Pesan manusiawi untuk 403; hanya ditampilkan jika EXPOSE_DENY_REASON=true (API.md §1).
export const REASON_MESSAGE = {
  [R.ROLE_NOT_ALLOWED]: 'Role Anda tidak diizinkan untuk endpoint ini',
  [R.SERVICE_ONLY]: 'Endpoint ini hanya untuk token service',
  [R.TOKEN_TYPE_INVALID]: 'Tipe token tidak sesuai endpoint ini',
  [R.NOT_OWNER]: 'Anda bukan pemilik data ini',
  [R.CLASS_NOT_OWNED]: 'Anda bukan dosen pengampu kelas ini',
  [R.RESOURCE_NOT_FOUND]: 'Data tidak ditemukan',
  [R.NILAI_ALREADY_FINAL]: 'Nilai sudah berstatus final',
  [R.OUTSIDE_ACCESS_HOURS]: 'Di luar jam akses yang diizinkan',
  [R.DEVICE_HEADER_MISSING]: 'Header X-Device-ID tidak dikirim',
  [R.DEVICE_NOT_REGISTERED]: 'Device tidak terdaftar untuk akun ini',
  [R.USER_INACTIVE]: 'Akun tidak aktif',
  [R.ROUTE_NOT_ALLOWED]: 'Route tidak terdaftar (default deny)',
};

export const deny = (reason) => ({ decision: 'DENY', reason });
export const allow = () => ({ decision: 'ALLOW', reason: R.ALLOWED });
