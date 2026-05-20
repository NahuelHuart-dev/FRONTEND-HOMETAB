# 🏠 HomeTab — Brand & Design System Document

> **Versión:** 1.0 · **Fecha:** Abril 2026 · **Equipo:** GenSync

---

## 1. Filosofía de Marca

HomeTab no es una app corporativa fría. Es una **libreta digital de hogar**: cálida, orgánica, un poco imperfecta (a propósito) y muy personal. La estética está inspirada en notas adhesivas, cuadernos Moleskine y tablones de corcho. La interfaz debe sentirse **hecha a mano**, pero con la solidez de un producto moderno.

**Palabras clave de marca:** Acogedor · Organizado · Compartido · Cotidiano · Auténtico

---

## 2. Sistema Tipográfico

> Solo usamos Google Fonts. Nunca usaremos fuentes del sistema como fallback principal.

### Familias Tipográficas

| Rol | Familia | Peso(s) | Uso |
|---|---|---|---|
| **Display / Hero** | `Playfair Display` | 700, 900 | Títulos `h1` principales, hero section |
| **UI / Body** | `Comfortaa` | 300, 400, 600, 700 | Texto corriente, labels, navegación |
| **Accent / Handwritten** | `Patrick Hand` | 400 | Post-its, notas, elementos decorativos de la marca |
| **Monospace / Código** | `JetBrains Mono` | 400 | Códigos de invitación, IDs, datos técnicos |

### Import en `main.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Comfortaa:wght@300;400;600;700&family=Patrick+Hand&family=JetBrains+Mono&display=swap');
```

### Escala Tipográfica (Type Scale)

```
--font-display:   'Playfair Display', Georgia, serif
--font-ui:        'Comfortaa', sans-serif
--font-accent:    'Patrick Hand', cursive
--font-mono:      'JetBrains Mono', monospace

--text-xs:        0.75rem   (12px)  — micro labels, copyright
--text-sm:        0.875rem  (14px)  — labels de formulario, hints
--text-base:      1rem      (16px)  — cuerpo de texto estándar
--text-lg:        1.125rem  (18px)  — subtítulos pequeños
--text-xl:        1.25rem   (20px)  — subtítulos de sección
--text-2xl:       1.5rem    (24px)  — h3 de widgets y tarjetas
--text-3xl:       2rem      (32px)  — h2 de secciones
--text-4xl:       2.5rem    (40px)  — h2 hero secundario
--text-5xl:       3.5rem    (56px)  — h1 principal (Display font)
```

### Reglas de Uso

- `h1`: siempre `Playfair Display` + `--text-5xl` o superior
- `h2`: `Playfair Display` para páginas de marketing; `Comfortaa 700` para dashboards
- `h3`, `h4`: `Comfortaa 700`
- `p`, `li`, `label`: `Comfortaa 400`
- Tags tipo `mini-tag` / `badge`: `Comfortaa 700` + `uppercase` + `letter-spacing: 1.5px`
- Post-its y notas: `Patrick Hand 400`
- Códigos, IDs: `JetBrains Mono 400`

---

## 3. Sistema de Color

### 3.1 Colores Base (Invariables por tema)

Estos colores forman el núcleo de la identidad de HomeTab y NO cambian con el tema de acento:

```
--color-cream-light:  #fdfbf7   — fondo claro principal
--color-cream-dark:   #f5f0e8   — fondo claro alternativo / tarjetas
--color-paper:        #1c1917   — fondo oscuro principal
--color-paper-alt:    #292524   — fondo oscuro alternativo / tarjetas
--color-ink-dark:     #1c1917   — texto principal modo claro
--color-ink-light:    #e7e5e4   — texto principal modo oscuro
--color-ink-muted:    #78716c   — texto secundario
--color-line-light:   rgba(0,0,0,0.08)    — bordes / líneas modo claro
--color-line-dark:    rgba(255,255,255,0.08) — bordes / líneas modo oscuro
--color-error:        #ef4444   — errores y alertas rojas
--color-success:      #10b981   — confirmaciones y éxitos
--color-warning:      #f59e0b   — advertencias
```

### 3.2 Temas de Acento (Paletas Predefinidas)

El usuario puede seleccionar uno de estos temas. Cada tema define el `colorAcento` que se propaga por toda la app. Los nombres y colores son parte de la identidad de HomeTab:

| ID | Nombre | Color Principal | Hex |
|---|---|---|---|
| `arcilla` | **Arcilla** *(default)* | Naranja teja | `#ea580c` |
| `matcha` | **Matcha** | Verde hoja | `#16a34a` |
| `oceano` | **Océano** | Azul cobalto | `#2563eb` |
| `lavanda` | **Lavanda** | Morado suave | `#9333ea` |
| `carbon` | **Carbón** | Gris grafito | `#44403c` |
| `coral` | **Coral** | Rosa cálido | `#f43f5e` |

