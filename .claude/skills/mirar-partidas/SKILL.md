---
name: mirar-partidas
description: >-
  Cómo consultar la base D1 con las partidas reales que manda el juego, y los
  dos filtros que si se olvidan hacen que los números mientan. Úsala siempre que
  haya que mirar datos de jugadores: "cuántas partidas hay", "cómo va la gente",
  "por dónde mueren", "qué cartas no ve nadie", "echa un ojo a las partidas de
  hoy", "está bien equilibrado", o cualquier pregunta sobre telemetría, playtest
  o comportamiento de los jugadores. También cuando haya que añadir una consulta
  nueva o entender qué se guarda de cada partida. Incluye los errores de
  interpretación que ya se han cometido una vez, que es donde está el valor.
---

# Mirar las partidas reales

El juego manda cada partida a una base D1 (`nomeconsta-partidas`). Las preguntas
que merece la pena hacerle ya están escritas en **`worker/consultas.sql`**, con
el porqué de cada una: léelo antes de inventarte una consulta. Qué se guarda y
qué no, en `worker/esquema.sql`.

Aquí está **cómo se ejecuta y cómo se lee sin equivocarse**.

## La forma del comando

```bash
npx wrangler@4.145.0 d1 execute nomeconsta-partidas --remote --json \
  --command "SELECT ... ; SELECT ..."
```

Tres cosas que ahorran un rato:

- **`@4.145.0` fijo.** Sin versión, npx intenta instalar una más nueva y choca
  con un bloqueo de caché de Windows.
- **`--remote` siempre.** Sin él consultas una base local vacía y parece que no
  juega nadie.
- **`--command` con varios `SELECT` separados por `;` devuelve varios resultados
  en un array.** `--file` con `--json` **no**: devuelve solo un resumen de
  cuántas consultas corrieron, sin los datos. Si vas a lanzar
  `worker/consultas.sql` entero, hazlo sin `--json` y lee las tablas.

La salida trae texto antes del JSON, así que para procesarla hay que cortar
desde el primer `[`:

```bash
... --json --command "..." | python -c "
import sys, json
t = sys.stdin.read()
for bloque in json.loads(t[t.find('['):]):
    for fila in bloque['results']: print(fila)
"
```

## Los dos filtros que no se pueden olvidar

```sql
WHERE quien IS NULL AND final <> 'abandonada'
```

- **`quien IS NULL`** deja fuera las partidas del autor, marcadas a mano con
  `quien = 'pruebas'`. No valen para medir: uno ya sabe qué hace cada personaje
  y por dónde se muere, así que la media miente hacia arriba.
- **`final <> 'abandonada'`** deja fuera las partidas que el jugador dejó a
  medias, que el juego manda al ocultarse la pestaña. **No son muertes**: nadie
  perdió ahí, simplemente se fue. Coladas en "cuánto dura la gente" o "por dónde
  cae", las dos mienten hacia abajo.

**Excepción a propósito:** las consultas por CARTA (qué sale mucho, qué no sale
nunca, qué lado elige la gente) **sí** incluyen las abandonadas. Una decisión
tomada en una partida que luego se abandonó es una decisión igual de real.

## Cómo leer lo que sale, sin equivocarse

Estos tres errores ya se cometieron una vez. Merece la pena no repetirlos.

**Aquí hay PARTIDAS, no jugadores.** No existe ningún identificador que una dos
partidas de la misma persona, y es a propósito (`src/utils/perfil.ts`). "El 40 %
de las partidas duran menos de diez meses" es cierto; "el 40 % de la GENTE no
pasa de diez meses" no se puede saber, porque una sola persona empeñada puede
ser veinte partidas.

**`partida_n` cuenta partidas TERMINADAS**, no empezadas (`g.partidas += 1` en
`registrarPartida`). Por eso un hueco en la numeración es una partida que se
acabó y nunca llegó — así se midió que se perdía una de cada cuatro antes de
poner la cola de envíos. Agrupar por las dos respuestas de la encuesta
(`juega`, `reigns`) da una huella flojita del móvil que sirve para reconstruir
esos huecos; es un suelo, no un techo, porque dos móviles pueden caer en el
mismo grupo.

**La `sesion` une los dos envíos de UNA partida**, la abandonada y esa misma ya
acabada, para que sean una fila y no dos. No une dos partidas distintas.

## Si vas a escribir en la base

Para marcar tus propias partidas o limpiar pruebas:

```sql
UPDATE partidas SET quien = 'pruebas' WHERE id = '...';
DELETE FROM decisiones WHERE partida IN (SELECT id FROM partidas WHERE quien='pruebas');
DELETE FROM partidas WHERE quien='pruebas';
```

**Borra siempre `decisiones` antes que `partidas`.** Al revés quedan filas
huérfanas que no aparecen en ninguna consulta y van inflando la base. Para
comprobar que no quedan:

```sql
SELECT COUNT(*) FROM decisiones d
WHERE NOT EXISTS (SELECT 1 FROM partidas p WHERE p.id = d.partida);
```

## Probar la API sin jugar

Si hace falta meter una partida de prueba, el POST va a `/api/partida` con
`"pruebas": true` para que caiga en `quien='pruebas'` y no contamine nada.
Cloudflare corta las peticiones sin user-agent de navegador (403, error 1010),
así que hay que mandar uno. Y borra las filas al terminar.
