import { Component, type ErrorInfo, type ReactNode } from 'react'
import { COLOR, pixel } from '../utils/estilo'

// Si algo revienta al pintar, React desmonta el arbol entero y deja la
// pantalla EN BLANCO. Sin nada que tocar, sin nada que leer y sin forma de
// volver: el juego, para quien lo esta jugando, ha desaparecido.
//
// Lo enseno el QA a lo bruto: al desactivar a proposito el validador de
// guardados, dos partidas corruptas tiraban la aplicacion y lo unico que
// quedaba era una pagina vacia y un "considera anadir un error boundary" en
// la consola, que el jugador no ve.
//
// El validador de guardados sigue estando, asi que ese camino concreto esta
// tapado. Esto es para todos los demas, los que no se han encontrado todavia:
// convierte una pantalla en blanco en una pantalla con una salida.
//
// La salida borra SOLO la partida en curso, que es lo unico que puede estar
// envenenado. Los records y los logros no se tocan: quien lleva veinte
// partidas no tiene por que perderlas porque una se haya estropeado.

interface Props {
  children: ReactNode
}
interface Estado {
  roto: boolean
  detalle: string
}

export class RedDeSeguridad extends Component<Props, Estado> {
  state: Estado = { roto: false, detalle: '' }

  static getDerivedStateFromError(e: unknown): Estado {
    return { roto: true, detalle: e instanceof Error ? e.message : String(e) }
  }

  componentDidCatch(e: Error, info: ErrorInfo) {
    // A la consola siempre: es la unica pista que queda de por que se cayo, y
    // el QA a lo bruto vigila justamente los errores de consola.
    console.error('el juego se ha roto:', e, info.componentStack)
  }

  empezarDeCero = () => {
    try {
      localStorage.removeItem('nomeconsta.partida')
    } catch {
      /* si no se puede borrar, al menos que recargue */
    }
    location.reload()
  }

  render() {
    if (!this.state.roto) return this.props.children
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          padding: '24px 28px',
          boxSizing: 'border-box',
          background: '#111113',
          textAlign: 'center',
        }}
      >
        <div style={{ ...pixel, fontWeight: 400, fontSize: 34, color: COLOR.oro, lineHeight: 1.2 }}>
          Se ha caído el sistema
        </div>
        <div
          style={{
            ...pixel,
            fontWeight: 500,
            fontSize: 16,
            lineHeight: 1.45,
            color: '#e8e2d4',
            maxWidth: 420,
          }}
        >
          No es parte del juego: algo ha fallado de verdad. Su récord y sus logros siguen
          guardados. Lo único que se pierde es la partida que tenía a medias.
        </div>
        <button
          onClick={this.empezarDeCero}
          style={{
            background: COLOR.oro,
            border: 'none',
            borderRadius: 8,
            padding: '12px 22px',
            ...pixel,
            fontWeight: 400,
            fontSize: 20,
            cursor: 'pointer',
          }}
        >
          Empezar de cero
        </button>
        <div style={{ ...pixel, fontWeight: 500, fontSize: 12, color: COLOR.apagado, maxWidth: 420 }}>
          {this.state.detalle.slice(0, 160)}
        </div>
      </div>
    )
  }
}
