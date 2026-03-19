import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

const sharedLanguageOptions = {
  ecmaVersion: 2020,
  parserOptions: {
    ecmaVersion: 'latest',
    ecmaFeatures: { jsx: true },
    sourceType: 'module',
  },
}

const sharedRules = {
  'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ...sharedLanguageOptions,
      globals: globals.browser,
    },
    rules: sharedRules,
  },
  {
    files: ['server.js', 'eslint.config.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ...sharedLanguageOptions,
      globals: globals.node,
    },
    rules: sharedRules,
  },
])
