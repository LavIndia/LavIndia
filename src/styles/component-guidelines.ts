// Component Structure Guidelines for Lavish India
// Follow these patterns for consistent code organization across all components

export const componentGuidelines = {
  // File Structure
  fileStructure: {
    order: [
      '"use client"', // Client directive (if needed)
      "imports", // External libraries, React, Next.js
      "local imports", // UI components, styles, local components
      "types/interfaces", // TypeScript definitions
      "component export", // Main component function
    ],
  },

  // Import Organization
  imports: {
    order: [
      "React imports",
      "Next.js imports",
      "UI library imports (shadcn)",
      "Icon library imports (lucide-react)",
      "Style imports (colors, design-system)",
      "Local component imports",
    ],
    example: `import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import colors from "@/styles/colors";
import { designSystem } from "@/styles/design-system";
import { OtherComponent } from "./OtherComponent";`,
  },

  // Component Patterns
  patterns: {
    naming: {
      components: "PascalCase (HeaderSection, HeroBanner)",
      files: "PascalCase.tsx (HeaderSection.tsx)",
      functions: "camelCase (handleClick, onSubmit)",
      variables: "camelCase (isOpen, userData)",
    },

    structure: {
      props: "interface ComponentNameProps { ... }",
      component:
        "export function ComponentName(props: ComponentNameProps) { ... }",
      hooks: "const [state, setState] = useState(initialValue);",
      eventHandlers: "const handleEvent = () => { ... };",
    },

    styling: {
      classes: "Use designSystem tokens and centralized colors",
      responsive: "Consistent breakpoint usage (sm:, md:, lg:, xl:)",
      spacing: "Use designSystem.spacing values",
      colors: "Use colors object instead of hardcoded hex values",
    },
  },

  // Code Quality
  quality: {
    accessibility: "Include aria-labels, semantic HTML, keyboard navigation",
    performance: "Use Next.js Image, lazy loading, proper memoization",
    maintainability: "Clear comments, consistent naming, avoid deep nesting",
    responsiveness: "Mobile-first approach, test all breakpoints",
  },

  // Example Component Template
  template: `"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import colors from "@/styles/colors";
import { designSystem } from "@/styles/design-system";

interface ExampleComponentProps {
  title: string;
  onAction?: () => void;
}

export function ExampleComponent({ title, onAction }: ExampleComponentProps) {
  const [isActive, setIsActive] = useState(false);

  const handleClick = () => {
    setIsActive(!isActive);
    onAction?.();
  };

  return (
    <div className={\`p-4 \${designSystem.borderRadius.md} bg-white\`}>
      <h2 className={designSystem.fontSize.xl}>{title}</h2>
      <Button
        onClick={handleClick}
        className={\`bg-[\${colors.accentGold}] hover:bg-[\${colors.accentGoldHover}] \${designSystem.transition.normal}\`}
      >
        {isActive ? 'Active' : 'Inactive'}
      </Button>
    </div>
  );
}`,
};
