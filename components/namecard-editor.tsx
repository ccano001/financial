"use client"

import type React from "react"
import { useRef, useState } from "react"
import NamecardWallpaper, {
  type NamecardData,
  type LogoStyle,
  type GroupPosition,
} from "@/components/namecard-wallpaper"
import { ZoomBackgroundOutput, EmailSignatureOutput } from "@/components/namecard-outputs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, Upload, X, ZoomIn, ZoomOut } from "lucide-react"

// ─── TYPES ───────────────────────────────────────────────────────
type OutputTab = "wallpaper" | "zoom" | "email" | "card"

const DEFAULT_DATA: NamecardData = {
  displayName: "Tan Wei Ling",
  jobTitle: "Financial Advisor",
  firmName: "Horizon Wealth Advisors",
  phone: "+65 9123 4567",
  email: "weiling@horizonwealth.com.sg",
  address: "1 Raffles Place, Singapore",
  profilePhoto: null,
  firmLogo: null,
  backgroundColor: "#FFFFFF",
  logoStyle: "banner",
  groupPosition: "center",
  qrValue: "https://financialruler.com/meet/demo",
  brandName: "FinancialRuler",
}

const LOGO_OPTIONS: { value: LogoStyle; label: string }[] = [
  { value: "tl", label: "Top left circle" },
  { value: "tr", label: "Top right circle" },
  { value: "banner", label: "Top banner" },
]

const GROUP_OPTIONS: { value: GroupPosition; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
]

// ─── DIGITAL CARD SETTINGS ──────────────────────────────────────
interface DigitalCardSettings {
  baseUrl:    string
  // Social toggles
  linkedin:   string; linkedinOn:   boolean
  youtube:    string; youtubeOn:    boolean
  instagram:  string; instagramOn:  boolean
  facebook:   string; facebookOn:   boolean
  twitter:    string; twitterOn:    boolean
  website:    string; websiteOn:    boolean
  // Calendly
  calendly:   string
  // Featured links (label|url)
  link1Label: string; link1Url: string
  link2Label: string; link2Url: string
  // Offer toggles
  offerKyc:      boolean
  offerAccess:   boolean
  offerNamecard: boolean
}

const DEFAULT_CARD: DigitalCardSettings = {
  baseUrl:      "https://financialruler.com/card",
  linkedin:     "", linkedinOn:   false,
  youtube:      "", youtubeOn:    false,
  instagram:    "", instagramOn:  false,
  facebook:     "", facebookOn:   false,
  twitter:      "", twitterOn:    false,
  website:      "", websiteOn:    false,
  calendly:     "",
  link1Label:   "", link1Url:     "",
  link2Label:   "", link2Url:     "",
  offerKyc:      true,
  offerAccess:   true,
  offerNamecard: true,
}

// ─── IMAGE CROP MODAL ────────────────────────────────────────────
type FitMode = "crop" | "fit"

