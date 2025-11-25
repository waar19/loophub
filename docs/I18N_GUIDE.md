# Guía de Internacionalización (i18n)

## ✅ Implementado

LoopHub ahora soporta **Español** e **Inglés** con detección automática del idioma del navegador.

## 🎯 Características

- ✅ Detección automática del idioma del navegador
- ✅ Selector de idioma en el header
- ✅ Persistencia de la preferencia del usuario (localStorage)
- ✅ Actualización automática del atributo `lang` en el HTML
- ✅ Traducciones completas para los componentes principales

## 📝 Cómo Usar Traducciones en Componentes

### 1. Importar el hook

```typescript
import { useTranslations } from "@/components/TranslationsProvider";
```

### 2. Usar el hook en componentes cliente

```typescript
"use client";

export default function MyComponent() {
  const { t, locale, setLocale } = useTranslations();
  
  return (
    <div>
      <h1>{t("home.welcome")}</h1>
      <p>Current locale: {locale}</p>
      <button onClick={() => setLocale("en")}>English</button>
      <button onClick={() => setLocale("es")}>Español</button>
    </div>
  );
}
```

### 3. Claves de Traducción

Las claves están organizadas por sección:

- `nav.*` - Navegación (home, forums, search, etc.)
- `home.*` - Página principal
- `threads.*` - Hilos y comentarios
- `forums.*` - Foros
- `auth.*` - Autenticación
- `common.*` - Textos comunes (loading, error, etc.)
- `notifications.*` - Notificaciones
- `admin.*` - Administración
- `errors.*` - Mensajes de error

### 4. Ejemplos de Uso

```typescript
// Texto simple
{t("nav.home")} // "Inicio" o "Home"

// Con parámetros
{t("time.minutesAgo", { count: 5 })} // "Hace 5 minutos" o "5 minutes ago"

// Textos anidados
{t("threads.comments")} // "Comentarios" o "Comments"
{t("threads.noComments")} // "Aún no hay comentarios" o "No comments yet"
```

## 🔧 Agregar Nuevas Traducciones

### 1. Agregar la clave en `lib/i18n/translations.ts`

```typescript
export const translations = {
  es: {
    // ... traducciones existentes
    nuevaSeccion: {
      nuevoTexto: "Texto en español",
    },
  },
  en: {
    // ... traducciones existentes
    nuevaSeccion: {
      nuevoTexto: "Text in English",
    },
  },
};
```

### 2. Usar en componentes

```typescript
{t("nuevaSeccion.nuevoTexto")}
```

## 📋 Componentes Actualizados

Los siguientes componentes ya usan traducciones:

- ✅ `Sidebar` - Navegación lateral
- ✅ `MobileMenu` - Menú móvil
- ✅ `SearchBar` - Barra de búsqueda
- ✅ `NotificationBell` - Campana de notificaciones
- ✅ `LanguageSelector` - Selector de idioma
- ✅ `Header` - Header principal

## 🚧 Componentes Pendientes de Traducir

Los siguientes componentes aún necesitan traducciones:

- `AuthButton` - Botón de autenticación
- `ThreadCard` - Tarjeta de hilo
- `CommentCard` - Tarjeta de comentario
- `ThreadPage` - Página de hilo
- `ForumPage` - Página de foro
- `LoginPage` - Página de login
- `SignupPage` - Página de registro
- `NotificationsPage` - Página de notificaciones
- Y otros componentes de páginas

## 🌐 Idiomas Soportados

Actualmente soportados:
- 🇪🇸 Español (`es`) - Idioma por defecto
- 🇺🇸 English (`en`)

Para agregar más idiomas:

1. Agregar el código del idioma en `lib/i18n/translations.ts`:
```typescript
export type Locale = "es" | "en" | "fr"; // Agregar "fr" para francés
export const supportedLocales: Locale[] = ["es", "en", "fr"];
```

2. Agregar las traducciones en el objeto `translations`:
```typescript
export const translations = {
  es: { /* ... */ },
  en: { /* ... */ },
  fr: { /* ... */ }, // Nuevas traducciones en francés
};
```

3. Agregar el nombre y bandera en `components/LanguageSelector.tsx`:
```typescript
const localeNames: Record<Locale, string> = {
  es: "Español",
  en: "English",
  fr: "Français", // Nuevo
};

const localeFlags: Record<Locale, string> = {
  es: "🇪🇸",
  en: "🇺🇸",
  fr: "🇫🇷", // Nuevo
};
```

## 🎨 Selector de Idioma

El selector de idioma está disponible en el header. Los usuarios pueden:
- Ver el idioma actual con su bandera
- Cambiar el idioma haciendo clic en el selector
- La preferencia se guarda automáticamente en localStorage
- El atributo `lang` del HTML se actualiza automáticamente

## 🔍 Detección Automática

El sistema detecta el idioma del navegador en este orden:

1. **Preferencia guardada** - Si el usuario ya seleccionó un idioma, se usa ese
2. **Idioma del navegador** - Se detecta automáticamente del `navigator.language`
3. **Idioma por defecto** - Español (`es`) si no se puede detectar

## 📝 Notas Importantes

- Las traducciones solo funcionan en componentes cliente (`"use client"`)
- Para componentes del servidor, usa los metadatos de Next.js o detecta el idioma desde headers
- El sistema es completamente tipado - TypeScript te ayudará a encontrar las claves correctas
- Las traducciones se cargan de forma lazy - solo se cargan cuando se necesitan

