# No Me Consta

Sátira política española con mecánica de Reigns: cartas que se deciden
arrastrando a izquierda o derecha, cuatro barras (medios, gobierno, calle,
caja B) y una legislatura de 48 meses que casi nadie termina. React +
TypeScript + Vite + framer-motion + zustand.

Se sirve como **Cloudflare Worker** (no Pages) en
`https://no-me-consta.albertocalvodonate.workers.dev/`.

> Este fichero se carga en cada sesión, así que solo lleva lo que no se deduce
> mirando el código. **No dupliques aquí lo que ya está escrito en otro sitio**:
> apunta al sitio.

## Dónde está escrito lo demás

| | |
|---|---|
| `PARA-MANANA.md` | qué quedó abierto y por qué. **Léelo antes de empezar.** |
| `arte-fuentes/LEEME.md` | cómo se entrega y se importa un retrato (fuera de git) |
| `worker/consultas.sql` | las preguntas que merece la pena hacerle a los datos |
| `worker/esquema.sql` | qué se guarda de cada partida y qué NO, con el porqué |

Los ficheros de este repo llevan el razonamiento en comentarios largos, incluido
**lo que se probó y no funcionó**. Antes de rehacer algo, lee el comentario: casi
siempre explica por qué está así.

## Cosas del entorno que cuestan media hora si no se saben

- **Desplegar es a mano**, Workers Builds no recoge los push desde el 01/10/2026:

  ```bash
  npm run build && npx wrangler@4.145.0 deploy
  ```

  El `@4.145.0` **no es opcional**: sin fijar versión, npx intenta instalar una
  más nueva y choca con un bloqueo de caché de Windows (EBUSY).

- **Los heredoc de bash se comen las barras invertidas** en esta máquina. Para
  cualquier cosa con `\` usa la herramienta Write/Edit, o Python con heredoc.

- **Playwright no es dependencia del proyecto.** Los scripts que abren un
  navegador lo buscan en la caché de npx:

  ```bash
  export PLAYWRIGHT_PATH="file:///C:/Users/Churrasco/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs"
  ```

  Y casi todos necesitan `npm run dev` levantado en otra terminal.

- **Hay Python con PIL, numpy y cv2** en `C:/kohya_ss/venv/Scripts/python.exe`,
  útil para medir imágenes.

## Cómo se decide si algo está bien: midiendo

Es la norma de la casa. No "parece que va mejor", sino un número.

- **Equilibrio**: `node scripts/simular.mjs 1200` juega con el motor de verdad
  (abre el juego en un navegador e importa el store; **no copia el motor**).
  Banda: **óptimo 14–18 %, bueno 9–13 %**. Si tocas efectos de cartas, mide
  antes y después, no solo después.
- **Cartas**: `npm run validate-cards` (bloquea), más `auditar-coherencia`,
  `auditar-efectos`, `auditar-logros`, `qa-ortografia`, `qa-voz`,
  `qa-personalidad`.
- **Retratos**: `node scripts/comprobar-retrato.mjs <fichero>.webp`.
- **Color de las cartas**: `colores-retrato.mjs` imprime al terminar cuántas
  parejas son confundibles en CIELAB. Si tocas la paleta, mira ese número.

## Mapa rápido

- `src/data/cards.content.ts` — las 634 cartas. **`characterImage` va en CADA
  carta**, no en el personaje: añadirlo solo a `reparto.ts` hace que la cara
  salga en el panel del reparto y no en la carta.
- `src/data/cards.ts` — finales. `src/data/reparto.ts` — quién es quién y qué
  barra encarna. `src/data/logros.ts` — 62 logros.
- `src/hooks/useGameStore.ts` — el motor. Sorteo, barras, enfado y favor.
- `worker/index.ts` — sirve el juego y recoge las partidas (D1
  `nomeconsta-partidas`). Lo último que hace, pase lo que pase, es devolver el
  sitio: un fallo de la API no puede dejar el juego sin servir.

## Arte

Retratos a **1224×1440** (17:20 exacto), PNG-24 transparente, sRGB. Si llega a
esa medida exacta, la tubería no lo reencuadra.

**Copia el original a `arte-fuentes/originales/` ANTES de ejecutar nada**:
`recortar-fondo` modifica el fichero en el sitio y `to-webp` lo borra. Así se
perdieron los originales de la primera tanda.

Orden: `recortar-fondo` → `normalize-portraits` → `to-webp` → `colores-retrato`
→ `comprobar-retrato`. Pasa el nombre del fichero: sin argumento tocan toda la
carpeta, incluidas las ilustraciones de final.

## Telemetría

Se recogen partidas reales en D1, con consentimiento y un interruptor para
apagarlo. **No viaja ningún identificador de persona ni de móvil**, y eso es
cierto mirando el esquema, no solo la intención. Si tocas esto, lee primero el
encabezado de `worker/esquema.sql` y `src/utils/enviarPartida.ts`: lo que se le
promete al jugador está escrito en pantalla y tiene que seguir siendo verdad.

Para consultar: `npx wrangler@4.145.0 d1 execute nomeconsta-partidas --remote
--json --command "..."`. Casi todas las consultas llevan `WHERE quien IS NULL`
(fuera las partidas de prueba del autor) y `AND final <> 'abandonada'` (una
partida dejada a medias no es una muerte).

## Voz

Todo el código, los comentarios y los commits van **en castellano**, sin
tecnicismos innecesarios y explicando el porqué, no el qué. Los mensajes de
commit cuentan qué se midió y qué salió. Mantén ese tono.
