# Muestreo de color: recorrido comparativo

Referencia: sustrato completo aprobado de Manglares. Candidata: misma receta, normales siempre muestreadas y color de barro omitido únicamente fuera de la transición protegida por altura. Ninguna reducción de densidad, geometría, resolución o distancia.

[Vídeo diurno](baja-day.mp4) · [Vídeo nocturno](baja-night.mp4). Izquierda referencia, derecha candidata. Cada vídeo contiene36 capturas reales a12fps,3segundos,1920×540. Renderizado de cada fuente1280×720, montado y reducido para comparar. Son secuencias de pasos fijos, no grabaciones de rendimiento en tiempo real.

144 capturas/72 parejas, calidad baja, semilla712, día150/noche350, aproximación cercana hacia la misma transición. Cámara, objetivo, hora, llamadas y triángulos iguales en todos los pares, sin errores GL o de página. [Registros](captures.json), [auditoría](comparison.json), [metadatos](video-metadata.json).

Diferencias RGB por fotograma: día0–10 píxeles, máximo7 niveles; noche0–11 píxeles, máximo5. No crecen ampliamente durante este recorrido. No se atribuye una causa exacta a los residuos ni se declara igualdad bit a bit. Comparaciones hechas sobre PNG fuente, no vídeo comprimido.

Inspeccionados los mosaicos de nueve posiciones diurnas y nocturnas: se conserva el patrón de musgo/barro en la aproximación. [Día](baja-day-contact.webp), [noche](baja-night-contact.webp). La inspección de mosaicos no equivale a revisar reproducción continua a resolución completa; los vídeos se entregan para esa revisión. Pendientes recorridos más largos, otras calidades y streaming.

Conservar candidata para medir rendimiento de color-only. No transferir las cifras de height-guard (que también omite normales) a esta variante. No hay benchmark nuevo en esta ronda, ni evidencia de ahorro CPU/GPU. La receta visual aprobada permanece intacta, sin activación por defecto ni cambios en main.

```powershell
node tools/experiments/capture-mangrove-color-motion.mjs
python tools/experiments/package-mangrove-color-motion.py
```

Vite5190. Simulación pausada, iluminación material congelada y pasos de render1/30; la reproducción12fps ralentiza esos pasos. No cambia navegación, balance, modelos o terreno autoritativo. Objetivo global de seis biomas pendiente.
