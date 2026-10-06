# Cámara estable en la lectura de color

Diagnóstico previo a reutilizar compatibilidad de profundidad, sobre `35ba81f`, Manglares/Mapungubwe semilla 712 intacto. Se añade únicamente el registro de eye, target, quaternion, matrices view/projection y origen a cada frame del visor N/N/G/B/B/N. Esos valores coinciden exactamente en los seis frames; origen (0,0). No hubo cambios lógicos ni errores.

Esto descarta deriva de esos inputs de cámara en esta secuencia. No prueba estabilidad de todos los datos de geometría, uniforms, sombras, orden o GPU; tampoco identifica la causa de la variación de color. No se modifica la cámara del juego sin evidencia de un fallo. La profundidad coincide en todos los pares y las diferencias de color se conservan en el [informe íntegro](before.json).
