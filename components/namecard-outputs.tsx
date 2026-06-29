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
  link.href = canvas.toDataURL("image/png")
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

type LogoPosition = "left" | "center" | "right"
type QrPosition  = "left" | "right"
type BgStyle = "solid" | "gradient" | "image"
type LogoShape = "square" | "rectangle"

interface ZoomSettings {
  logoPos:   LogoPosition
  qrPos:     QrPosition
  logoSize:  number
  showQr:    boolean
  bgStyle:   BgStyle
  bgColor:   string
  bgColor2:  string
  bgImage:   string | null
  logoShape: LogoShape
}

const ZOOM_W = 1920
const ZOOM_H = 1080

function ZoomBgCanvas({ data, settings, scale, logoCornerColor = "rgba(255,255,255,0.95)" }: {
  data: NamecardData
  settings: ZoomSettings
  scale: number
  logoCornerColor?: string
}) {
  const W = ZOOM_W * scale
  const H = ZOOM_H * scale
  const pad = Math.round(60 * scale)
  const qrSize = Math.round(280 * scale)

  // Logo size driven by slider (native px on 1920 canvas)
  const logoW = settings.logoShape === "rectangle"
    ? Math.round(settings.logoSize * 1.6 * scale)
    : Math.round(settings.logoSize * scale)
  const logoH = Math.round(settings.logoSize * scale)
  const logoRadius = settings.logoShape === "square" ? "50%" : `${Math.round(20 * scale)}px`

  const nameSz = Math.round(42 * scale)

  // Logo position — bleed offset when logo is large enough to reach edge
  const bleedOffset = settings.logoSize > 350 ? Math.round(-(settings.logoSize - 300) / 2 * scale) : Math.round(pad / 2)
  const logoPosStyle: React.CSSProperties = (() => {
    const top = bleedOffset < 0 ? bleedOffset : pad
    if (settings.logoPos === "left")   return { position: "absolute", top, left: bleedOffset < 0 ? bleedOffset : pad }
    if (settings.logoPos === "right")  return { position: "absolute", top, right: bleedOffset < 0 ? bleedOffset : pad }
    return { position: "absolute", top, left: "50%", transform: `translateX(-50%)` }
  })()

  // QR + name position — bottom left or right
  const qrPosStyle: React.CSSProperties = settings.qrPos === "left"
    ? { position: "absolute", bottom: pad, left: pad }
    : { position: "absolute", bottom: pad, right: pad }
  const nameAlign = settings.qrPos === "left" ? "left" : "right"

  const bg = settings.bgStyle === "gradient"
    ? `linear-gradient(135deg, ${settings.bgColor} 0%, ${settings.bgColor2} 100%)`
    : settings.bgStyle === "image" ? "transparent"
    : settings.bgColor

  const hex = settings.bgColor.replace("#", "")
  const r = parseInt(hex.slice(0,2)||"1e",16), g = parseInt(hex.slice(2,4)||"3a",16), b = parseInt(hex.slice(4,6)||"5f",16)
  const luma = 0.299*r + 0.587*g + 0.114*b
  const textCol = (settings.bgStyle === "image" || luma <= 155) ? "#FFFFFF" : "#111827"

  return (
    <div style={{
      width: W, height: H, position: "relative", overflow: "hidden",
      background: bg, fontFamily: "Inter, system-ui, sans-serif",
      borderRadius: scale < 1 ? 8 : 0, flexShrink: 0,
    }}>
      {/* BACKGROUND IMAGE */}
      {settings.bgStyle === "image" && settings.bgImage && (
        <img src={settings.bgImage} alt="" crossOrigin="anonymous"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }} />
      )}

      {/* LOGO — always transparent, no white card */}
      {data.firmLogo && (
        <div style={{
          ...logoPosStyle,
          width: logoW, height: logoH,
          borderRadius: logoRadius,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", zIndex: 6,
          background: "transparent",
        }}>
          <img src={data.firmLogo} alt="logo" crossOrigin="anonymous"
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
        </div>
      )}

      {/* NAME + QR stacked — tight gap */}
      <div style={{ ...qrPosStyle, display: "flex", flexDirection: "column", alignItems: nameAlign === "right" ? "flex-end" : "flex-start", gap: Math.round(6 * scale), zIndex: 10 }}>
        {/* Name always visible */}
        <div style={{
          fontSize: nameSz, fontWeight: 700, color: textCol,
          lineHeight: 1.2, letterSpacing: "-0.01em",
          textShadow: textCol === "#FFFFFF" ? "0 1px 8px rgba(0,0,0,0.4)" : "none",
          textAlign: nameAlign,
          width: qrSize + Math.round(12 * scale),
          wordBreak: "break-word",
          overflowWrap: "break-word",
        }}>
          {(() => {
            const name = data.displayName.trim()
            if (name.length <= 14) return name
            const splitAt = name.lastIndexOf(" ", 14)
            if (splitAt > 0) {
              return <>{name.slice(0, splitAt)}<br />{name.slice(splitAt + 1)}</>
            }
            return <>{name.slice(0, 14)}<br />{name.slice(14, 28)}</>
          })()}
        </div>
        {/* QR code — togglable */}
        {settings.showQr && (
          <div style={{
            background: "white", padding: Math.round(6 * scale),
            borderRadius: Math.round(10 * scale),
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)", display: "inline-flex",
          }}>
            <QRCodeSVG value={data.qrValue || " "} size={qrSize} level="H" />
          </div>
        )}
      </div>

      {/* BRAND WATERMARK */}
      <div style={{ position: "absolute", bottom: Math.round(14 * scale), left: "50%", transform: "translateX(-50%)", opacity: 0.3, zIndex: 5 }}>
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
    logoPos:   "left",
    qrPos:     "right",
    logoSize:  500,
    showQr:    true,
    bgStyle:   "solid",
    bgColor:   data.backgroundColor && data.backgroundColor !== "#FFFFFF" ? data.backgroundColor : "#1E3A5F",
    bgColor2:  "#00AEFF",
    bgImage:   null,
    logoShape: logoShapeProp,
  })

  useEffect(() => {
    setSettings(s => ({ ...s, logoShape: logoShapeProp }))
  }, [logoShapeProp])

  const set = <K extends keyof ZoomSettings>(k: K, v: ZoomSettings[K]) => {
    setSettings(s => ({ ...s, [k]: v }))
    if (k === "logoShape" && onLogoShapeChange) onLogoShapeChange(v as LogoShape)
  }

  const bgImageRef = useRef<HTMLInputElement>(null)

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => set("bgImage", reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const handleDownload = async () => {
    const el = exportRef.current
    if (!el) return
    setDownloading(true)
    try {
      const canvas = await captureElement(el, 2)
      await downloadCanvas(canvas, `ZoomBg_${data.displayName.replace(/\s+/g,"_")}.png`)
    } finally {
      setDownloading(false)
    }
  }

  // FIX: preview scale derived from panel width (390px wide panel → 16:9 preview)
  const PANEL_W = 390
  const previewScale = PANEL_W / ZOOM_W

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── LOGO POSITION + SIZE ── */}
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Logo</h2>
        </div>
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Position */}
          <div style={{ display: "flex", gap: 8 }}>
            {(["left","center","right"] as LogoPosition[]).map(p => (
              <button key={p} onClick={() => set("logoPos", p)} style={{
                flex: 1, padding: "8px", borderRadius: 10, cursor: "pointer", border: "1.5px solid",
                borderColor: settings.logoPos === p ? "#00AEFF" : "#E5E7EB",
                background: settings.logoPos === p ? "#EBF7FF" : "white",
                fontSize: 13, fontWeight: settings.logoPos === p ? 600 : 400,
                color: settings.logoPos === p ? "#0090D8" : "#111827", textTransform: "capitalize",
              }}>{p}</button>
            ))}
          </div>
          {/* Size slider */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Label style={{ fontSize: 11, color: "#6B7280" }}>Size</Label>
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>{settings.logoSize}px</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: "#9CA3AF" }}>S</span>
              <input type="range" min={150} max={700} step={10} value={settings.logoSize}
                onChange={e => set("logoSize", parseInt(e.target.value))}
                style={{ flex: 1 }} />
              <span style={{ fontSize: 13, color: "#9CA3AF" }}>L</span>
            </div>
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Drag larger to bleed into the corner — smaller to float with padding.</p>
          </div>
        </div>
      </div>

      {/* ── QR CODE ── */}
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">QR Code</h2>
          <button onClick={() => set("showQr", !settings.showQr)} style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", background: settings.showQr ? "#00AEFF" : "#E5E7EB", position: "relative", transition: "background 0.2s" }}>
            <span style={{ position: "absolute", top: 2, width: 16, height: 16, borderRadius: "50%", background: "white", transition: "left 0.2s", left: settings.showQr ? 18 : 2 }} />
          </button>
        </div>
        {settings.showQr && (
          <div style={{ padding: "12px 16px", display: "flex", gap: 8 }}>
            {(["left","right"] as QrPosition[]).map(p => (
              <button key={p} onClick={() => set("qrPos", p)} style={{
                flex: 1, padding: "8px", borderRadius: 10, cursor: "pointer", border: "1.5px solid",
                borderColor: settings.qrPos === p ? "#00AEFF" : "#E5E7EB",
                background: settings.qrPos === p ? "#EBF7FF" : "white",
                fontSize: 13, fontWeight: settings.qrPos === p ? 600 : 400,
                color: settings.qrPos === p ? "#0090D8" : "#111827", textTransform: "capitalize",
              }}>{p === "left" ? "← Bottom left" : "Bottom right →"}</button>
            ))}
          </div>
        )}
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
                flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer", border: "1.5px solid",
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
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {(["solid","gradient","image"] as BgStyle[]).map(s => (
              <button key={s} onClick={() => set("bgStyle", s)} style={{
                flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 12, fontWeight: 500,
                cursor: "pointer", border: "1.5px solid",
                borderColor: settings.bgStyle === s ? "#00AEFF" : "#E5E7EB",
                background: settings.bgStyle === s ? "#EBF7FF" : "white",
                color: settings.bgStyle === s ? "#0090D8" : "#6B7280",
              }}>{s === "solid" ? "Solid" : s === "gradient" ? "Gradient" : "Image"}</button>
            ))}
          </div>
          {settings.bgStyle !== "image" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
          )}
          {settings.bgStyle === "image" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input ref={bgImageRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleBgImageUpload} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => bgImageRef.current?.click()} style={{
                  padding: "8px 14px", borderRadius: 8, border: "1.5px solid #E5E7EB",
                  background: "white", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "#374151",
                }}>{settings.bgImage ? "Replace image" : "Upload image"}</button>
                {settings.bgImage && (
                  <button onClick={() => set("bgImage", null)} style={{ fontSize: 11, color: "#EF4444", background: "none", border: "none", cursor: "pointer" }}>Remove</button>
                )}
              </div>
              {settings.bgImage && (
                <img src={settings.bgImage} alt="bg preview" style={{ width: "100%", height: 60, objectFit: "cover", borderRadius: 8, border: "1px solid #E5E7EB" }} />
              )}
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Use a 1920×1080 image for best results.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── 16:9 PREVIEW — CSS scaled from native size ── */}
      <div style={{
        width: PANEL_W,
        height: Math.round(PANEL_W * (ZOOM_H / ZOOM_W)),
        borderRadius: 8, overflow: "hidden",
        border: "1px solid #E5E7EB",
        flexShrink: 0, position: "relative",
      }}>
        <div style={{ transformOrigin: "top left", transform: `scale(${previewScale})`, position: "absolute", top: 0, left: 0 }}>
          <ZoomBgCanvas data={data} settings={settings} scale={1} logoCornerColor={logoCornerColor} />
        </div>
      </div>

      {/* Hidden full-res export target */}
      <div style={{ position: "fixed", left: -9999, top: -9999, pointerEvents: "none" }}>
        <div ref={exportRef}>
          <ZoomBgCanvas data={data} settings={settings} scale={1} logoCornerColor={logoCornerColor} />
        </div>
      </div>

      {/* ── HOW TO USE ── */}
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">How to set as Zoom background</h2>
        </div>
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { n: 1, text: "Download the background image below." },
            { n: 2, text: "In Zoom: click the arrow next to Stop Video → Virtual Background → click + to upload the image." },
            { n: 3, text: "Your name and QR code will be visible to meeting participants in the bottom corner." },
            { n: 4, text: "Tip: for best results, use a plain background and ensure good lighting on your face." },
          ].map(s => (
            <div key={s.n} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#EBF7FF", color: "#00AEFF", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{s.n}</div>
              <p style={{ fontSize: 12, color: "#374151", margin: 0, lineHeight: 1.6 }}>{s.text}</p>
            </div>
          ))}
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

