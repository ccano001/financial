"use client"

import { useEffect, useRef, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { NamecardData } from "@/components/namecard-wallpaper"

// ─── SHARED UTIL ─────────────────────────────────────────────────

function initials(name: string) {
  return name.trim().split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase()
}

async function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement("a")
  link.download = filename
  link.href = canvas.toDataURL("image/jpeg", 0.95)
  link.click()
}

async function captureElement(el: HTMLElement, scale = 2): Promise<HTMLCanvasElement> {
  const { toCanvas } = await import("html-to-image")
  return toCanvas(el, {
    pixelRatio: scale * 2,  // FIX: 2x extra for crisp JPEG output
    backgroundColor: "#FFFFFF",
    skipFonts: false,
  })
}

// ═══════════════════════════════════════════════════════════════════
//  ZOOM BACKGROUND  —  1920×1080
// ═══════════════════════════════════════════════════════════════════

type LayoutPreset = "logo-left" | "logo-right"
type BgStyle = "solid" | "gradient"

type LogoShape = "square" | "rectangle"

interface ZoomSettings {
  layout:    LayoutPreset
  bgStyle:   BgStyle
  bgColor:   string
  bgColor2:  string
  logoShape: LogoShape
}

const ZOOM_W = 1920
const ZOOM_H = 1080

// Preset maps layout name → corner assignments
// Logo and name panel both sit at the top, alternating sides. QR at bottom opposite to logo.
const PRESETS: Record<LayoutPreset, { logo: string; info: string; qr: string }> = {
  "logo-left":  { logo: "tl", info: "tr", qr: "br" },  // logo top-left, name top-right, QR bottom-right
  "logo-right": { logo: "tr", info: "tl", qr: "bl" },  // logo top-right, name top-left, QR bottom-left
}

