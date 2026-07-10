# FUF DS 44/2024 — Fiscalización Preventiva

Aplicación web (HTML único, sin build) para aplicar el **Formulario Único de Fiscalización (FUF) del DS N° 44/2024** sobre gestión preventiva de riesgos laborales en Chile.

## Funcionalidades
- **Checklist de 60 preguntas reales** del FUF, agrupadas en 15 secciones, con el artículo del DS 44 citado.
- **Score de cumplimiento** automático (excluye "No Aplica" del denominador).
- **Interceptor de alertas críticas**: banner rojo cuando un ítem crítico (MIPER, EPP, riesgo grave e inminente, plan de emergencias, CPHS, vigilancia) queda en *No Cumple*.
- **Buscador** por texto, número de pregunta o artículo.
- **Biblioteca Normativa**: carga PDF de normas, leyes y DS (DS 594, Ley 16.744, Ley Karin, protocolos MINSAL) que se usan como contexto de la IA.
- **Asistente IA (Claude)**: consultas en lenguaje natural sobre la normativa cargada, con citas al documento fuente.
- **Impresión para terreno** (`@media print`): documento limpio en Times New Roman con checkboxes y firmas.
- **Modo claro/oscuro** y **control de tamaño de letra**.

## Datos
- La **fiscalización** (respuestas + cabecera) se guarda en **Firebase Realtime Database** cuando se configura `firebaseConfig` en `index.html`; si no, funciona con `localStorage` (offline).
- La **biblioteca de PDF** se guarda localmente (IndexedDB).
- La **API key de Claude** se guarda solo en el navegador del usuario.

## Configuración
1. **Firebase**: reemplazar el bloque `firebaseConfig` en `index.html` con la config de tu proyecto (Realtime Database).
2. **IA**: en la pestaña *Asistente IA*, pegar una API key de Anthropic (https://console.anthropic.com). Se envía directo a la API de Claude desde el navegador.

## Aviso
Las sugerencias legales y planes son **orientativos**. Valida siempre con tu asesor SST o el organismo administrador de la Ley 16.744.
