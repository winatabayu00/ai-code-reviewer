// src/filters.ts

/**
 * Daftar file pattern yang akan diabaikan (noise)
 * Bisa ditambah sesuai kebutuhan
 */
const IGNORE_PATTERNS = [
  /\.lock$/,
  /\.min\.(js|css)$/,
  /dist\//,
  /build\//,
  /node_modules\//,
  /\.snap$/,
  /yarn\.lock/,
  /pnpm-lock\.yaml/,
  /\.log$/,
];

/**
 * Filter perubahan yang tidak relevan (hanya whitespace, komentar, dll)
 * Ini masih sederhana, nanti bisa pakai diff parser yang lebih canggih
 */
export function isMeaningfulDiff(diffLine: string): boolean {
  // Abaikan baris yang hanya berisi whitespace
  if (/^\s*$/.test(diffLine)) return false;
  // Abaikan perubahan yang hanya mengubah komentar (satu baris)
  if (/^[+-]\s*\/\/.*$/.test(diffLine)) return false;
  if (/^[+-]\s*\/\*.*\*\/\s*$/.test(diffLine)) return false;
  return true;
}

/**
 * Filter seluruh diff berdasarkan file pattern
 * Mengembalikan diff yang sudah difilter (hanya file yang tidak diabaikan)
 * Sekarang juga tidak menyertakan header diff untuk file yang diabaikan
 */
export function filterDiffByFile(diff: string): string {
  const lines = diff.split("\n");
  const filteredLines: string[] = [];
  let keepCurrentFile = true;

  for (const line of lines) {
    // Deteksi nama file yang diubah: diff --git a/path b/path
    const fileMatch = line.match(/^diff --git a\/(.*) b\/(.*)$/);
    if (fileMatch) {
      const currentFile = fileMatch[1];
      keepCurrentFile = !IGNORE_PATTERNS.some(pattern => pattern.test(currentFile));
      if (keepCurrentFile) {
        filteredLines.push(line); // hanya push header jika file tidak diabaikan
      }
      continue;
    }
    // Jika file saat ini tidak diabaikan, ikutkan semua baris lainnya
    if (keepCurrentFile) {
      filteredLines.push(line);
    }
  }
  return filteredLines.join("\n");
}

/**
 * Filter baris-baris diff yang tidak bermakna (whitespace, komentar, dll)
 * Per baris perubahan (+ atau -)
 */
export function filterNoiseLines(diff: string): string {
  const lines = diff.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    // Jika baris adalah tambahan (+) atau pengurangan (-) dan tidak berarti, skip
    if (line.startsWith("+") || line.startsWith("-")) {
      if (!isMeaningfulDiff(line)) {
        continue;
      }
    }
    result.push(line);
  }
  return result.join("\n");
}

/**
 * Kombinasi filter: file + konten garis
 * Juga limit ukuran diff agar tidak kepotong
 */
export function filterFullDiff(diff: string): string {
  let filtered = filterDiffByFile(diff);
  filtered = filterNoiseLines(filtered);

  // Limit: jika diff terlalu besar, truncate
  const MAX_DIFF_SIZE = 8000;
  if (filtered.length > MAX_DIFF_SIZE) {
    console.log(`⚠️ Diff size ${filtered.length} chars exceeds limit ${MAX_DIFF_SIZE}, truncating...`);
    filtered = filtered.substring(0, MAX_DIFF_SIZE) + "\n... (truncated)";
  }

  return filtered;
}