> **Nota sobre opacidades:** El color de acento se usa siempre con opacidad para fondos y halos. Las variaciones estandarizadas son:
> - `colorAcento + '0D'` → 5% opacidad (fondo muy sutil)
> - `colorAcento + '15'` → 8% opacidad (fondo tarjetas)
> - `colorAcento + '30'` → 19% opacidad (fondo hover)
> - `colorAcento + '40'` → 25% opacidad (bordes, halos de focus)
> - `colorAcento + '60'` → 38% opacidad (bordes más visibles)
> - `colorAcento + '99'` → 60% opacidad (fondos de botones secundarios)
> - `colorAcento + 'CC'` → 80% opacidad (botones con algo de transparencia)

---

## 4. Espaciado y Layout

```
--space-1:   0.25rem  (4px)
--space-2:   0.5rem   (8px)
--space-3:   0.75rem  (12px)
--space-4:   1rem     (16px)
--space-6:   1.5rem   (24px)
--space-8:   2rem     (32px)
--space-12:  3rem     (48px)
--space-16:  4rem     (64px)
--space-20:  5rem     (80px)
--space-24:  6rem     (96px)

--radius-sm:   4px
--radius-md:   8px
--radius-lg:   12px
--radius-xl:   20px
--radius-pill: 50px
--radius-full: 9999px
```

**Breakpoints Responsive:**
```
--bp-sm:   480px   (móvil pequeño)
--bp-md:   768px   (móvil/tablet)
--bp-lg:   1024px  (tablet/desktop pequeño)
--bp-xl:   1280px  (desktop estándar)
--bp-2xl:  1536px  (desktop grande)
```

**Contenedores máximos:**
```
--container-sm:   450px   (modales, tarjetas de login)
--container-md:   900px   (hero sections)
--container-lg:   1200px  (tabhub, listas)
--container-xl:   1400px  (landing, about)
--container-full: 1600px  (household layout)
```

---

## 5. Componentes de Diseño

### 5.1 Botones

**Jerarquía de botones:**
| Tipo | Uso | Clase propuesta |
|---|---|---|
| **Primary** | Acción principal de pantalla | `.btn-primary` |
| **Secondary** | Acción alternativa | `.btn-secondary` |
| **Ghost / Text** | Terciario, cancelar | `.btn-ghost` |
| **Danger** | Eliminar, logout | `.btn-danger` |

**Animación estándar para todos los botones:**
```css
transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), 
            box-shadow 0.2s ease,
            background-color 0.15s ease;

&:hover  { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.12); }
&:active { transform: scale(0.97) translateY(0); }
```

### 5.2 Inputs / Formularios

Todos los inputs siguen el patrón:
- Fondo semitransparente con el color de acento (`colorAcento + '15'`)
- Border `2px solid transparent` → en focus: `2px solid colorAcento`
- Halo de focus: `box-shadow: 0 0 0 4px (colorAcento + '40')`
- `translateY(-2px)` en focus para sensación de elevación
- Clase reutilizable: `.ht-input`

### 5.3 Post-It Cards

El componente `PostItCard` es la tarjeta principal de HomeTab. Sigue estas reglas:
- Fondo: `colorAcento + '15'`
- Borde: `1px solid colorAcento + '40'`
- Cinta de celo (`.tape`) decorativa en la parte superior
- Rotación suave (-2° a +2°) para dar sensación orgánica
- En hover: `scale(1.05) rotate(0deg)` + mayor shadow
- Fuente del label: `Patrick Hand`

### 5.4 Widgets del Dashboard

- Border `2px dashed` en reposo → `solid` en hover
- Esquinas `border-radius: 8px`
- En hover: `translateY(-6px)` + shadow pronunciada
- Animación de entrada: `fadeIn` con `translateY(10px)`

---

## 6. Animaciones e Interacciones

### Principios

