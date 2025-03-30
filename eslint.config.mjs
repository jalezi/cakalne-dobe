import { defineConfig } from 'eslint/config';
import prettier from 'eslint-plugin-prettier';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import drizzle from 'eslint-plugin-drizzle';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';

import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});
export default defineConfig([
  {
    extends: compat.extends(
      'plugin:@typescript-eslint/recommended',
      'plugin:drizzle/recommended'
    ),
    ignores: ['.next*'],
    plugins: {
      prettier,
      '@typescript-eslint': typescriptEslint,
      drizzle,
      '@next/next': nextPlugin,
    },

    languageOptions: {
      parser: tsParser,
    },

    rules: {
      'no-unused-vars': 'off',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],

      '@typescript-eslint/no-empty-object-type': 'warn',

      'no-console': [
        'error',
        {
          allow: ['warn', 'error'],
        },
      ],

      'drizzle/enforce-delete-with-where': [
        'error',
        {
          drizzleObjectName: ['db'],
        },
      ],

      'drizzle/enforce-update-with-where': [
        'error',
        {
          drizzleObjectName: ['db'],
        },
      ],

      'prettier/prettier': 'warn',

      // Add Next.js recommended rules
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-img-element': 'warn',
      '@next/next/no-unwanted-polyfillio': 'warn',
      '@next/next/no-sync-scripts': 'error',
      '@next/next/google-font-display': 'warn',
      '@next/next/google-font-preconnect': 'warn',
      '@next/next/next-script-for-ga': 'warn',
    },
  },
]);
