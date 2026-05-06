export default function BvlgariLoader({ message = 'Memuat data...' }: { message?: string }) {
  return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-10 select-none">

      {/* ── Logo mark ─────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>

        {/* Outer ring — slow CW dashes */}
        <svg className="bvl-ring-cw absolute inset-0" width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r="84"
            fill="none" stroke="#B45309" strokeWidth="1"
            strokeDasharray="14 8" strokeLinecap="round" opacity="0.35" />
        </svg>

        {/* Middle ring — faster CCW solid arcs */}
        <svg className="bvl-ring-ccw absolute inset-0" width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r="74"
            fill="none" stroke="#D97706" strokeWidth="1.5"
            strokeDasharray="55 180" strokeLinecap="round" opacity="0.5" />
        </svg>

        {/* Inner accent ring — subtle CW */}
        <svg className="bvl-ring-cw absolute inset-0" style={{ animationDuration: '10s' }} width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r="63"
            fill="none" stroke="#F59E0B" strokeWidth="0.75"
            strokeDasharray="4 12" opacity="0.2" />
        </svg>

        {/* Core badge */}
        <div className="relative z-10 flex flex-col items-center justify-center rounded-full"
          style={{ width: 118, height: 118, background: 'radial-gradient(circle at 40% 35%, #1e293b, #0f172a)' }}>

          {/* Diamond SVG mark */}
          <svg viewBox="0 0 32 32" width="22" height="22" className="bvl-glow mb-2.5">
            <polygon points="16,2 30,12 16,30 2,12"
              fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" />
            <polygon points="16,2 30,12 16,16 2,12"
              fill="#F59E0B" opacity="0.15" />
            <line x1="2" y1="12" x2="30" y2="12" stroke="#F59E0B" strokeWidth="1" opacity="0.4" />
            <line x1="16" y1="2"  x2="16" y2="30" stroke="#F59E0B" strokeWidth="1" opacity="0.25" />
          </svg>

          {/* BVLGARI wordmark */}
          <span className="bvl-title block text-center font-black uppercase"
            style={{
              fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
              fontSize: 13,
              letterSpacing: '0.45em',
              color: '#FCD34D',
              textShadow: '0 0 12px rgba(251,191,36,0.4)',
            }}>
            BVLGARI
          </span>

          {/* ROMA subtitle */}
          <span className="mt-1 block text-center font-medium uppercase"
            style={{
              fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
              fontSize: 7,
              letterSpacing: '0.35em',
              color: '#92400E',
            }}>
            ROMA
          </span>
        </div>
      </div>

      {/* ── Shimmer bar ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-full"
        style={{ width: 160, height: 2, backgroundColor: 'rgba(180,83,9,0.15)' }}>
        <div className="bvl-shimmer absolute inset-y-0 left-0 rounded-full"
          style={{
            width: '35%',
            background: 'linear-gradient(90deg, transparent, #F59E0B, transparent)',
          }} />
      </div>

      {/* ── Dot indicators ────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {[0,1,2].map(i => (
          <span key={i}
            className={['bvl-dot-1','bvl-dot-2','bvl-dot-3'][i]}
            style={{
              display: 'inline-block',
              width: 5, height: 5,
              borderRadius: '50%',
              backgroundColor: '#D97706',
            }} />
        ))}
      </div>

      {/* ── Message ───────────────────────────────────────────────── */}
      <p className="text-xs font-medium tracking-widest uppercase"
        style={{ color: '#78716C', letterSpacing: '0.2em' }}>
        {message}
      </p>

    </div>
  );
}
