# Tipografía: binarios, variantes y licencias

Implementación `f25a030`, enlaces de créditos ajustados en `d89b184`,
y margen de títulos corregido en `e195843`.
QA-157 queda verificado frente a su requisito de comprobar nombres/licencias reales
y conservar el paquete documental original sin añadirle archivos tipográficos.

## Hallazgo corregido

El CSS asignaba Banga-VF normal únicamente a peso 400 y Banga-Italic-VF a peso 700
sin declarar font-style:italic. Una petición de negrita normal podía usar la cursiva.
Ahora cada variante declara su propio rango 200–800 y su estilo normal/italic.
Ga Maamli conserva el único peso 400. Se desactiva la síntesis de peso/estilo;
peticiones fuera del rango nativo usan el peso disponible, sin generar otro binario.

[Auditoría binaria](qa/fonts/binary-metadata.json): names 0/1/13/14/16/17, fvar,
post, flags y etiquetas STAT, con tamaño y SHA-256 de los archivos originales.
Ga Maamli: familia real Ga Maamli, Regular, sin fvar. Banga normal: name1
Banga ExtraLight, familia tipográfica name16 Banga, rango wght 200–800.
Banga-Italic conserva algunos nombres internos Regular y flags sin bit cursiva;
no se oculta esa discrepancia. Su postItalicAngle=-8 y STAT incluye Italic.
No se editan nombres, flags, contornos ni archivos TTF para corregirlo.
Las tres fuentes incluyen todos los caracteres de la muestra auditada:
ÁÉÍÓÚÜÑáéíóúüñ¡¿€×−0123456789.

## Aplicación y distribución

La hoja compartida public/content/fonts.css usa ../assets/… para los tres TTF.
La aplicación principal la carga mediante assetUrl; menú y selector la enlazan
relativamente. Los estilos nativos del HUD y selector usan Banga para texto y
Ga Maamli para títulos. Se conservan ilustraciones y geometría/layout original.
Los preparadores de contenido, menú, selector y HUD incorporan la misma adaptación;
no se altera el material ni renderer del diorama.

Las licencias completas OFL 1.1 y el aviso de autores Banga se copian íntegros
al paquete web, además del manifiesto original. Los enlaces están en Biblioteca.
[HTTP local](qa/fonts/licenses-http.json): tres respuestas 200 text/plain y
contenido byte-equivalente al texto suministrado. El documento original del plan
no cambia y docs/qa/fonts no contiene TTF/WOFF ni otros archivos de fuente.

## Evidencia de navegador

[Muestra](qa/fonts/specimen.png) y [datos](qa/fonts/specimen.json): FontFaceSet nativo
reporta tres caras loaded; pesos 200/400/700/800 normales y cursivos, español/inglés,
acentos, ñ, símbolos y números largos. Las ocho muestras no desbordan su ancho
a 1264 px; no es una prueba de todos los dispositivos o traducciones posibles.
El acceso directo a FontFaceSet no está expuesto en el evaluador DOM de CUA;
la fixture lo lee en su código normal y presenta el resultado público en pantalla.

Selector original: [bioma](qa/fonts/selector-biome.png),
[cultura](qa/fonts/selector-culture.png), estilos calculados conservados en JSON.
Juego de producción cargando qa-village-ui: [HUD](qa/fonts/hud.png) y
[panel de cultivos](qa/fonts/hud-crops.png), familias calculadas y dimensiones.
Slot de QA preparado con Sabana/Mapungubwe, centro pagado y crédito explícito
200000 monedas, día 101. No acredita una campaña natural ni auditoría económica;
se abre/cierra el panel sin compras. Se confirma contratación con cero trabajadores
y coste cero al amanecer del día 102. La captura de contratación usa las mismas
familias nativas ([evidencia](qa/fonts/hiring.png)). [Créditos](qa/fonts/library-credits.png)
con enlaces locales; esa captura precede al ajuste posterior de color de enlaces.
[Consolas](qa/fonts/console.json) conservadas para las tres superficies.

La inspección visual del panel detectó que el marco tapaba parte de la C inicial,
aunque las medidas de ancho no mostraban desbordamiento. Se añade margen de 10 px
a los títulos de los paneles de herramientas. [Captura corregida](qa/fonts/hud-crops-after-margin.png)
y [estilos finales](qa/fonts/hud-crops-after-margin.json); se conserva la captura anterior
como evidencia del hallazgo. No se modifica el marco ni el diorama.

## Validación

[3 pruebas](qa/fonts/directed.txt), cero fallos/omisiones, 150,2641 ms: lecturas
SFNT reales en Node, hashes, familias/licencias, rango variable, inclinación,
separación de caras, avisos completos y conexiones nativas. Los cinco preparadores
compilan con py_compile; sus archivos temporales se eliminan después.
[Assets](qa/fonts/assets.txt): 23 fuentes de assets, 484 recursos,
126 SFX exactos y 48 acciones de trabajadores con procedencia.
[Build](qa/fonts/build.txt) correcto en 8,47 s, aviso conocido de bundle grande.
[Paquete web](qa/fonts/package.txt): 559 archivos / 379779720 bytes,
796 enlaces relativos, 20 GLB runtime sin duplicados originales.
