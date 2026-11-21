# Arranque del canal de vegetación lejana

`VITE_WEBGPU_FAR_VISUAL=true` solicita explícitamente el canal de consulta regional en el perfil WebGPU Worker. La autoridad temprana lo recibe al crearse; la presentación comprueba que esa capacidad coincide antes de conectarse. La misma configuración gráfica se utiliza para un Worker de reemplazo durante la recuperación. Sin la variable, el canal permanece desactivado. Una versión de Wild Engine sin los exports necesarios rechaza la consulta y no habilita la sustitución de árboles.

Las pruebas cubren la propagación al Worker gráfico inicial y al de reemplazo, el perfil de recuperación y el rechazo de discrepancias con la autoridad temprana. No demuestran recuperación de dispositivo en navegador ni dibujan impostores: la cobertura, su invalidación y publicación siguen siendo responsabilidad del propietario regional. La consulta se ejecuta en el Worker autoritativo y su coste y latencia no se han medido.
