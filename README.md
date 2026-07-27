# AuditTest Vision

**Herramienta CLI de productividad** que automatiza la auditoría de accesibilidad (WCAG 2.1) y detección de errores visuales de layout en páginas web. Un comando, cero configuración, resultados inmediatos.

> Reto 4: Productividad y herramientas para desarrolladores — Hackathon Código Facilito + Kiro 2026

---

## El Problema

Los desarrolladores dedicamos horas revisando manualmente interfaces buscando problemas de accesibilidad y errores visuales:

- **Repetitivo** — las mismas verificaciones en cada deploy
- **Propenso a errores** — el ojo humano no detecta ratios de contraste
- **Lento** — revisar cada página, cada breakpoint, cada componente
- **Inconsistente** — depende de quién revise y su experiencia en WCAG

## La Solución

```bash
npx audittest-vision https://tu-sitio.com --report --fix
```

En segundos: score de accesibilidad, lista de problemas, sugerencias de fix, y un reporte HTML interactivo con el screenshot de la página anotado.

---

## Publicado en npm

```bash
npx audittest-vision https://cualquier-sitio.com
```

**https://www.npmjs.com/package/audittest-vision**

---

## Comandos

### Auditoría básica
```bash
npx audittest-vision https://google.com
```
**Salida esperada:**
```
🔍 Auditing: https://google.com
████████████████░░░░ 82/100 — Bueno

Found 3 issues:
  ⛔ [critical] Contraste insuficiente — div.header > h1 (ratio: 2.8:1)
  ⚠️  [major] Imagen sin alt text — img.logo
  ℹ️  [minor] Heading saltado (h1 → h3) — section.content > h3
```

### Con sugerencias de fix (`--fix`)
```bash
npx audittest-vision https://miapp.com --fix
```
**Salida esperada:**
```
🔍 Auditing: https://miapp.com
████████████████████ 95/100 — Excelente

Found 1 issue:
  ⚠️  [major] Imagen sin alt text — img.hero-banner

💡 Auto-fix suggestions:
  1. img.hero-banner
     Type: attribute
     Fix: <img src="hero.png" alt="Banner principal del sitio">
     Desc: Agregar texto alternativo descriptivo
```

### Reporte HTML interactivo (`--report`)
```bash
npx audittest-vision https://miapp.com --report --fix
```
**Salida esperada:**
```
🔍 Auditing: https://miapp.com
📸 Screenshot captured
📊 Score: 78/100 — Bueno
📝 Report saved: audittest-report.html
   Open in browser to see interactive markers on screenshot
```
Genera un archivo `audittest-report.html` con screenshot anotado, markers clickeables, score gauge, y toggle light/dark mode.

### Exportar como PDF (`--pdf`)
```bash
npx audittest-vision https://miapp.com --pdf
```
**Salida esperada:**
```
🔍 Auditing: https://miapp.com
📸 Screenshot captured
📊 Score: 78/100 — Bueno
📄 PDF saved: audittest-report.pdf
```
Genera un archivo `audittest-report.pdf` con score, resumen por severidad, lista detallada de issues, y screenshot.

### Comparar dos URLs (`--diff`)
```bash
npx audittest-vision https://prod.com --diff https://staging.com
```
**Salida esperada:**
```
🔍 Comparing:
   URL1: https://prod.com (Score: 72)
   URL2: https://staging.com (Score: 85)

📈 Score change: +13 points

  + [FIXED] img.banner sin alt text
  + [FIXED] Contraste en .nav-link
  - [NEW] Heading saltado en section.about
  = [PERSISTENT] Input sin label — form#contact > input.email
```

### Watch mode (`--watch`)
```bash
npx audittest-vision http://localhost:3000 --watch
```
**Salida esperada:**
```
🔍 Watching: http://localhost:3000 (every 30s)
   Press Ctrl+C to stop

[14:30:00] Score: 82/100 — 3 issues
[14:30:30] Score: 85/100 — 2 issues
   [FIXED] img.logo sin alt text
[14:31:00] Score: 78/100 — 4 issues
   [NEW] Contraste insuficiente — .footer > p
   [NEW] Input sin label — form > input.search
```

### Salida JSON (`--json`)
```bash
npx audittest-vision https://miapp.com --json
```
**Salida esperada:**
```json
{
  "url": "https://miapp.com",
  "timestamp": "2025-01-15T10:30:00Z",
  "duration": 2340,
  "score": 82,
  "classification": "Bueno",
  "issues": [
    {
      "id": "wcag-1.1.1-alt",
      "severity": "major",
      "rule": "1.1.1 Non-text Content",
      "selector": "img.hero-banner",
      "message": "Imagen sin texto alternativo"
    }
  ],
  "summary": { "critical": 0, "major": 1, "minor": 2 }
}
```
Exit code: `0` si no hay issues críticos, `1` si hay al menos un critical (útil para CI/CD).

### Guardar screenshot (`--screenshot`)
```bash
npx audittest-vision https://miapp.com --screenshot
```
**Salida esperada:**
```
🔍 Auditing: https://miapp.com
📸 Screenshot saved: audittest-screenshot.png
📊 Score: 82/100 — Bueno
Found 3 issues...
```

