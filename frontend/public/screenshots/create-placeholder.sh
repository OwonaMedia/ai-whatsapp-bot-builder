#!/bin/bash
# Erstellt Platzhalter-Bilder für fehlende Screenshots

cd "$(dirname "$0")"

# Erstelle Platzhalter-Bilder mit ImageMagick (falls vorhanden) oder alternativ
# Verwende einfache SVG-zu-PNG Konvertierung

for img in analytics-demo.png knowledge-demo.png settings-demo.png; do
  if [ ! -f "$img" ]; then
    echo "Erstelle Platzhalter: $img"
    # Erstelle ein einfaches Platzhalter-Bild (1920x1080, grau mit Text)
    # Falls ImageMagick nicht verfügbar ist, erstelle ein einfaches SVG
    cat > "${img%.png}.svg" << EOF
<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
  <rect width="1920" height="1080" fill="#f3f4f6"/>
  <text x="960" y="540" font-family="Arial, sans-serif" font-size="48" fill="#6b7280" text-anchor="middle" dominant-baseline="middle">
    ${img%.png}
  </text>
</svg>
EOF
    # Konvertiere SVG zu PNG falls möglich, sonst erstelle ein einfaches PNG
    if command -v convert &> /dev/null; then
      convert "${img%.png}.svg" "$img" 2>/dev/null || echo "ImageMagick nicht verfügbar, verwende SVG"
    elif command -v rsvg-convert &> /dev/null; then
      rsvg-convert "${img%.png}.svg" -o "$img" 2>/dev/null || echo "rsvg-convert nicht verfügbar"
    else
      echo "⚠️ Kein Konverter gefunden. Verwende vorhandene Bilder als Fallback."
    fi
  fi
done

echo "✅ Platzhalter-Bilder erstellt (falls möglich)"









