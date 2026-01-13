#!/bin/bash
# Website Validation Script für whatsapp.owona.de
# Basierend auf Web Development Expert MCP Server Expertise

URL="https://whatsapp.owona.de/de"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

echo "🔍 Website Validation Report"
echo "URL: $URL"
echo "Datum: $TIMESTAMP"
echo ""

# 1. HTML Validation (W3C)
echo "=== 1. HTML VALIDIERUNG (W3C) ==="
echo "Online Validator: https://validator.w3.org/nu/?doc=$URL"
curl -s "https://validator.w3.org/nu/?out=json&doc=$URL" | python3 -m json.tool | grep -E '(type|message)' | head -10
echo ""

# 2. CSS Validation
echo "=== 2. CSS VALIDIERUNG (W3C) ==="
echo "Online Validator: https://jigsaw.w3.org/css-validator/validator?uri=$URL"
curl -s "https://jigsaw.w3.org/css-validator/validator?uri=$URL&output=json" | python3 -m json.tool | grep -E '(validity|errorcount|warningcount)' | head -5
echo ""

# 3. Security Headers Check
echo "=== 3. SECURITY HEADERS ==="
curl -s -I "$URL" | grep -iE '(content-security-policy|x-frame-options|x-content-type-options|strict-transport-security|referrer-policy)'
echo ""

# 4. Basic Accessibility Check
echo "=== 4. ACCESSIBILITY BASIC CHECK ==="
HTML=$(curl -s "$URL")
echo "✅ DOCTYPE vorhanden: $(echo "$HTML" | grep -o '<!DOCTYPE' | wc -l | tr -d ' ')x"
echo "✅ lang-Attribut: $(echo "$HTML" | grep -o 'lang="' | wc -l | tr -d ' ')x"
echo "✅ title-Tag: $(echo "$HTML" | grep -o '<title>' | wc -l | tr -d ' ')x"
echo "✅ meta description: $(echo "$HTML" | grep -o 'name="description"' | wc -l | tr -d ' ')x"
echo "✅ ARIA-Labels: $(echo "$HTML" | grep -o 'aria-label' | wc -l | tr -d ' ')x"
echo "⚠️  Images ohne alt: $(echo "$HTML" | grep -o '<img[^>]*>' | grep -v 'alt=' | wc -l | tr -d ' ')x"
echo "✅ Semantic HTML:"
echo "   - <header>: $(echo "$HTML" | grep -o '<header' | wc -l | tr -d ' ')x"
echo "   - <main>: $(echo "$HTML" | grep -o '<main' | wc -l | tr -d ' ')x"
echo "   - <footer>: $(echo "$HTML" | grep -o '<footer' | wc -l | tr -d ' ')x"
echo "   - <nav>: $(echo "$HTML" | grep -o '<nav' | wc -l | tr -d ' ')x"
echo "   - <section>: $(echo "$HTML" | grep -o '<section' | wc -l | tr -d ' ')x"
echo ""

# 5. Performance Check
echo "=== 5. PERFORMANCE CHECK ==="
echo "⚠️  Nutze Google PageSpeed Insights für detaillierte Analyse:"
echo "   https://pagespeed.web.dev/analysis?url=$URL"
echo "⚠️  Nutze Lighthouse in Chrome DevTools (F12 > Lighthouse)"
echo ""

# 6. SEO Basic Check
echo "=== 6. SEO BASIC CHECK ==="
echo "✅ Title vorhanden: $(echo "$HTML" | grep -o '<title>' | wc -l | tr -d ' ')x"
echo "✅ Meta Description: $(echo "$HTML" | grep -o 'name="description"' | wc -l | tr -d ' ')x"
echo "⚠️  Open Graph Tags: $(echo "$HTML" | grep -o 'property="og:' | wc -l | tr -d ' ')x"
echo "⚠️  Twitter Cards: $(echo "$HTML" | grep -o 'name="twitter:' | wc -l | tr -d ' ')x"
echo ""

echo "=== VALIDIERUNG ABGESCHLOSSEN ==="
echo ""
echo "📋 NÄCHSTE SCHRITTE:"
echo "1. HTML-Validierung: https://validator.w3.org/nu/?doc=$URL"
echo "2. CSS-Validierung: https://jigsaw.w3.org/css-validator/validator?uri=$URL"
echo "3. Accessibility: https://wave.webaim.org/report#/$URL"
echo "4. Performance: https://pagespeed.web.dev/analysis?url=$URL"
echo "5. Security Headers: https://securityheaders.com/?q=$URL"
echo "6. Mobile-Friendly: https://search.google.com/test/mobile-friendly?url=$URL"










