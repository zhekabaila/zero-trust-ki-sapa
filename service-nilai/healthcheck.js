// Dipakai Docker HEALTHCHECK Service Nilai.
const port = process.argv[2] || '3001';
fetch(`http://localhost:${port}/health`)
  .then((r) => process.exit(r.ok ? 0 : 1))
  .catch(() => process.exit(1));
