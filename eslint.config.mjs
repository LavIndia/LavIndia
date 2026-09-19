import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * ESLint configuration.
 *
 * The project was on ESLint 9 with no config file at all, which meant
 * `npm run lint` failed outright and nothing was ever checked. This is the
 * flat config that version expects, extending the Next.js rules that the
 * dependencies were already installed for.
 *
 * Generated output is ignored rather than linted: `styled-system` is emitted
 * by Panda on every `panda codegen`, so any complaint about it is both
 * unfixable and regenerated the moment it is silenced.
 */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "styled-system/**",
      "public/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
