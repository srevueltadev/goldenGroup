import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
/*  {
    extends: ['next/core-web-vitals', 'next/typescript'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Disable the explicit any rule
      'react-hooks/exhaustive-deps': 'off', // Optionally disable exhaust deps rule
      'no-console': 'off', // Disable no-console rule
      // Add other rules you want to disable here
    },
  }*/
];

export default eslintConfig;
