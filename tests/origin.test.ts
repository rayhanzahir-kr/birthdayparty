import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { evaluateOrigin, isSameOrigin } from "../lib/origin";

const ALLOWED = ["https://acara.vercel.app", "http://localhost:3000"];
const sig = (o: Partial<Parameters<typeof evaluateOrigin>[0]>) =>
  ({ secFetchSite: null, origin: null, referer: null, ...o });

describe("evaluateOrigin — serangan CSRF ditolak", () => {
  it("menolak Sec-Fetch-Site: cross-site walau Origin dipalsukan", () => {
    const d = evaluateOrigin(
      sig({ secFetchSite: "cross-site", origin: "https://acara.vercel.app" }),
      ALLOWED,
    );
    assert.equal(d.allowed, false);
    assert.equal(d.reason, "sec_fetch_cross_site");
  });

  it("menolak same-site (subdomain lain) — bukan same-origin", () => {
    assert.equal(evaluateOrigin(sig({ secFetchSite: "same-site" }), ALLOWED).allowed, false);
  });

  it("menolak Origin asing ketika browser tidak mengirim Sec-Fetch-Site", () => {
    const d = evaluateOrigin(sig({ origin: "https://penyerang.example" }), ALLOWED);
    assert.equal(d.allowed, false);
    assert.equal(d.reason, "origin_not_allowlisted");
  });

  it("menolak Referer asing", () => {
    assert.equal(
      evaluateOrigin(sig({ referer: "https://penyerang.example/hal" }), ALLOWED).allowed,
      false,
    );
  });

  it("menolak request tanpa sinyal apa pun", () => {
    const d = evaluateOrigin(sig({}), ALLOWED);
    assert.equal(d.allowed, false);
    assert.equal(d.reason, "no_signal");
  });

  it("menolak Referer yang tidak bisa diurai", () => {
    assert.equal(evaluateOrigin(sig({ referer: "bukan-url" }), ALLOWED).allowed, false);
  });
});

describe("evaluateOrigin — pemakaian sah tetap jalan", () => {
  it("menerima Sec-Fetch-Site: same-origin walau SITE_URL salah konfigurasi", () => {
    // Inti perbaikannya: allowlist kosong/keliru tidak lagi melumpuhkan aplikasi,
    // karena browser sendiri yang menjamin request berasal dari halaman kita.
    const d = evaluateOrigin(
      sig({ secFetchSite: "same-origin", origin: "https://domain-yang-belum-disetel.vercel.app" }),
      [],
    );
    assert.equal(d.allowed, true);
    assert.equal(d.reason, "sec_fetch_same_origin");
  });

  it("menerima deployment preview Vercel lewat same-origin", () => {
    assert.ok(
      evaluateOrigin(
        sig({ secFetchSite: "same-origin", origin: "https://acara-git-main-abc.vercel.app" }),
        ALLOWED,
      ).allowed,
    );
  });

  it("menerima Origin yang ada di allowlist (browser tanpa Sec-Fetch-Site)", () => {
    const d = evaluateOrigin(sig({ origin: "https://acara.vercel.app" }), ALLOWED);
    assert.equal(d.allowed, true);
    assert.equal(d.reason, "origin_allowlisted");
  });

  it("menerima localhost saat pengembangan", () => {
    assert.ok(evaluateOrigin(sig({ origin: "http://localhost:3000" }), ALLOWED).allowed);
  });

  it("menerima Referer yang ada di allowlist", () => {
    const d = evaluateOrigin(sig({ referer: "https://acara.vercel.app/invite/abc" }), ALLOWED);
    assert.equal(d.allowed, true);
    assert.equal(d.reason, "referer_allowlisted");
  });

  it("menerima Sec-Fetch-Site: none (navigasi langsung)", () => {
    assert.ok(evaluateOrigin(sig({ secFetchSite: "none" }), ALLOWED).allowed);
  });

  it("none + Origin asing tetap ditolak", () => {
    assert.equal(
      evaluateOrigin(sig({ secFetchSite: "none", origin: "https://penyerang.example" }), ALLOWED)
        .allowed,
      false,
    );
  });
});

describe("isSameOrigin", () => {
  it("mengabaikan path dan trailing slash", () => {
    assert.ok(isSameOrigin("https://a.app/", "https://a.app"));
    assert.ok(isSameOrigin("https://a.app/x/y", "https://a.app"));
  });

  it("membedakan skema, host, dan port", () => {
    assert.equal(isSameOrigin("https://a.app", "http://a.app"), false);
    assert.equal(isSameOrigin("https://a.app", "https://b.app"), false);
    assert.equal(isSameOrigin("http://localhost:3000", "http://localhost:3001"), false);
  });

  it("false untuk nilai yang bukan URL", () => {
    assert.equal(isSameOrigin("bukan-url", "https://a.app"), false);
  });
});