### Mostrar ayuda (`--help`)
```bash
npx audittest-vision --help
```
**Salida esperada:**
```
AuditTest Vision — CLI de auditoría de accesibilidad

Uso: npx audittest-vision <url> [opciones]

Opciones:
  --fix              Muestra sugerencias de auto-fix
  --report           Genera reporte HTML interactivo
  --pdf              Exporta reporte como PDF
  --json             Salida JSON (para CI/CD)
  --diff <url2>      Compara accesibilidad entre dos URLs
  --watch            Re-audita cada 30s (modo desarrollo)
  --screenshot       Guarda screenshot como PNG
  --help, -h         Muestra esta ayuda

Ejemplos:
  npx audittest-vision https://google.com
  npx audittest-vision https://miapp.com --fix --report
  npx audittest-vision https://prod.com --diff https://staging.com
  npx audittest-vision http://localhost:3000 --watch
```

---

## Referencia Completa de Flags

| Flag | Descripción | Ejemplo | Formato de salida |
|------|-------------|---------|-------------------|
| `<url>` | URL o ruta local a auditar | `npx audittest-vision https://google.com` | Terminal: score + lista de issues |
| `--fix` | Muestra sugerencias de auto-fix para cada issue | `npx audittest-vision url --fix` | Terminal: issues + bloque de sugerencias con selector, tipo y código |
| `--report` | Genera reporte HTML interactivo con screenshot anotado | `npx audittest-vision url --report` | Archivo: `audittest-report.html` |
| `--pdf` | Exporta el reporte como PDF | `npx audittest-vision url --pdf` | Archivo: `audittest-report.pdf` |
| `--json` | Salida JSON estructurada para CI/CD | `npx audittest-vision url --json` | stdout: JSON con url, score, issues[], summary |
| `--diff <url2>` | Compara accesibilidad entre dos URLs | `npx audittest-vision url1 --diff url2` | Terminal: score delta + lista [NEW]/[FIXED]/[PERSISTENT] |
| `--watch` | Re-audita cada 30 segundos (modo dev) | `npx audittest-vision url --watch` | Terminal: updates continuos con [NEW]/[FIXED] por ciclo |
| `--screenshot` | Guarda screenshot de la página como PNG | `npx audittest-vision url --screenshot` | Archivo: `audittest-screenshot.png` |
| `--help, -h` | Muestra documentación de ayuda completa | `npx audittest-vision --help` | Terminal: lista de flags, descripciones y ejemplos |

---

## Accessibility Score (0-100)

Cada auditoría calcula un puntaje basado en la severidad de los issues:

```
████████████████░░░░ 82/100 — Bueno
```

| Rango | Clasificación | Color |
|-------|--------------|-------|
| 90-100 | Excelente | Verde |
| 70-89 | Bueno | Amarillo |
| 50-69 | Necesita trabajo | Naranja |
| 0-49 | Pobre | Rojo |

**Fórmula:** `score = max(0, 100 - (critical×25 + major×10 + minor×3))`

---

## Reglas Evaluadas (WCAG 2.1)

| Regla | Criterio | Nivel | Severidad |
|-------|----------|-------|-----------|
| Imágenes sin alt text | 1.1.1 | A | Major |
| Botones/enlaces sin texto | 1.1.1 | A | Major |
| Inputs sin label | 1.3.1 | A | Major |
| Headings saltados | 1.3.1 | A | Minor |
| Sin landmarks semánticos | 1.3.1 | A | Minor |
| Contraste insuficiente | 1.4.3 | AA | Critical/Major |
| Overflow del viewport | Visual | — | Major |

---

## Características

| Feature | Descripción |
|---------|-------------|
| **Score 0-100** | Puntaje de accesibilidad con gauge visual en el reporte |
| **7 reglas WCAG** | Evaluación automática de criterios reales |
| **Reporte HTML** | Screenshot anotado, markers clickeables, light/dark mode |
| **PDF export** | Genera PDF del reporte para compartir |
| **Diff entre URLs** | Compara producción vs staging, muestra regresiones |
| **Watch mode** | Re-audita cada 30s, detecta [NEW] y [FIXED] |
| **Auto-Fix** | Sugerencias concretas de CSS/HTML para cada issue |
| **CI/CD ready** | Exit code 1 en críticos + salida JSON |
| **Git Hook** | Pre-push que bloquea deploy con issues críticos |
| **Chrome Extension** | Botón flotante, badges visuales, export a GitHub Issue |
| **100% local** | Puppeteer headless, sin APIs externas |

---

## Arquitectura

