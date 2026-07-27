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

### Con sugerencias de fix
```bash
npx audittest-vision https://miapp.com --fix
```

### Reporte HTML interactivo (con screenshot anotado + score gauge)
```bash
npx audittest-vision https://miapp.com --report --fix
```

### Exportar como PDF
```bash
npx audittest-vision https://miapp.com --pdf
```

### Comparar dos URLs (producción vs staging)
```bash
npx audittest-vision https://prod.com --diff https://staging.com
```

### Watch mode (re-audita cada 30s durante desarrollo)
```bash
npx audittest-vision http://localhost:3000 --watch
```

### Salida JSON (para CI/CD pipelines)
```bash
npx audittest-vision https://miapp.com --json
```

### Guardar screenshot
```bash
npx audittest-vision https://miapp.com --screenshot
```

---

## Referencia Completa de Flags

| Flag | Descripción |
|------|-------------|
| `<url>` | URL o ruta de archivo a auditar |
| `--fix` | Muestra sugerencias de auto-fix para cada issue |
| `--report` | Genera reporte HTML interactivo con screenshot anotado |
| `--pdf` | Exporta el reporte como PDF |
| `--json` | Salida JSON para pipelines CI/CD |
| `--diff <url2>` | Compara accesibilidad entre dos URLs |
| `--watch` | Re-audita cada 30 segundos (modo dev) |
| `--screenshot` | Guarda screenshot como PNG |
| `--help, -h` | Muestra ayuda completa |

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
|   +-----------+   +-----------+   +------------+            |
|   |  Visual   |   |   WCAG    |   |  Auto-Fix  |            |
|   |  Module   |   |  Module   |   |   Module   |            |
|   |(Puppeteer)|   | (7 Reglas)|   |(Sugerencias)|           |
|   +-----+-----+   +-----+-----+   +------+-----+           |
|         |               |                 |                  |
|         +-------+-------+-------+---------+                  |
|                 |               |                             |
|          +------+------+  +----+--------+                    |
|          |Score Engine |  | Report Gen. |                    |
|          |  (0-100)    |  |(HTML/PDF/JSON)|                  |
|          +------+------+  +-------------+                    |
|                 |                                             |
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
