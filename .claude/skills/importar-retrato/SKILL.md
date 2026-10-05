---
name: importar-retrato
description: >-
  La tubería completa para meter en el juego el retrato de un personaje nuevo:
  dónde guardar el original antes de que se destruya, en qué orden van los
  scripts, y los dos sitios distintos donde hay que registrar la cara para que
  salga de verdad. Úsala siempre que aparezca un PNG de personaje nuevo en
  arte-fuentes o en public/characters, o cuando se hable de "importar un
  retrato", "meter una cara nueva", "ya tengo el arte de X" o de que un
  personaje salga rotulado con el nombre en vez de con su cara. También cuando
  haya que RE-importar o retocar un retrato que ya estaba. Tiene dos trampas que
  cuestan trabajo perdido si se improvisa, así que conviene leerla antes de
  tocar ningún fichero.
---

# Importar un retrato de personaje

La tubería funciona bien, pero tiene dos sitios donde improvisar sale caro: uno
destruye el original para siempre y el otro deja la cara sin salir en el juego
sin que falle nada. Por eso existe esta skill.

La especificación de cómo se entrega el arte (medidas, encuadre, halo) está en
`arte-fuentes/LEEME.md`. Aquí está el **procedimiento**.

## 1. Pon el original a salvo, antes que nada

```bash
mkdir -p arte-fuentes/originales
cp public/characters/<nombre>.png arte-fuentes/originales/
```

**Esto va primero y no es opcional.** `recortar-fondo` modifica el fichero en el
sitio y `to-webp` lo borra al terminar. Así se perdieron los originales de la
primera tanda de retratos: ya no hay de dónde volver, y el `.webp` que queda ya
pasó por una compresión con pérdida, así que no sirve para retocar.

`arte-fuentes/` está fuera de git a propósito (pesa), así que esta copia vive
solo en la máquina. Avísalo si el trabajo es para otra persona.

## 2. Mira qué ha llegado antes de procesarlo

```bash
"C:/kohya_ss/venv/Scripts/python.exe" -c "
from PIL import Image; import numpy as np
im = Image.open('public/characters/<nombre>.png')
a = np.asarray(im.convert('RGBA'))
print(im.size, im.mode, 'ratio', round(im.size[0]/im.size[1], 4))
print('transparente', round((a[:,:,3]<10).mean()*100,1), '%  borde abajo cubierto',
      round((a[-1,:,3]>200).mean()*100), '%')
"
```

Lo que buscas: **1224×1440** (ratio 0,85), modo RGBA, y el torso llegando al
100 % del borde de abajo. Si llega a esa medida exacta, `normalize-portraits` lo
respeta tal cual y no lo reencuadra — que es lo que quieres cuando el dibujo ya
viene con la cara al tamaño del resto del reparto.

## 3. Pasa la tubería, fichero a fichero

Hace falta `npm run dev` levantado en otra terminal, y Playwright, que no es
dependencia del proyecto:

```bash
export PLAYWRIGHT_PATH="file:///C:/Users/Churrasco/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs"

node scripts/recortar-fondo.mjs <nombre>.png
node scripts/normalize-portraits.mjs <nombre>.png
node scripts/to-webp.mjs <nombre>.png
```

**Pasa siempre el nombre del fichero.** Sin argumento, estos scripts recorren la
carpeta entera, incluidas las cuatro ilustraciones de final, y hay que
restaurarlas de git.

Luego **borra el PNG intermedio**:

```bash
rm public/characters/<nombre>.png
```

Si no lo borras, el siguiente paso procesa el `.png` *y* el `.webp` como si
fueran dos personajes distintos, y te salen entradas de más en la tabla de
colores.

## 4. Registra la cara en los DOS sitios

Aquí está la trampa que más cuesta, porque no falla nada: simplemente la cara no
sale.

**Sitio 1 — `src/data/reparto.ts`.** Añade `imagen:` al personaje. Esto solo
afecta al panel "El reparto".

```ts
{ nombre: 'El Sindicalista', imagen: 'sindicalista.webp', dueno: 'calle', quien: '...' },
```

**Sitio 2 — `src/data/cards.content.ts`.** `characterImage` va **en cada carta**,
no en el personaje. Un personaje con veinte cartas necesita las veinte.

```ts
character: 'El Sindicalista',
characterImage: 'sindicalista.webp',
```

Pasó el 02/10/2026: se importaron tres retratos, se apuntaron en el reparto —con
lo que salían bien en el panel— y sus 53 cartas siguieron saliendo rotuladas con
el nombre en grande durante un día. No daba ningún error.

Para rellenarlas todas sin ir a mano, el patrón que funciona es trocear el
fichero por carta (`\n  {\n`) y meter `characterImage` justo detrás de
`character:`, respetando la sangría de cada una.

## 5. Recalcula los colores y comprueba

```bash
node scripts/colores-retrato.mjs
node scripts/comprobar-retrato.mjs <nombre>.webp
npm run validate-cards
```

- `colores-retrato` recalcula el fondo de **todas** las cartas, no solo la
  nueva: el tono de cada una sale de repartir el reparto entero por el círculo
  cromático. Al terminar imprime cuántas parejas son confundibles en CIELAB —
  **mira ese número**: si sube mucho, el retrato nuevo ha estrechado el reparto.
- `comprobar-retrato` avisa de proporción, ancho, aire sobre la cabeza, si el
  torso llega a los bordes y si hay halo claro.
- `validate-cards` es el que caza el olvido del paso 4: si el personaje tiene
  retrato en el reparto, exige que lo lleven todas sus cartas.

## 6. Míralo

Los números no dicen si la cara pega con el resto. Monta una hoja de contactos
con las 27 cartas —el mismo degradado que usa el juego, `linear-gradient(170deg,
aclarar(c,1.35) 0%, c 46%, aclarar(c,0.55) 100%)`— y compruébalo a ojo: lo que
importa es que la cara salga del mismo tamaño que las demás.

Si el arte nuevo trae la cara más pequeña o más grande, **se arregla en el
dibujo, no en el código**. Hubo dos sistemas que compensaban eso por personaje y
se quitaron el 01/10/2026 porque con arte igualado a mano hacían lo contrario.

## 7. Sube

```bash
npm run build && npx wrangler@4.145.0 deploy
```

El `@4.145.0` no es opcional. Y **compila despues de commitear**: la version
lleva el hash del commit y se congela en el build.

Comprueba que el retrato esta en vivo **mirando el tipo de contenido, no el
codigo de estado**:

```bash
curl -s -o /dev/null -w "%{http_code} %{content_type} %{size_download}
"   https://no-me-consta.albertocalvodonate.workers.dev/characters/<nombre>.webp
```

Tiene que decir `image/webp` y un tamano parecido al del fichero local. **Un 200
no prueba nada**: el worker va con `not_found_handling: single-page-application`,
asi que una ruta que no existe devuelve el index.html con un 200 tan ricamente.
El 03/10/2026 dos retratos parecian desplegados y lo que llegaba eran 2.266
bytes de HTML, los mismos que devuelve un nombre inventado, que es la forma
rapida de salir de dudas.
