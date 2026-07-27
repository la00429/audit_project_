# AuditTest Vision

**Herramienta CLI de productividad** que automatiza la auditoría de accesibilidad (WCAG 2.1) y detección de errores visuales de layout en páginas web. Un comando, cero configuración, resultados inmediatos.

> Reto 4: Productividad y herramientas para desarrolladores — Hackathon Código Facilito + Kiro 2026

## El Problema

Los desarrolladores dedicamos horas a revisar manualmente nuestras interfaces buscando problemas de accesibilidad y errores visuales. Este proceso es:

- **Repetitivo** — las mismas verificaciones en cada deploy
- **Propenso a errores** — el ojo humano no detecta ratios de contraste
- **Lento** — revisar cada página, cada breakpoint, cada componente
- **Inconsistente** — depende de quién revise y su experiencia en WCAG

## La Solución

**AuditTest Vision** automatiza todo esto con un solo comando:

```bash
npx audittest-vision https://tu-sitio.com --fix
```

Usa Puppeteer para navegar la página, extrae el DOM completo, y ejecuta un motor de reglas que detecta:

- Contraste de color insuficiente (WCAG 1.4.3)
- Imágenes sin texto alternativo (WCAG 1.1.1)
- Formularios sin labels accesibles (WCAG 1.3.1)
- Jerarquía de headings incorrecta (WCAG 1.3.1)
- Ausencia de landmarks semánticos (WCAG 1.3.1)
- Elementos fuera del viewport (detección visual)
- Botones/enlaces sin texto accesible (WCAG 1.1.1)
- **Sugerencias de auto-fix** para cada problema

## Publicado en npm

```bash
npx audittest-vision https://cualquier-sitio.com
```

