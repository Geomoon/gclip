#!/bin/bash

# Script para auto-recargar la extensión cuando detecta cambios

EXT_DIR="$HOME/.local/share/gnome-shell/extensions/gclip@Geomoon.dev"
DEV_DIR="$(pwd)"

echo "👀 Watching for changes in $DEV_DIR"
echo "Press Ctrl+C to stop"
echo ""

# Función para sincronizar y recargar
reload_extension() {
    echo ""
    echo "🔄 $(date '+%H:%M:%S') - Changes detected, reloading..."
    
    # Copiar archivos
    rsync -a --exclude='.git' \
        --exclude='node_modules' \
        --exclude='*.sh' \
        --exclude='README.md' \
        "$DEV_DIR/" "$EXT_DIR/"
    
    # Recompilar schemas si es necesario
    if [[ "$1" == *"gschema.xml"* ]]; then
        glib-compile-schemas "$EXT_DIR/schemas/"
    fi
    
    # Recargar extensión
    gnome-extensions disable gclip@Geomoon.dev 2>/dev/null
    sleep 0.3
    gnome-extensions enable gclip@Geomoon.dev
    
    echo "✅ Reloaded! Test with Super+V"
}

# Instalar inotify-tools si no está instalado
if ! command -v inotifywait &> /dev/null; then
    echo "⚠️  inotify-tools not found. Installing..."
    sudo apt install -y inotify-tools || sudo dnf install -y inotify-tools
fi

# Observar cambios en archivos .js, .css, .xml
inotifywait -m -r -e modify,create,delete \
    --exclude '.*\.(swp|swx|git|md|sh)$' \
    "$DEV_DIR" | while read path action file; do
    
    # Filtrar solo archivos relevantes
    if [[ "$file" =~ \.(js|css|xml|json)$ ]]; then
        reload_extension "$file"
    fi
done
