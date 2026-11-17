import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, UnsecuredJWT, type JWTVerifyGetKey } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { verifyIdToken } from "@/lib/server/auth";

const PROJECT = "demo-p";
const ISS = `https://securetoken.google.com/${PROJECT}`;

let jwks: JWTVerifyGetKey;
let privateKey: CryptoKey;
let otherKey: CryptoKey;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  otherKey = (await generateKeyPair("RS256")).privateKey;
  const jwk = await exportJWK(pair.publicKey);
  jwks = createLocalJWKSet({ keys: [{ ...jwk, kid: "k1", alg: "RS256" }] });
});

function sign(claims: { aud?: string; iss?: string; sub?: string; exp?: number | string } = {}, key = privateKey) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setAudience(claims.aud ?? PROJECT)
    .setIssuer(claims.iss ?? ISS)
    .setSubject(claims.sub ?? "u1")
    .setIssuedAt()
    .setExpirationTime(claims.exp ?? "1h")
    .sign(key);
}

async function expectRejected(p: Promise<unknown>) {
  await expect(p).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
}

describe("verifyIdToken", () => {
  it("accepts a valid token", async () => {
    await expect(verifyIdToken(await sign(), { projectId: PROJECT, jwks, emulator: false })).resolves.toEqual({
      uid: "u1",
    });
  });

  it("rejects a wrong audience", async () => {
    await expectRejected(verifyIdToken(await sign({ aud: "other" }), { projectId: PROJECT, jwks, emulator: false }));
  });

  it("rejects a wrong issuer", async () => {
    await expectRejected(
      verifyIdToken(await sign({ iss: "https://evil.example" }), { projectId: PROJECT, jwks, emulator: false }),
    );
  });

  it("rejects an expired token", async () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    await expectRejected(verifyIdToken(await sign({ exp: past }), { projectId: PROJECT, jwks, emulator: false }));
  });

  it("rejects an empty subject", async () => {
    await expectRejected(verifyIdToken(await sign({ sub: "" }), { projectId: PROJECT, jwks, emulator: false }));
  });

  it("rejects a signature from another key", async () => {
    await expectRejected(verifyIdToken(await sign({}, otherKey), { projectId: PROJECT, jwks, emulator: false }));
  });

  it("rejects garbage and an empty token", async () => {
    await expectRejected(verifyIdToken("not.a.jwt", { projectId: PROJECT, jwks, emulator: false }));
    await expectRejected(verifyIdToken("", { projectId: PROJECT, jwks, emulator: false }));
  });

  it("rejects everything without a project id", async () => {
    await expectRejected(verifyIdToken(await sign(), { projectId: "", jwks, emulator: false }));
  });

  describe("unsigned token rejected unless emulator", () => {
    const unsigned = (project = PROJECT) =>
      new UnsecuredJWT({})
        .setAudience(project)
        .setIssuer(`https://securetoken.google.com/${project}`)
        .setSubject("u9")
        .setIssuedAt()
        .setExpirationTime("1h")
        .encode();

    it("rejected when not in emulator mode", async () => {
      await expectRejected(verifyIdToken(unsigned(), { projectId: PROJECT, jwks, emulator: false }));
    });

    it("accepted in emulator mode for a demo- project", async () => {
      await expect(verifyIdToken(unsigned(), { projectId: PROJECT, jwks, emulator: true })).resolves.toEqual({
        uid: "u9",
      });
    });

    it("rejected in emulator mode for a real project", async () => {
      await expectRejected(verifyIdToken(unsigned("real-p"), { projectId: "real-p", jwks, emulator: true }));
    });

    it("emulator mode still checks the audience", async () => {
      await expectRejected(verifyIdToken(unsigned("demo-other"), { projectId: PROJECT, jwks, emulator: true }));
    });

    it("defaults to rejecting when FIREBASE_AUTH_EMULATOR_HOST is unset", async () => {
      delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
      await expectRejected(verifyIdToken(unsigned(), { projectId: PROJECT, jwks }));
    });
  });
});