1. **Significativas, no decorativas.** Cada animación comunica un estado (carga, transición, error, éxito).
2. **Rápidas.** 150–400ms. Nunca más de 600ms para interacciones de UI.
3. **Elásticas donde corresponde.** Los elementos que "aparecen" o "saltan" usan `cubic-bezier(0.34, 1.56, 0.64, 1)` para un efecto rebotón suave.
4. **Respetar `prefers-reduced-motion`.** Toda animación debe poder desactivarse.

### Catálogo de Animaciones Globales (en `main.css`)

```
@keyframes ht-fade-in      — Aparición suave (opacity 0→1 + translateY 10px→0)
@keyframes ht-slide-up     — Entrada desde abajo (translateY 20px→0)
@keyframes ht-pop-in       — Entrada rebotona para modales y tarjetas
@keyframes ht-pulse        — Pulsación para loaders (scale 1→1.1→1)
@keyframes ht-shake        — Sacudida para errores de validación
@keyframes ht-bounce-in    — Para elementos que "caen" desde arriba
```

### Transiciones de Página

El sistema actual de `screen-loader` con opacidad es bueno. Se puede enriquecer con GSAP para:
- Cortina de deslizamiento lateral
- Fade con logo pulsante (actual)
- Explosión de partículas para rutas de "éxito"

### Política de GSAP

- Usar GSAP para: transiciones de página complejas, animaciones de scroll (ScrollTrigger), secuencias de entrada encadenadas en el Landing.
- Usar CSS puro para: hover states, focus states, transiciones de componentes simples.
- Usar Vue Transition API para: aparición/desaparición de elementos condicionales (`v-if`, `v-show`).

---

## 7. Iconografía

Usamos **PrimeIcons** como librería principal (ya instalada). Complementamos con emojis para contextos informales (Post-its, mensajes vacíos).

**Tamaños estándar:**
```
--icon-sm:   1rem     (16px) — inline, dentro de texto
--icon-md:   1.25rem  (20px) — botones, tags
--icon-lg:   1.5rem   (24px) — íconos de acción principales
--icon-xl:   2rem     (32px) — features, estados vacíos
--icon-2xl:  3rem     (48px) — ilustraciones de sección
--icon-3xl:  4rem     (64px) — Post-it icons
```

---

## 8. Patrones Reutilizables (CSS Utilities en `main.css`)

Clases de utilidad que **no deben repetirse por archivo**:

```
.ht-container      — max-width + padding horizontal estándar
.ht-section        — padding vertical para secciones de página
.ht-card           — tarjeta estándar con glassmorphism suave
.ht-paper-tape     — la cinta de celo adhesiva decorativa
.ht-resaltado      — texto con subrayado de marcador
.ht-mini-tag       — etiqueta de categoría uppercase
.ht-input          — input estándar de la app
.ht-btn-primary    — botón principal
.ht-btn-secondary  — botón secundario
.ht-btn-ghost      — botón fantasma / texto
.ht-fade-in        — clase para aplicar animación fadeIn
.ht-text-error     — texto de error (color rojo estándar)
.ht-text-success   — texto de éxito (color verde estándar)
.ht-flex-center    — flex + justify-center + align-center
.ht-sr-only        — accesibilidad: oculto visualmente, visible para screenreaders
```

---

## 9. Accesibilidad

- Contraste mínimo **4.5:1** para texto normal sobre cualquier fondo de la app.
- Todos los elementos interactivos tienen `focus-visible` style definido (no se anula con `outline: none` sin reemplazo).
- Imágenes decorativas tienen `aria-hidden="true"`.
- Los iconos de acción sin texto tienen `aria-label`.
- Incluir `@media (prefers-reduced-motion: reduce)` para desactivar todas las animaciones no esenciales.

---

## 10. Tono de los Textos (Copywriting)

- **Familiar y cercano**: tuteo siempre, nunca "usted".
- **Empático con el caos del hogar**: los mensajes de error y estado vacío son amigables, no técnicos.
- **Brevedad**: los labels de UI son cortos. Los textos descriptivos son concisos.
- **Español**: toda la UI está en español. Los comentarios de código pueden ser en español o inglés.

**Ejemplos de tono:**
| ❌ Frío | ✅ HomeTab |
|---|---|
| "Error 401: No autorizado" | "Parece que tu sesión caducó. ¡Vuelve a entrar!" |
| "No se han encontrado registros" | "Aún no hay nada aquí. ¡Empieza añadiendo el primero!" |
| "Operación completada con éxito" | "¡Todo listo! Ya está guardado." |
