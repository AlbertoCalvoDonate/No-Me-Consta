import { useEffect, useState } from 'react'

// "ESTAS PARTIDAS SON MIAS Y NO CUENTAN".
//
// Las partidas del que hace el juego no valen para medir nada: uno ya sabe qué
// hace cada personaje, por dónde se muere y qué carta conviene. Mezcladas con
// las de los testers, la media miente hacia arriba. Y además casi ninguna es
// una partida de verdad: la mayoría son dos minutos para ver si un cambio se
// ve bien.
//
// El problema es que el servidor NO PUEDE SABER de quién es cada partida, y es
// a propósito: no viaja ningún identificador (ver utils/perfil). Así que lo
// tiene que decir el propio móvil, y por eso esto es un interruptor.
//
// OJO CON LA DIFERENCIA, QUE IMPORTA: esto NO identifica a nadie. Dice "esta
// partida es una prueba", no "esta partida es de Alberto". Dos personas
// distintas que lo enciendan mandan exactamente lo mismo, y sigue sin poderse
// juntar dos partidas de la misma persona. Es una etiqueta sobre la partida,
// igual que las respuestas de la encuesta.
//
// Apagado por defecto: lo normal es que quien juega sea un tester y su partida
// cuente. Lo enciende quien sabe que las suyas no.

const CLAVE = 'nomeconsta.sonPruebas'

export function sonPruebas(): boolean {
  try {
    return localStorage.getItem(CLAVE) === '1'
  } catch {
    return false
  }
}

export function marcarPruebas(si: boolean) {
  try {
    if (si) localStorage.setItem(CLAVE, '1')
    else localStorage.removeItem(CLAVE)
  } catch {
    /* sin almacenamiento no se puede recordar; se mandara sin marcar */
  }
}

export function usePruebas(): [boolean, (v: boolean) => void] {
  const [es, setEs] = useState(sonPruebas)
  useEffect(() => {
    marcarPruebas(es)
  }, [es])
  return [es, setEs]
}