Disponible globalmente: [npmjs.com/package/audittest-vision](https://www.npmjs.com/package/audittest-vision)

## Características

| Feature | Descripción |
|---------|-------------|
| **CLI standalone** | Funciona 100% local con Puppeteer, sin APIs externas |
| **WCAG 2.1 AA** | 7 reglas de accesibilidad evaluadas automáticamente |
| **Detección visual** | Analiza bounding boxes para detectar overflow y elementos fuera del viewport |
| **Auto-Fix** | Genera sugerencias de CSS/HTML para corregir cada issue |
| **CI/CD ready** | Exit code 1 en issues críticos + salida `--json` |
| **Chrome Extension** | UI con botón flotante, badges de severidad, export a GitHub Issue |
| **Git Hook** | Pre-push que bloquea deploy si hay issues críticos |
| **Zero config** | Funciona out-of-the-box sin configuración |

## Arquitectura

```
┌──────────────────────────────────────────────────────┐
│               AuditTest Vision                        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐   │
│  │  Visual    │  │   WCAG     │  │  Auto-Fix   │   │
│  │  Module    │  │  Module    │  │   Module    │   │
│  │(Puppeteer) │  │ (Reglas)   │  │ (Sugerencias│   │
│  └─────┬──────┘  └─────┬──────┘  └──────┬──────┘   │
│        └───────┬────────┴────────┬───────┘          │
│                │                 │                    │
│         ┌──────┴──────┐  ┌──────┴──────┐           │
│         │Audit Engine │  │  CLI Tool   │           │
│         │(Orquestador)│  │ (Terminal)  │           │
│         └──────┬──────┘  └─────────────┘           │
│                │                                     │
│         ┌──────┴──────┐                             │
│         │   Chrome    │                             │
│         │  Extension  │                             │
│         └─────────────┘                             │
└──────────────────────────────────────────────────────┘
```

## Uso

### CLI (Terminal) — Forma principal

```bash
# Auditar cualquier URL pública
npx audittest-vision https://google.com

# Con sugerencias de cómo arreglar cada issue
npx audittest-vision https://miapp.com --fix

# Salida JSON para pipelines CI/CD
npx audittest-vision https://miapp.com --json

# Guardar screenshot de la página auditada
npx audittest-vision https://miapp.com --screenshot

# Auditar un archivo HTML local
npx audittest-vision ./dist/index.html
```

### Chrome Extension (UI visual)

1. Clonar repo y compilar: `npm install && npm run package`
2. Abrir `chrome://extensions/` → activar Modo desarrollador
3. "Cargar extensión sin empaquetar" → seleccionar `dist/extension/`
4. Navegar a cualquier página → click en botón **Audit**

### Git Hook (automatización pre-push)

```bash
cp src/cli/git-hook-pre-push.sh .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

## Instalación desde código fuente

```bash
git clone https://github.com/la00429/audit_project_.git
cd audit_project_
npm install
npm run package
```

## Tecnologías

| Tecnología | Uso |
|-----------|-----|
| **TypeScript 5** | Lenguaje principal (strict mode) |
| **Puppeteer 22** | Navegador headless para captura y análisis DOM |
| **Chrome Manifest V3** | Extensión del navegador moderna |
| **Kiro IDE** | Desarrollo con Spec-Driven Development (SDD) |
| **Node.js** | Runtime para CLI |
| **npm** | Distribución del paquete |

## Desarrollo con Kiro (Spec-Driven Development)

Este proyecto fue construido íntegramente usando el flujo SDD de Kiro IDE:

```
.kiro/
├── specs/audit-vision/
│   ├── requirements.md    ← Requisitos funcionales (formato EARS)
│   ├── design.md          ← Arquitectura y flujo de datos
│   └── tasks.md           ← Checklist de implementación (27 tareas)
├── hooks/
│   ├── validate-env.json  ← Valida config antes de tareas
│   ├── lint-on-save.json  ← TypeScript check al guardar
│   └── pre-push-audit-check.json ← Gate de calidad pre-push
└── steering/
    └── audit-vision.md    ← Reglas de estilo y estándares
```

### Flujo SDD aplicado:

1. **Requirements** → 6 requisitos funcionales + 4 NFRs en formato EARS
2. **Design** → Arquitectura microkernel, interfaces TypeScript, flujo de datos
3. **Tasks** → 27 tareas en 6 fases ejecutadas secuencialmente
4. **Hooks** → Automatización de validaciones en cada paso
5. **Steering** → Contexto persistente para consistencia del código

## Estructura del Proyecto

```
audittest-vision/
├── src/
│   ├── core/
│   │   └── auditEngine.ts      # Orquestador central (microkernel)
│   ├── modules/
│   │   ├── visualModule.ts      # Detección visual de errores de layout
│   │   ├── wcagModule.ts        # Motor de reglas WCAG 2.1
│   │   └── autoFixModule.ts     # Generador de sugerencias de fix
│   ├── extension/
│   │   ├── manifest.json        # Chrome Manifest V3
│   │   ├── popup.html/ts        # UI del popup
│   │   ├── content.ts           # Script inyectado en páginas
│   │   └── background.ts        # Service worker
│   └── cli/
│       ├── audittest.ts         # CLI standalone (entry point)
│       └── git-hook-pre-push.sh # Hook de git
├── scripts/                     # Build y utilidades
├── .kiro/                       # Specs, hooks, steering (SDD)
├── audit-rules.spec.json        # Configuración de reglas
├── docs/                        # Landing page (GitHub Pages)
└── dist/                        # Build compilado
```

## Demo y enlaces

| Recurso | URL |
|---------|-----|
| **npm (producción)** | https://www.npmjs.com/package/audittest-vision |
| **Repositorio** | https://github.com/la00429/audit_project_ |
| **Landing Page** | https://la00429.github.io/audit_project_/ |

## Configuración Avanzada

Editar `audit-rules.spec.json` para personalizar:

- Nivel WCAG (A, AA, AAA)
- Habilitar/deshabilitar reglas específicas
- Umbrales del quality gate para el git hook
- Permisos de auto-fix (CSS, HTML, atributos)

## Autor

Desarrollado para el **Hackathon Código Facilito + Kiro 2026** — Reto 4: Productividad y herramientas para desarrolladores.

## Licencia

MIT
