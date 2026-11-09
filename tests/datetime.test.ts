import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  formatEventDateTime,
  isDeadlineConsistent,
  isDeadlinePassed,
  isValidTimeZone,
  isoToZonedLocalInput,
  zonedLocalInputToIso,
} from "../lib/datetime";

describe("isDeadlinePassed", () => {
  const deadline = "2026-11-20T18:00:00.000Z";

  it("false ketika deadline belum diisi (null)", () => {
    assert.equal(isDeadlinePassed(null), false);
  });

  it("false satu detik sebelum deadline", () => {
    assert.equal(isDeadlinePassed(deadline, new Date("2026-11-20T17:59:59.000Z")), false);
  });

  it("false tepat pada deadline (batas inklusif)", () => {
    assert.equal(isDeadlinePassed(deadline, new Date(deadline)), false);
  });

  it("true satu milidetik setelah deadline", () => {
    assert.equal(isDeadlinePassed(deadline, new Date("2026-11-20T18:00:00.001Z")), true);
  });

  it("false untuk nilai tanggal yang tidak bisa dibaca", () => {
    assert.equal(isDeadlinePassed("bukan-tanggal", new Date()), false);
  });
});

describe("isDeadlineConsistent", () => {
  it("mengizinkan deadline sebelum atau tepat pada waktu mulai", () => {
    assert.ok(isDeadlineConsistent("2026-12-01T19:00:00Z", "2026-11-25T23:59:00Z"));
    assert.ok(isDeadlineConsistent("2026-12-01T19:00:00Z", "2026-12-01T19:00:00Z"));
  });

  it("menolak deadline sesudah waktu mulai acara", () => {
    assert.equal(isDeadlineConsistent("2026-12-01T19:00:00Z", "2026-12-02T19:00:00Z"), false);
  });

  it("mengizinkan kombinasi apa pun bila salah satunya null", () => {
    assert.ok(isDeadlineConsistent(null, "2026-12-02T19:00:00Z"));
    assert.ok(isDeadlineConsistent("2026-12-01T19:00:00Z", null));
    assert.ok(isDeadlineConsistent(null, null));
  });
});

describe("isValidTimeZone", () => {
  it("menerima zona IANA yang dikenal", () => {
    for (const tz of ["Europe/Berlin", "Asia/Jakarta", "UTC", "America/New_York"]) {
      assert.ok(isValidTimeZone(tz), tz);
    }
  });

  it("menolak nilai yang bukan zona waktu", () => {
    for (const tz of ["", "   ", "Bukan/Zona", "WIB+7", 7, null, undefined]) {
      assert.equal(isValidTimeZone(tz), false, String(tz));
    }
  });
});

describe("formatEventDateTime", () => {
  it("menampilkan jam pada zona ACARA, bukan zona proses", () => {
    // 18:00 UTC = 19:00 di Berlin (CET, musim dingin).
    const berlin = formatEventDateTime("2026-12-01T18:00:00.000Z", "Europe/Berlin");
    assert.match(berlin, /19[.:]00/);

    // Instant yang sama = 01:00 keesokan hari di Jakarta (WIB, UTC+7).
    const jakarta = formatEventDateTime("2026-12-01T18:00:00.000Z", "Asia/Jakarta");
    assert.match(jakarta, /01[.:]00/);
    assert.match(jakarta, /2 December 2026/);
  });

  it("selalu menyertakan nama zona waktu agar tidak ambigu", () => {
    assert.match(formatEventDateTime("2026-12-01T18:00:00.000Z", "Europe/Berlin"), /\(.+\)$/);
  });

  it("memakai placeholder, bukan tanggal karangan, ketika null", () => {
    assert.equal(formatEventDateTime(null, "Europe/Berlin"), "To be announced");
    assert.equal(formatEventDateTime("bukan-tanggal", "Europe/Berlin"), "To be announced");
  });
});

describe("zonedLocalInputToIso", () => {
  it("menafsirkan input admin pada zona acara (musim dingin)", () => {
    assert.equal(
      zonedLocalInputToIso("2026-12-01T19:00", "Europe/Berlin"),
      "2026-12-01T18:00:00.000Z",
    );
  });

  it("menangani daylight saving (musim panas Berlin = UTC+2)", () => {
    assert.equal(
      zonedLocalInputToIso("2026-07-01T19:00", "Europe/Berlin"),
      "2026-07-01T17:00:00.000Z",
    );
  });

  it("menangani zona tanpa DST", () => {
    assert.equal(
      zonedLocalInputToIso("2026-12-01T19:00", "Asia/Jakarta"),
      "2026-12-01T12:00:00.000Z",
    );
  });

  it("round-trip tidak menggeser waktu", () => {
    for (const tz of ["Europe/Berlin", "Asia/Jakarta", "America/New_York", "UTC"]) {
      for (const local of ["2026-12-01T19:30", "2026-07-15T08:05"]) {
        const iso = zonedLocalInputToIso(local, tz);
        assert.ok(iso, `gagal konversi ${local} ${tz}`);
        assert.equal(isoToZonedLocalInput(iso, tz), local, `${local} @ ${tz}`);
      }
    }
  });

  it("menolak format input yang salah", () => {
    for (const value of ["2026-12-01", "19:00", "", "2026-12-01 19:00", "2026-13-01T19:00x"]) {
      assert.equal(zonedLocalInputToIso(value, "Europe/Berlin"), null, value);
    }
  });
});

describe("isoToZonedLocalInput", () => {
  it("mengembalikan string kosong untuk null", () => {
    assert.equal(isoToZonedLocalInput(null, "Europe/Berlin"), "");
    assert.equal(isoToZonedLocalInput("bukan-tanggal", "Europe/Berlin"), "");
  });
});
