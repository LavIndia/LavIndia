// Design System for Lavish India
// Centralized design tokens for consistent styling across all components

export const designSystem = {
  // Typography
  fontSize: {
    xs: "text-xs", // 12px
    sm: "text-sm", // 14px
    base: "text-base", // 16px
    lg: "text-lg", // 18px
    xl: "text-xl", // 20px
    "2xl": "text-2xl", // 24px
    "3xl": "text-3xl", // 30px
    "4xl": "text-4xl", // 36px
  },

  // Spacing
  spacing: {
    xs: "space-x-1", // 4px
    sm: "space-x-2", // 8px
    md: "space-x-4", // 16px
    lg: "space-x-6", // 24px
    xl: "space-x-8", // 32px
  },

  // Padding
  padding: {
    xs: "p-2", // 8px
    sm: "p-3", // 12px
    md: "p-4", // 16px
    lg: "p-6", // 24px
    xl: "p-8", // 32px
  },

  // Margins
  margin: {
    xs: "m-1", // -4px
    sm: "m-2", // -8px
    md: "m-4", // -16px
    lg: "m-6", // -24px
  },

  // Border Radius
  borderRadius: {
    none: "rounded-none",
    sm: "rounded-sm", // 2px
    md: "rounded-md", // 6px
    lg: "rounded-lg", // 8px
    xl: "rounded-xl", // 12px
    full: "rounded-full", // 9999px
  },

  // Shadows
  shadow: {
    none: "shadow-none",
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
    xl: "shadow-xl",
  },

  // Component Heights
  componentHeight: {
    xs: "h-8", // 32px
    sm: "h-9", // 36px
    md: "h-10", // 40px
    lg: "h-12", // 48px
    xl: "h-16", // 64px
  },

  // Responsive Breakpoints (consistent usage)
  breakpoints: {
    sm: "sm:", // 640px+
    md: "md:", // 768px+
    lg: "lg:", // 1024px+
    xl: "xl:", // 1280px+
    "2xl": "2xl:", // 1536px+
  },

  // Z-index layers
  zIndex: {
    base: "z-0",
    dropdown: "z-10",
    sticky: "z-20",
    fixed: "z-30",
    modal: "z-40",
    popover: "z-50",
    tooltip: "z-60",
  },

  // Transitions
  transition: {
    fast: "transition duration-150",
    normal: "transition duration-200",
    slow: "transition duration-300",
  },
};

// Common component patterns
export const componentPatterns = {
  button: {
    base: "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    sizes: {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-base",
      lg: "h-12 px-6 text-lg",
    },
  },

  input: {
    base: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  },

  card: {
    base: "rounded-lg border bg-card text-card-foreground shadow-sm",
  },
};
