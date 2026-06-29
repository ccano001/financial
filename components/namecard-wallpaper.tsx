"use client"

import { forwardRef, useLayoutEffect, useRef, useState } from "react"
import { QRCodeSVG } from "qrcode.react"

export type LogoStyle = "tl" | "tr" | "banner"
export type GroupPosition = "left" | "center" | "right"

export interface NamecardData {
  displayName: string
  jobTitle: string
  firmName: string
  phone: string
  email: string
  address: string
  profilePhoto: string | null
  firmLogo: string | null
  backgroundColor: string
  backgroundImage: string | null
  fontColor: string | null
  photoShape: "portrait" | "circle"
  logoStyle: LogoStyle
  groupPosition: GroupPosition
  qrValue: string
  brandName: string
}

// CONSTRAINT 1 — name display logic.
// Hard cap: 28 chars max (truncate with ellipsis beyond that).
// Max 2 lines, 12 chars per line.
// ≤12 chars: single line, full base size.
// 13–24 chars: single line, font scales down proportionally.
// 25–28 chars: split into 2 lines (12 chars each), font reduces further.
function computeNameLines(name: string, baseSize: number, wrapSize: number): { lines: string[]; size: number } {
  // FIX: hard cap at 28 chars
  const trimmed = name.trim().slice(0, 28)
  const len = trimmed.length

  if (len <= 12) {
    return { lines: [trimmed], size: baseSize }
  }
  if (len <= 24) {
    // single line, scale baseSize -> (baseSize - 8) proportionally
    const size = Math.round(baseSize - ((len - 12) / 12) * 8)
    return { lines: [trimmed], size }
  }

  // FIX: 25–28 chars: always 2 lines, font reduces from wrapSize.
  // Split at last space at or before char 12; if none, hard-split at 12.
  const extraChars = Math.max(0, len - 24)
  const reducedSize = Math.max(14, wrapSize - Math.floor(extraChars / 2))

  let splitIndex = trimmed.lastIndexOf(" ", 12)
  if (splitIndex <= 0) splitIndex = 12
  let line1 = trimmed.slice(0, splitIndex).trimEnd()
  let line2 = trimmed.slice(splitIndex).trimStart()
  // FIX: enforce 12-char max per line with ellipsis
  if (line1.length > 12) line1 = line1.slice(0, 11) + "\u2026"
  if (line2.length > 12) line2 = line2.slice(0, 11) + "\u2026"
  return { lines: [line1, line2], size: reducedSize }
}

const SIDE_PHOTO_H = 150

