#!/bin/bash

# scripts/dev.sh - SCRIPT DE DESARROLLO PARA NORA AI

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[DEV]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# ========================================
# CONFIGURACIÓN INICIAL DE DESARROLLO
# ========================================

setup_dev() {
    log "🛠️  Configurando entorno de desarrollo para NORA AI..."
    
    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js no está instalado. Instala Node.js 18+ desde https://nodejs.org"
    fi
    
    NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Se requiere Node.js 18+. Versión actual: $(node -v)"
    fi
    
    # Verificar/instalar Expo CLI
    if ! command -v expo &> /dev/null; then
        log "📦 Instalando Expo CLI..."
        npm install -g @expo/cli
    fi
    
    # Verificar/instalar EAS CLI
    if ! command -v eas &> /dev/null; then
        log "📦 Instalando EAS CLI..."
        npm install -g @expo/eas-cli
    fi
    
    # Crear archivo .env si no existe
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log "📝 Archivo .env creado desde .env.example"
            warn "⚠️  Configura tus variables de entorno en .env"
        else
            error "No se encontró .env.example"
        fi
    fi
    
    # Instalar dependencias
    log "📥 Instalando dependencias..."
    npm install
    
    # Verificar Firebase CLI
    if ! command -v firebase &> /dev/null; then
        log "📦 Instalando Firebase CLI..."
        npm install -g firebase-tools
    fi
    
    success "✅ Entorno de desarrollo configurado correctamente"
}

# ========================================
# COMANDOS DE DESARROLLO
# ========================================

start_dev() {
    log "🚀 Iniciando servidor de desarrollo..."
    
    # Verificar que las dependencias están instaladas
    if [ ! -d "node_modules" ]; then
        log "📥 Instalando dependencias..."
        npm install
    fi
    
    # Limpiar cache si es necesario
    if [ "$1" == "--clear-cache" ]; then
        log "🧹 Limpiando cache..."
        npx expo start --clear
    else
        npx expo start --dev-client
    fi
}

# ========================================
# TESTING Y QUALITY ASSURANCE
# ========================================

run_tests() {
    log "🧪 Ejecutando tests..."
    
    # Type checking
    log "🔍 Verificando tipos TypeScript..."
    npm run type-check
    
    # Linting
    log "🔧 Ejecutando ESLint..."
    npm run lint
    
    # Tests unitarios (cuando se implementen)
    if [ -f "jest.config.js" ]; then
        log "🃏 Ejecutando tests unitarios..."
        npm test
    fi
    
    success "✅ Todos los tests pasaron"
}

# ========================================
# UTILIDADES DE DESARROLLO
# ========================================

reset_project() {
    log "🔄 Reseteando proyecto..."
    
    warn "⚠️  Esto eliminará node_modules y reinstalará todo"
    read -p "¿Continuar? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf node_modules
        rm -f package-lock.json
        rm -f yarn.lock
        npm install
        success "✅ Proyecto reseteado"
    else
        log "Operación cancelada"
    fi
}

generate_icons() {
    log "🎨 Generando iconos de la app..."
    
    if [ -f "assets/icon-source.png" ]; then
        # Aquí podrías usar una herramienta como expo-app-icon-generator
        log "Generando iconos desde assets/icon-source.png..."
        # npx expo-app-icon-generator generate
        warn "Implementar generación automática de iconos"
    else
        warn "No se encontró assets/icon-source.png"
    fi
}

check_updates() {
    log "🔍 Verificando actualizaciones de dependencias..."
    
    npx npm-check-updates --interactive
}

# ========================================
# COMANDOS DE FIREBASE
# ========================================

setup_firebase() {
    log "🔥 Configurando Firebase..."
    
    if ! command -v firebase &> /dev/null; then
        error "Firebase CLI no está instalado"
    fi
    
    # Login a Firebase
    firebase login
    
    # Listar proyectos
    log "📋 Proyectos Firebase disponibles:"
    firebase projects:list
    
    # Inicializar proyecto si es necesario
    if [ ! -f "firebase.json" ]; then
        log "🚀 Inicializando proyecto Firebase..."
        firebase init
    fi
    
    success "✅ Firebase configurado"
}

start_emulators() {
    log "🔧 Iniciando emuladores de Firebase..."
    
    if [ -f "firebase.json" ]; then
        firebase emulators:start --import=./firebase-export --export-on-exit
    else
        error "No se encontró firebase.json. Ejecuta: npm run setup:firebase"
    fi
}

# ========================================
# HERRAMIENTAS DE ANÁLISIS
# ========================================

analyze_bundle() {
    log "📊 Analizando bundle..."
    
    # Build de producción para análisis
    npx expo export --platform android
    
    # Analizar tamaño
    log "📏 Tamaño del bundle:"
    du -sh dist/
    
    warn "Para análisis más detallado, considera usar webpack-bundle-analyzer"
}

check_performance() {
    log "⚡ Verificando rendimiento..."
    
    # Verificar que no hay warnings en el código
    npm run lint
    
    # Verificar TypeScript
    npm run type-check
    
    # TODO: Agregar más checks de rendimiento
    log "📱 Consejos de rendimiento:"
    echo "  - Usa lazy loading para componentes grandes"
    echo "  - Optimiza imágenes antes de incluirlas"
    echo "  - Minimiza el uso de librerías grandes"
    echo "  - Usa React.memo para componentes que no cambian frecuentemente"
}

# ========================================
# AYUDA Y DOCUMENTACIÓN
# ========================================

show_help() {
    echo "🚀 NORA AI Mobile - Script de Desarrollo"
    echo ""
    echo "Uso: ./scripts/dev.sh [comando] [opciones]"
    echo ""
    echo "Comandos disponibles:"
    echo "  setup           Configurar entorno de desarrollo"
    echo "  start           Iniciar servidor de desarrollo"
    echo "  start --clear   Iniciar limpiando cache"
    echo "  test           Ejecutar tests y linting"
    echo "  reset          Resetear proyecto (reinstalar dependencias)"
    echo "  icons          Generar iconos de la app"
    echo "  updates        Verificar actualizaciones de dependencias"
    echo "  firebase       Configurar Firebase"
    echo "  emulators      Iniciar emuladores de Firebase"
    echo "  analyze        Analizar tamaño del bundle"
    echo "  performance    Verificar rendimiento"
    echo "  help           Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  ./scripts/dev.sh setup"
    echo "  ./scripts/dev.sh start"
    echo "  ./scripts/dev.sh test"
    echo ""
}

# ========================================
# ROUTER PRINCIPAL
# ========================================

case "${1:-help}" in
    "setup")
        setup_dev
        ;;
    "start")
        start_dev $2
        ;;
    "test")
        run_tests
        ;;
    "reset")
        reset_project
        ;;
    "icons")
        generate_icons
        ;;
    "updates")
        check_updates
        ;;
    "firebase")
        setup_firebase
        ;;
    "emulators")
        start_emulators
        ;;
    "analyze")
        analyze_bundle
        ;;
    "performance")
        check_performance
        ;;
    "help"|*)
        show_help
        ;;
esac