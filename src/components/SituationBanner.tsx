// Altura fija a propósito: así el retrato de abajo siempre ocupa el mismo
// espacio, sin importar si el texto de la carta es corto o largo. Los
// textos muy largos se recortan con "…" en vez de agrandar el banner.
// Banner compacto (letra pequeña) para dejarle sitio a la carta, que es lo
// que manda visualmente — estilo Reigns.
const BANNER_HEIGHT = 168

// Ritmo visual: las cartas de hito no se leen igual que una carta cualquiera.
// El banner cambia de color y saca una etiqueta pequeña arriba, para que se
// note de un vistazo que esto NO es un turno de trámite.
export type BannerKind = 'normal' | 'eleccion' | 'balance' | 'favor'

const ESTILO: Record<
  BannerKind,
  { bg: string; borde: string; etiqueta?: string; color: string }
> = {
  normal: { bg: '#1c1c1e', borde: 'rgba(224,184,77,0.25)', color: '#e0b84d' },
  eleccion: { bg: '#221c0e', borde: 'rgba(224,184,77,0.65)', etiqueta: 'Noche electoral', color: '#e0b84d' },
  balance: { bg: '#0e1c21', borde: 'rgba(120,199,214,0.55)', etiqueta: 'Balance del año', color: '#9bd6e2' },
  favor: { bg: '#0f1f18', borde: 'rgba(107,214,154,0.55)', etiqueta: 'Te deben una', color: '#8fe0b4' },
}

export function SituationBanner({ text, kind = 'normal' }: { text: string; kind?: BannerKind }) {
  const e = ESTILO[kind]
  return (
    <div
      style={{
        position: 'relative',
        flexShrink: 0,
        height: BANNER_HEIGHT,
        boxSizing: 'border-box',
        background: e.bg,
        borderBottom: `1px solid ${e.borde}`,
        padding: e.etiqueta ? '20px 14px 8px' : '8px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {e.etiqueta && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: 'var(--font-pixel)',
            fontWeight: 500,
            fontSize: 12,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: e.color,
          }}
        >
          ◆ {e.etiqueta} ◆
        </div>
      )}
      <div
        // Marca para las pruebas automáticas: sin ella hay que localizar este
        // texto recorriendo todos los divs con getComputedStyle, que fuerza un
        // reflow por elemento y llega a tumbar la pestaña al repetirlo miles
        // de veces.
        data-testid="situacion"
        style={{
          fontFamily: 'var(--font-pixel)',
          fontWeight: 500,
          fontSize: 18,
          lineHeight: 1.3,
          letterSpacing: 0.2,
          textAlign: 'center',
          color: '#f7ecd2',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: e.etiqueta ? 7 : 8,
          overflow: 'hidden',
        }}
      >
        {text}
      </div>
    </div>
  )
}