function ImageEditModal({
  src, label, aspectRatio, onApply, onClose,
}: {
  src: string; label: string; aspectRatio: number
  onApply: (dataUrl: string) => void; onClose: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [fitMode, setFitMode] = useState<FitMode>("crop")
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })
  const imgRef = useRef<HTMLImageElement | null>(null)

  const PREV_W = 220
  const PREV_H = Math.round(PREV_W / aspectRatio)

  const drawPreview = () => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, PREV_W, PREV_H)
    if (fitMode === "fit") {
      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(0, 0, PREV_W, PREV_H)
      const scale = Math.min(PREV_W / img.width, PREV_H / img.height)
      const w = img.width * scale; const h = img.height * scale
      ctx.drawImage(img, (PREV_W - w) / 2, (PREV_H - h) / 2, w, h)
    } else {
      const baseScale = Math.max(PREV_W / img.width, PREV_H / img.height)
      const scale = baseScale * zoom
      const drawW = img.width * scale; const drawH = img.height * scale
      ctx.drawImage(img, (PREV_W - drawW) / 2 + offset.x, (PREV_H - drawH) / 2 + offset.y, drawW, drawH)
    }
  }

  const loadImage = (src: string) => {
    const img = new Image(); img.crossOrigin = "anonymous"; img.src = src
    img.onload = () => { imgRef.current = img; drawPreview() }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useState(() => { loadImage(src) })

  const onMouseDown = (e: React.MouseEvent) => {
    if (fitMode !== "crop") return
    setDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    setOffset({ x: dragStart.current.ox + e.clientX - dragStart.current.mx, y: dragStart.current.oy + e.clientY - dragStart.current.my })
    drawPreview()
  }
  const onMouseUp = () => setDragging(false)
  const onTouchStart = (e: React.TouchEvent) => {
    if (fitMode !== "crop") return
    const t = e.touches[0]; setDragging(true)
    dragStart.current = { mx: t.clientX, my: t.clientY, ox: offset.x, oy: offset.y }
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return
    const t = e.touches[0]
    setOffset({ x: dragStart.current.ox + t.clientX - dragStart.current.mx, y: dragStart.current.oy + t.clientY - dragStart.current.my })
    drawPreview()
  }

  const handleApply = () => {
    const canvas = canvasRef.current; const img = imgRef.current
    if (!canvas || !img) return
    const OUT_W = PREV_W * 2; const OUT_H = PREV_H * 2
    const off = document.createElement("canvas"); off.width = OUT_W; off.height = OUT_H
    const ctx = off.getContext("2d")!
    if (fitMode === "fit") {
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, OUT_W, OUT_H)
      const scale = Math.min(OUT_W / img.width, OUT_H / img.height)
      const w = img.width * scale; const h = img.height * scale
      ctx.drawImage(img, (OUT_W - w) / 2, (OUT_H - h) / 2, w, h)
    } else {
      const baseScale = Math.max(OUT_W / img.width, OUT_H / img.height)
      const scale = baseScale * zoom; const drawW = img.width * scale; const drawH = img.height * scale
      ctx.drawImage(img, (OUT_W - drawW) / 2 + offset.x * 2, (OUT_H - drawH) / 2 + offset.y * 2, drawW, drawH)
    }
    onApply(off.toDataURL("image/jpeg", 0.95))
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: "white", borderRadius: 16, padding: 24, width: 300, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Edit {label}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["crop", "fit"] as FitMode[]).map(m => (
            <button key={m} onClick={() => { setFitMode(m); setZoom(1); setOffset({ x: 0, y: 0 }) }}
              style={{ flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", background: fitMode === m ? "#00AEFF" : "#f0f0f0", color: fitMode === m ? "white" : "#666", border: "none" }}>
              {m === "crop" ? "Crop to fit" : "Fit to frame"}
            </button>
          ))}
        </div>
        <div style={{ width: PREV_W, height: PREV_H, margin: "0 auto", borderRadius: 8, overflow: "hidden", border: "2px solid #e0e0e0", cursor: fitMode === "crop" ? (dragging ? "grabbing" : "grab") : "default" }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onMouseUp}>
          <canvas ref={canvasRef} width={PREV_W} height={PREV_H} style={{ display: "block" }} />
        </div>
        {fitMode === "crop" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ZoomOut size={14} color="#666" />
              <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => { setZoom(parseFloat(e.target.value)); drawPreview() }} style={{ flex: 1 }} />
              <ZoomIn size={14} color="#666" />
            </div>
            <p style={{ margin: 0, fontSize: 11, color: "#999", textAlign: "center" }}>Drag to reposition · scroll slider to zoom</p>
          </>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, background: "#f0f0f0", color: "#444", border: "none", cursor: "pointer" }}>Cancel</button>
          <button onClick={handleApply} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, background: "#00AEFF", color: "white", border: "none", cursor: "pointer", fontWeight: 600 }}>Apply</button>
        </div>
      </div>
    </div>
  )
}

