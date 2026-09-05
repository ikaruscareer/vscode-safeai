import tsParser from '@typescript-eslint/parser';
import pluginTs from '@typescript-eslint/eslint-plugin';

export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    plugins: {
      '@typescript-eslint': pluginTs
    },
    rules: {
      ...pluginTs.configs.recommended?.rules
    }
  },
  {
    ignores: ['dist', 'node_modules']
  }
];
