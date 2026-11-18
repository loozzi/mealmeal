import { createRemoteJWKSet, decodeJwt, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";
import { AnalyzeError } from "./analyze";

// Google's public keys for Firebase ID tokens (securetoken), as a JWK set.
const GOOGLE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

let googleJwks: JWTVerifyGetKey | undefined;
const defaultJwks = () => (googleJwks ??= createRemoteJWKSet(new URL(GOOGLE_JWKS_URL)));

type Options = { projectId?: string; jwks?: JWTVerifyGetKey; emulator?: boolean };

const unauthenticated = () => new AnalyzeError("UNAUTHENTICATED");

export type IdTokenClaims = { uid: string; email?: string; emailVerified: boolean };

function checkClaims(payload: JWTPayload, projectId: string): IdTokenClaims {
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) throw unauthenticated();
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw unauthenticated();
  if (typeof payload.exp !== "number" || payload.exp <= now) throw unauthenticated();
  if (typeof payload.sub !== "string" || payload.sub === "") throw unauthenticated();
  const claims: IdTokenClaims = { uid: payload.sub, emailVerified: payload.email_verified === true };
  if (typeof payload.email === "string") claims.email = payload.email;
  return claims;
}

/**
 * Verifies a Firebase ID token and returns its user id and email claims. Throws `AnalyzeError("UNAUTHENTICATED")`
 * for any invalid token.
 *
 * Emulator mode accepts the Auth emulator's unsigned tokens. It is on only when
 * `FIREBASE_AUTH_EMULATOR_HOST` is set (never on Vercel) and the project id is a `demo-` project.
 */
export async function verifyIdToken(token: string, opts: Options = {}): Promise<IdTokenClaims> {
  const projectId = opts.projectId ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
  const emulator = opts.emulator ?? Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  if (!projectId || !token) throw unauthenticated();

  if (emulator && projectId.startsWith("demo-")) {
    let payload: JWTPayload;
    try {
      payload = decodeJwt(token);
    } catch {
      throw unauthenticated();
    }
    return checkClaims(payload, projectId);
  }

  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, opts.jwks ?? defaultJwks(), {
      algorithms: ["RS256"],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    }));
  } catch {
    throw unauthenticated();
  }
  return checkClaims(payload, projectId);
}
