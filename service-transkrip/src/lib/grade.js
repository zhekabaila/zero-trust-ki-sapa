// Bagian 6 API.md: konversi nilai angka → huruf + bobot, dan perhitungan IPK.
// Transkrip menghitung sendiri (bukan kiriman Service Nilai) = satu sumber kebenaran.

export function toGrade(score) {
  if (score >= 85) return { nilaiHuruf: 'A', bobot: 4.0 };
  if (score >= 70) return { nilaiHuruf: 'B', bobot: 3.0 };
  if (score >= 55) return { nilaiHuruf: 'C', bobot: 2.0 };
  if (score >= 40) return { nilaiHuruf: 'D', bobot: 1.0 };
  return { nilaiHuruf: 'E', bobot: 0.0 };
}

// IPK = Σ(bobot × SKS) / Σ SKS, dua desimal. Transkrip kosong → 0.
export function computeIpk(entries) {
  const totalSks = entries.reduce((sum, e) => sum + e.sks, 0);
  if (totalSks === 0) return 0;
  const totalBobot = entries.reduce((sum, e) => sum + e.bobot * e.sks, 0);
  return Math.round((totalBobot / totalSks) * 100) / 100;
}
