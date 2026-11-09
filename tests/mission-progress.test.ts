import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  PROGRESS_SCHEMA_VERSION,
  PROGRESS_TTL_MS,
  parseProgress,
  storageKey,
} from "../lib/mission/progress";

const NOW = 1_762_000_000_000;
const valid = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    version: PROGRESS_SCHEMA_VERSION,
    nextLevel: 2,
    completed: false,
    skipped: false,
    updatedAt: NOW - 1000,
    ...over,
  });

describe("storageKey", () => {
  it("diberi namespace per undangan dan per versi skema", () => {
    assert.equal(storageKey("ABC123"), `project-r:v${PROGRESS_SCHEMA_VERSION}:ABC123`);
    assert.notEqual(storageKey("A"), storageKey("B"));
  });
});

describe("parseProgress — data sehat", () => {
  it("menerima payload valid", () => {
    const p = parseProgress(valid(), NOW);
    assert.ok(p);
    assert.equal(p?.nextLevel, 2);
  });

  it("hanya mengembalikan field yang diizinkan", () => {
    const p = parseProgress(valid({ guestName: "Bocor", token: "rahasia" }), NOW);
    assert.ok(p);
    assert.deepEqual(Object.keys(p!).sort(), [
      "completed",
      "nextLevel",
      "skipped",
      "updatedAt",
      "version",
    ]);
    assert.ok(!("guestName" in (p as object)), "nama tamu tidak boleh ikut terbaca");
    assert.ok(!("token" in (p as object)), "token tidak boleh ikut terbaca");
  });
});

describe("parseProgress — data rusak ditolak dengan aman", () => {
  it("menolak null, string kosong, dan JSON tidak valid", () => {
    for (const raw of [null, "", "{", "bukan json", "[]", '"teks"', "123"]) {
      assert.equal(parseProgress(raw as string | null, NOW), null, String(raw));
    }
  });

  it("menolak versi skema yang tidak dikenal", () => {
    assert.equal(parseProgress(valid({ version: 0 }), NOW), null);
    assert.equal(parseProgress(valid({ version: 99 }), NOW), null);
    assert.equal(parseProgress(valid({ version: "1" }), NOW), null);
  });

  it("menolak nextLevel di luar rentang atau bukan bilangan bulat", () => {
    for (const nextLevel of [0, 5, -1, 2.5, NaN, "2", null]) {
      assert.equal(parseProgress(valid({ nextLevel }), NOW), null, String(nextLevel));
    }
  });

  it("menolak flag yang bukan boolean", () => {
    assert.equal(parseProgress(valid({ completed: "true" }), NOW), null);
    assert.equal(parseProgress(valid({ skipped: 1 }), NOW), null);
  });

  it("menolak progress yang sudah kedaluwarsa (TTL 30 hari)", () => {
    assert.ok(parseProgress(valid({ updatedAt: NOW - PROGRESS_TTL_MS + 1000 }), NOW));
    assert.equal(parseProgress(valid({ updatedAt: NOW - PROGRESS_TTL_MS - 1000 }), NOW), null);
  });

  it("menolak timestamp masa depan yang tidak masuk akal", () => {
    assert.equal(parseProgress(valid({ updatedAt: NOW + 86_400_000 }), NOW), null);
    assert.equal(parseProgress(valid({ updatedAt: "kemarin" }), NOW), null);
  });
});

describe("batas kepercayaan", () => {
  it("completed yang dimanipulasi tetap hanya data tampilan", () => {
    // Progress tersimpan bisa diubah siapa pun lewat devtools. Yang penting:
    // modul ini hanya mengembalikan preferensi tampilan, tidak pernah izin akses.
    const p = parseProgress(valid({ completed: true, nextLevel: 4 }), NOW);
    assert.ok(p);
    assert.equal(p?.completed, true);
    // Tidak ada field apa pun di sini yang bisa dipakai sebagai otorisasi.
    assert.ok(!("token" in (p as object)));
    assert.ok(!("authorized" in (p as object)));
  });
});
