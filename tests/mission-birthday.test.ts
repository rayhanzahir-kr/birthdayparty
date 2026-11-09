import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  CANONICAL_BIRTHDAY,
  DENIED_MESSAGES,
  checkBirthdayAnswer,
  deniedMessageFor,
  shouldShowExtraHint,
} from "../lib/mission/birthday";

describe("Level 3 — format utama DDMMYYYY", () => {
  it("jawaban kanonis adalah 10112004", () => {
    assert.equal(CANONICAL_BIRTHDAY, "10112004");
    const v = checkBirthdayAnswer("10112004");
    assert.equal(v.kind, "correct");
    assert.equal(v.kind === "correct" && v.normalized, "10112004");
  });

  it("mengabaikan whitespace di kedua ujung", () => {
    for (const raw of ["  10112004", "10112004  ", "\t10112004\n"]) {
      assert.equal(checkBirthdayAnswer(raw).kind, "correct", raw);
    }
  });
});

describe("Level 3 — bentuk bertanda pemisah tetap diterima", () => {
  it("menerima titik, tanda hubung, dan garis miring, dinormalkan ke kanonis", () => {
    for (const raw of ["10.11.2004", "10-11-2004", "10/11/2004"]) {
      const v = checkBirthdayAnswer(raw);
      assert.equal(v.kind, "correct", raw);
      assert.equal(v.kind === "correct" && v.normalized, CANONICAL_BIRTHDAY, raw);
    }
  });

  it("menolak separator campuran", () => {
    for (const raw of ["10.11-2004", "10-11.2004", "10/11.2004"]) {
      assert.equal(checkBirthdayAnswer(raw).kind, "incorrect", raw);
    }
  });
});

describe("Level 3 — penolakan", () => {
  it("menolak tanggal terbalik dalam semua bentuk", () => {
    for (const raw of ["11102004", "11.10.2004", "11-10-2004"]) {
      assert.equal(checkBirthdayAnswer(raw).kind, "incorrect", raw);
    }
  });

  it("menolak tahun pendek, format ISO, dan panjang digit yang salah", () => {
    for (const raw of ["101104", "2004-11-10", "20041110", "1011204", "101120041"]) {
      assert.equal(checkBirthdayAnswer(raw).kind, "incorrect", raw);
    }
  });

  it("menolak teks tambahan di sekitar jawaban benar", () => {
    for (const raw of ["10112004!", "answer 10112004", "10112004 ok", "a10112004"]) {
      assert.equal(checkBirthdayAnswer(raw).kind, "incorrect", raw);
    }
  });

  it("menolak spasi di tengah digit", () => {
    for (const raw of ["1011 2004", "10 11 2004", "10,11,2004"]) {
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
    assert.equal(checkBirthdayAnswer(`${" ".repeat(40)}10112004`).kind, "incorrect");
    assert.equal(checkBirthdayAnswer(null).kind, "incorrect");
    assert.equal(checkBirthdayAnswer(10112004).kind, "incorrect");
  });
});

describe("Level 3 — konsistensi dengan kunci RSVP", () => {
  it("format yang diajarkan game juga diterima kunci RSVP", async () => {
    // Jebakan yang dicegah: tamu belajar satu format di game lalu ditolak form.
    const { canonicalizeInvitePassword } = await import("../lib/password-format");
    for (const raw of ["10112004", "10.11.2004", "10-11-2004", "10/11/2004"]) {
      assert.equal(checkBirthdayAnswer(raw).kind, "correct", `game: ${raw}`);
      assert.equal(canonicalizeInvitePassword(raw), "2004-11-10", `rsvp: ${raw}`);
    }
  });

  it("yang ditolak game juga ditolak kunci RSVP", async () => {
    const { canonicalizeInvitePassword } = await import("../lib/password-format");
    for (const raw of ["10.11-2004", "20041110", "1011204", "101120041", "11102004"]) {
      const gameOk = checkBirthdayAnswer(raw).kind === "correct";
      const rsvpOk = canonicalizeInvitePassword(raw) === "2004-11-10";
      assert.equal(gameOk, false, `game seharusnya menolak: ${raw}`);
      assert.equal(rsvpOk, false, `rsvp seharusnya menolak: ${raw}`);
    }
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
    assert.equal(shouldShowExtraHint(1), false);
    assert.equal(shouldShowExtraHint(2), true);
  });
});
