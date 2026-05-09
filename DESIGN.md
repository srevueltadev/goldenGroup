---
name: Golden Group
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#d0c5af'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#99907c'
  outline-variant: '#4d4635'
  surface-tint: '#e9c349'
  primary: '#f2ca50'
  on-primary: '#3c2f00'
  primary-container: '#d4af37'
  on-primary-container: '#554300'
  inverse-primary: '#735c00'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#54e98a'
  on-tertiary: '#003919'
  tertiary-container: '#2ecc71'
  on-tertiary-container: '#005027'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe088'
  primary-fixed-dim: '#e9c349'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#6bfe9c'
  tertiary-fixed-dim: '#4ae183'
  on-tertiary-fixed: '#00210c'
  on-tertiary-fixed-variant: '#005228'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
  number-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: -0.01em
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 20px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  section-gap: 48px
---

## Brand & Style
The design system for this product is rooted in the concepts of **Institutional Prestige** and **Technical Precision**. It caters to the Colombian investment market, where gold represents both a traditional store of value and a sophisticated financial asset. The aesthetic merges the heritage of fine jewelry and bullion with the modern speed of a Progressive Web App.

The style is a blend of **Minimalism** and **Glassmorphism**. It utilizes high-contrast surfaces to ensure data clarity while employing subtle metallic gradients and translucent layers to evoke a sense of luxury. The UI feels like a premium physical asset: heavy, polished, and meticulously crafted. Every interaction should feel intentional, reinforcing the user's trust in the platform's data integrity and financial authority.

## Colors
The palette is centered on a "Pitch Black" foundation to provide the highest possible contrast for gold elements and technical data. **Deep Gold (#D4AF37)** is used sparingly for primary actions and brand flourishes to maintain its impact. 

Metallic gradients should be applied to primary buttons and key iconography to simulate the luster of physical gold. **Emerald Green** is reserved exclusively for positive price movements, acting as a functional signal against the dark background. For negative trends, use a muted crimson to maintain professional restraint without causing alarm. Surface colors use **Dark Charcoal** to create depth between the background and interactive elements.

## Typography
The typography system establishes a hierarchy between "Editorial Sophistication" and "Data Utility." **Playfair Display** is used for page titles and section headers to provide an institutional, legacy-banking feel. 

**Inter** handles all functional requirements. It is chosen for its exceptional legibility on small screens and its neutral, technical character. When displaying gold prices or percentage changes, use the `number-xl` or `body-md` roles with tabular lining figures to ensure digits align perfectly in tables and lists. Use `label-caps` for table headers and metadata to provide a distinct visual break from the primary body text.

## Layout & Spacing
This design system follows a **Mobile-First Fluid Grid** optimized for PWA performance. The layout uses a 4-column structure for mobile and scales to an 8-column centered container for tablet/desktop viewports.

Vertical rhythm is based on a 4px baseline grid. Generous whitespace is a core requirement to prevent the data-heavy content from feeling overwhelming. Containers use `stack-md` for internal padding to maintain a spacious, premium feel. For technical tables, horizontal padding can be tightened to `stack-sm` to maximize data visibility on narrow mobile screens, while vertical row spacing remains breathable.

## Elevation & Depth
Depth is communicated through **Glassmorphism** and subtle tonal layering rather than traditional heavy shadows.

- **Level 0 (Background):** Pitch Black (#0F0F0F).
- **Level 1 (Cards/Containers):** Dark Charcoal (#1A1A1A) with a 1px border at 10% Gold opacity.
- **Level 2 (Overlays/Modals):** A semi-transparent Dark Charcoal (alpha 0.8) with a 20px backdrop blur and a more prominent metallic border.

Instead of ambient shadows, use "Glow" effects sparingly. Active price tickers or primary buttons may have a soft outer glow in the primary gold color to simulate light reflecting off a metallic surface.

## Shapes
The shape language is disciplined and professional. A **Soft (0.25rem)** base radius is applied to standard components like input fields and small cards to take the edge off the high-contrast UI without appearing too casual or "bubbly."

Larger containers and modal sheets use a `rounded-lg` (0.5rem) radius to feel more substantial. Use sharp 90-degree corners for decorative horizontal dividers and table borders to maintain a structured, institutional grid. Buttons and interactive chips use the same `rounded-lg` setting to provide a comfortable touch target for mobile users.

## Components
- **Buttons:** Primary buttons use a metallic gold gradient background with black text for maximum visibility. Secondary buttons use a "ghost" style with a gold border and ivory text.
- **Cards:** Financial cards (e.g., price summaries) use the Dark Charcoal surface with a subtle 1px top-border gradient to simulate a beveled edge.
- **Data Tickers:** Real-time price updates should be housed in a glassmorphic bar at the top or bottom of the viewport, using fixed-width numbers to prevent layout shift during price flickers.
- **Chips/Badges:** Trend indicators (Up/Down) use a low-opacity background of Emerald Green or Red, with full-saturation text and a small directional arrow.
- **Input Fields:** Minimalist design with only a bottom border that illuminates in gold when focused. Ivory text is used for inputs, with Muted Gray for placeholders.
- **Lists:** Data rows should have generous vertical padding (16px) and be separated by a hairline divider (1px Ivory at 5% opacity).
- **Chart Elements:** Use Emerald Green for the line graph of gold prices, with a subtle gold gradient fill below the line to connect the data to the brand color.