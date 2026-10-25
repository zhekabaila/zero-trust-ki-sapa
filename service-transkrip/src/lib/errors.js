// Error status + kode alasan (pola sama di ketiga aplikasi, keputusan D5).
export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
