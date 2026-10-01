// Protects credential passwords with the numeric security key.
//
// Saving must not need the key, but viewing must. So passwords are encrypted with a public key
// (RSA-OAEP wrapping a random AES-GCM key per password), and the matching private key is stored
// encrypted under a key derived from the numeric security key (PBKDF2). Only decrypting needs it.
// The security key itself is never stored: just a random salt and a verifier.
const ITERATIONS = 200000
const enc = new TextEncoder()
const dec = new TextDecoder()
const RSA = { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }

const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

export const isValidPin = (pin) => /^\d{4,8}$/.test(pin)
// Older records had no key pair; they must be upgraded in Settings before protecting more passwords.
export const canProtect = (security) => !!security?.pub

// PBKDF2 gives 512 bits: first half is an AES key (wraps the private key), second half the verifier.
async function derive(pin, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    base,
    512
  )
  const aes = await crypto.subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['encrypt', 'decrypt'])
  return { aes, verifier: toB64(bits.slice(32)) }
}

async function aesEncrypt(key, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes)
  return { iv: toB64(iv), ct: toB64(ct) }
}
const aesDecrypt = (key, box) =>
  crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(box.iv) }, key, fromB64(box.ct))

async function wrapPrivate(pin, pkcs8, pub) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const { aes, verifier } = await derive(pin, salt)
  return { salt: toB64(salt), verifier, pub, wrapped: await aesEncrypt(aes, pkcs8) }
}

// Brand-new security record with a fresh key pair.
export async function createSecurity(pin) {
  const pair = await crypto.subtle.generateKey(RSA, true, ['encrypt', 'decrypt'])
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', pair.privateKey)
  const pub = toB64(await crypto.subtle.exportKey('spki', pair.publicKey))
  return wrapPrivate(pin, pkcs8, pub)
}

// Same key pair, locked under a new security key. Needs the context from unlock().
export async function changePin(ctx, security, newPin) {
  return wrapPrivate(newPin, ctx.pkcs8, security.pub)
}

// Returns a context for decrypting if the pin is right, otherwise null.
export async function unlock(pin, security) {
  if (!security || !isValidPin(pin)) return null
  const { aes, verifier } = await derive(pin, fromB64(security.salt))
  if (verifier !== security.verifier) return null
  if (!security.wrapped) return { legacyKey: aes } // pre key-pair records
  const pkcs8 = new Uint8Array(await aesDecrypt(aes, security.wrapped))
  const privateKey = await crypto.subtle.importKey('pkcs8', pkcs8, RSA, false, ['decrypt'])
  return { privateKey, pkcs8 }
}

// No security key needed.
export async function encryptPassword(security, text) {
  const pub = await crypto.subtle.importKey('spki', fromB64(security.pub), RSA, false, ['encrypt'])
  const aes = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const box = await aesEncrypt(aes, enc.encode(text))
  const raw = await crypto.subtle.exportKey('raw', aes)
  return { ...box, ek: toB64(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, pub, raw)) }
}

export async function decryptPassword(ctx, box) {
  if (!box.ek) return dec.decode(await aesDecrypt(ctx.legacyKey, box)) // pre key-pair entries
  const raw = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, ctx.privateKey, fromB64(box.ek))
  const aes = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt'])
  return dec.decode(await aesDecrypt(aes, box))
}
