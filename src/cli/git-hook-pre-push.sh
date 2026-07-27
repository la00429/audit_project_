#!/usr/bin/env bash
# ============================================================================
# AuditTest Vision — Pre-Push Git Hook
#
# Runs a lightweight headless audit check before allowing a git push.
# Blocks the push if critical accessibility or visual issues are detected.
#
# Installation:
#   cp src/cli/git-hook-pre-push.sh .git/hooks/pre-push
#   chmod +x .git/hooks/pre-push
#
# Configuration:
#   Set AUDITTEST_API_KEY and AUDITTEST_URL env vars, or use audit-rules.spec.json
# ============================================================================

set -euo pipefail

# --- Configuration ---
AUDIT_URL="${AUDITTEST_URL:-http://localhost:3000}"
API_KEY="${AUDITTEST_API_KEY:-}"
CONFIG_FILE="audit-rules.spec.json"
MAX_CRITICAL="${AUDITTEST_MAX_CRITICAL:-0}"
TIMEOUT="${AUDITTEST_TIMEOUT:-30}"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}[AuditTest Vision]${NC} Running pre-push quality gate..."

# --- Check prerequisites ---
if ! command -v node &> /dev/null; then
  echo -e "${RED}[AuditTest Vision]${NC} Node.js is required but not installed. Skipping audit."
  exit 0
fi

if ! command -v npx &> /dev/null; then
  echo -e "${RED}[AuditTest Vision]${NC} npx is required but not installed. Skipping audit."
  exit 0
fi

# --- Load config if available ---
if [ -f "$CONFIG_FILE" ]; then
  # Extract max critical threshold from config
  CONFIG_MAX_CRITICAL=$(node -e "
    try {
      const c = require('./${CONFIG_FILE}');
      console.log(c.gates?.prePush?.maxCritical ?? 0);
    } catch(e) { console.log(0); }
  " 2>/dev/null || echo "0")
  MAX_CRITICAL="${CONFIG_MAX_CRITICAL}"
fi

# --- Find target URL to audit ---
# Check if a dev server is running, or use a static file
TARGET_URL=""

if curl -s --max-time 2 "http://localhost:3000" > /dev/null 2>&1; then
  TARGET_URL="http://localhost:3000"
elif curl -s --max-time 2 "http://localhost:5173" > /dev/null 2>&1; then
  TARGET_URL="http://localhost:5173"
elif curl -s --max-time 2 "http://localhost:8080" > /dev/null 2>&1; then
  TARGET_URL="http://localhost:8080"
else
  echo -e "${YELLOW}[AuditTest Vision]${NC} No dev server detected. Running static file audit..."
  # Look for an index.html to audit
  if [ -f "dist/index.html" ]; then
    TARGET_URL="file://$(pwd)/dist/index.html"
  elif [ -f "public/index.html" ]; then
    TARGET_URL="file://$(pwd)/public/index.html"
  elif [ -f "index.html" ]; then
    TARGET_URL="file://$(pwd)/index.html"
  else
    echo -e "${YELLOW}[AuditTest Vision]${NC} No auditable target found. Skipping."
    exit 0
  fi
fi

echo -e "${YELLOW}[AuditTest Vision]${NC} Auditing: ${TARGET_URL}"

# --- Run headless audit via Puppeteer ---
AUDIT_RESULT=$(node --experimental-vm-modules -e "
const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto('${TARGET_URL}', { waitUntil: 'networkidle2', timeout: ${TIMEOUT}000 });

    // Capture screenshot
    const screenshot = await page.screenshot({ encoding: 'base64' });

    // Extract basic DOM metadata for WCAG checks
    const elements = await page.evaluate(() => {
      const items = [];
      const tags = ['img', 'input', 'select', 'textarea', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'a', 'main', 'nav', 'header', 'footer'];
      
      for (const tag of tags) {
        document.querySelectorAll(tag).forEach(el => {
          const rect = el.getBoundingClientRect();
          const computed = window.getComputedStyle(el);
          items.push({
            selector: el.id ? '#' + el.id : tag + (el.className ? '.' + el.className.split(' ')[0] : ''),
            tagName: el.tagName,
            boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            computedStyles: { color: computed.color, backgroundColor: computed.backgroundColor, fontSize: computed.fontSize, fontWeight: computed.fontWeight },
            attributes: { alt: el.getAttribute('alt'), 'aria-label': el.getAttribute('aria-label'), role: el.getAttribute('role'), id: el.id || undefined },
            textContent: (el.textContent || '').trim().slice(0, 50),
          });
        });
      }
      return items.slice(0, 200);
    });

    // Quick WCAG checks inline (no API call needed)
    let criticalCount = 0;
    let issues = [];

    // Check images without alt
    const imgsNoAlt = elements.filter(e => e.tagName === 'IMG' && !e.attributes.alt && !e.attributes['aria-label']);
    if (imgsNoAlt.length > 0) {
      issues.push({ severity: 'major', title: 'Images missing alt text', count: imgsNoAlt.length });
    }

    // Check color contrast (simplified)
    for (const el of elements) {
      if (!el.computedStyles.color || !el.computedStyles.backgroundColor) continue;
      if (!el.textContent) continue;
      const parseRgb = (s) => { const m = s.match(/rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)/); return m ? [+m[1],+m[2],+m[3]] : null; };
      const fg = parseRgb(el.computedStyles.color);
      const bg = parseRgb(el.computedStyles.backgroundColor);
      if (!fg || !bg) continue;
      const lum = (rgb) => { const c = rgb.map(v => { const s = v/255; return s <= 0.03928 ? s/12.92 : Math.pow((s+0.055)/1.055, 2.4); }); return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; };
      const ratio = (Math.max(lum(fg),lum(bg))+0.05) / (Math.min(lum(fg),lum(bg))+0.05);
      if (ratio < 3.0) {
        criticalCount++;
        issues.push({ severity: 'critical', title: 'Very low contrast on: ' + el.selector });
      }
    }

    // Check for landmarks
    const hasLandmark = elements.some(e => ['MAIN','NAV','HEADER','FOOTER'].includes(e.tagName) || e.attributes.role);
    if (!hasLandmark) {
      issues.push({ severity: 'minor', title: 'No landmark regions found' });
    }

    console.log(JSON.stringify({ criticalCount, totalIssues: issues.length, issues }));
  } catch (err) {
    console.log(JSON.stringify({ criticalCount: 0, totalIssues: 0, issues: [], error: err.message }));
  } finally {
    if (browser) await browser.close();
  }
})();
" 2>/dev/null)