function EmailSigCanvas({ data, accentColor, showQr = true }: { data: NamecardData; accentColor: string; showQr?: boolean }) {
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
        {showQr && (
          <div style={{ background: "white", padding: 2, border: "1px solid #E5E7EB", borderRadius: 4 }}>
            <QRCodeSVG value={data.qrValue || " "} size={52} level="M" />
          </div>
        )}
      </div>
    </div>
  )
}

export function EmailSignatureOutput({ data }: { data: NamecardData }) {
  const exportRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [accentColor, setAccentColor] = useState("#00AEFF")
  const [showQr, setShowQr] = useState(true)

  const handleDownload = async () => {
    const el = exportRef.current
    if (!el) return
    setDownloading(true)
    try {
      const canvas = await captureElement(el, 3)
      await downloadCanvas(canvas, `EmailSig_${data.displayName.replace(/\s+/g,"_")}.png`)
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

      {/* ── QR TOGGLE ── */}
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">QR Code</h2>
          <button onClick={() => setShowQr(v => !v)} style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", background: showQr ? "#00AEFF" : "#E5E7EB", position: "relative", transition: "background 0.2s" }}>
            <span style={{ position: "absolute", top: 2, width: 16, height: 16, borderRadius: "50%", background: "white", transition: "left 0.2s", left: showQr ? 18 : 2 }} />
          </button>
        </div>
        {!showQr && <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0, padding: "10px 16px" }}>QR code hidden — logo only in the right column.</p>}
      </div>

      {/* ── PREVIEW ── */}
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Preview</h2>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{ width: 390, height: Math.round(SIG_H * (390 / SIG_W)), overflow: "hidden", borderRadius: 8 }}>
            <div style={{ transformOrigin: "top left", transform: `scale(${390 / SIG_W})`, width: SIG_W }}>
              <EmailSigCanvas data={data} accentColor={accentColor} showQr={showQr} />
            </div>
          </div>
        </div>
      </div>

      {/* ── HOW TO USE ── */}
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">How to use this</h2>
        </div>
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { n: 1, text: "Copy your card link from the Digital Card tab above, then click Download below." },
            { n: 2, text: "In Gmail: go to Settings → See all settings → Signature. Click the image icon, upload the PNG. Then select the image and click the link icon to paste your card URL." },
            { n: 3, text: "In Outlook: go to New Email → Signature → Edit. Insert the PNG as a picture, right-click it, and select Hyperlink to paste your card URL." },
            { n: 4, text: "Anyone who clicks the signature image goes directly to your digital card." },
          ].map(s => (
            <div key={s.n} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#EBF7FF", color: "#00AEFF", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{s.n}</div>
              <p style={{ fontSize: 12, color: "#374151", margin: 0, lineHeight: 1.6 }}>{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Hidden full-size export target */}
      <div style={{ position: "fixed", left: -9999, top: -9999, pointerEvents: "none" }}>
        <div ref={exportRef}>
          <EmailSigCanvas data={data} accentColor={accentColor} showQr={showQr} />
        </div>
      </div>

      <Button onClick={handleDownload} disabled={downloading} size="lg">
        <Download className="size-4" />
        {downloading ? "Generating…" : "Download Email Signature"}
      </Button>
    </div>
  )
}