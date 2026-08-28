export function BottomBar({ turn }: { turn: number }) {
  return (
    <div
      style={{
        flexShrink: 0,
        background: '#111113',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: 'var(--font-pixel)',
        fontSize: 20,
        fontWeight: 500,
        color: '#a89f8c',
      }}
    >
      <span style={{ color: '#e0b84d' }}>Presidente</span>
      <span>
        {turn} mes{turn === 1 ? '' : 'es'} en el cargo
      </span>
    </div>
  )
}
