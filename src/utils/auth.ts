const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key-for-bvl-dashboard-2026";

async function getHmacKey() {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Hashing password menggunakan PBKDF2 + SHA-256 (Web Crypto API)
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  
  const pbkdf2Params = {
    name: "PBKDF2",
    salt: salt,
    iterations: 100000,
    hash: "SHA-256"
  };
  
  const derivedKey = await crypto.subtle.deriveBits(
    pbkdf2Params,
    keyMaterial,
    256
  );
  
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(derivedKey)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}.${hashHex}`;
}

/**
 * Verifikasi kesesuaian password dengan hash di database
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash || !hash.includes('.')) return false;
  const [saltHex, originalHashHex] = hash.split('.');
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  
  const pbkdf2Params = {
    name: "PBKDF2",
    salt: salt,
    iterations: 100000,
    hash: "SHA-256"
  };
  
  const derivedKey = await crypto.subtle.deriveBits(
    pbkdf2Params,
    keyMaterial,
    256
  );
  
  const hashHex = Array.from(new Uint8Array(derivedKey)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === originalHashHex;
}

/**
 * Membuat token session yang aman dan kedaluwarsa dalam 7 hari
 */
export async function generateSessionToken(email: string, role: string): Promise<string> {
  const encoder = new TextEncoder();
  // Expire dalam 7 hari
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = JSON.stringify({ email: email.toLowerCase(), role, exp });
  const payloadBase64 = btoa(payload);
  
  const hmacKey = await getHmacKey();
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    hmacKey,
    encoder.encode(payloadBase64)
  );
  
  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
    
  return `${payloadBase64}.${signatureHex}`;
}

/**
 * Memverifikasi validitas token session
 */
export async function verifySessionToken(token: string): Promise<{ email: string, role: string } | null> {
  if (!token || !token.includes('.')) return null;
  const [payloadBase64, signatureHex] = token.split('.');
  
  try {
    const encoder = new TextEncoder();
    const hmacKey = await getHmacKey();
    
    // Verifikasi tanda tangan hmac
    const expectedBuffer = await crypto.subtle.sign(
      "HMAC",
      hmacKey,
      encoder.encode(payloadBase64)
    );
    
    const expectedHex = Array.from(new Uint8Array(expectedBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
      
    if (signatureHex !== expectedHex) {
      return null;
    }
    
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);
    
    if (Date.now() > payload.exp) {
      return null; // Token kedaluwarsa
    }
    
    return { email: payload.email, role: payload.role };
  } catch (e) {
    console.error("Token verification error:", e);
    return null;
  }
}
