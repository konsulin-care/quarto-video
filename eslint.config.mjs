// ESLint flat config (ADR-0001). Lints TypeScript and JavaScript code.
import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", ".video-build/**", "tests/visual/report/**"],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  prettier,
);
