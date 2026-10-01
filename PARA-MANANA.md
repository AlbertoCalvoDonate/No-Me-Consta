# Para mañana

Puesto al día el **01/10/2026**. Lo del encargo del 28/09 está hecho; lo de
abajo es lo que quedó abierto hoy.

## 1. Demasiadas cartas azules

**Lo que se ve:** 14 de los 24 fondos de carta son azules. El 58 % del reparto
tiene la misma carta.

**Por qué, medido:** el color sale del tono dominante de la franja inferior del
retrato (la ropa), que es la parte que toca el borde de la carta — y los
políticos visten de azul marino. El dato es correcto; lo que falla es que la
realidad es monocroma.

Se miró si había de dónde sacar variedad sin inventarla, listando los cuatro
colores más presentes del cuerpo de cada uno de los catorce azules. **No la
hay**: lo único que aparece aparte del azul son tonos de piel (16°–24°), que el
algoritmo ya descarta a propósito — sin ese descarte le salía el mismo marrón a
19 de 22.

**O sea que no se arregla con un algoritmo más listo.** Las salidas reales son:

- **Repintar ropa** en los retratos: corbatas, camisas, chaquetas de otro
  color. Es la única que mantiene el principio de "el fondo sale del arte".
- **Separar los tonos a propósito**, abanicando los catorce azules por el
  círculo cromático. Rompe ese principio: un traje azul marino sobre una carta
  verdosa se nota en las esquinas de arriba.
- **Variar la luminosidad**, que hoy es fija (0,19) para todos a propósito,
  "para que ninguna carta pese más que otra". Diferenciaría sin tocar el tono,
  pero rompe esa regla.

Las tres son decisiones de diseño, no de código. Sin decidir.

## 2. Cloudflare dejó de desplegar solo

Workers Builds no recogió ningún push desde las **15:38 UTC del 01/10**. No es
el código: desde un clon limpio, `npm ci && npm run build` funciona y genera el
`dist` correcto. Los dos últimos despliegues se hicieron a mano:

```bash
npx wrangler@4.145.0 deploy
```

**Hay que mirar el panel de Cloudflare → el Worker → Builds** y ver si hay una
construcción fallida o encolada. Mientras no vuelva sola, cada cambio necesita
ese comando y es fácil olvidarse.

(El `@4.145.0` es a propósito: sin fijar versión, npx intenta instalar una más
nueva y choca con un bloqueo de caché de Windows.)

## 3. Arte que falta

- **Cinco personajes sin cara**: El Tertuliano, La Funcionaria, El Sindicalista,
  La Vecina, El Empresario. Salen rotulados con el nombre en grande.
- **Ilustraciones de los cuatro finales por evento**: moción, expediente,
  ruptura y registro. El del registro es ~7 % de las muertes. El de la ruptura
  estuvo inalcanzable hasta hoy; ya sale en ~3 % de las partidas.

Todo lo de arte, con medidas y pasos, en `arte-fuentes/LEEME.md`.

## 4. Suelto, de la auditoría de logros

`coleccion_todas` (ver las 672 cartas) es *posible* pero durísimo: en 2.500
partidas se ven 666. Las seis que faltan están nombradas en
`scripts/auditar-logros.mjs`. Si alguna vez parece demasiado, ahí es donde se
toca.
