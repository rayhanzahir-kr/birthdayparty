/**
 * Ekspor kartu VIP ke PNG.
 *
 * Keputusan: menggambar langsung dengan Canvas 2D, BUKAN menserialisasi DOM.
 * Alasannya dua. Pertama, PRD melarang menambah dependensi tanpa kebutuhan
 * nyata — pustaka html-to-image/dom-to-image tidak diperlukan. Kedua,
 * pendekatan ini tidak pernah memuat aset eksternal, sehingga canvas tidak
 * mungkin tercemar CORS (PRD FR-07).
 *
 * Modul ini di-lazy-load (dynamic import) agar tidak membebani bundle awal.
 * Tidak ada token, QR, atau data pribadi selain nama tamu dan display ID.
 */

export interface CardPngInput {
  guestName: string;
  displayId: string;
  eventTitle: string;
}

const WIDTH = 1080;
const HEIGHT = 1500;

const BG = "#080d0b";
const SURFACE = "#101a14";
const ACCENT = "#6cff9a";
const SECONDARY = "#8fe8a6";
const TEXT = "#f1f7f2";
const MUTED = "#a6b8ac";

/** Stack font sistem; tidak memuat font remote sehingga render selalu siap. */
const MONO = '"SF Mono", "Menlo", "Consolas", "Liberation Mono", monospace';

export async function renderCardPng(input: CardPngInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");

  // Pastikan font sistem siap sebelum menggambar teks.
  try {
    await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
  } catch {
    // Font API tidak tersedia; stack sistem tetap aman dipakai.
  }

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Panel
  const pad = 60;
  roundRect(ctx, pad, pad, WIDTH - pad * 2, HEIGHT - pad * 2, 28);
  ctx.fillStyle = SURFACE;
  ctx.fill();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Scanline halus
  ctx.fillStyle = "rgba(108, 255, 154, 0.030)";
  for (let y = pad; y < HEIGHT - pad; y += 6) {
    ctx.fillRect(pad, y, WIDTH - pad * 2, 2);
  }

  const left = pad + 70;
  const maxTextWidth = WIDTH - pad * 2 - 140;

  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = MUTED;
  ctx.font = `28px ${MONO}`;
  ctx.fillText("PROJECT_R // CLASSIFIED", left, pad + 110);

  ctx.fillStyle = ACCENT;
  ctx.font = `bold 76px ${MONO}`;
  ctx.fillText("VIP ACCESS", left, pad + 215);

  // Garis pemisah
  ctx.fillStyle = `${ACCENT}55`;
  ctx.fillRect(left, pad + 255, maxTextWidth, 2);

  ctx.fillStyle = MUTED;
  ctx.font = `26px ${MONO}`;
  ctx.fillText("GUEST", left, pad + 345);

  // Nama tamu: bungkus agar nama panjang tidak terpotong.
  ctx.fillStyle = TEXT;
  const nameLines = wrapToWidth(ctx, input.guestName, maxTextWidth, 60, MONO, 3);
  let y = pad + 425;
  for (const line of nameLines) {
    ctx.fillText(line, left, y);
    y += 72;
  }

  y += 40;
  ctx.fillStyle = MUTED;
  ctx.font = `26px ${MONO}`;
  ctx.fillText("GUEST ID", left, y);
  ctx.fillStyle = SECONDARY;
  ctx.font = `42px ${MONO}`;
  ctx.fillText(input.displayId, left, y + 60);

  y += 160;
  ctx.fillStyle = MUTED;
  ctx.font = `26px ${MONO}`;
  ctx.fillText("STATUS", left, y);
  ctx.fillStyle = ACCENT;
  ctx.font = `bold 46px ${MONO}`;
  ctx.fillText("ACCESS GRANTED", left, y + 62);

  y += 160;
  ctx.fillStyle = MUTED;
  ctx.font = `26px ${MONO}`;
  ctx.fillText("CLEARANCE", left, y);
  ctx.fillStyle = SECONDARY;
  ctx.font = `bold 46px ${MONO}`;
  ctx.fillText("VIP", left, y + 62);

  y += 160;
  ctx.fillStyle = MUTED;
  ctx.font = `26px ${MONO}`;
  ctx.fillText("EVENT", left, y);
  ctx.fillStyle = TEXT;
  const eventLines = wrapToWidth(ctx, input.eventTitle, maxTextWidth, 38, MONO, 2);
  let ey = y + 58;
  for (const line of eventLines) {
    ctx.fillText(line, left, ey);
    ey += 48;
  }

  ctx.fillStyle = MUTED;
  ctx.font = `22px ${MONO}`;
  ctx.fillText("Souvenir only — not proof of RSVP or admission.", left, HEIGHT - pad - 70);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to encode the PNG."));
    }, "image/png");
  });
}

/** Memotong teks menjadi beberapa baris agar muat; baris terakhir diberi elipsis. */
function wrapToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number,
  font: string,
  maxLines: number,
): string[] {
  ctx.font = `bold ${fontSize}px ${font}`;
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ["Guest"];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  // Baris terakhir masih kepanjangan (mis. satu kata sangat panjang): potong.
  const last = lines[lines.length - 1];
  if (last && ctx.measureText(last).width > maxWidth) {
    let truncated = last;
    while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    lines[lines.length - 1] = `${truncated}…`;
  }
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
