#!/bin/bash

# Script de desarrollo para GClip
# Sincroniza cambios y recarga la extensión automáticamente

EXT_DIR="$HOME/.local/share/gnome-shell/extensions/gclip@usuario.dev"
DEV_DIR="$(pwd)"

echo "🔄 Syncing files to extension directory..."

# Copiar archivos modificados
rsync -av --exclude='.git' \
    --exclude='node_modules' \
    --exclude='dev.sh' \
    --exclude='watch.sh' \
    --exclude='README.md' \
    "$DEV_DIR/" "$EXT_DIR/"

echo "📦 Recompiling schemas..."
glib-compile-schemas "$EXT_DIR/schemas/"

echo "🔄 Reloading extension..."
gnome-extensions disable gclip@usuario.dev 2>/dev/null
sleep 0.5
gnome-extensions enable gclip@usuario.dev

echo "✅ Extension reloaded! Press Super+V to test"
echo "📋 Watching logs (Ctrl+C to stop):"
echo ""

# Mostrar logs en tiempo real
journalctl -f -o cat /usr/bin/gnome-shell | grep -i "gclip\|js error"