```
+--------------------------------------------------------------+
|                      AuditTest Vision                        |
+--------------------------------------------------------------+
|                                                              |
|   +-----------+   +-----------+   +-------------+            |
|   |  Visual   |   |   WCAG    |   |  Auto-Fix   |            |
|   |  Module   |   |  Module   |   |   Module    |            |
|   |(Puppeteer)|   | (7 Reglas)|   |(Sugerencias)|            |
|   +-----+-----+   +-----+-----+   +------+------+            |
|         |               |                 |                  |
|         +-------+-------+-------+---------+                  |
|                 |               |                            |
|          +------+------+  +----+--------+                    |
|          |Score Engine |  | Report Gen. |                    |
|          |  (0-100)    |  |(HTML/PDF/JSON)|                  |
|          +------+------+  +-------------+                    |
|                 |                                            |
|     +-----------+-----------+-----------+                    |
|     |           |           |           |                    |
|     v           v           v           v                    |
|    CLI      Chrome Ext.  Git Hook   CI/CD                    |
|  --report   Popup UI     Pre-push   JSON output              |
|  --diff     Badges       Quality                             |
|  --watch    Export       gate                                |
|  --pdf                                                       |
+--------------------------------------------------------------+
```

---

## Instalación desde código fuente

```bash
git clone https://github.com/la00429/audit_project_.git
cd audit_project_
npm install
npm run package
```

## Chrome Extension

1. Compilar: `npm run package`
2. Abrir `chrome://extensions/` → Modo desarrollador
3. "Cargar sin empaquetar" → seleccionar `dist/extension/`
4. Navegar a cualquier página → click en botón flotante **Audit**

## Git Hook (pre-push)

```bash
cp src/cli/git-hook-pre-push.sh .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

---

## Tecnologías

| Tecnología | Uso |
|-----------|-----|
| **TypeScript 5** | Lenguaje principal (strict mode) |
| **Puppeteer 22** | Navegador headless, screenshots, PDF generation |
| **Chrome Manifest V3** | Extensión del navegador |
| **Kiro IDE** | Spec-Driven Development (SDD) |
| **Node.js** | Runtime para CLI |
| **npm** | Distribución del paquete |

---

## Desarrollo con Kiro (Spec-Driven Development)

Proyecto construido usando el flujo SDD nativo de Kiro IDE:

```
.kiro/
├── specs/audit-vision/
│   ├── requirements.md       # 11 requisitos EARS + 7 NFRs
│   ├── design.md             # Arquitectura y flujo de datos
│   └── tasks.md              # 41 tareas en 11 fases
├── hooks/
│   ├── validate-env.json     # Valida config antes de tareas
│   ├── lint-on-save.json     # TypeScript check al guardar
│   └── pre-push-audit-check.json  # Gate de calidad
└── steering/
    └── audit-vision.md       # Estandares y reglas del proyecto
```

### Flujo SDD aplicado:

1. **Requirements** - 11 requisitos funcionales en formato EARS + 7 no funcionales
2. **Design** - Arquitectura microkernel, interfaces TypeScript, data flow
3. **Tasks** - 41 tareas divididas en 11 fases ejecutadas secuencialmente
4. **Hooks** - Validacion automatica de env, lint al guardar, gate pre-push
5. **Steering** - Contexto persistente con reglas de codigo y convenciones

---

## Estructura del Proyecto

```
audittest-vision/
├── src/
│   ├── core/
│   │   └── auditEngine.ts           # Orquestador central (microkernel)
│   ├── modules/
│   │   ├── visualModule.ts           # Deteccion visual de layout
│   │   ├── wcagModule.ts             # Motor de reglas WCAG 2.1
│   │   └── autoFixModule.ts          # Generador de sugerencias
│   ├── extension/
│   │   ├── manifest.json             # Chrome Manifest V3
│   │   ├── popup.html                # UI del popup
│   │   ├── popup.ts                  # Controlador del popup
│   │   ├── content.ts                # Script inyectado en paginas
│   │   ├── content.css               # Estilos del overlay
│   │   ├── background.ts             # Service worker
│   │   └── icons/                    # Iconos 16/48/128px
│   └── cli/
│       ├── audittest.ts              # CLI principal (entry point)
│       └── git-hook-pre-push.sh      # Hook de git
├── scripts/
│   ├── build.ps1                     # Script de build (Windows)
│   ├── copy-assets.cjs               # Copia assets al dist
│   └── generate-icons.cjs            # Genera iconos PNG
├── docs/
│   └── index.html                    # Landing page (GitHub Pages)
├── .kiro/
│   ├── specs/audit-vision/           # SDD: requirements, design, tasks
│   ├── hooks/                        # Hooks: validate, lint, pre-push
│   └── steering/                     # Reglas y estandares
├── dist/                             # Build compilado
├── audit-rules.spec.json             # Configuracion de reglas
├── package.json                      # Dependencias y scripts
├── tsconfig.json                     # TypeScript config base
└── tsconfig.extension.json           # TypeScript config para build
```

---

## Demo y Enlaces

| Recurso | URL |
|---------|-----|
| **npm** | https://www.npmjs.com/package/audittest-vision |
| **GitHub** | https://github.com/la00429/audit_project_ |
| **Landing** | https://la00429.github.io/audit_project_/ |

---

## Autor

Desarrollado para el **Hackathon Código Facilito + Kiro 2026** — Reto 4: Productividad y herramientas para desarrolladores.

## Licencia

MIT
