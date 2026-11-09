import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { canonicalizeInvitePassword } from "../lib/password-format";
import { hashCanonicalPassword, verifyInvitePassword } from "../lib/password";

/**
 * Kedua format yang diminta PRD §4.6 mewakili 10 November 2004. Nilai ini ada
 * di berkas tes (bukan di source aplikasi, bundle browser, atau HTML) supaya
 * aturannya benar-benar terverifikasi.
 */
const DOT_FORM = "10.11.2004";
const DASH_FORM = "10-11-2004";
const CANONICAL = "2004-11-10";
const CORRECT_HASH = createHash("sha256").update(CANONICAL, "utf8").digest("hex");

describe("canonicalizeInvitePassword", () => {
  it("menerima format titik dan menormalkan ke YYYY-MM-DD", () => {
    assert.equal(canonicalizeInvitePassword(DOT_FORM), CANONICAL);
  });

  it("menerima format tanda hubung dan menormalkan ke nilai yang sama", () => {
    assert.equal(canonicalizeInvitePassword(DASH_FORM), CANONICAL);
  });

  it("mengabaikan spasi di awal dan akhir", () => {
    assert.equal(canonicalizeInvitePassword(`  ${DOT_FORM}  `), CANONICAL);
    assert.equal(canonicalizeInvitePassword(`\t${DASH_FORM}\n`), CANONICAL);
  });

  it("menolak separator campuran", () => {
    assert.equal(canonicalizeInvitePassword("10.11-2004"), null);
    assert.equal(canonicalizeInvitePassword("10-11.2004"), null);
  });

  it("menolak format lain", () => {
    for (const value of [
      "2004-11-10",
      "10/11/2004",
      "1.1.2004",
      "1.11.2004",
      "10.11.04",
      "10 11 2004",
      "10.11.2004extra",
      "101120 04",
      "",
      "   ",
    ]) {
      assert.equal(canonicalizeInvitePassword(value), null, `seharusnya ditolak: ${value}`);
    }
  });

  it("menolak spasi di tengah", () => {
    assert.equal(canonicalizeInvitePassword("10. 11.2004"), null);
  });

  it("menolak tanggal yang tidak ada di kalender", () => {
    assert.equal(canonicalizeInvitePassword("31.02.2004"), null);
    assert.equal(canonicalizeInvitePassword("00.11.2004"), null);
    assert.equal(canonicalizeInvitePassword("10.13.2004"), null);
    assert.equal(canonicalizeInvitePassword("29.02.2003"), null);
  });

  it("menerima tanggal kabisat yang valid", () => {
    assert.equal(canonicalizeInvitePassword("29.02.2004"), "2004-02-29");
  });

  it("menolak input non-string dan input sangat panjang", () => {
    assert.equal(canonicalizeInvitePassword(undefined), null);
    assert.equal(canonicalizeInvitePassword(20041110), null);
    assert.equal(canonicalizeInvitePassword({}), null);
    assert.equal(canonicalizeInvitePassword("1".repeat(500)), null);
  });
});

describe("verifyInvitePassword", () => {
  it("menerima kedua format yang benar", () => {
    assert.deepEqual(verifyInvitePassword(DOT_FORM, CORRECT_HASH), { ok: true });
    assert.deepEqual(verifyInvitePassword(DASH_FORM, CORRECT_HASH), { ok: true });
  });

  it("menolak password yang salah nilainya", () => {
    const result = verifyInvitePassword("11.10.2004", CORRECT_HASH);
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.reason, "mismatch");
  });

  it("menolak format campuran sebagai invalid_format, bukan mismatch", () => {
    const result = verifyInvitePassword("10.11-2004", CORRECT_HASH);
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.reason, "invalid_format");
  });

  it("menolak password kosong", () => {
    for (const value of ["", "   ", undefined]) {
      const result = verifyInvitePassword(value, CORRECT_HASH);
      assert.equal(result.ok, false);
    }
  });

  it("melaporkan not_configured bila hash belum disetel atau tidak valid", () => {
    for (const hash of [undefined, "", "bukan-hash", "abc", "Z".repeat(64)]) {
      const result = verifyInvitePassword(DOT_FORM, hash);
      assert.equal(result.ok, false, `hash ${String(hash)} seharusnya tidak lolos`);
      assert.equal(result.ok === false && result.reason, "not_configured");
    }
  });

  it("menerima hash dengan huruf besar / spasi berlebih", () => {
    assert.deepEqual(verifyInvitePassword(DOT_FORM, `  ${CORRECT_HASH.toUpperCase()}  `), {
      ok: true,
    });
  });
});

describe("hashCanonicalPassword", () => {
  it("cocok dengan SHA-256 bentuk kanonis", () => {
    assert.equal(hashCanonicalPassword(CANONICAL), CORRECT_HASH);
  });

  it("kedua format menghasilkan hash identik setelah normalisasi", () => {
    const a = hashCanonicalPassword(canonicalizeInvitePassword(DOT_FORM)!);
    const b = hashCanonicalPassword(canonicalizeInvitePassword(DASH_FORM)!);
    assert.equal(a, b);
  });
});
