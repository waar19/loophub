# Configuración de URLs de Producción

## ⚠️ IMPORTANTE: Configurar Variable de Entorno

Para que las URLs de compartir funcionen correctamente en producción, necesitas configurar la variable de entorno `NEXT_PUBLIC_BASE_URL`.

### En Vercel:

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto **LoopHub**
3. Ve a **Settings** → **Environment Variables**
4. Agrega una nueva variable:
   - **Name**: `NEXT_PUBLIC_BASE_URL`
   - **Value**: `https://loophub.vercel.app` (o tu dominio personalizado)
   - **Environment**: Production (y Preview si quieres)
5. Guarda y haz un nuevo deploy

### En archivo `.env.local` (solo desarrollo):

```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### En archivo `.env.production` (si usas build local):

```env
NEXT_PUBLIC_BASE_URL=https://loophub.vercel.app
```

## 🔍 Cómo Funciona

El sistema detecta la URL de producción en este orden:

1. **`NEXT_PUBLIC_BASE_URL`** (prioridad más alta) - Debe configurarse en producción
2. **`VERCEL_URL`** (automático en Vercel) - Se usa si `NEXT_PUBLIC_BASE_URL` no está configurado
3. **Fallback** - `https://loophub.vercel.app` (solo si nada más está disponible)

## ✅ Verificación

Después de configurar la variable de entorno:

1. Haz un nuevo deploy en Vercel
2. Visita un thread en producción
3. Haz clic en "Copiar" en los botones de compartir
4. Verifica que la URL sea `https://loophub.vercel.app/thread/...` y NO `http://localhost:3000/...`

## 🐛 Troubleshooting

### Las URLs siguen siendo localhost

1. Verifica que `NEXT_PUBLIC_BASE_URL` esté configurada en Vercel
2. Verifica que el deploy se haya hecho DESPUÉS de agregar la variable
3. Limpia la caché del navegador (Ctrl+Shift+R o Cmd+Shift+R)
4. Verifica en las DevTools → Network → Headers que las requests usen la URL correcta

### Los metadatos Open Graph muestran localhost

Los metadatos se generan en el servidor, así que:
1. Verifica que `NEXT_PUBLIC_BASE_URL` esté configurada en Vercel
2. Haz un nuevo deploy
3. Usa [opengraph.xyz](https://www.opengraph.xyz/) para verificar los metadatos

### El componente ShareButtons muestra localhost

El componente usa `getFullUrl()` que respeta `NEXT_PUBLIC_BASE_URL`. Si sigue mostrando localhost:
1. Verifica que la variable esté configurada
2. Limpia la caché del navegador
3. Verifica que estés en producción (no en localhost)