function ZoomBgCanvas({ data, settings, scale, logoCornerColor = "rgba(255,255,255,0.95)" }: {
  data: NamecardData
  settings: ZoomSettings
  scale: number
  logoCornerColor?: string
}) {
  const W = ZOOM_W * scale
  const H = ZOOM_H * scale

  const pad    = Math.round(52 * scale)
  const qrSize = Math.round(148 * scale)

  // Logo dimensions based on shape selection
  const logoW = settings.logoShape === "square"
    ? Math.round(200 * scale)   // FIX: bigger square frame
    : Math.round(460 * scale)   // FIX: wider rectangle for wordmarks
  const logoH = settings.logoShape === "square"
    ? Math.round(200 * scale)
    : Math.round(150 * scale)
  const logoRadius = settings.logoShape === "square"
    ? Math.round(20 * scale)
    : Math.round(12 * scale)
  // FIX: bigger text to fill the space, no panel box
  const nameSz   = Math.round(64  * scale)
  const emailSz  = Math.round(28  * scale)

  const { logo: logoC, info: infoC, qr: qrC } = PRESETS[settings.layout]

  function pos(corner: string): React.CSSProperties {
    if (corner === "tl") return { position: "absolute", top: pad, left: pad }
    if (corner === "tr") return { position: "absolute", top: pad, right: pad }
    if (corner === "bl") return { position: "absolute", bottom: pad, left: pad }
    return { position: "absolute", bottom: pad, right: pad }
  }

  const bg = settings.bgStyle === "gradient"
    ? `linear-gradient(135deg, ${settings.bgColor} 0%, ${settings.bgColor2} 100%)`
    : settings.bgColor

  // Auto text colour from bg luma
  const hex = settings.bgColor.replace("#", "")
  const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16)
  const luma = 0.299*r + 0.587*g + 0.114*b
  const textCol = luma > 155 ? "#111827" : "#FFFFFF"
  const subCol  = luma > 155 ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.65)"

  // Info text alignment mirrors which corner it's in
  const infoAlign = infoC === "tr" || infoC === "br" ? "right" : "left"

  return (
    <div style={{
      width: W, height: H, position: "relative", overflow: "hidden",
      background: bg, fontFamily: "Inter, system-ui, sans-serif",
      borderRadius: scale < 1 ? 8 : 0, flexShrink: 0,
    }}>
      {/* LOGO — white card, dimensions driven by logoShape */}
      {data.firmLogo && (
        <div style={{
          ...pos(logoC),
          width: logoW, height: logoH,
          background: logoCornerColor === "transparent" ? "transparent" : logoCornerColor,
          borderRadius: logoRadius,
          boxShadow: "0 2px 16px rgba(0,0,0,0.14)",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
          <img
            src={data.firmLogo} alt="logo" crossOrigin="anonymous"
            style={{ maxWidth: "88%", maxHeight: "88%", objectFit: "contain", display: "block" }}
          />
        </div>
      )}

      {/* QR CODE */}
      <div style={{
        ...pos(qrC),
        background: "white",
        padding: Math.round(6 * scale),
        borderRadius: Math.round(10 * scale),
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: Math.round(4 * scale),
      }}>
        <QRCodeSVG value={data.qrValue || " "} size={qrSize} level="H" />
      </div>

      {/* INFO — bare text, no panel box */}
      <div style={{
        ...pos(infoC),
        display: "flex", flexDirection: "column",
        gap: Math.round(6 * scale),
        textAlign: infoAlign,
        maxWidth: Math.round(700 * scale),
      }}>
        <div style={{
          fontSize: nameSz, fontWeight: 800, color: textCol,
          lineHeight: 1.1, letterSpacing: "-0.02em",
          textShadow: luma > 155 ? "none" : "0 2px 12px rgba(0,0,0,0.3)",
        }}>
          {data.displayName}
        </div>
        <div style={{
          fontSize: emailSz, color: subCol, fontWeight: 400,
          textShadow: luma > 155 ? "none" : "0 1px 8px rgba(0,0,0,0.25)",
        }}>
          {data.email}
        </div>
      </div>

      {/* BRAND WATERMARK */}
      <div style={{
        position: "absolute", bottom: Math.round(14 * scale), left: "50%",
        transform: "translateX(-50%)", opacity: 0.3,
      }}>
        <span style={{ fontSize: Math.round(10 * scale), color: textCol, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          {data.brandName}
        </span>
      </div>
    </div>
  )
}

export function ZoomBackgroundOutput({ data, logoCornerColor = "rgba(255,255,255,0.95)", logoShape: logoShapeProp = "square", onLogoShapeChange }: {
  data: NamecardData
  logoCornerColor?: string
  logoShape?: LogoShape
  onLogoShapeChange?: (shape: LogoShape) => void
}) {
  const exportRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  const [settings, setSettings] = useState<ZoomSettings>({
    layout:    "logo-left",
    bgStyle:   "solid",
    bgColor:   data.backgroundColor && data.backgroundColor !== "#FFFFFF" ? data.backgroundColor : "#1E3A5F",
    bgColor2:  "#00AEFF",
    logoShape: logoShapeProp,
  })

  // Keep logoShape in sync when lockscreen logo style changes
  useEffect(() => {
    setSettings(s => ({ ...s, logoShape: logoShapeProp }))
  }, [logoShapeProp])

  const set = <K extends keyof ZoomSettings>(k: K, v: ZoomSettings[K]) => {
    setSettings(s => ({ ...s, [k]: v }))
    if (k === "logoShape" && onLogoShapeChange) onLogoShapeChange(v as LogoShape)
  }

  const handleDownload = async () => {
    const el = exportRef.current
    if (!el) return
    setDownloading(true)
    try {
      const canvas = await captureElement(el, 1)
      await downloadCanvas(canvas, `ZoomBg_${data.displayName.replace(/\s+/g,"_")}.jpg`)
    } finally {
      setDownloading(false)
    }
  }

  // FIX: preview scale derived from panel width (390px wide panel → 16:9 preview)
  const PANEL_W = 390
  const previewScale = PANEL_W / ZOOM_W

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── LAYOUT ── */}
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Layout</h2>
        </div>
        <div style={{ padding: "12px 16px", display: "flex", gap: 8 }}>
          {([
            { value: "logo-left"  as LayoutPreset, label: "← Logo left",  sub: "Info top right" },
            { value: "logo-right" as LayoutPreset, label: "Logo right →", sub: "Info top left"  },
          ]).map(opt => (
            <button key={opt.value} onClick={() => set("layout", opt.value)} style={{
              flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer",
              border: "1.5px solid",
              borderColor: settings.layout === opt.value ? "#00AEFF" : "#E5E7EB",
              background: settings.layout === opt.value ? "#EBF7FF" : "white",
              display: "flex", flexDirection: "column", gap: 2,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: settings.layout === opt.value ? "#0090D8" : "#111827" }}>{opt.label}</span>
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>{opt.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── LOGO FRAME ── */}
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Logo Frame</h2>
        </div>
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {([
              { value: "square"    as LogoShape, label: "■  Square",    sub: "Circular / square logos" },
              { value: "rectangle" as LogoShape, label: "▬  Rectangle", sub: "Wordmarks / wide logos"  },
            ]).map(opt => (
              <button key={opt.value} onClick={() => set("logoShape", opt.value)} style={{
                flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer",
                border: "1.5px solid",
                borderColor: settings.logoShape === opt.value ? "#00AEFF" : "#E5E7EB",
                background: settings.logoShape === opt.value ? "#EBF7FF" : "white",
                display: "flex", flexDirection: "column", gap: 2, textAlign: "left",
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: settings.logoShape === opt.value ? "#0090D8" : "#111827" }}>{opt.label}</span>
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{opt.sub}</span>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Changing this also updates your Lock Screen logo style.</p>
        </div>
      </div>

      {/* ── BACKGROUND ── */}
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Background</h2>
        </div>
        <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {(["solid","gradient"] as BgStyle[]).map(s => (
              <button key={s} onClick={() => set("bgStyle", s)} style={{
                padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                cursor: "pointer", border: "1.5px solid",
                borderColor: settings.bgStyle === s ? "#00AEFF" : "#E5E7EB",
                background: settings.bgStyle === s ? "#EBF7FF" : "white",
                color: settings.bgStyle === s ? "#0090D8" : "#6B7280",
              }}>
                {s === "solid" ? "Solid" : "Gradient"}
              </button>
            ))}
          </div>
          <input type="color" value={settings.bgColor} onChange={e => set("bgColor", e.target.value)}
            style={{ width: 36, height: 32, borderRadius: 6, border: "1px solid #E5E7EB", padding: 2, cursor: "pointer" }} />
          {settings.bgStyle === "gradient" && (
            <>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>→</span>
              <input type="color" value={settings.bgColor2} onChange={e => set("bgColor2", e.target.value)}
                style={{ width: 36, height: 32, borderRadius: 6, border: "1px solid #E5E7EB", padding: 2, cursor: "pointer" }} />
            </>
          )}
          <span style={{ fontFamily: "monospace", fontSize: 11, color: "#9CA3AF" }}>{settings.bgColor.toUpperCase()}</span>
        </div>
      </div>

      {/* ── 16:9 PREVIEW ── */}
      <div style={{
        width: PANEL_W,
        height: Math.round(PANEL_W * (ZOOM_H / ZOOM_W)),
        borderRadius: 8, overflow: "hidden",
        border: "1px solid #E5E7EB",
        flexShrink: 0,
      }}>
        <ZoomBgCanvas data={data} settings={settings} scale={previewScale} logoCornerColor={logoCornerColor} />
      </div>

      {/* Hidden full-res export target */}
      <div style={{ position: "fixed", left: -9999, top: -9999, pointerEvents: "none" }}>
        <div ref={exportRef}>
          <ZoomBgCanvas data={data} settings={settings} scale={1} logoCornerColor={logoCornerColor} />
        </div>
      </div>

      <Button onClick={handleDownload} disabled={downloading} size="lg">
        <Download className="size-4" />
        {downloading ? "Generating…" : "Download Zoom Background (1920×1080)"}
      </Button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
//  EMAIL SIGNATURE  —  PNG image output
// ═══════════════════════════════════════════════════════════════════

const SIG_W = 640
const SIG_H = 120  // fixed height — all content must fit within this

function EmailSigCanvas({ data, accentColor }: { data: NamecardData; accentColor: string }) {
  const PHOTO_SIZE = 76
  const pad = 12

  return (
    <div style={{
      width: SIG_W, height: SIG_H, background: "#FFFFFF",
      fontFamily: "Inter, Arial, sans-serif",
      display: "flex", flexDirection: "row", alignItems: "stretch",
      overflow: "hidden", border: "1px solid #E5E7EB", borderRadius: 8,
    }}>
      {/* Accent bar */}
      <div style={{ width: 4, background: accentColor, flexShrink: 0, borderRadius: "8px 0 0 8px" }} />

      {/* Photo */}
      <div style={{ padding: pad, paddingRight: 0, display: "flex", alignItems: "center", flexShrink: 0 }}>
        <div style={{
          width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 8,
          overflow: "hidden", background: "#0C447C",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, fontWeight: 700, color: "white",
          border: "2px solid #E5E7EB", flexShrink: 0,
        }}>
          {data.profilePhoto
            ? <img src={data.profilePhoto} crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
            : initials(data.displayName)}
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, background: "#E5E7EB", margin: `${pad}px 0`, flexShrink: 0, marginLeft: 12 }} />

      {/* Text — name, title+firm on one line each, then contacts */}
      <div style={{ flex: 1, padding: `${pad}px 12px`, display: "flex", flexDirection: "column", justifyContent: "center", gap: 1, minWidth: 0 }}>
        {/* Name — single line, ellipsis if too long */}
        <div style={{ fontSize: 14, fontWeight: 800, color: "#111827", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {data.displayName}
        </div>
        {/* Title · Firm — single line, ellipsis */}
        <div style={{ fontSize: 10, color: "#6B7280", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {data.jobTitle}{data.firmName && <> · <span style={{ color: accentColor, fontWeight: 600 }}>{data.firmName}</span></>}
        </div>
        {/* Divider */}
        <div style={{ height: 1, background: "#F3F4F6", margin: "6px 0 5px" }} />
        {/* Contacts */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 10, color: "#374151", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: accentColor, fontWeight: 700, fontSize: 9, minWidth: 8 }}>M</span>
            <span style={{ whiteSpace: "nowrap" }}>{data.phone}</span>
          </div>
          <div style={{ fontSize: 10, color: "#374151", display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
            <span style={{ color: accentColor, fontWeight: 700, fontSize: 9, minWidth: 8 }}>E</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.email}</span>
          </div>
          {data.address && (
            <div style={{ fontSize: 9, color: "#9CA3AF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {data.address}
            </div>
          )}
        </div>
      </div>

      {/* Logo + QR — right column */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: pad, paddingLeft: 8, gap: 6, flexShrink: 0 }}>
        {data.firmLogo && (
          <img src={data.firmLogo} crossOrigin="anonymous" alt="logo"
            style={{ maxWidth: 100, maxHeight: 40, objectFit: "contain", display: "block" }} />
        )}
        <div style={{ background: "white", padding: 2, border: "1px solid #E5E7EB", borderRadius: 4 }}>
          <QRCodeSVG value={data.qrValue || " "} size={52} level="M" />
        </div>
        <span style={{ fontSize: 7, color: "#9CA3AF", textAlign: "center" }}>Scan to connect</span>
      </div>
    </div>
  )
}

export function EmailSignatureOutput({ data }: { data: NamecardData }) {
  const sigRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [accentColor, setAccentColor] = useState("#00AEFF")

  const handleDownload = async () => {
    const el = sigRef.current
    if (!el) return
    setDownloading(true)
    try {
      const canvas = await captureElement(el, 2)
      await downloadCanvas(canvas, `EmailSig_${data.displayName.replace(/\s+/g,"_")}.jpg`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── ACCENT COLOUR ── */}
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Accent Colour</h2>
        </div>
        <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <input id="sig-accent" type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
            style={{ width: 36, height: 32, borderRadius: 6, border: "1px solid #E5E7EB", padding: 2, cursor: "pointer" }} />
          <span style={{ fontFamily: "monospace", fontSize: 12, color: "#6B7280" }}>{accentColor.toUpperCase()}</span>
        </div>
      </div>

      {/* ── PREVIEW ── */}
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Preview</h2>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{ width: 390, height: Math.round(SIG_H * (390 / SIG_W)), overflow: "visible", borderRadius: 8 }}>
            <div ref={sigRef} style={{ transformOrigin: "top left", transform: `scale(${390 / SIG_W})` }}>
              <EmailSigCanvas data={data} accentColor={accentColor} />
            </div>
          </div>
          <p style={{ fontSize: 11, color: "#9CA3AF", margin: "10px 0 0", lineHeight: 1.5 }}>
            Download the PNG then insert it as an image in Gmail or Outlook. Link it to your QR URL so clicks go to your digital card.
          </p>
        </div>
      </div>

      <Button onClick={handleDownload} disabled={downloading} size="lg">
        <Download className="size-4" />
        {downloading ? "Generating…" : "Download Email Signature"}
      </Button>
    </div>
  )
}