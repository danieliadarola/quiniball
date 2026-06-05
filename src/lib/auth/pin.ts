/**
 * Hash y verificación del PIN de 4 dígitos (bcrypt).
 *
 * El PIN nunca se guarda en claro: en `profiles.pin_hash` vive su bcrypt.
 * Nota de seguridad: un PIN de 4 dígitos tiene 10.000 combinaciones; es
 * adecuado para un juego sin dinero, pero conviene añadir rate-limiting al
 * login en una iteración posterior.
 */
import bcrypt from "bcryptjs";

const PIN_REGEX = /^\d{4}$/;
const SALT_ROUNDS = 10;

export function isValidPin(pin: string): boolean {
  return PIN_REGEX.test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  if (!isValidPin(pin)) {
    throw new Error("El PIN debe ser exactamente 4 dígitos.");
  }
  return bcrypt.hash(pin, SALT_ROUNDS);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(pin, hash);
  } catch {
    return false;
  }
}
