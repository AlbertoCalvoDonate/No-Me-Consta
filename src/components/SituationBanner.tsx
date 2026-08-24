// Altura fija a propósito: así el retrato de abajo siempre ocupa el mismo
// espacio, sin importar si el texto de la carta es corto o largo. Los
// textos muy largos se recortan con "…" en vez de agrandar el banner.
const BANNER_HEIGHT = 225

export function SituationBanner({ text }: { text: string }) {
  return (
    <div
      style={{
        flexShrink: 0,
        height: BANNER_HEIGHT,
        boxSizing: 'border-box',
        background: '#1c1c1e',
        borderBottom: '1px solid rgba(224,184,77,0.25)',
        padding: '10px 22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-pixel)',
          fontWeight: 500,
          fontSize: 23,
          lineHeight: 1.35,
          letterSpacing: 0.3,
          textAlign: 'center',
          color: '#f7ecd2',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 6,
          overflow: 'hidden',
        }}
      >
        {text}
      </div>
    </div>
  )
}
