# Pruebas de Comandos — AuditTest Vision

Guía para probar todos los comandos del CLI con sitios reales.

---

## 1. Auditoría básica

```bash
# Sitio simple y limpio (debería pasar con score alto)
npx audittest-vision https://example.com

# Wikipedia (muchos elementos, buena accesibilidad)
npx audittest-vision https://es.wikipedia.org

# GitHub (sitio complejo, bien hecho)
npx audittest-vision https://github.com
```

---

## 2. Con sugerencias de fix (--fix)

```bash
# Blog personal (suele tener imágenes sin alt)
npx audittest-vision https://dev.to --fix

# Sitio gubernamental (a veces tiene problemas de contraste)
npx audittest-vision https://www.gob.mx --fix

# E-commerce (formularios sin labels, imágenes sin alt)
npx audittest-vision https://www.mercadolibre.com --fix
```

---

## 3. Reporte HTML interactivo (--report)

```bash
# Genera reporte con screenshot anotado
npx audittest-vision https://www.codigofacilito.com --report --fix

# Abre el reporte generado
# Windows:
start audittest-report.html
# Mac:
open audittest-report.html
# Linux:
xdg-open audittest-report.html
```

---

## 4. Exportar como PDF (--pdf)

```bash
# Genera PDF del reporte (requiere que --report se genere primero internamente)
npx audittest-vision https://nodejs.org --pdf --fix

# El PDF se guarda como: audittest-report.pdf
```

---

## 5. Comparación entre URLs (--diff)

```bash
# Comparar dos versiones de un sitio
npx audittest-vision https://www.google.com --diff https://www.google.com.mx

# Comparar producción vs documentación
npx audittest-vision https://react.dev --diff https://vuejs.org

# Comparar tu localhost vs producción (si tienes un server corriendo)
npx audittest-vision http://localhost:3000 --diff https://tu-sitio-en-produccion.com
```

---

## 6. Watch mode (--watch)

```bash
# Monitorear tu servidor local (re-audita cada 30s)
npx audittest-vision http://localhost:3000 --watch

# Monitorear un sitio externo (útil para detectar cambios)
npx audittest-vision https://www.codigofacilito.com --watch

# Detener con Ctrl+C
```

---

## 7. Salida JSON (--json)

```bash
# Para integrar en CI/CD pipelines
npx audittest-vision https://example.com --json

# Guardar JSON en archivo
npx audittest-vision https://github.com --json > audit-result.json

# Combinar con fix para tener sugerencias en el JSON
npx audittest-vision https://dev.to --json --fix
```

---

## 8. Screenshot (--screenshot)

```bash
# Guarda screenshot como audittest-screenshot.png
npx audittest-vision https://www.codigofacilito.com --screenshot

# Combinar con reporte
npx audittest-vision https://tailwindcss.com --screenshot --report --fix
```

---

## 9. Combinaciones útiles

```bash
# Auditoría completa: reporte + PDF + fix + screenshot
npx audittest-vision https://www.codigofacilito.com --report --pdf --fix --screenshot

# Modo CI/CD: JSON + exit code para pipelines
npx audittest-vision https://mi-app.vercel.app --json --fix

# Archivo HTML local
npx audittest-vision ./dist/index.html --report --fix

# Comparación completa con fix
npx audittest-vision https://prod.miapp.com --diff https://staging.miapp.com --fix
```

---

## 10. Sitios recomendados para probar (variedad de resultados)

| Sitio | Esperado | Por qué |
|-------|----------|---------|
| `https://example.com` | Score 100 | Página mínima, sin issues |
| `https://www.w3.org` | Score 85-95 | Bien hecho, pocas fallas |
| `https://es.wikipedia.org` | Score 70-85 | Muchos elementos, algunos sin labels |
| `https://www.google.com` | Score 80-90 | Optimizado pero no perfecto |
| `https://dev.to` | Score 60-80 | Imágenes de usuarios sin alt |
| `https://www.mercadolibre.com` | Score 50-70 | E-commerce complejo, muchos issues |
| `https://www.gob.mx` | Score 40-70 | Depende de la sección |

---

## Notas

- La primera ejecución tarda más porque Puppeteer descarga Chromium (~170MB)
- Los sitios con mucho JavaScript pueden tardar hasta 30s en cargar
- El score varía según la página específica que cargue (contenido dinámico)
- `--watch` es ideal para desarrollo local, no para sitios externos en producción
- `--diff` audita las dos URLs secuencialmente (tarda el doble)
- Si un sitio bloquea headless browsers, verás un error de timeout
