# Troubleshooting: Twitter Card sin Imagen

## Problema
El card de Twitter se muestra correctamente pero sin imagen (muestra un placeholder genérico).

## Soluciones

### 1. Verificar que la Imagen sea Accesible

La imagen OG debe ser accesible públicamente. Verifica:

```bash
# Abre esta URL en tu navegador:
https://loophub.vercel.app/api/og?title=Test&forum=Technology
```

Deberías ver una imagen generada. Si no se muestra, hay un problema con el endpoint.

### 2. Validar los Metadatos de Twitter

Usa el [Twitter Card Validator](https://cards-dev.twitter.com/validator) o [X Card Validator](https://www.xcardvalidator.com/):

1. Ve a https://cards-dev.twitter.com/validator
2. Ingresa la URL de tu thread: `https://loophub.vercel.app/thread/[id]`
3. Haz clic en "Preview card"
4. Revisa si hay errores

### 3. Verificar los Metadatos en el HTML

Abre la página del thread y verifica que los metadatos estén presentes:

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="..." />
<meta name="twitter:description" content="..." />
<meta name="twitter:image" content="https://loophub.vercel.app/api/og?title=..." />
```

### 4. Requisitos de Twitter para Imágenes

- **Tamaño mínimo**: 300x157px
- **Tamaño recomendado**: 1200x630px (ya configurado ✅)
- **Formato**: JPG, PNG, WEBP, GIF
- **Tamaño máximo**: 5MB
- **Debe ser HTTPS**: ✅ Ya configurado
- **Debe ser accesible públicamente**: Verifica que no requiera autenticación

### 5. Cache de Twitter

Twitter cachea las imágenes y metadatos. Si acabas de hacer cambios:

1. Espera unos minutos (5-10 minutos)
2. Usa el [Twitter Card Validator](https://cards-dev.twitter.com/validator) para forzar una actualización
3. El validator tiene un botón "Clear cache" que fuerza a Twitter a re-fetch los metadatos

### 6. Verificar que la URL de la Imagen sea Absoluta

Los metadatos ya están configurados con URLs absolutas usando `getBaseUrl()` y `getFullUrl()`, así que esto debería estar correcto.

### 7. Verificar Content-Type

El endpoint `/api/og` debe devolver `Content-Type: image/png` o `image/jpeg`. Next.js `ImageResponse` lo hace automáticamente.

## Pasos para Verificar

1. ✅ Verifica que la imagen sea accesible: `https://loophub.vercel.app/api/og?title=Test&forum=Technology`
2. ✅ Valida los metadatos con [Twitter Card Validator](https://cards-dev.twitter.com/validator)
3. ✅ Verifica que la URL de la imagen en los metadatos sea absoluta y HTTPS
4. ✅ Espera 5-10 minutos y vuelve a validar (cache de Twitter)
5. ✅ Usa "Clear cache" en el validator para forzar actualización

## Si Sigue Sin Funcionar

1. Verifica los logs de Vercel para ver si hay errores en `/api/og`
2. Verifica que el endpoint esté funcionando en producción
3. Revisa la consola del navegador para errores
4. Verifica que `NEXT_PUBLIC_BASE_URL` esté configurada correctamente en Vercel

## Nota Importante

Twitter puede tardar varios minutos en actualizar el cache de las imágenes. Si acabas de hacer cambios, espera y vuelve a validar.

