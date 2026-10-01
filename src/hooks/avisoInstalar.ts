// ¿Se le ha contado ya al jugador que esto se puede instalar?
//
// El aviso sale UNA vez y no vuelve. Si volviera cada vez seria publicidad
// dentro de su propio juego, y lo que se gana (alguno mas instalandolo) no
// compensa lo que se pierde (que lo cierren sin leer desde la segunda vez).
//
// NO SE BORRA CON "BORRAR MI PROGRESO", a proposito, y por el mismo motivo que
// el volumen: no es progreso, es que ya se te dijo. Quien borra sus logros
// para empezar de cero no esta pidiendo que le vuelvan a explicar como se
// instala una aplicacion que ya tiene instalada o que ya decidio no instalar.
const CLAVE = 'nomeconsta.avisoInstalar'

export function yaSeLeDijo(): boolean {
  try {
    return localStorage.getItem(CLAVE) === '1'
  } catch {
    // Modo incognito: no se puede recordar, asi que se trata como "ya se le
    // dijo". Mas vale no enseñarlo que enseñarlo en cada apertura.
    return true
  }
}

export function apuntarQueSeLeDijo() {
  try {
    localStorage.setItem(CLAVE, '1')
  } catch {
    /* da igual: sin almacenamiento el aviso no sale */
  }
}
