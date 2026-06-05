/**
 * Generación de códigos de invitación de quiniela.
 *
 * Alfabeto sin caracteres ambiguos (sin O/0, I/1, L) para que sea fácil de
 * dictar y teclear. 6 caracteres ≈ 887M combinaciones → colisiones casi nulas;
 * aun así, la Server Action reintenta si la BD detecta duplicado.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const DEFAULT_LENGTH = 6;

export function generateJoinCode(length = DEFAULT_LENGTH): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

/** Normaliza un código introducido por el usuario (mayúsculas, sin espacios). */
export function normalizeJoinCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}
