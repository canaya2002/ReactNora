#!/bin/bash

# scripts/build.sh - SCRIPT DE BUILD PARA PRODUCCIÓN NORA AI

set -e  # Salir si algún comando falla

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${BLUE}[BUILD]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# ========================================
# VERIFICACIONES INICIALES
# ========================================

log "🚀 Iniciando build de NORA AI Mobile..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    error "No se encontró package.json. Ejecuta este script desde la raíz del proyecto."
fi

# Verificar que existe app.json
if [ ! -f "app.json" ]; then
    error "No se encontró app.json. Verifica la configuración del proyecto Expo."
fi

# Verificar variables de entorno
if [ ! -f ".env" ]; then
    warn "No se encontró archivo .env. Copiando desde .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        log "Se creó .env desde .env.example. Por favor, configura tus variables de entorno."
    else
        error "No se encontró .env.example. Verifica la configuración del proyecto."
    fi
fi

# Verificar EAS CLI
if ! command -v eas &> /dev/null; then
    error "EAS CLI no está instalado. Instala con: npm install -g @expo/eas-cli"
fi

# ========================================
# PREPARACIÓN DEL BUILD
# ========================================

log "📦 Preparando dependencias..."

# Limpiar node_modules si es necesario
if [ "$1" == "--clean" ]; then
    log "🧹 Limpiando node_modules..."
    rm -rf node_modules
    rm -f package-lock.json
    rm -f yarn.lock
fi

# Instalar dependencias
log "📥 Instalando dependencias..."
npm ci

# Type check
log "🔍 Verificando tipos TypeScript..."
npm run type-check

# Linting
log "🔧 Ejecutando linter..."
npm run lint

# ========================================
# CONFIGURACIÓN DE BUILD
# ========================================

# Determinar tipo de build
BUILD_TYPE=${2:-"preview"}
case $BUILD_TYPE in
    "dev"|"development")
        BUILD_PROFILE="development"
        log "🛠️  Configurando build para desarrollo..."
        ;;
    "preview"|"staging")
        BUILD_PROFILE="preview"
        log "👀 Configurando build preview..."
        ;;
    "prod"|"production")
        BUILD_PROFILE="production"
        log "🚀 Configurando build de producción..."
        ;;
    *)
        error "Tipo de build no válido: $BUILD_TYPE. Usa: dev, preview, o production"
        ;;
esac

# ========================================
# VERIFICACIONES DE PRODUCCIÓN
# ========================================

if [ "$BUILD_PROFILE" == "production" ]; then
    log "🔐 Verificaciones de producción..."
    
    # Verificar certificados y credenciales
    if [ ! -f "service-account-key.json" ]; then
        warn "No se encontró service-account-key.json para Android"
    fi
    
    # Verificar variables de entorno de producción
    source .env
    if [ -z "$EXPO_PUBLIC_FIREBASE_API_KEY" ]; then
        error "EXPO_PUBLIC_FIREBASE_API_KEY no está configurada"
    fi
    
    if [ -z "$EXPO_PUBLIC_FIREBASE_PROJECT_ID" ]; then
        error "EXPO_PUBLIC_FIREBASE_PROJECT_ID no está configurada"
    fi
    
    success "✅ Verificaciones de producción completadas"
fi

# ========================================
# BUILD PARA ANDROID
# ========================================

build_android() {
    log "🤖 Iniciando build para Android..."
    
    # Verificar que EAS está configurado
    if [ ! -f "eas.json" ]; then
        error "No se encontró eas.json. Verifica la configuración de EAS."
    fi
    
    # Login a EAS (si es necesario)
    if ! eas whoami > /dev/null 2>&1; then
        log "🔑 Iniciando sesión en EAS..."
        eas login
    fi
    
    # Build
    log "🔨 Construyendo APK/AAB para Android..."
    eas build --platform android --profile $BUILD_PROFILE --non-interactive
    
    if [ $? -eq 0 ]; then
        success "✅ Build de Android completado exitosamente"
        
        # Si es preview, descargar APK
        if [ "$BUILD_PROFILE" == "preview" ]; then
            log "📱 Para instalar el APK, descárgalo desde: https://expo.dev/artifacts"
        fi
    else
        error "❌ Build de Android falló"
    fi
}

# ========================================
# BUILD PARA iOS (opcional)
# ========================================

build_ios() {
    log "🍎 Iniciando build para iOS..."
    
    if [ "$(uname)" != "Darwin" ]; then
        warn "Build de iOS solo disponible en macOS"
        return 0
    fi
    
    # Build
    log "🔨 Construyendo para iOS..."
    eas build --platform ios --profile $BUILD_PROFILE --non-interactive
    
    if [ $? -eq 0 ]; then
        success "✅ Build de iOS completado exitosamente"
    else
        error "❌ Build de iOS falló"
    fi
}

# ========================================
# EJECUTAR BUILDS
# ========================================

PLATFORM=${3:-"android"}

case $PLATFORM in
    "android")
        build_android
        ;;
    "ios")
        build_ios
        ;;
    "all")
        build_android
        build_ios
        ;;
    *)
        error "Plataforma no válida: $PLATFORM. Usa: android, ios, o all"
        ;;
esac

# ========================================
# POST-BUILD
# ========================================

log "📋 Build completado. Resumen:"
echo "  - Perfil: $BUILD_PROFILE"
echo "  - Plataforma: $PLATFORM"
echo "  - Timestamp: $(date)"

if [ "$BUILD_PROFILE" == "production" ]; then
    log "🚀 Para subir a stores:"
    echo "  - Android: eas submit --platform android"
    echo "  - iOS: eas submit --platform ios"
fi

success "🎉 ¡Build de NORA AI Mobile completado exitosamente!"

# ========================================
# NOTIFICACIÓN OPCIONAL
# ========================================

# Si tienes configurado algún webhook o notificación
# curl -X POST "your-webhook-url" -d "Build $BUILD_PROFILE completado"

log "📱 La aplicación NORA AI está lista para usar!"