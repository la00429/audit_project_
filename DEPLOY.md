# Guía de Despliegue — AuditTest Vision

## Paso 1: Preparar el Build

Abre una terminal (PowerShell) en la carpeta del proyecto y ejecuta:

```powershell
# Si npm te da error de "ejecución de scripts deshabilitada":
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

# Instalar dependencias (solo la primera vez)
npm install

# Generar iconos (solo la primera vez)
npm run icons

# Compilar todo + copiar assets
npm run package
```

Esto genera la carpeta `dist/` con todo listo.

## Paso 2: Cargar la Extensión en Chrome

1. Abre Chrome → escribe `chrome://extensions/` en la barra de direcciones
2. Activa **"Modo desarrollador"** (esquina superior derecha)
3. Click en **"Cargar extensión sin empaquetar"**
4. Selecciona la carpeta: `dist/extension/`
5. Verás el ícono morado de AuditTest Vision en tu barra de extensiones

## Paso 3: Publicar en Chrome Web Store (producción real)

1. Ve a https://chrome.google.com/webstore/devconsole
2. Paga la cuota de desarrollador ($5 USD, una sola vez)
3. Click "Nuevo elemento"
4. Sube un ZIP de la carpeta `dist/extension/`:
   ```powershell
   Compress-Archive -Path dist/extension/* -DestinationPath audittest-vision.zip
   ```
5. Llena la información del listing (descripción, capturas, categoría)
6. Envía a revisión (tarda 1-3 días)

## Paso 4: Configurar API (si usas los módulos de IA)

Los módulos de Vision LLM y Auto-Fix necesitan un backend. Tienes dos opciones:

### Opción A: Usar OpenAI directamente

1. Copia `.env.example` a `.env`
2. Cambia `AUDITTEST_API_KEY` por tu key de OpenAI
3. Cambia los endpoints a:
   ```
   VISION_API_ENDPOINT=https://api.openai.com/v1/chat/completions
   AUTOFIX_API_ENDPOINT=https://api.openai.com/v1/chat/completions
   ```
4. El modelo `gpt-4o` soporta análisis de imágenes (vision)

### Opción B: Sin backend (solo WCAG local)

El módulo WCAG funciona al 100% sin necesidad de API. Solo desactiva los módulos de IA en `audit-rules.spec.json`:

```json
{
  "visual": { "enabled": false },
  "autoFix": { "enabled": false }
}
```

## Paso 5: Instalar Git Hook

```powershell
Copy-Item src/cli/git-hook-pre-push.sh .git/hooks/pre-push
```

En Git Bash (o WSL) ejecuta:
```bash
chmod +x .git/hooks/pre-push
```

## Paso 6: Subir a GitHub

```powershell
git add -A
git commit -m "feat: AuditTest Vision v1.0.0 - initial release"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/audittest-vision.git
git push -u origin main
```

## Estructura final del proyecto

```
audittest-vision/
├── dist/                      ← BUILD (no commitear)
│   ├── extension/             ← Cargar esto en Chrome
│   │   ├── manifest.json
│   │   ├── popup.html
│   │   ├── popup.js
│   │   ├── content.js
│   │   ├── content.css
│   │   ├── background.js
│   │   └── icons/
│   ├── core/
│   └── modules/
├── src/                       ← Código fuente
├── scripts/                   ← Scripts de build
├── .kiro/                     ← Configuración Kiro
├── audit-rules.spec.json      ← Config de reglas
├── package.json
└── tsconfig.json
```

## Troubleshooting

| Problema | Solución |
|----------|----------|
| "ejecución de scripts deshabilitada" | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Extension no carga | Asegúrate de seleccionar `dist/extension/`, no `src/extension/` |
| Iconos no aparecen | Ejecuta `npm run icons` y luego `npm run package` |
| API no responde | Revisa `.env` y que `AUDITTEST_API_KEY` sea válido |
| Git hook no funciona | Necesitas Git Bash o WSL para scripts .sh |