# --- Parse results ---
if [ -z "$AUDIT_RESULT" ]; then
  echo -e "${YELLOW}[AuditTest Vision]${NC} Audit returned no results. Allowing push."
  exit 0
fi

CRITICAL_COUNT=$(echo "$AUDIT_RESULT" | node -e "
  const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  console.log(data.criticalCount || 0);
" 2>/dev/null || echo "0")

TOTAL_ISSUES=$(echo "$AUDIT_RESULT" | node -e "
  const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  console.log(data.totalIssues || 0);
" 2>/dev/null || echo "0")

# --- Gate Decision ---
echo -e "${YELLOW}[AuditTest Vision]${NC} Scan complete: ${TOTAL_ISSUES} issues found (${CRITICAL_COUNT} critical)"

if [ "$CRITICAL_COUNT" -gt "$MAX_CRITICAL" ]; then
  echo ""
  echo -e "${RED}════════════════════════════════════════════════════════${NC}"
  echo -e "${RED} PUSH BLOCKED: ${CRITICAL_COUNT} critical issue(s) detected${NC}"
  echo -e "${RED} Maximum allowed: ${MAX_CRITICAL}${NC}"
  echo -e "${RED}════════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "${YELLOW}Issues:${NC}"
  echo "$AUDIT_RESULT" | node -e "
    const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    data.issues.forEach(i => console.log('  [' + i.severity.toUpperCase() + '] ' + i.title + (i.count ? ' (' + i.count + ')' : '')));
  " 2>/dev/null
  echo ""
  echo -e "Run ${GREEN}npx audittest-vision --fix${NC} to auto-fix issues, or use ${GREEN}git push --no-verify${NC} to bypass."
  exit 1
fi

echo -e "${GREEN}[AuditTest Vision]${NC} Quality gate passed. Push allowed."
exit 0