// ─── HELPERS ─────────────────────────────────────────────────────
function FieldRow({ id, label, value, onChange, placeholder }: {
  id: string; label: string; value: string
  onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function ImageUpload({ label, value, onChange, aspectRatio }: {
  label: string; value: string | null; onChange: (v: string | null) => void; aspectRatio: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [editSrc, setEditSrc] = useState<string | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => setEditSrc(reader.result as string)
    reader.readAsDataURL(file); e.target.value = ""
  }

  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" />{value ? "Replace" : "Upload"}
        </Button>
        {value && (
          <>
            <button type="button" onClick={() => setEditSrc(value)} style={{ padding: 0, background: "none", border: "none", cursor: "pointer" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt={`${label} preview`} className="size-9 rounded-md border border-border object-cover hover:opacity-80 transition-opacity" title="Click to edit" />
            </button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              <X className="size-4" />Remove
            </Button>
          </>
        )}
      </div>
      {editSrc && (
        <ImageEditModal src={editSrc} label={label} aspectRatio={aspectRatio}
          onApply={dataUrl => { onChange(dataUrl); setEditSrc(null) }}
          onClose={() => setEditSrc(null)} />
      )}
    </div>
  )
}

function SegmentedControl<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className={opt.value === value
            ? "rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            : "rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"}
          aria-pressed={opt.value === value}>
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── MAIN EDITOR ─────────────────────────────────────────────────
export default function NamecardEditor() {
  const [data, setData] = useState<NamecardData>(DEFAULT_DATA)
  const [downloading, setDownloading] = useState(false)
  const [activeTab, setActiveTab] = useState<OutputTab>("wallpaper")
  const [cardEditTarget, setCardEditTarget] = useState<"profile" | "logo" | null>(null)
  const [card, setCard] = useState<DigitalCardSettings>(DEFAULT_CARD)
  const updateCard = <K extends keyof DigitalCardSettings>(key: K, val: DigitalCardSettings[K]) =>
    setCard(c => ({ ...c, [key]: val }))

  // Auto-generate digital card URL from profile + card settings
  const cardUrl = (() => {
    const p = new URLSearchParams()
    p.set("name",  data.displayName)
    p.set("title", data.jobTitle)
    p.set("firm",  data.firmName)
    p.set("phone", data.phone)
    p.set("email", data.email)
    if (card.linkedinOn   && card.linkedin)   p.set("linkedin",  card.linkedin)
    if (card.youtubeOn    && card.youtube)    p.set("youtube",   card.youtube)
    if (card.instagramOn  && card.instagram)  p.set("instagram", card.instagram)
    if (card.facebookOn   && card.facebook)   p.set("facebook",  card.facebook)
    if (card.twitterOn    && card.twitter)    p.set("twitter",   card.twitter)
    if (card.websiteOn    && card.website)    p.set("website",   card.website)
    if (card.calendly)   p.set("calendly", card.calendly)
    if (card.link1Url)   p.set("link1", `${card.link1Label}|${card.link1Url}`)
    if (card.link2Url)   p.set("link2", `${card.link2Label}|${card.link2Url}`)
    const offers = [
      card.offerKyc      && "kyc",
      card.offerAccess   && "access",
      card.offerNamecard && "namecard",
    ].filter(Boolean).join(",")
    if (offers) p.set("offers", offers)
    return `${card.baseUrl}?${p.toString()}`
  })()
  const cardRef = useRef<HTMLDivElement>(null)

  const update = <K extends keyof NamecardData>(key: K, value: NamecardData[K]) =>
    setData(d => ({ ...d, [key]: value }))

  const handleDownload = async () => {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const { toCanvas } = await import("html-to-image")
      const canvas = await toCanvas(cardRef.current, {
        pixelRatio: 3,
        backgroundColor: data.backgroundColor,
        skipFonts: false,
        canvasWidth: 390 * 3,
        canvasHeight: 844 * 3,
        style: { transform: "none", borderRadius: "0" },
      })
      const link = document.createElement("a")
      link.download = `FinancialRuler_Namecard_${data.displayName.replace(/\s+/g, "_") || "wallpaper"}.jpg`
      link.href = canvas.toDataURL("image/jpeg", 0.95); link.click()
    } catch (err) {
      console.log("[namecard] Download failed:", err)
    } finally {
      setDownloading(false)
    }
  }

  const PROFILE_RATIO = 120 / 150
  const LOGO_RATIO = data.logoStyle === "banner" ? 390 / 138 : 1

  const TABS = [
    { value: "wallpaper" as OutputTab, label: "Lock Screen" },
    { value: "zoom"      as OutputTab, label: "Zoom Bg" },
    { value: "email"     as OutputTab, label: "Email Sig" },
    { value: "card"      as OutputTab, label: "Digital Card" },
  ]

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_minmax(0,420px)] lg:py-12">

      {/* ── EDITOR PANEL ── */}
      <div className="order-2 lg:order-1">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Digital Namecard Builder</h1>
          <p className="mt-1 text-sm text-muted-foreground">Build your lock screen wallpaper, Zoom background, and email signature from one profile.</p>
        </div>

        <div className="grid gap-6">
          {/* Details */}
          <section className="grid gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Details</h2>
            <FieldRow id="displayName" label="Display name" value={data.displayName}
              onChange={v => update("displayName", v.slice(0, 28))} placeholder="Max 28 characters" />
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow id="jobTitle" label="Job title" value={data.jobTitle} onChange={v => update("jobTitle", v)} />
              <FieldRow id="firmName" label="Firm name" value={data.firmName} onChange={v => update("firmName", v)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow id="phone" label="Phone" value={data.phone} onChange={v => update("phone", v)} />
              <FieldRow id="email" label="Email" value={data.email} onChange={v => update("email", v)} />
            </div>
            <FieldRow id="address" label="Office address" value={data.address} onChange={v => update("address", v)} />
            <FieldRow id="qrValue" label="QR code link" value={data.qrValue} placeholder="https://..." onChange={v => update("qrValue", v)} />
            <FieldRow id="brandName" label="Wordmark" value={data.brandName} onChange={v => update("brandName", v)} />
          </section>

          {/* Media */}
          <section className="grid gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Media <span className="font-normal normal-case text-muted-foreground/70">(click thumbnail to edit)</span>
            </h2>
            <ImageUpload label="Profile photo" value={data.profilePhoto} onChange={v => update("profilePhoto", v)} aspectRatio={PROFILE_RATIO} />
            <ImageUpload label="Firm logo" value={data.firmLogo} onChange={v => update("firmLogo", v)} aspectRatio={LOGO_RATIO} />
          </section>

          {/* Layout — only relevant for wallpaper */}
          <section className="grid gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Wallpaper Layout</h2>
            <div className="grid gap-1.5">
              <Label>Logo style</Label>
              <SegmentedControl options={LOGO_OPTIONS} value={data.logoStyle} onChange={v => update("logoStyle", v)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Photo + name position</Label>
              <SegmentedControl options={GROUP_OPTIONS} value={data.groupPosition} onChange={v => update("groupPosition", v)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bgColor">Background color</Label>
              <div className="flex items-center gap-3">
                <input id="bgColor" type="color" value={data.backgroundColor}
                  onChange={e => update("backgroundColor", e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border border-border bg-background p-1" />
                <span className="font-mono text-sm text-muted-foreground">{data.backgroundColor.toUpperCase()}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ── OUTPUT PANEL ── */}
      <div className="order-1 lg:order-2">
        <div className="lg:sticky lg:top-8">

          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {TABS.map(tab => (
              <button key={tab.value} onClick={() => setActiveTab(tab.value)} style={{
                flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 12,
                fontWeight: 600, cursor: "pointer", border: "1.5px solid",
                borderColor: activeTab === tab.value ? "#00AEFF" : "#E5E7EB",
                background: activeTab === tab.value ? "#EBF7FF" : "white",
                color: activeTab === tab.value ? "#0090D8" : "#6B7280",
                transition: "all 0.15s",
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── LOCK SCREEN ── */}
          {activeTab === "wallpaper" && (
            <>
              <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Live preview · <span className="font-normal normal-case">tap photo or logo on card to edit</span>
              </p>
              <div className="flex justify-center">
                <div className="overflow-hidden rounded-[2.25rem] border-[6px] border-foreground/90 shadow-2xl">
                  <div style={{ width: 390, height: 844 }}>
                    <NamecardWallpaper
                      ref={cardRef}
                      data={data}
                      onEditPhoto={() => setCardEditTarget("profile")}
                      onEditLogo={() => setCardEditTarget("logo")}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={handleDownload} disabled={downloading} size="lg" className="w-full">
                  <Download className="size-4" />
                  {downloading ? "Generating…" : "Download Wallpaper"}
                </Button>
              </div>
            </>
          )}

          {/* ── ZOOM BACKGROUND ── */}
          {activeTab === "zoom" && <ZoomBackgroundOutput data={data} />}

          {/* ── EMAIL SIGNATURE ── */}
          {activeTab === "email" && <EmailSignatureOutput data={data} />}

          {/* ── DIGITAL CARD ── */}
          {activeTab === "card" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Base URL */}
              <div className="grid gap-1.5">
                <Label>Base URL</Label>
                <Input value={card.baseUrl} onChange={e => updateCard("baseUrl", e.target.value)} placeholder="https://financialruler.com/card" />
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>The domain where digital-card.html is hosted</p>
              </div>

              {/* Social toggles */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Social Links</h2>
                {([
                  { key: "linkedin",  onKey: "linkedinOn",  label: "LinkedIn",    placeholder: "linkedin.com/in/yourname" },
                  { key: "youtube",   onKey: "youtubeOn",   label: "YouTube",     placeholder: "youtube.com/@yourchannel" },
                  { key: "instagram", onKey: "instagramOn", label: "Instagram",   placeholder: "instagram.com/yourhandle" },
                  { key: "facebook",  onKey: "facebookOn",  label: "Facebook",    placeholder: "facebook.com/yourpage" },
                  { key: "twitter",   onKey: "twitterOn",   label: "X (Twitter)", placeholder: "x.com/yourhandle" },
                  { key: "website",   onKey: "websiteOn",   label: "Website",     placeholder: "yourwebsite.com" },
                ] as const).map(s => (
                  <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      onClick={() => updateCard(s.onKey, !card[s.onKey])}
                      style={{
                        width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", flexShrink: 0,
                        background: card[s.onKey] ? "#00AEFF" : "#E5E7EB",
                        position: "relative", transition: "background 0.2s",
                      }}
                    >
                      <span style={{
                        position: "absolute", top: 2, width: 16, height: 16, borderRadius: "50%", background: "white",
                        transition: "left 0.2s", left: card[s.onKey] ? 18 : 2,
                      }} />
                    </button>
                    <Label style={{ minWidth: 80, fontSize: 12 }}>{s.label}</Label>
                    <Input
                      value={card[s.key]}
                      onChange={e => updateCard(s.key, e.target.value)}
                      placeholder={s.placeholder}
                      disabled={!card[s.onKey]}
                      style={{ opacity: card[s.onKey] ? 1 : 0.4 }}
                    />
                  </div>
                ))}
              </div>

              {/* Calendly */}
              <div className="grid gap-1.5">
                <Label>Calendly URL</Label>
                <Input value={card.calendly} onChange={e => updateCard("calendly", e.target.value)} placeholder="calendly.com/yourname" />
              </div>

              {/* Featured links */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Featured Links (max 2)</h2>
                {([
                  { lKey: "link1Label" as const, uKey: "link1Url" as const, n: 1 },
                  { lKey: "link2Label" as const, uKey: "link2Url" as const, n: 2 },
                ]).map(l => (
                  <div key={l.n} style={{ display: "flex", gap: 8 }}>
                    <Input value={card[l.lKey]} onChange={e => updateCard(l.lKey, e.target.value)} placeholder={`Link ${l.n} label`} style={{ flex: "0 0 120px" }} />
                    <Input value={card[l.uKey]} onChange={e => updateCard(l.uKey, e.target.value)} placeholder="https://..." />
                  </div>
                ))}
              </div>

              {/* Offer toggles */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Offers to Show</h2>
                {([
                  { key: "offerKyc"      as const, label: "Free KYC Report" },
                  { key: "offerAccess"   as const, label: "1 Year Free Access" },
                  { key: "offerNamecard" as const, label: "Free Namecard" },
                ]).map(o => (
                  <div key={o.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      onClick={() => updateCard(o.key, !card[o.key])}
                      style={{
                        width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", flexShrink: 0,
                        background: card[o.key] ? "#00AEFF" : "#E5E7EB",
                        position: "relative", transition: "background 0.2s",
                      }}
                    >
                      <span style={{
                        position: "absolute", top: 2, width: 16, height: 16, borderRadius: "50%", background: "white",
                        transition: "left 0.2s", left: card[o.key] ? 18 : 2,
                      }} />
                    </button>
                    <Label style={{ fontSize: 13 }}>{o.label}</Label>
                  </div>
                ))}
              </div>

              {/* Generated URL */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your Card Link</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    readOnly value={cardUrl}
                    style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 11, fontFamily: "monospace", color: "#6B7280", background: "#F9FAFB", minWidth: 0 }}
                  />
                  <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(cardUrl)}>
                    Copy
                  </Button>
                </div>
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
                  Paste this as the QR code link in your Lock Screen tab — it will update automatically.
                </p>
                <Button onClick={() => { update("qrValue", cardUrl) }} variant="outline" size="sm" className="w-full">
                  ↑ Sync to Lock Screen QR
                </Button>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* ── CARD-CLICK EDIT MODALS ── */}
      {cardEditTarget === "profile" && data.profilePhoto && (
        <ImageEditModal src={data.profilePhoto} label="Profile photo" aspectRatio={PROFILE_RATIO}
          onApply={dataUrl => { update("profilePhoto", dataUrl); setCardEditTarget(null) }}
          onClose={() => setCardEditTarget(null)} />
      )}
      {cardEditTarget === "logo" && data.firmLogo && (
        <ImageEditModal src={data.firmLogo} label="Firm logo" aspectRatio={LOGO_RATIO}
          onApply={dataUrl => { update("firmLogo", dataUrl); setCardEditTarget(null) }}
          onClose={() => setCardEditTarget(null)} />
      )}
    </div>
  )
}