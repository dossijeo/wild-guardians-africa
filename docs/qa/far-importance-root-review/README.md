# Revisión independiente de prioridad de árboles lejanos

Se revisó la candidata 19424f6 y se ejecutaron sus dos pruebas nuevas, ambas correctas. La prioridad modifica el rank determinista al instanciar, sin cambios de shader ni subidas del atributo durante el movimiento. Esto no demuestra ahorro de GPU: puede conservar más píxeles visibles.

En density-motion-3.png de la rama experimental sigue visible el tramado de otro árbol (aproximadamente x690,y110). Se pidió al subagente identificarlo y contrastar su desaparición con la bruma; no basta corregir únicamente el baobab inicial. El JSON conserva hashes y límites. La imagen permanece en la rama del subagente y deberá incluirse con su evidencia final. No se activa ni se fusiona la funcionalidad por esta revisión.