function SideContact({ data, align, textPrimary, textSub }: { data: NamecardData; align: "left" | "right"; textPrimary: string; textSub: string }) {
  const nameRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLParagraphElement>(null)
  const firmRef = useRef<HTMLParagraphElement>(null)
  const blockRef = useRef<HTMLDivElement>(null)

  // FIX: increased base sizes for accessibility (was 24/18)
  // FIX: 26px base fits side layout without wrapping onto contact lines
  const baseName = computeNameLines(data.displayName, 26, 20)
  const [nameSize, setNameSize] = useState(baseName.size)
  const [titleSize, setTitleSize] = useState(14) // balanced accessibility vs fit
  const [firmSize, setFirmSize] = useState(14)

  useLayoutEffect(() => {
    const nEl = nameRef.current
    const tEl = titleRef.current
    const fEl = firmRef.current
    const block = blockRef.current

    // title/firm: start 14, shrink to fit single line, min 10
    let ts = 14
    if (tEl) {
      tEl.style.fontSize = `${ts}px`
      while (ts > 10 && tEl.scrollWidth > tEl.clientWidth) {
        ts -= 1
        tEl.style.fontSize = `${ts}px`
      }
    }
    let fs = 14
    if (fEl) {
      fEl.style.fontSize = `${fs}px`
      while (fs > 10 && fEl.scrollWidth > fEl.clientWidth) {
        fs -= 1
        fEl.style.fontSize = `${fs}px`
      }
    }

    // Shrink name if total block overflows photo height
    let ns = baseName.size
    if (nEl) nEl.style.fontSize = `${ns}px`
    const overflows = () => !!block && block.scrollHeight > SIDE_PHOTO_H
    while (overflows() && ns > 14) { ns -= 1; if (nEl) nEl.style.fontSize = `${ns}px` }
    while (overflows() && ts > 10) { ts -= 1; if (tEl) tEl.style.fontSize = `${ts}px` }
    while (overflows() && fs > 10) { fs -= 1; if (fEl) fEl.style.fontSize = `${fs}px` }

    setNameSize(ns)
    setTitleSize(ts)
    setFirmSize(fs)
  }, [data.displayName, data.jobTitle, data.firmName, baseName.size, align])

  const alignItems = align === "right" ? "flex-end" : "flex-start"
  const textAlign = align

  return (
    // FIX: single flex column with space-between — eliminates dead gap between firm name and phone
    <div
      ref={blockRef}
      style={{
        flex: 1,
        height: SIDE_PHOTO_H,
        overflow: "hidden",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between", // FIX: distributes name block and contact evenly
        alignItems,
      }}
    >
      {/* TOP: name + title + firm */}
      <div style={{ display: "flex", flexDirection: "column", alignItems, minWidth: 0, width: "100%" }}>
        <div
          ref={nameRef}
          style={{ fontSize: nameSize, fontWeight: "bold", lineHeight: 1.15, color: textPrimary, width: "100%", textAlign }}
        >
          {baseName.lines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
        <p ref={titleRef} style={{ margin: "4px 0 0", fontSize: titleSize, color: textSub, textAlign, width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {data.jobTitle}
        </p>
        <p ref={firmRef} style={{ margin: "3px 0 0", fontSize: firmSize, color: textSub, textAlign, width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {data.firmName}
        </p>
      </div>

      {/* BOTTOM: phone + email — pinned to bottom via space-between, no gap */}
      <div style={{ display: "flex", flexDirection: "column", alignItems, width: "100%", minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, color: textPrimary, textAlign, width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          M: {data.phone}
        </p>
        <p style={{ margin: "3px 0 0", fontSize: 12, color: textPrimary, textAlign, width: "100%", wordBreak: "break-all", lineHeight: 1.2 }}>
          E: {data.email}
        </p>
      </div>
    </div>
  )
}

function CenterContact({ data, maxHeight, textPrimary, textSub }: { data: NamecardData; maxHeight: number; textPrimary: string; textSub: string }) {
  const blockRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLParagraphElement>(null)
  const firmRef = useRef<HTMLParagraphElement>(null)
  const phoneRef = useRef<HTMLParagraphElement>(null)
  const emailRef = useRef<HTMLParagraphElement>(null)

  const baseName = computeNameLines(data.displayName, 32, 24)
  const baseGaps = { title: 6, firm: 4, phone: 12, email: 4 }

  const [nameSize, setNameSize] = useState(baseName.size)
  const [titleSize, setTitleSize] = useState(16)
  const [firmSize, setFirmSize] = useState(16)
  const [gaps, setGaps] = useState(baseGaps)

  useLayoutEffect(() => {
    const block = blockRef.current
    const nEl = nameRef.current
    const tEl = titleRef.current
    const fEl = firmRef.current
    const phEl = phoneRef.current
    const emEl = emailRef.current

    let ts = 16
    if (tEl) {
      tEl.style.fontSize = `${ts}px`
      while (ts > 9 && tEl.scrollWidth > tEl.clientWidth) { ts -= 1; tEl.style.fontSize = `${ts}px` }
    }
    let fs = 16
    if (fEl) {
      fEl.style.fontSize = `${fs}px`
      while (fs > 9 && fEl.scrollWidth > fEl.clientWidth) { fs -= 1; fEl.style.fontSize = `${fs}px` }
    }
    // FIX: enforce matching font size — use the smaller of the two so both always match
    const matchedSize = Math.min(ts, fs)
    ts = matchedSize; fs = matchedSize
    if (tEl) tEl.style.fontSize = `${ts}px`
    if (fEl) fEl.style.fontSize = `${fs}px`

    const overflows = () => !!block && block.scrollHeight > maxHeight

    const applyGaps = (scale: number) => {
      const g = {
        title: Math.max(1, Math.round(baseGaps.title * scale)),
        firm: Math.max(1, Math.round(baseGaps.firm * scale)),
        phone: Math.max(1, Math.round(baseGaps.phone * scale)),
        email: Math.max(1, Math.round(baseGaps.email * scale)),
      }
      if (tEl) tEl.style.marginTop = `${g.title}px`
      if (fEl) fEl.style.marginTop = `${g.firm}px`
      if (phEl) phEl.style.marginTop = `${g.phone}px`
      if (emEl) emEl.style.marginTop = `${g.email}px`
      return g
    }

    let scale = 1
    let g = applyGaps(scale)
    while (overflows() && scale > 0.15) { scale -= 0.05; g = applyGaps(scale) }

    let ns = baseName.size
    if (nEl) nEl.style.fontSize = `${ns}px`
    while (overflows() && ns > 18) { ns -= 1; if (nEl) nEl.style.fontSize = `${ns}px` }
    while (overflows() && ts > 9) { ts -= 1; if (tEl) tEl.style.fontSize = `${ts}px` }
    while (overflows() && fs > 9) { fs -= 1; if (fEl) fEl.style.fontSize = `${fs}px` }

    setNameSize(ns)
    setTitleSize(ts)
    setFirmSize(fs)
    setGaps(g)
  }, [data.displayName, data.jobTitle, data.firmName, data.phone, data.email, maxHeight, baseName.size])

  return (
    <div ref={blockRef} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: "100%" }}>
      <div ref={nameRef} style={{ fontSize: nameSize, fontWeight: "bold", lineHeight: 1.1, color: textPrimary, width: "100%", textAlign: "center" }}>
        {baseName.lines.map((l, i) => <div key={i}>{l}</div>)}
      </div>
      <p ref={titleRef} style={{ margin: `${gaps.title}px 0 0`, fontSize: titleSize, color: textSub, width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>
        {data.jobTitle}
      </p>
      <p ref={firmRef} style={{ margin: `${gaps.firm}px 0 0`, fontSize: firmSize, color: textSub, width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>
        {data.firmName}
      </p>
      <p ref={phoneRef} style={{ margin: `${gaps.phone}px 0 0`, fontSize: 14, color: textPrimary, width: "100%", textAlign: "center" }}>
        M: {data.phone}
      </p>
      <p ref={emailRef} style={{ margin: `${gaps.email}px 0 0`, fontSize: 14, color: textPrimary, width: "100%", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        E: {data.email}
      </p>
    </div>
  )
}

function PhotoBlock({ profilePhoto, displayName, size, photoShape = "portrait" }: { profilePhoto: string | null; displayName: string; size: "center" | "side"; photoShape?: "portrait" | "circle" }) {
  const initials = displayName.split(" ").filter((w) => w.length > 0).slice(0, 2).map((w) => w[0]).join("")
  const dims = size === "center" ? { width: 140, height: 180 } : { width: 120, height: 150 }
  const isCircle = photoShape === "circle"
  const circleDim = size === "center" ? 140 : 120

  return (
    <div style={{
      ...(isCircle ? { width: circleDim, height: circleDim } : dims),
      borderRadius: isCircle ? "50%" : 9,
      border: "2px solid white", overflow: "hidden", background: "#0C447C",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 32, fontWeight: "bold", color: "white", flexShrink: 0,
      boxShadow: "0 1px 4px rgba(0,0,0,0.15)"
    }}>
      {profilePhoto
        ? <img src={profilePhoto || "/placeholder.svg"} crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={displayName} />
        : initials}
    </div>
  )
}

interface NamecardWallpaperProps {
  data: NamecardData
  logoCornerColor?: string   // sampled from logo corner — used as container bg
  onEditPhoto?: () => void
  onEditLogo?: () => void
}

const NamecardWallpaper = forwardRef<HTMLDivElement, NamecardWallpaperProps>(function NamecardWallpaper(
  { data, logoCornerColor = "transparent", onEditPhoto, onEditLogo }, ref,
) {
  const isBanner = data.logoStyle === "banner"
  const group = data.groupPosition
  const isSide = group === "left" || group === "right"

  // Adaptive text colors based on background luminance
  const hex = (data.backgroundColor || "#FFFFFF").replace("#", "")
  const r = parseInt(hex.slice(0,2)||"ff",16)
  const g = parseInt(hex.slice(2,4)||"ff",16)
  const b = parseInt(hex.slice(4,6)||"ff",16)
  const luma = 0.299*r + 0.587*g + 0.114*b
  const isDark = luma < 160
  const textPrimary = data.fontColor || (isDark ? "#FFFFFF"                  : "#1A1A1A")
  const textSub     = data.fontColor ? `${data.fontColor}CC`                 : (isDark ? "rgba(255,255,255,0.70)" : "#666666")
  const textMuted   = data.fontColor ? `${data.fontColor}77`                 : (isDark ? "rgba(255,255,255,0.45)" : "#999999")

  const CENTER_PHOTO_H = 180
  // Photo starts below iOS clock zone (~160px)
  const centerPhotoTop = isBanner ? 155 : 90
  const centerNameTop = centerPhotoTop + CENTER_PHOTO_H + 12

  // QR: smaller so address fits below; bottom clears iOS flashlight zone
  const QR_SIZE = 200
  const SAFE_QR_BOTTOM = 708  // 844 - 100 iOS UI - 36 address zone
  // FIX: banner+center needs more vertical room for text — push QR lower only in that case
  const centerQrTop = isBanner
    ? Math.min(520, SAFE_QR_BOTTOM - QR_SIZE)   // banner: more room for text block
    : Math.min(408, SAFE_QR_BOTTOM - QR_SIZE)    // no banner: unchanged
  const qrTop = Math.min(isSide ? 460 : centerQrTop, SAFE_QR_BOTTOM - QR_SIZE)

  // Address: 12px gap below QR, sits above iOS UI zone
  const addrTop = qrTop + QR_SIZE + 28

  const centerMaxHeight = centerQrTop - 8 - centerNameTop

  return (
    <div
      ref={ref}
      style={{
        width: 390, height: 844, position: "relative", overflow: "hidden",
        background: data.backgroundColor, fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* BACKGROUND IMAGE — renders behind everything */}
      {data.backgroundImage && (
        <img
          src={data.backgroundImage}
          crossOrigin="anonymous"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
          alt=""
        />
      )}

      {/* BRAND BADGE */}
      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 20, background: "rgba(0,0,0,0.45)", borderRadius: 20, padding: "3px 8px", display: "flex", alignItems: "center", gap: 4 }}>
        <svg width="14" height="8" viewBox="0 0 14 8" aria-hidden="true">
          <rect x="0" y="4" width="2" height="4" fill="white" />
          <rect x="3" y="2" width="2" height="6" fill="white" />
          <rect x="6" y="3" width="2" height="5" fill="white" />
          <rect x="9" y="1" width="2" height="7" fill="white" />
          <rect x="12" y="3" width="2" height="5" fill="white" />
        </svg>
        <span style={{ fontSize: 10, color: "white", fontWeight: 500 }}>{data.brandName}</span>
      </div>

      {/* LOGO — TOP LEFT CIRCLE */}
      {data.logoStyle === "tl" && data.firmLogo && (
        <div onClick={() => onEditLogo?.()} title="Click to edit logo" style={{ position: "absolute", top: -65, left: -65, zIndex: 6, width: 260, height: 260, borderRadius: "50%", overflow: "hidden", background: logoCornerColor, cursor: "pointer" }}>
          <img src={data.firmLogo || "/placeholder.svg"} crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="firm logo" />
        </div>
      )}

      {/* LOGO — TOP RIGHT CIRCLE */}
      {data.logoStyle === "tr" && data.firmLogo && (
        <div onClick={() => onEditLogo?.()} title="Click to edit logo" style={{ position: "absolute", top: -65, right: -65, zIndex: 6, width: 260, height: 260, borderRadius: "50%", overflow: "hidden", background: logoCornerColor, cursor: "pointer" }}>
          <img src={data.firmLogo || "/placeholder.svg"} crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="firm logo" />
        </div>
      )}

      {/* LOGO — TOP BANNER: fills full width edge to edge */}
      {data.logoStyle === "banner" && data.firmLogo && (
        <div onClick={() => onEditLogo?.()} title="Click to edit logo" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 138, zIndex: 4, cursor: "pointer", overflow: "hidden", background: logoCornerColor }}>
          <img src={data.firmLogo || "/placeholder.svg"} crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} alt="firm logo" />
        </div>
      )}

      {/* CENTER LAYOUT */}
      {group === "center" && (
        <>
          <div style={{ position: "absolute", top: centerPhotoTop, left: 0, right: 0, zIndex: 10, display: "flex", justifyContent: "center", cursor: data.profilePhoto ? "pointer" : "default" }} onClick={() => data.profilePhoto && onEditPhoto?.()} title={data.profilePhoto ? "Click to edit photo" : undefined}>
            <PhotoBlock profilePhoto={data.profilePhoto} displayName={data.displayName} size="center" photoShape={data.photoShape} />
          </div>
          <div style={{ position: "absolute", top: centerNameTop, left: 24, right: 24, zIndex: 10 }}>
            <CenterContact data={data} maxHeight={centerMaxHeight} textPrimary={textPrimary} textSub={textSub} />
          </div>
        </>
      )}

      {/* LEFT LAYOUT */}
      {group === "left" && (
        <div style={{ position: "absolute", top: 230, left: 24, right: 24, zIndex: 10, display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
          <div onClick={() => data.profilePhoto && onEditPhoto?.()} title={data.profilePhoto ? "Click to edit photo" : undefined} style={{ cursor: data.profilePhoto ? "pointer" : "default", flexShrink: 0 }}>
            <PhotoBlock profilePhoto={data.profilePhoto} displayName={data.displayName} size="side" photoShape={data.photoShape} />
          </div>
          <SideContact data={data} align="left" textPrimary={textPrimary} textSub={textSub} />
        </div>
      )}

      {/* RIGHT LAYOUT */}
      {group === "right" && (
        <div style={{ position: "absolute", top: 230, left: 24, right: 24, zIndex: 10, display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
          <SideContact data={data} align="right" textPrimary={textPrimary} textSub={textSub} />
          <div onClick={() => data.profilePhoto && onEditPhoto?.()} title={data.profilePhoto ? "Click to edit photo" : undefined} style={{ cursor: data.profilePhoto ? "pointer" : "default", flexShrink: 0 }}>
            <PhotoBlock profilePhoto={data.profilePhoto} displayName={data.displayName} size="side" photoShape={data.photoShape} />
          </div>
        </div>
      )}

      {/* QR CODE */}
      <div style={{ position: "absolute", top: qrTop, left: 0, right: 0, zIndex: 5, display: "flex", justifyContent: "center" }}>
        <div style={{ background: "white", padding: 4, border: "1px solid rgba(0,174,255,0.2)", borderRadius: 5 }}>
          <QRCodeSVG value={data.qrValue || " "} size={QR_SIZE} level="H" />
        </div>
      </div>

      {/* ADDRESS — wraps up to 2 lines, font shrinks for long addresses */}
      <p
        style={{
          position: "absolute",
          top: addrTop,
          left: 24,
          right: 24,
          fontSize: data.address.length > 30 ? 14 : 16,
          color: textMuted,
          textAlign: "center",
          margin: 0,
          lineHeight: 1.4,
          wordBreak: "break-word",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {data.address}
      </p>
    </div>
  )
})

export default NamecardWallpaper