/**
 * Assets base64 untuk template dokumen SPR dan Kwitansi (.docx)
 * Berisi representasi base64 dari logo perusahaan, logo proyek, paraf, dan checkbox.
 */

// 1x1 Transparent / Placeholder PNG
const BASE_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// 1x1 White JPG (valid JPEG header & JFIF standard)
const BASE_JPG_B64 =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

export const LOGO_PERUSAHAAN_B64 = BASE_PNG_B64;
export const LOGO_PROYEK_B64 = BASE_JPG_B64;
export const CHECKBOX_CENTANG_B64 = BASE_PNG_B64;
export const CHECKBOX_KOSONG_B64 = BASE_PNG_B64;
export const KOTAK_PARAF_B64 = BASE_PNG_B64;
