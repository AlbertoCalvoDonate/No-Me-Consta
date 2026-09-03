import { SoundButton } from './SoundButton'

export function BottomBar({ turn }: { turn: number }) {
  return (
    <div
      style={{
        flexShrink: 0,
        background: '#111113',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '8px 12px 8px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'var(--font-pixel)',
        fontSize: 20,
        fontWeight: 500,
        color: '#a89f8c',
      }}
    >
      <span style={{ color: '#e0b84d', whiteSpace: 'nowrap' }}>Presidente</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span style={{ whiteSpace: 'nowrap' }}>
          {turn} mes{turn === 1 ? '' : 'es'}
        </span>
        <SoundButton />
      </div>
    </div>
  )
}
