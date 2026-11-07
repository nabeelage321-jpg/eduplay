// Twinkle — EduPlay's helper mascot, drawn as original inline SVG.
// A little star character: eyes, smile, cheeks, arms with hands, feet.
// Left hand holds a small teal BOOK, right hand holds a small MOBILE
// (phone) — the two things kids use to learn and play. CSS/SVG only:
// no downloaded image, no copied art. The old PNG portrait
// (/eduplay-mascot.png) is no longer used by the helper button.
export default function TwinkleArt() {
  return (
    <svg
      viewBox="0 0 128 108"
      role="img"
      aria-label="Twinkle, EduPlay's helper star"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        <linearGradient id="twinkle-star-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFC93C" />
          <stop offset="100%" stopColor="#FF9A1F" />
        </linearGradient>
      </defs>
      {/* Arms (behind the star body) */}
      <path d="M28,54 Q14,60 15,72" fill="none" stroke="#E87E00" strokeWidth="5" strokeLinecap="round" />
      <path d="M100,54 Q114,60 113,72" fill="none" stroke="#E87E00" strokeWidth="5" strokeLinecap="round" />
      {/* Feet / little shoes */}
      <ellipse cx="52" cy="96" rx="7" ry="4.5" fill="#26264A" />
      <ellipse cx="76" cy="96" rx="7" ry="4.5" fill="#26264A" />
      {/* Star body */}
      <path
        d="M64,16 L74,44.2 L103.9,45 L80.2,63.3 L88.7,92 L64,75 L39.3,92 L47.8,63.3 L24.1,45 L54,44.2 Z"
        fill="url(#twinkle-star-body)"
        stroke="#E87E00"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Eyes */}
      <ellipse cx="54" cy="55" rx="4.5" ry="6" fill="#26264A" />
      <ellipse cx="74" cy="55" rx="4.5" ry="6" fill="#26264A" />
      <circle cx="55.5" cy="52.5" r="1.5" fill="#FFFFFF" />
      <circle cx="75.5" cy="52.5" r="1.5" fill="#FFFFFF" />
      {/* Cheeks + smile */}
      <circle cx="48" cy="64" r="3.5" fill="#FF9EBB" opacity="0.8" />
      <circle cx="80" cy="64" r="3.5" fill="#FF9EBB" opacity="0.8" />
      <path d="M56,66 Q64,72 72,66" fill="none" stroke="#26264A" strokeWidth="2.5" strokeLinecap="round" />
      {/* Left hand holding a BOOK */}
      <circle cx="15" cy="73" r="4" fill="#FFB020" stroke="#E87E00" strokeWidth="1.5" />
      <g transform="rotate(-8 13 74)">
        <rect x="2" y="66" width="22" height="17" rx="2.5" fill="#0E7C7B" />
        <rect x="4.5" y="68.5" width="17" height="12" rx="1.5" fill="#FFF8E7" />
        <line x1="13" y1="68.5" x2="13" y2="80.5" stroke="#0E7C7B" strokeWidth="1.5" />
      </g>
      {/* Right hand holding a MOBILE (phone) */}
      <circle cx="113" cy="73" r="4" fill="#FFB020" stroke="#E87E00" strokeWidth="1.5" />
      <g transform="rotate(8 111 76)">
        <rect x="104" y="64" width="15" height="24" rx="3" fill="#26264A" />
        <rect x="106.5" y="67" width="10" height="15" rx="1" fill="#8FE3FF" />
        <circle cx="111.5" cy="84.5" r="1" fill="#FFFFFF" />
      </g>
    </svg>
  )
}
