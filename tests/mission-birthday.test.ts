import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  CANONICAL_BIRTHDAY,
  DENIED_MESSAGES,
  checkBirthdayAnswer,
  deniedMessageFor,
  shouldShowExtraHint,
} from "../lib/mission/birthday";

describe("Level 3 — mode strict (default)", () => {
  it("menerima jawaban kanonis", () => {
    const v = checkBirthdayAnswer(CANONICAL_BIRTHDAY);
    assert.equal(v.kind, "correct");
    assert.equal(v.kind === "correct" && v.normalized, "10.11.2004");
  });

  it("mengabaikan whitespace di kedua ujung", () => {
    for (const raw of ["  10.11.2004", "10.11.2004  ", "\t10.11.2004\n"]) {
      assert.equal(checkBirthdayAnswer(raw).kind, "correct", raw);
    }
  });

  it("MENOLAK alias ketika variants tidak diaktifkan", () => {
    assert.equal(checkBirthdayAnswer("10/11/2004").kind, "incorrect");
    assert.equal(checkBirthdayAnswer("10112004").kind, "incorrect");
  });

  it("menolak tanggal terbalik, tahun pendek, dan format ISO", () => {
    for (const raw of ["11.10.2004", "10.11.04", "2004-11-10", "2004.11.10"]) {
      assert.equal(checkBirthdayAnswer(raw).kind, "incorrect", raw);
    }
  });

  it("menolak teks tambahan di sekitar jawaban benar", () => {
    for (const raw of ["10.11.2004!", "answer 10.11.2004", "10.11.2004 ok", "a10.11.2004"]) {
      assert.equal(checkBirthdayAnswer(raw).kind, "incorrect", raw);
    }
  });

  it('menolak jawaban lama "RAYHAN"', () => {
    for (const raw of ["RAYHAN", "rayhan", "Rayhan"]) {
      assert.equal(checkBirthdayAnswer(raw).kind, "incorrect", raw);
    }
  });

  it("input kosong adalah 'empty', bukan tebakan salah", () => {
    for (const raw of ["", "   ", "\t\n"]) {
      assert.equal(checkBirthdayAnswer(raw).kind, "empty", JSON.stringify(raw));
    }
  });

  it("menolak input melebihi 32 karakter dan tipe non-string", () => {
    assert.equal(checkBirthdayAnswer("1".repeat(33)).kind, "incorrect");
    assert.equal(checkBirthdayAnswer(`${" ".repeat(40)}10.11.2004`).kind, "incorrect");
    assert.equal(checkBirthdayAnswer(null).kind, "incorrect");
    assert.equal(checkBirthdayAnswer(10112004).kind, "incorrect");
  });
});

describe("Level 3 — mode acceptBirthdayVariants", () => {
  const opts = { acceptBirthdayVariants: true };

  it("menerima tepat dua alias dan menormalkannya", () => {
    for (const raw of ["10/11/2004", "10112004"]) {
      const v = checkBirthdayAnswer(raw, opts);
      assert.equal(v.kind, "correct", raw);
      assert.equal(v.kind === "correct" && v.normalized, CANONICAL_BIRTHDAY);
    }
  });

  it("TIDAK membuang karakter non-digit secara umum", () => {
    for (const raw of ["10-11-2004", "10 11 2004", "1.0.1.1.2.0.0.4", "10,11,2004"]) {
      assert.equal(checkBirthdayAnswer(raw, opts).kind, "incorrect", raw);
    }
  });

  it("alias dengan tanggal lain tetap ditolak", () => {
    assert.equal(checkBirthdayAnswer("11/10/2004", opts).kind, "incorrect");
    assert.equal(checkBirthdayAnswer("11102004", opts).kind, "incorrect");
  });
});

describe("Level 3 — feedback", () => {
  it("merotasi pesan ACCESS DENIED secara deterministik", () => {
    assert.equal(deniedMessageFor(1), DENIED_MESSAGES[0]);
    assert.equal(deniedMessageFor(2), DENIED_MESSAGES[1]);
    assert.equal(deniedMessageFor(3), DENIED_MESSAGES[2]);
    assert.equal(deniedMessageFor(4), DENIED_MESSAGES[0]);
  });

  it("hint tambahan muncul setelah dua tebakan gagal", () => {
    assert.equal(shouldShowExtraHint(0), false);
    assert.equal(shouldShowExtraHint(1), false);
    assert.equal(shouldShowExtraHint(2), true);
    assert.equal(shouldShowExtraHint(5), true);
  });
});
