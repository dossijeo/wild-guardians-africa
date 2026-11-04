# Cobertura de Sabana: paridad funcional

Se utiliza la selección residente auténtica del experimento anterior, commit
`719510cec`: 2.438 módulos refinados y 8.303 ligeros, 212.704 triángulos y dos
draws a densidad 1. Filament oficial v1.78.0 renderiza esta geometría mediante
WASM y un adaptador Intel WebGPU físico (`isFallbackAdapter: false`). No se
modifica el renderizador del juego.

## Verificación visual real

`grass-smoke.js` solicita diez renders con cámara fija del snapshot y tiempo de
viento `frame / 60` en ambos motores; el último tiempo solicitado es 0,15 s.
Hay una actualización parcial idéntica en el cuarto paso. Son pruebas de
funcionamiento, no mediciones de FPS: el contador de solicitudes no demuestra
cuántos frames acepta internamente Filament.

Evidencias conservadas:

- [Filament expandido](grass-smoke/browser.png), [registro](grass-smoke/result.json).
- [Filament con instancing](grass-smoke-native/browser.png), [registro](grass-smoke-native/result.json).
- [Three expandido](grass-smoke-three/browser.png), [registro](grass-smoke-three/result.json).

Los tres registros terminan sin errores de aplicación ni validación GPU.
El 404 de consola corresponde a un recurso auxiliar del documento, no a una
carga fallida de geometría, material o textura.

Comparación de las capturas Filament nativo / Three expandido: recorte del
canvas `[8:728, 8:1288]`, RGB de 8 bits y máscara de intersección donde
`R > 1.2 * B` en ambas imágenes. Los 178.834 píxeles compartidos de hierba
tienen diferencia absoluta media de canal **0,01294/255** y percentil 99 igual
a cero. Es una comprobación sobre la intersección de píxeles de hierba, no una
comparación exhaustiva de siluetas ni una garantía sobre el juego completo.
El fondo de estas capturas tiene una diferencia conocida de conversión de
color; se excluye de esa cifra. El benchmark debe fijar explícitamente el
mismo color de salida en ambos motores.

## Representaciones y memoria de entrada

Valores a densidad 1; bytes de arrays/texturas asignados, no VRAM medida:

| Representación | Vértices | Índices | Datos adicionales de instancias |
| --- | ---: | ---: | ---: |
| Expandida, ambos motores | 38.790.144 | 2.552.448 | Incluidos en vértices |
| Three con atributos instanciados | 435.688 | 408 | Incluidos en vértices |
| Filament con textura de instancias | 10.368 | 816 | 520.192 |

La API web no expone divisor para atributos personalizados, pero esto **no
impide instancing nativo**: `RenderableManager.setInstanceCount`, material
`instanced: true` y `getInstanceIndex()` permiten leer anclas, variación y
pendiente de una textura RGBA32F. Está implementado y comprobado en navegador.
Las comparaciones expandidas aíslan mejor el trabajo gráfico; las variantes
nativas comparan soluciones razonables distintas y deben analizarse aparte.

## Alcance y límites

- Misma topología, viento, normales modificadas, pigmento, iluminación por
  vértice, transición día/noche, ACES y conversión sRGB en los materiales.
- LOD por distancia y desvanecimiento lejano en shader. La selección residente
  está congelada; no se mide selección CPU, streaming ni culling dinámico.
- La visibilidad de sombras de hierba es uno en ambos motores, como en el
  experimento original. Este fixture no demuestra paridad de sombras.
- Densidades 0,5 / 1 / 2: submuestreo determinista por debajo de uno;
  repeticiones de la distribución capturada con desplazamiento local de
  0,07 unidades en X por encima de uno. No son mundos procedurales nuevos.
- Actualizar el 1 % de instancias envía 384.768 bytes en la variante expandida,
  1.712 en Three nativo y 520.192 en Filament nativo. La API JavaScript
  `Texture.setImage` utilizada expone subida del nivel entero: se cambian
  solamente las entidades elegidas, pero se vuelve a enviar esa textura
  completa. Los recursos persisten; no se recrean cada frame.
- `loadGrassTexture` entrega a ambos motores los mismos bytes RGBA8 y niveles
  mip calculados previamente con canvas; evita diferencias del generador mip
  y utiliza color sin conversión automática y muestreo equivalente.

La prueba inicial de `generateMipmaps` lanzó una excepción C++ numérica. No
demuestra que WebGPU carezca de generación mip: el backend oficial la
implementa. Además, [Texture.cpp de v1.78.0](https://github.com/google/filament/blob/v1.78.0/filament/src/details/Texture.cpp#L636-L657)
comprueba el flag de uso `GEN_MIPMAPPABLE`, omitido por el constructor manual
de esa prueba. Las declaraciones TypeScript distribuidas omiten ese valor,
aunque el binding C++ lo expone. Es una causa candidata concreta, pendiente
de confirmación aislada; el helper compartido evita depender de ella. No se
considera un impedimento estructural.

## Reproducción

Con el servidor de evaluación en el puerto 5296, materiales compilados con
`matc -a webgpu -p mobile` y `WG_QA_PLAYWRIGHT_MODULE` apuntando a Playwright:

```powershell
node tools/filament-evaluation/grass-smoke.mjs
node tools/filament-evaluation/grass-smoke.mjs --native
node tools/filament-evaluation/grass-smoke.mjs --three
```

Las capturas sólo verifican la implementación. La decisión de migrar depende
de las mediciones repetidas del benchmark y su cadencia aceptada real.
