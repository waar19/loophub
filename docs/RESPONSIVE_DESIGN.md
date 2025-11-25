# Diseño Responsive - LoopHub

## Comportamiento del Menú y Sidebar

### Breakpoints de Tailwind CSS

- **`lg`**: 1024px (pantallas grandes)
- **`xl`**: 1280px (pantallas extra grandes)
- **`md`**: 768px (tablets)
- **`sm`**: 640px (móviles grandes)

### Comportamiento Actual

#### Pantallas Pequeñas (< 1024px)
- **Sidebar**: Oculto (`hidden lg:block`)
- **Menú de Hamburguesa**: Visible (`lg:hidden`)
- **Contenido Principal**: Ocupa todo el ancho disponible
- **Panel de Trending**: Oculto en pantallas pequeñas

**Casos de uso:**
- Móviles en portrait (< 768px)
- Móviles en landscape (768px - 1023px)
- Tablets pequeñas en portrait (< 1024px)

#### Pantallas Grandes (>= 1024px)
- **Sidebar**: Visible y fijo en el lado izquierdo
- **Menú de Hamburguesa**: Oculto (no necesario)
- **Contenido Principal**: Con margen izquierdo para el sidebar (`lg:ml-[var(--sidebar-width)]`)
- **Panel de Trending**: Visible en pantallas >= 1280px (`xl:mr-80`)

**Casos de uso:**
- Tablets grandes en landscape (>= 1024px)
- Desktop (>= 1024px)
- Pantallas extra grandes (>= 1280px)

### ¿Por qué se basa en ancho y no en orientación?

El diseño se basa en el **ancho disponible** (`lg: 1024px`) en lugar de la orientación del dispositivo porque:

1. **Mejor UX**: Un iPad en landscape tiene suficiente espacio horizontal para mostrar el sidebar fijo, mejorando la navegación.

2. **Consistencia**: El comportamiento es predecible basado en el espacio disponible, no en cómo el usuario sostiene el dispositivo.

3. **Estándar de la industria**: La mayoría de aplicaciones modernas (Twitter, GitHub, Linear) usan este enfoque.

### Escenarios Específicos

#### Móvil Portrait (< 768px)
- Menú hamburguesa visible
- Sidebar oculto
- Contenido a pantalla completa

#### Móvil Landscape (768px - 1023px)
- Menú hamburguesa visible (aún hay espacio limitado)
- Sidebar oculto
- Contenido a pantalla completa

#### Tablet Portrait (< 1024px)
- Menú hamburguesa visible
- Sidebar oculto
- Contenido a pantalla completa

#### Tablet Landscape (>= 1024px)
- **Sidebar visible automáticamente** (suficiente espacio)
- Menú hamburguesa oculto (no necesario)
- Contenido con margen para sidebar

#### Desktop (>= 1024px)
- Sidebar visible
- Menú hamburguesa oculto
- Panel de trending visible (>= 1280px)

## Mejoras Futuras

Si necesitas un comportamiento diferente, podrías:

1. **Usar media queries de orientación**:
   ```css
   @media (orientation: landscape) and (max-width: 1024px) {
     /* Estilos específicos para landscape */
   }
   ```

2. **Detectar orientación con JavaScript**:
   ```javascript
   const isLandscape = window.innerWidth > window.innerHeight;
   ```

3. **Ajustar breakpoints**:
   Cambiar `lg:block` a `xl:block` si quieres que el sidebar solo aparezca en pantallas más grandes.

## Conclusión

El comportamiento actual es **óptimo para la mayoría de casos de uso**. El menú de hamburguesa aparece cuando hay poco espacio (< 1024px) y el sidebar aparece automáticamente cuando hay suficiente espacio (>= 1024px), independientemente de la orientación.

