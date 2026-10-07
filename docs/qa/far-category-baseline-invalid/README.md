# Controles de categoría inválidos: máscara QA reactivaba el baseline

Fuente f0b473d, tab140, misma pose elevada nocturna. Estos tres ABBA no sirven para atribuir coste a categorías: setFarComponentIsolation se ejecutaba tras owner.update y restablecía root.visible=true también cuando owner/adapter.enabled=false. Así A volvía a dibujar bancos preparados y backdrop. Los baselines cambiaban 73.365/19 o 53.890/15 frente a 53.762/14 del control válido anterior.

Conservamos muestras y capturas como contraejemplo. No hay cambio de producción asociado: el defecto pertenece exclusivamente al nuevo control de la fixture. Los ABBA previos sobre 1d1d79a (far-bridge-compact-cost) no usan este helper y conservan su atribución histórica negativa.

La regresión exige que toda máscara respete owner.enabled para backdrop y adapter.enabled para bancos, incluso all/no-sprites. Pendiente repetir controles con ese arreglo; no inferir ahorros de estos datos.
