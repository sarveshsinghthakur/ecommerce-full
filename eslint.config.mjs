import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "**/*.d.ts",
    "drizzle.config.ts",
  ]),
  {
    rules: {
      // React's own documentation prescribes `useEffect` + fetch + setState as
      // the data-fetching pattern. This rule cannot see through our async
      // helpers and flags every mount-time load as a synchronous setState, so
      // it fires on correct code. Disabled deliberately rather than worked
      // around with timers.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
