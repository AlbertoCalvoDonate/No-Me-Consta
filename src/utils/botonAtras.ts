import { useEffect } from 'react'

// EL BOTON "ATRAS" DE ANDROID, QUE INSTALADO CIERRA LA APP.
//
// En el navegador, "atras" te saca de la pagina y no pasa nada: vuelves. En
// una app instalada -PWA o APK- "atras" CIERRA LA APLICACION. Y el gesto de
// deslizar desde el borde izquierdo es el mismo boton, asi que en un juego que
// se juega deslizando con el pulgar se pulsa solo.
//
// La partida en curso se guarda despues de cada decision (persistPartida), asi
// que cerrar no pierde nada: al volver sale "Continuar". Pero con un panel
// abierto -el reparto, los logros, el tutorial- "atras" es inequivocamente
// "cierra esto", y cerrar la app entera en vez del panel se siente roto.
//
// COMO FUNCIONA, que es mas simple de lo que parece. No hay rutas ni router:
// al abrir algo se mete una entrada falsa en el historial, y "atras" consume
// esa entrada en vez de salir de la pagina. Al cerrar por las buenas (la X) se
// quita la entrada, para no dejar historial basura que obligue a pulsar atras
// dos veces.
//
// Deliberadamente NO se usa para la partida en si: estando jugando, "atras"
// cierra la app, que es lo que un usuario de Android espera que haga en la
// pantalla principal. Secuestrarlo ahi seria pelearse con el sistema.
export function useAtrasCierra(abierto: boolean, cerrar: () => void) {
  useEffect(() => {
    if (!abierto) return

    // La marca sirve para saber, al volver, si la entrada que se consume es la
    // nuestra. Sin ella, dos paneles abiertos a la vez se pisarian.
    const marca = { nmcPanel: Date.now() }
    history.pushState(marca, '')

    const alVolver = () => cerrar()
    window.addEventListener('popstate', alVolver)

    return () => {
      window.removeEventListener('popstate', alVolver)
      // Si el panel se cerro con la X y no con "atras", la entrada falsa sigue
      // ahi: se retira. `history.state` dice si todavia es la nuestra; si no
      // lo es, es que ya la consumio el propio "atras" y no hay nada que
      // deshacer (llamar a back() entonces sacaria al jugador de la app).
      if (history.state && (history.state as typeof marca).nmcPanel === marca.nmcPanel) {
        history.back()
      }
    }
  }, [abierto, cerrar])
}
