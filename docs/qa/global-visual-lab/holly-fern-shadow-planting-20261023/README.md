# Compra real de cultivo e invalidacion de cobertura/sombra

Partida poblada guardada usada en benchmarks, semilla712, Manglares. Se busca una posicion legal entre los anclajes de cobertura y se ejecuta Game.plant con mijo mediante la API normal. Se cierra/reabre la pausa menu sin avanzar artificialmente el cultivo. Sin modificar reglas, navegacion ni emitir eventos manuales.

Resultado: plantas12->13, saldo580->575, evento CropPlaced observado. Anclajes en radio1.2m:6->0. Casters19373->19343; reconstrucciones7->8. Cero errores GL. La region de sombras responde al mismo evento real que la cobertura visible.

Fallo de QA descubierto: importar /src/simulation/game.js sin su parametro de version de Vite crea otro registro de observadores respecto al modulo versionado de la escena. duplicate-module-failure.json conserva la prueba fallida: compraba pero no invalidaba la cobertura. El guion corregido importa la URL canonica que cargo el navegador. No era necesario cambiar el sistema de eventos del juego.

Limitaciones: valida colocacion real, no cosecha ni recuperacion tras retirada. La cosecha exige madurez y trabajo del ciclo normal; no se falsifica borrando una planta. Tampoco demuestra streaming largo, seis biomas ni ausencia de todos los solapamientos. Imagen antes/despues y datos en esta carpeta. Variante QA guarded sin optimizacion versionada integrada.

Reproduccion: Vite5190, WG_CARD_TREATMENTS=cards, node tools/experiments/probe-holly-fern-shadow-planting-20261023.mjs.
