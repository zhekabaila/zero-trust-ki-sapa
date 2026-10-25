// Error dengan status HTTP + kode alasan; ditangkap oleh error-handler.middleware.js.
export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
