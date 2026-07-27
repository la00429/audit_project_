# AuditTest Vision

**Herramienta de productividad para desarrolladores** que automatiza la auditoría visual y de accesibilidad web usando visión computacional e inteligencia artificial.

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
npx audittest-vision https://tu-sitio.com
```

En segundos obtienes un reporte con:

- Problemas de contraste de color (WCAG 1.4.3)
- Imágenes sin texto alternativo (WCAG 1.1.1)
- Formularios sin labels accesibles (WCAG 1.3.1)
- Jerarquía de headings incorrecta
- Elementos fuera del viewport
- Botones/enlaces sin texto accesible
- **Sugerencias de auto-fix** para cada problema detectado

## Características Principales

| Feature | Descripción |
|---------|-------------|
| **CLI standalone** | Funciona sin APIs externas, 100% local con Puppeteer |
| **WCAG 2.1 AA** | Evalúa criterios de accesibilidad reales |
| **Auto-Fix** | Genera parches CSS/HTML para cada issue |
| **CI/CD ready** | Exit code 1 en issues críticos, salida JSON |
| **Chrome Extension** | UI integrada en el navegador |
| **Git Hook** | Bloquea push si hay issues críticos |
| **Zero config** | Funciona out-of-the-box sin configuración |

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│              AuditTest Vision                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────┐  ┌───────────┐  ┌────────────┐     │
│  │  Visual   │  │   WCAG    │  │  Auto-Fix  │     │
│  │  Module   │  │  Module   │  │   Module   │     │
│  │(Vision AI)│  │(Reglas)   │  │(AI+Reglas) │     │
│  └─────┬─────┘  └─────┬─────┘  └─────┬──────┘     │
│        └───────┬───────┴───────┬──────┘            │
│                │               │                    │
│         ┌──────┴──────┐ ┌─────┴──────┐            │
│         │Audit Engine │ │  CLI Tool  │            │
│         │(Orquestador)│ │ (Terminal) │            │
│         └──────┬──────┘ └────────────┘            │
│                │                                    │
│         ┌──────┴──────┐                            │
│         │   Chrome    │                            │
│         │  Extension  │                            │
│         └─────────────┘                            │
└─────────────────────────────────────────────────────┘
```

## Uso

### Modo CLI (Terminal)

```bash
# Auditar una URL
npx audittest-vision https://google.com

# Con sugerencias de auto-fix
npx audittest-vision https://miapp.com --fix

# Salida JSON (para pipelines CI/CD)
npx audittest-vision https://miapp.com --json

# Guardar screenshot
npx audittest-vision https://miapp.com --screenshot
```

### Chrome Extension

1. Compilar: `npm run package`
2. Abrir `chrome://extensions/` → Modo desarrollador
3. "Cargar sin empaquetar" → seleccionar `dist/extension/`
4. Navegar a cualquier página y hacer click en el botón **Audit**

### Git Hook (pre-push)

```bash
cp src/cli/git-hook-pre-push.sh .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

Bloquea el push si detecta issues críticos de accesibilidad.

## Instalación

```bash
# Clonar
git clone https://github.com/la00429/audit_project_.git
cd audit_project_

# Instalar dependencias
npm install

# Generar iconos de extensión
npm run icons

# Compilar todo
npm run package
```

## Tecnologías

| Tecnología | Uso |
|-----------|-----|
| **TypeScript** | Lenguaje principal (strict mode) |
| **Puppeteer** | Navegación headless y screenshots |
| **Chrome Manifest V3** | Extension del navegador |
| **Kiro IDE** | Desarrollo con SDD (Spec-Driven Development) |
| **Node.js** | Runtime para CLI y build |

## Uso de Kiro (Spec-Driven Development)

Este proyecto fue desarrollado íntegramente usando el flujo SDD de Kiro:

```
.kiro/
├── specs/audit-vision/
│   ├── requirements.md    ← Requisitos funcionales (formato EARS)
│   ├── design.md          ← Arquitectura y flujo de datos
│   └── tasks.md           ← Checklist de implementación
├── hooks/
│   ├── validate-env.json  ← Valida API keys antes de tareas
│   ├── lint-on-save.json  ← TypeScript check al guardar
│   └── pre-push-audit-check.json ← Gate de calidad pre-push
└── steering/
    └── audit-vision.md    ← Reglas de estilo y estándares
```

### Flujo SDD aplicado:

1. **Requirements** → Definición EARS de cada funcionalidad
2. **Design** → Arquitectura microkernel, interfaces TypeScript
3. **Tasks** → Ejecución paso a paso verificable por Kiro
4. **Hooks** → Automatización de validaciones en cada paso
5. **Steering** → Contexto persistente para consistencia

## Estructura del Proyecto

```
audittest-vision/
├── src/
│   ├── core/
│   │   └── auditEngine.ts      # Orquestador central
│   ├── modules/
│   │   ├── visualModule.ts      # Análisis visual (Vision AI)
│   │   ├── wcagModule.ts        # Reglas WCAG 2.1
│   │   └── autoFixModule.ts     # Generador de parches
│   ├── extension/
│   │   ├── manifest.json        # Chrome Manifest V3
│   │   ├── popup.html/ts        # UI del popup
│   │   ├── content.ts           # Script de página
│   │   └── background.ts        # Service worker
│   └── cli/
│       ├── audittest.ts         # CLI standalone
│       └── git-hook-pre-push.sh # Hook de git
├── scripts/                     # Build y utilidades
├── .kiro/                       # Specs, hooks, steering
├── audit-rules.spec.json        # Configuración de reglas
└── dist/                        # Build compilado
```

## Demo

**Landing Page:** [https://la00429.github.io/audit_project_/](https://la00429.github.io/audit_project_/)

**Repositorio:** [https://github.com/la00429/audit_project_](https://github.com/la00429/audit_project_)

## Configuración Avanzada

Editar `audit-rules.spec.json` para personalizar:

- Nivel WCAG (A, AA, AAA)
- Habilitar/deshabilitar reglas específicas
- Umbrales del quality gate
- Permisos de auto-fix

## Autor

Desarrollado para el **Hackathon Código Facilito + Kiro 2026** — Reto 4: Productividad y herramientas para desarrolladores.

## Licencia

MIT
