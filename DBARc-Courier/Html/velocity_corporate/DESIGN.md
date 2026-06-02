---
name: Velocity Corporate
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434656'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737688'
  outline-variant: '#c3c5d9'
  surface-tint: '#004ced'
  primary: '#003ec7'
  on-primary: '#ffffff'
  primary-container: '#0052ff'
  on-primary-container: '#dfe3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#3f4f65'
  on-tertiary: '#ffffff'
  tertiary-container: '#57677e'
  on-tertiary-container: '#d6e6ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001452'
  on-primary-fixed-variant: '#0038b6'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  tabular-nums:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 48px
  gutter: 24px
  margin: 32px
---

## Brand & Style

The design system is engineered for high-performance logistics, prioritizing efficiency, clarity, and authoritative precision. The brand personality is "Professional Momentum"—it feels fast but stable, modern but grounded. 

The aesthetic follows a **Corporate Modern** style, characterized by exceptional clarity, a strict modular grid, and a sophisticated layering system. We move away from the dated, heavy purple headers toward a refined environment with ample whitespace, allowing complex data tables and logistics forms to breathe. The UI evokes a sense of "Logistical Mastery," ensuring users feel in total control of the data-heavy environment.

## Colors

The palette is anchored by **Action Blue**, a vibrant, high-contrast primary color reserved for key interactions and status indicators. This is balanced by **Deep Charcoal** (Secondary) for text and structural navigation, providing a sophisticated corporate foundation.

- **Primary (#0052FF):** Used for primary buttons, active states, and critical navigation highlights.
- **Secondary (#0F172A):** Used for high-level headings and the unified header background.
- **Surface Neutrals:** A range of Slate Grays (from #F8FAFC to #E2E8F0) defines the background, card surfaces, and border treatments to create a subtle hierarchy without visual noise.
- **Semantic Colors:** Success (Emerald), Warning (Amber), and Error (Rose) are used strictly for status labels (e.g., "Paid", "Pending", "Delayed") with low-opacity backgrounds for readability.

## Typography

This design system utilizes **Inter** exclusively to ensure maximum legibility across dense data environments. The scale focuses on "Tabular Precision," utilizing Inter’s OpenType features for monospaced numbers in data tables to ensure columns of figures align perfectly.

Headlines use a tighter letter-spacing and heavier weights to command attention, while body text maintains a generous line height for long-form data entry and reading. Labels are clearly distinguished through capitalization and increased tracking to differentiate them from interactive values.

## Layout & Spacing

The design system employs a **12-column Fluid Grid** for dashboards and a **Fixed Centered Container (1280px)** for complex forms to prevent input fields from stretching excessively on ultra-wide monitors.

A strict 4px baseline rhythm is used. Dashboards utilize a "Modular Spacing" approach:
- **Card Padding:** 24px (md) for internal content.
- **Section Spacing:** 32px (lg) between distinct logical groups (e.g., Summary Cards vs. Data Tables).
- **Form Density:** A "Comfortable" density for data entry, with 16px (sm) between label-input pairs and 24px (md) between field rows.
- **Unified Header:** The header is condensed to 64px height, housing a global search bar that expands on focus.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Micro-Shadows**. We avoid deep, heavy shadows in favor of a "Stitch-and-Layer" look:

- **Level 0 (Background):** Slate-50 (#F8FAFC) creates a clean, non-distracting canvas.
- **Level 1 (Cards/Tables):** Pure white surfaces with a 1px border (#E2E8F0). A very soft, diffused shadow (0px 1px 3px rgba(0,0,0,0.05)) is used to lift cards slightly from the background.
- **Level 2 (Dropdowns/Modals):** High-contrast surfaces with a more pronounced elevation (0px 10px 15px rgba(0,0,0,0.1)) to indicate temporary interaction layers.
- **Active State:** Primary action items (like the "Save" button) use a subtle inner-glow rather than an outer shadow to feel "pressed" and tactile.

## Shapes

The shape language is **Soft and Structural**. Standard components use a 4px (0.25rem) radius to maintain a professional, slightly technical feel without being overly clinical or too playful. 

- **Inputs and Buttons:** 4px radius for a crisp, modern edge.
- **Container Cards:** 8px radius to provide a gentler frame for large blocks of data.
- **Status Tags/Chips:** Fully rounded (pill-shaped) to distinguish them from interactive buttons or input fields.

## Components

### Buttons & Inputs
- **Primary Action:** Solid Blue (#0052FF) with white text. No gradients.
- **Secondary/Ghost:** Slate-100 background or 1px border.
- **Input Fields:** 40px height, subtle gray border, with labels placed above the field in `label-md` style. Focus states use a 2px Primary Blue ring.

### Data Tables
- **Header:** Light gray background (#F1F5F9), semi-bold text, 12px height.
- **Rows:** 48px minimum height. Zebra striping is avoided; instead, use 1px bottom borders. Hover states trigger a subtle color shift to Slate-50.
- **Alignment:** Numerical data is always right-aligned; text data is left-aligned.

### Cards & Dashboards
- **KPI Cards:** Feature a prominent `headline-lg` value with a `label-md` title and a small icon in a low-opacity primary tint.
- **Unified Header:** Features a persistent logo, a centered global search bar (max-width 600px), and a right-aligned user profile/logout section.

### Navigation
- **Global Nav:** The top-tier navigation icons are simplified. Active states are indicated by a 2px blue bottom-bar and a weight change in the icon. Icons should be stroke-based (2px weight) for a technical appearance.