# Auditoría de contratos A1 y A3

Esta auditoría distingue el cierre lógico de contratos del contenido y de la validación en dispositivo. No acredita paridad gráfica ni rendimiento.

## A1: autoridad e interfaz

**Decisión: cerrado internamente como contrato de interfaz.** La función de poblados permanece como contenido B3 y la eliminación de snapshots completos pertenece a A2. Las pruebas de navegador y dispositivo pertenecen a C.

- Sesión y comandos: `simulation-authority-client.js` asigna sesión y secuencia, copia el comando antes de encolarlo y entrega la respuesta de la autoridad. `foundVillage` utiliza esa misma interfaz; su restricción de producto es contenido B3, no otra interfaz A1.
- Publicaciones y tiempo: el receptor de presentación ordena los estados y eventos confirmados y el reloj de presentación se actualiza desde tiempo de simulación. La retirada de la dependencia de snapshots completos sigue pendiente en A2; la reconstrucción histórica y su equivalencia se validan aparte.
- Recurso y dispositivo: `webgpu-resource-registry.js` identifica generación y versión de recurso; `webgpu-pipeline-admission.js` cancela por generación, señal o pérdida de dispositivo y comprueba los inputs, luces y targets antes de publicar.
- Trayectorias y entidad: los feeds de movimiento y la vinculación del actor consumen identificador y versiones confirmados; la cobertura completa de personajes y animaciones es B.
- Fachada existente: `bindWebGpuWorld` y `webgpu-world-client.js` cubren cámara, resize, selección, feedback, presentación y cierre; `main.js` comprueba expresamente el backend WebGPU. El perfil de opciones de producto ignora los `qa-*`; no se requiere una segunda fachada nominal. Recuperación usa generaciones y rechaza respuestas obsoletas.
- Pruebas: `webgpu-world-options`, `webgpu-world-client`, `webgpu-world-client-temporal-profile`, `webgpu-resource-registry`, `webgpu-pipeline-admission` y `presentation-recovery-{timeline,replay,journal}` pasan juntas (194 casos). Son pruebas de contrato, no una partida completa.

## A3: familias y pases actuales

**Decisión: cerrado internamente para las familias y pases existentes enumerados.** Cultivos, puentes y destrucción del centro usan también recetas de deformación con identidad y versión del material de origen; la receta no autoriza compartir materiales o pipelines de distintos orígenes. Cualquier familia nueva o nueva cobertura alfa debe declarar su contrato antes de incorporarse. Los resultados en hardware y la paridad visual siguen en C.

| Familia y consumidor | Contrato lógico actual | Límite de contenido o validación |
| --- | --- | --- |
| Color progresivo de personajes y construcciones | Grafo por receta y bindings compatibles; color y textura son datos por material. La clonación conserva mapas, color y parámetros de superficie. | La autoría actual de personajes admite opacos; alfa de autoría adicional requiere contrato de cobertura propio. Paridad visual B/C. |
| Animación precocinada y movimiento de actor | La receta identifica textura de poses y reloj. La deformación se instala en `positionNode`; el override de sombra de Three copia ese nodo. | Rigs, mezclas y contactos aún no migrados son B; equivalencia en GPU es C. |
| Toon de bestias | Variantes estructurales de pelo/sombra con uniforms dinámicos y grafo compartido por estilo. | La combinación con el material anfitrión determina sus pases; paridad artística B/C. |
| Guardián | Estado transparente y uniforms catalogados; `guardian-attack.js` establece `castShadow=false`. | Activar sombras exigiría trasladar también su `alphaTestNode` de disolución; no se activa aquí. |
| Terreno base y manglar | Estado material catalogado; manglar identifica los atlas y constantes incorporados al grafo. Profundidad se escribe en el pase de color normal. | El proveedor de manglar sigue experimental y no reproduce aún todos los efectos de autoría; B/C. |
| Vegetación de bioma | Receta distingue instancing, textura, recorte y estado. `castShadowNode` reproduce alfa de textura, opacidad y máscara de chunk en la sombra; el override conserva deformación. | Otros nodos de máscara o `alphaMap` no forman parte de este contrato. Paridad GPU C. |
| Cultivos y puentes | Crecimiento/viento usa `positionNode` y se propaga al override. Para `map` + `alphaTest` convencional el castShadowNode conserva cobertura; puente usa geometría opaca. | `alphaMap`, `maskNode` y `alphaTestNode` personalizados quedan fuera y no se sustituyen silenciosamente. |
| Destrucción de centro | La geometría usa positionNode y maskNode para agujeros; actualmente el cuerpo no proyecta sombras. | Si se habilitan sombras hay que trasladar la máscara, además de la posición; no se activa aquí. |
| Fragmentos de muro | Material estándar opaco instanciado, profundidad y sombra instanciadas. | Resultado en dispositivo C. |
| Agua y lava | Recetas comparten grafos por entradas compatibles y distinguen estado de recorte. Paleta y offset de semilla son referencias TSL por material; pruebas de nodos verifican instancias independientes y cambio de binding. El pase de color escribe profundidad con `chunkClipOpacity`; meshes fluidos no proyectan sombra. | Captura SSR usa materiales originales y excluye `nativeFluid`; calidad de reflejo y paridad C. |
| Hi-Z | Target no MSAA, reducción mínima y material sin prueba ni escritura de profundidad. | Precisión y coste GPU C. |
| Sprites, geometría VFX, bendición, vortex y haz del guardián, humo, escombros y ondas | Estados, atributos y política de profundidad catalogados; meshes VFX no proyectan sombra. Escombros opacos escriben profundidad. | Efectos y fórmulas aún no migrados B; comparación visual C. |

Los contratos de grafo no representan toda la clave de un pipeline WebGPU: Three también incorpora el layout de geometría, el render target y el estado del dispositivo. La reutilización física de pipelines, pérdida del dispositivo en navegador y paridad visual requieren C. Las pruebas de nodos y de override no sustituyen esa validación.

Los subgrafos de color, toon y caminata declaran `host-must-preserve-position-and-coverage`: no son materiales completos. El consumidor debe conservar la deformación y cobertura del material anfitrión en sus pases. El override de Three propaga `positionNode`; las rutas con recorte convencional instalan `castShadowNode` y las no soportadas se identifican expresamente. Las pruebas de `webgpu-biome-shadow-cutout`, `webgpu-crop-roster` y `webgpu-actor-motion-binding` ejercitan estas condiciones.
