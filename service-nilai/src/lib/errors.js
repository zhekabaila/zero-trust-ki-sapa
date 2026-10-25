// Error dengan status HTTP + kode alasan (sama polanya dengan gateway; sengaja diduplikasi, D5).
export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
