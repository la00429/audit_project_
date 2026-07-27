# Guión para Video — AuditTest Vision

## Duración: 4-5 minutos
## Formato: Google Vids (presentación narrada con IA)

---

## SLIDE 1 — Intro (0:00 - 0:30)

**Visual:** Logo/título "AuditTest Vision" sobre fondo oscuro con gradiente morado

**Narración:**
"¿Cuántas veces has hecho deploy y después descubres que una imagen no tiene alt text, o que el contraste de un botón no cumple con las normas de accesibilidad? AuditTest Vision es una herramienta de línea de comandos que automatiza esa revisión por ti. Un solo comando, cero configuración, y en segundos tienes un diagnóstico completo de tu sitio web."

---

## SLIDE 2 — El Problema (0:30 - 1:00)

**Visual:** Lista con íconos de los problemas (repetitivo, lento, inconsistente, propenso a errores)

**Narración:**
"Revisar accesibilidad manualmente es un proceso repetitivo que hacemos en cada deploy. Es lento, inconsistente porque depende de quién lo haga, y el ojo humano simplemente no detecta cosas como ratios de contraste o headings fuera de orden. Necesitábamos una herramienta que lo hiciera por nosotros, integrada en nuestro flujo de trabajo."

---

## SLIDE 3 — La Solución (1:00 - 1:45)

**Visual:** Terminal mostrando el comando y output con colores

**Narración:**
"La solución es un CLI publicado en npm. Ejecutas npx audittest-vision con la URL de tu sitio, y la herramienta lanza un navegador headless con Puppeteer, navega la página, extrae el DOM completo, y ejecuta siete reglas de accesibilidad WCAG 2.1 nivel doble A. Al final te da un score de cero a cien y una lista de problemas con sugerencias concretas de cómo arreglar cada uno."

---

## SLIDE 4 — Score de Accesibilidad (1:45 - 2:15)

**Visual:** Barra de score con colores (verde 90+, amarillo 70+, naranja 50+, rojo menos de 50)

**Narración:**
"Cada auditoría calcula un puntaje de accesibilidad. Los issues críticos restan 25 puntos, los mayores restan 10, y los menores restan 3. Si tu score baja de 50 sabes que tienes un problema serio. Este puntaje aparece tanto en la terminal como en el reporte HTML con un gauge visual."

---

## SLIDE 5 — Reporte HTML Interactivo (2:15 - 3:00)

**Visual:** Screenshot del reporte HTML con el gauge, markers sobre la página, sidebar con issues

**Narración:**
"Con la flag report, la herramienta genera un archivo HTML que abres en tu navegador. A la izquierda ves el screenshot de tu página con marcadores de colores señalando cada problema. A la derecha, la lista de issues. Si haces click en un issue, te resalta el elemento en el screenshot. Incluye light mode y dark mode, y cada issue tiene una sugerencia de fix lista para copiar."

---

## SLIDE 6 — Diff y Watch Mode (3:00 - 3:45)

**Visual:** Terminal mostrando --diff con indicadores + y -, y --watch con ciclos

**Narración:**
"Dos funcionalidades que nos encantan: diff y watch. Con diff comparas dos URLs, por ejemplo producción contra staging, y te muestra qué mejoró y qué empeoró. Con watch, la herramienta re-audita tu localhost cada 30 segundos mientras desarrollas, mostrándote en tiempo real qué issues son nuevos y cuáles resolviste. Es como hot reload pero de accesibilidad."

---

## SLIDE 7 — Extras: PDF, Git Hook, Extension (3:45 - 4:15)

**Visual:** Íconos de PDF, Git, Chrome con descripciones breves

**Narración:**
"También puedes exportar el reporte como PDF para compartir con tu equipo, instalar un git hook que bloquea el push si hay issues críticos, y cargar la Chrome Extension para auditar desde el navegador con un click. Todo funciona localmente sin APIs externas."

---

## SLIDE 8 — Desarrollo con Kiro SDD (4:15 - 4:45)

**Visual:** Estructura de .kiro/ con specs, hooks, steering

**Narración:**
"El proyecto fue desarrollado completamente usando Spec-Driven Development de Kiro IDE. Empezamos definiendo 11 requisitos en formato EARS, diseñamos la arquitectura microkernel, y ejecutamos 41 tareas divididas en 11 fases. Los hooks de Kiro validan automáticamente el código en cada paso, y el steering mantiene la consistencia del proyecto."

---

## SLIDE 9 — Cierre (4:45 - 5:00)

**Visual:** Links de npm, GitHub, landing page. Comando npx audittest-vision

**Narración:**
"AuditTest Vision está publicado en npm y disponible para cualquier desarrollador. Un comando y cero configuración. Gracias por ver."

---

## NOTAS PARA GOOGLE VIDS:

- Tono de voz: profesional pero cercano, como explicándole a un colega
- Ritmo: pausado, no apresurado
- Fondo musical: algo tech suave (lo pone Google Vids automático)
- Colores dominantes: morado (#7c3aed), negro (#09090b), blanco
