import crypto from 'crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Login Google (OpenID Connect, authorization code + PKCE) untuk dashboard.
// Butuh GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET dari Google Cloud Console.
export const googleEnabled = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const b64 = (buf) => buf.toString('base64url');

// APP_URL dipakai bila diisi (mis. domain utama), selain itu origin request ini.
export const appOrigin = (req) => (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, '');
export const callbackUrl = (req) => `${appOrigin(req)}/api/auth/google/callback`;

export function authorizationRequest(req) {
  const state = b64(crypto.randomBytes(16));
  const nonce = b64(crypto.randomBytes(16));
  const verifier = b64(crypto.randomBytes(32));
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl(req),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: b64(crypto.createHash('sha256').update(verifier).digest()),
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();
  return { url, saved: { state, nonce, verifier } };
}

// Tukar code dengan ID token lalu verifikasi tanda tangan, issuer, audience, dan nonce.
export async function verifyCallback(req, code, saved) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: callbackUrl(req),
      grant_type: 'authorization_code',
      code_verifier: saved.verifier,
    }),
  });
  if (!res.ok) throw new Error(`Google token endpoint ${res.status}: ${await res.text()}`);
  const { id_token: idToken } = await res.json();
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  if (payload.nonce !== saved.nonce) throw new Error('nonce tidak cocok');
  return payload;
}
