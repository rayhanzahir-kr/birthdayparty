import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
  TOKEN_BYTES,
  buildInviteUrl,
  generateToken,
  hashToken,
  isTokenShapeValid,
  safeCompareHex,
} from "../lib/tokens";

describe("generateToken", () => {
  it("memakai 32 byte entropi (>= 128 bit yang diminta PRD)", () => {
    assert.equal(TOKEN_BYTES, 32);
    assert.equal(Buffer.from(generateToken(), "base64url").length, 32);
  });

  it("menghasilkan base64url 43 karakter tanpa padding", () => {
    for (let i = 0; i < 50; i += 1) {
      const token = generateToken();
      assert.equal(token.length, 43);
      assert.match(token, /^[A-Za-z0-9_-]{43}$/);
      assert.ok(!token.includes("="), "tidak boleh ada padding");
      assert.ok(!token.includes("+") && !token.includes("/"), "harus base64url");
    }
  });

  it("tidak mengulang nilai", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i += 1) seen.add(generateToken());
    assert.equal(seen.size, 2000);
  });
});

describe("isTokenShapeValid", () => {
  it("menerima token yang dihasilkan sendiri", () => {
    assert.ok(isTokenShapeValid(generateToken()));
  });

  it("menolak bentuk yang salah sebelum menyentuh database", () => {
    for (const value of [
      "",
      "pendek",
      "demo",
      "a".repeat(42),
      "a".repeat(44),
      `${"a".repeat(42)}=`,
      `${"a".repeat(42)}/`,
      `${"a".repeat(42)}+`,
      "a".repeat(42) + " ",
      null,
      undefined,
      12345,
      {},
    ]) {
      assert.equal(isTokenShapeValid(value), false, `seharusnya ditolak: ${String(value)}`);
    }
  });

  it('menolak token khusus "demo" sehingga tidak bisa jadi bypass', () => {
    assert.equal(isTokenShapeValid("demo"), false);
  });
});

describe("hashToken", () => {
  it("menghasilkan SHA-256 hex 64 karakter", () => {
    const hash = hashToken(generateToken());
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  it("deterministik dan cocok dengan SHA-256 standar", () => {
    const token = generateToken();
    assert.equal(hashToken(token), hashToken(token));
    assert.equal(hashToken(token), createHash("sha256").update(token, "utf8").digest("hex"));
  });

  it("token berbeda menghasilkan hash berbeda", () => {
    assert.notEqual(hashToken(generateToken()), hashToken(generateToken()));
  });

  it("tidak dapat dibalik menjadi token (hash tidak memuat token)", () => {
    const token = generateToken();
    assert.ok(!hashToken(token).includes(token));
  });
});

describe("safeCompareHex", () => {
  it("true hanya untuk nilai identik", () => {
    const hash = hashToken(generateToken());
    assert.ok(safeCompareHex(hash, hash));
    assert.ok(!safeCompareHex(hash, hashToken(generateToken())));
  });

  it("false untuk panjang berbeda, kosong, atau non-hex", () => {
    assert.ok(!safeCompareHex("", ""));
    assert.ok(!safeCompareHex("abcd", "abcdef"));
    assert.ok(!safeCompareHex("zzzz", "zzzz"));
  });
});

describe("buildInviteUrl", () => {
  it("membangun URL /invite/<token>", () => {
    assert.equal(
      buildInviteUrl("https://example.vercel.app", "TOKEN"),
      "https://example.vercel.app/invite/TOKEN",
    );
  });

  it("menormalkan trailing slash", () => {
    assert.equal(
      buildInviteUrl("https://example.vercel.app///", "TOKEN"),
      "https://example.vercel.app/invite/TOKEN",
    );
  });
});
