import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  MESSAGE_MAX_LENGTH,
  createGuestSchema,
  eventSettingsSchema,
  rsvpSubmitSchema,
  sanitizeExternalUrl,
  setActiveSchema,
} from "../lib/validation";

const VALID_TOKEN = "a".repeat(43);

describe("rsvpSubmitSchema", () => {
  it("menerima tiga status yang sah", () => {
    for (const status of ["attending", "maybe", "declined"]) {
      const result = rsvpSubmitSchema.safeParse({ token: VALID_TOKEN, status });
      assert.ok(result.success, status);
    }
  });

  it("menolak status palsu", () => {
    for (const status of ["ATTENDING", "going", "yes", "", null, 1]) {
      const result = rsvpSubmitSchema.safeParse({ token: VALID_TOKEN, status });
      assert.equal(result.success, false, String(status));
    }
  });

  it("menolak field tambahan: guest_count, +1, guest_id, name, event_id", () => {
    for (const extra of [
      { guest_count: 2 },
      { plus_one: true },
      { "+1": 1 },
      { guest_id: "00000000-0000-0000-0000-000000000000" },
      { name: "Penyusup" },
      { event_id: "00000000-0000-0000-0000-000000000000" },
      { password_verified: true },
      { is_active: true },
    ]) {
      const result = rsvpSubmitSchema.safeParse({
        token: VALID_TOKEN,
        status: "attending",
        ...extra,
      });
      assert.equal(result.success, false, `seharusnya ditolak: ${JSON.stringify(extra)}`);
    }
  });

  it("mentrim pesan dan mengubah pesan kosong menjadi null", () => {
    const result = rsvpSubmitSchema.safeParse({
      token: VALID_TOKEN,
      status: "maybe",
      message: "   ",
    });
    assert.ok(result.success);
    assert.equal(result.data.message, null);
  });

  it(`menolak pesan lebih dari ${MESSAGE_MAX_LENGTH} karakter`, () => {
    const ok = rsvpSubmitSchema.safeParse({
      token: VALID_TOKEN,
      status: "maybe",
      message: "x".repeat(MESSAGE_MAX_LENGTH),
    });
    assert.ok(ok.success);

    const tooLong = rsvpSubmitSchema.safeParse({
      token: VALID_TOKEN,
      status: "maybe",
      message: "x".repeat(MESSAGE_MAX_LENGTH + 1),
    });
    assert.equal(tooLong.success, false);
  });

  it("menolak password yang panjangnya tidak wajar", () => {
    const result = rsvpSubmitSchema.safeParse({
      token: VALID_TOKEN,
      status: "attending",
      password: "1".repeat(500),
    });
    assert.equal(result.success, false);
  });

  it("password opsional di skema — server yang mewajibkannya untuk attending", () => {
    const result = rsvpSubmitSchema.safeParse({ token: VALID_TOKEN, status: "attending" });
    assert.ok(result.success);
    assert.equal(result.data.password, undefined);
  });
});

describe("createGuestSchema", () => {
  it("mentrim nama dan merapatkan spasi ganda", () => {
    const result = createGuestSchema.safeParse({ name: "  Rayhan   Zahir  " });
    assert.ok(result.success);
    assert.equal(result.data.name, "Rayhan Zahir");
  });

  it("menolak nama kosong setelah trim", () => {
    for (const name of ["", "   ", "\t\n"]) {
      assert.equal(createGuestSchema.safeParse({ name }).success, false, JSON.stringify(name));
    }
  });

  it("menerima 1 karakter dan menolak lebih dari 100 karakter", () => {
    assert.ok(createGuestSchema.safeParse({ name: "A" }).success);
    assert.ok(createGuestSchema.safeParse({ name: "A".repeat(100) }).success);
    assert.equal(createGuestSchema.safeParse({ name: "A".repeat(101) }).success, false);
  });

  it("menolak field tambahan", () => {
    assert.equal(
      createGuestSchema.safeParse({ name: "Tamu", is_active: false }).success,
      false,
    );
  });
});

describe("sanitizeExternalUrl", () => {
  it("menerima http dan https", () => {
    assert.ok(sanitizeExternalUrl("https://maps.example.com/x"));
    assert.ok(sanitizeExternalUrl("http://maps.example.com/x"));
  });

  it("menolak javascript:, data:, dan skema lain", () => {
    for (const url of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "ftp://example.com",
      "//example.com",
      "maps.example.com",
      "",
      "   ",
    ]) {
      assert.equal(sanitizeExternalUrl(url), null, `seharusnya ditolak: ${url}`);
    }
  });

  it("menolak URL yang sangat panjang", () => {
    assert.equal(sanitizeExternalUrl(`https://e.com/${"a".repeat(2100)}`), null);
  });
});

describe("eventSettingsSchema", () => {
  const base = {
    title: "Birthday Protocol",
    host_name: "Penyelenggara",
    timezone: "Europe/Berlin",
    location_name: "Lokasi",
    dress_code: "Neon",
    description: "Deskripsi",
  };

  it("menerima pengaturan minimal yang sah", () => {
    assert.ok(eventSettingsSchema.safeParse(base).success);
  });

  it("menolak zona waktu yang tidak dikenal", () => {
    assert.equal(
      eventSettingsSchema.safeParse({ ...base, timezone: "Bukan/Zona" }).success,
      false,
    );
  });

  it("menolak URL peta berbahaya", () => {
    assert.equal(
      eventSettingsSchema.safeParse({ ...base, location_url: "javascript:alert(1)" }).success,
      false,
    );
  });

  it("mengubah string kosong menjadi null untuk field opsional", () => {
    const result = eventSettingsSchema.safeParse({
      ...base,
      location_url: "",
      event_date: "",
      rsvp_deadline: "",
    });
    assert.ok(result.success);
    assert.equal(result.data.location_url, null);
    assert.equal(result.data.event_date, null);
    assert.equal(result.data.rsvp_deadline, null);
  });

  it("menolak judul kosong dan field tambahan", () => {
    assert.equal(eventSettingsSchema.safeParse({ ...base, title: "" }).success, false);
    assert.equal(eventSettingsSchema.safeParse({ ...base, id: "x" }).success, false);
  });
});

describe("setActiveSchema", () => {
  it("hanya menerima boolean", () => {
    assert.ok(setActiveSchema.safeParse({ is_active: true }).success);
    assert.ok(setActiveSchema.safeParse({ is_active: false }).success);
    for (const value of ["true", 1, null, undefined]) {
      assert.equal(setActiveSchema.safeParse({ is_active: value }).success, false, String(value));
    }
  });
});
