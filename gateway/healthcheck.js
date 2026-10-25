// Dipakai Docker HEALTHCHECK. Sengaja berkas terpisah (bukan curl) karena image slim tidak punya curl.
const port = process.argv[2] || '3000';
fetch(`http://localhost:${port}/health`)
  .then((r) => process.exit(r.ok ? 0 : 1))
  .catch(() => process.exit(1));
