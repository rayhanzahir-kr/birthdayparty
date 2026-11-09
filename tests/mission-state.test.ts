import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  initialState,
  missionReducer,
  progressFromState,
  stateFromProgress,
  type MissionState,
} from "../lib/mission/state";

const run = (state: MissionState, ...actions: Parameters<typeof missionReducer>[1][]) =>
  actions.reduce(missionReducer, state);

describe("alur utama", () => {
  it("boot → intro → challenge 1..4 → card", () => {
    let s = initialState();
    assert.equal(s.stage, "boot");
    s = run(s, { type: "BOOT_DONE" });
    assert.equal(s.stage, "intro");
    s = run(s, { type: "START_MISSION" });
    assert.equal(s.stage, "challenge");
    assert.equal(s.level, 1);

    for (const level of [1, 2, 3]) {
      s = run(s, { type: "CHALLENGE_PASSED", level });
      assert.equal(s.stage, "challenge");
      assert.equal(s.level, level + 1);
    }

    s = run(s, { type: "CHALLENGE_PASSED", level: 4 });
    assert.equal(s.stage, "card");
    assert.equal(s.completed, true);
    assert.equal(s.skipped, false);
  });
});

describe("proteksi transisi ganda", () => {
  it("jawaban benar yang sama dua kali tidak melompati dua level", () => {
    let s = run(initialState(), { type: "BOOT_DONE" }, { type: "START_MISSION" });
    s = run(s, { type: "CHALLENGE_PASSED", level: 1 });
    assert.equal(s.level, 2);
    s = run(s, { type: "CHALLENGE_PASSED", level: 1 }); // klik/Enter beruntun
    assert.equal(s.level, 2, "level tidak boleh melompat");
  });

  it("mengabaikan jawaban dari level yang bukan level aktif", () => {
    let s = run(initialState(), { type: "BOOT_DONE" }, { type: "START_MISSION" });
    s = run(s, { type: "CHALLENGE_PASSED", level: 3 });
    assert.equal(s.level, 1);
  });

  it("BOOT_DONE berulang tidak melewati intro", () => {
    const s = run(initialState(), { type: "BOOT_DONE" }, { type: "BOOT_DONE" });
    assert.equal(s.stage, "intro");
  });
});

describe("skip", () => {
  it("skip dari setiap stage membuka undangan tanpa menandai completed", () => {
    const starts: MissionState[] = [
      initialState(),
      run(initialState(), { type: "BOOT_DONE" }),
      run(initialState(), { type: "BOOT_DONE" }, { type: "START_MISSION" }),
    ];
    for (const start of starts) {
      const s = run(start, { type: "SKIP_MISSION" });
      assert.equal(s.stage, "invitation");
      assert.equal(s.completed, false, "skip tidak boleh menandai completed");
      assert.equal(s.skipped, true);
    }
  });

  it("skip dan completed adalah status berbeda", () => {
    let s = run(initialState(), { type: "BOOT_DONE" }, { type: "START_MISSION" });
    for (const level of [1, 2, 3, 4]) s = run(s, { type: "CHALLENGE_PASSED", level });
    s = run(s, { type: "CONTINUE_TO_INVITATION" });
    assert.equal(s.completed, true);
    assert.equal(s.skipped, false);
  });
});

describe("kartu VIP", () => {
  it("tidak bisa dibuka tanpa menyelesaikan mission", () => {
    const s = run(initialState(), { type: "SKIP_MISSION" }, { type: "VIEW_CARD" });
    assert.equal(s.stage, "invitation", "kartu hanya untuk yang menyelesaikan");
  });

  it("bisa dibuka lagi setelah selesai", () => {
    let s = run(initialState(), { type: "BOOT_DONE" }, { type: "START_MISSION" });
    for (const level of [1, 2, 3, 4]) s = run(s, { type: "CHALLENGE_PASSED", level });
    s = run(s, { type: "CONTINUE_TO_INVITATION" }, { type: "VIEW_CARD" });
    assert.equal(s.stage, "card");
  });
});

describe("replay", () => {
  it("mengembalikan ke level 1 dan menghapus status selesai", () => {
    let s = run(initialState(), { type: "BOOT_DONE" }, { type: "START_MISSION" });
    for (const level of [1, 2, 3, 4]) s = run(s, { type: "CHALLENGE_PASSED", level });
    s = run(s, { type: "REPLAY" });
    assert.deepEqual(s, { stage: "challenge", level: 1, completed: false, skipped: false });
  });
});

describe("kunjungan ulang", () => {
  it("tamu yang sudah selesai tidak dipaksa boot/game ulang", () => {
    const s = stateFromProgress({ nextLevel: 4, completed: true, skipped: false });
    assert.equal(s.stage, "invitation");
    assert.equal(s.completed, true);
  });

  it("tamu yang pernah skip langsung ke undangan, mission tetap bisa dimulai", () => {
    let s = stateFromProgress({ nextLevel: 1, completed: false, skipped: true });
    assert.equal(s.stage, "invitation");
    assert.equal(s.completed, false);
    s = run(s, { type: "START_MISSION" });
    assert.equal(s.stage, "challenge");
    assert.equal(s.skipped, false);
  });

  it("tamu yang belum selesai melanjutkan dari level yang tertinggal", () => {
    const s = stateFromProgress({ nextLevel: 3, completed: false, skipped: false });
    assert.equal(s.stage, "challenge");
    assert.equal(s.level, 3);
  });

  it("tanpa progress, mulai dari boot", () => {
    assert.deepEqual(stateFromProgress(null), initialState());
  });

  it("level di luar rentang dijepit ke 1..4", () => {
    assert.equal(stateFromProgress({ nextLevel: 99, completed: false, skipped: false }).level, 4);
    assert.equal(stateFromProgress({ nextLevel: -5, completed: false, skipped: false }).level, 1);
    assert.equal(stateFromProgress({ nextLevel: NaN, completed: false, skipped: false }).level, 1);
  });
});

describe("progressFromState", () => {
  it("menyimpan hanya field yang diizinkan", () => {
    const p = progressFromState({ stage: "challenge", level: 2, completed: false, skipped: false });
    assert.deepEqual(Object.keys(p).sort(), ["completed", "nextLevel", "skipped"]);
  });
});
