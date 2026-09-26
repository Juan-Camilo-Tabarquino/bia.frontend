/**
 * Jest configuration for the App Router app.
 *
 * `react-markdown@10` and `remark-gfm@4` are ESM-only (`"type": "module"`), and
 * so is their whole dependency tree. Jest cannot `require()` those files as
 * CommonJS, so `transformIgnorePatterns` below allowlists that tree (the exact
 * closure resolved from `react-markdown`/`remark-gfm`, including nested copies
 * such as `escape-string-regexp`) and ts-jest compiles `.js`/`.jsx` alongside
 * `.ts`/`.tsx`. The markdown packages are therefore exercised for real, never
 * mocked.
 *
 * The ant-design colour packages are allowlisted for the same reason.
 * `@ant-design/icons` and `@ant-design/colors` both ship a dual CJS/ESM build,
 * and their CommonJS entry points `require()` the ESM `/es/` paths:
 * `@ant-design/icons/lib/colorUtils.js` loads `@ant-design/colors/es/generate`,
 * whose own ESM file imports `@ant-design/fast-color`. Without these two
 * entries Jest cannot `require()` the icons barrel, so the real icon
 * components are exercised here instead of being stubbed.
 */
const esmPackages = [
  "@ant-design/colors",
  "@ant-design/fast-color",
  "@ungap/structured-clone",
  "bail",
  "ccount",
  "character-entities",
  "character-entities-html4",
  "character-entities-legacy",
  "character-reference-invalid",
  "comma-separated-tokens",
  "decode-named-character-reference",
  "devlop",
  "escape-string-regexp",
  "estree-util-is-identifier-name",
  "hast-util-to-jsx-runtime",
  "hast-util-whitespace",
  "html-url-attributes",
  "is-alphabetical",
  "is-alphanumerical",
  "is-decimal",
  "is-hexadecimal",
  "is-plain-obj",
  "longest-streak",
  "markdown-table",
  "mdast-util-find-and-replace",
  "mdast-util-from-markdown",
  "mdast-util-gfm",
  "mdast-util-gfm-autolink-literal",
  "mdast-util-gfm-footnote",
  "mdast-util-gfm-strikethrough",
  "mdast-util-gfm-table",
  "mdast-util-gfm-task-list-item",
  "mdast-util-mdx-expression",
  "mdast-util-mdx-jsx",
  "mdast-util-mdxjs-esm",
  "mdast-util-phrasing",
  "mdast-util-to-hast",
  "mdast-util-to-markdown",
  "mdast-util-to-string",
  "micromark",
  "micromark-core-commonmark",
  "micromark-extension-gfm",
  "micromark-extension-gfm-autolink-literal",
  "micromark-extension-gfm-footnote",
  "micromark-extension-gfm-strikethrough",
  "micromark-extension-gfm-table",
  "micromark-extension-gfm-tagfilter",
  "micromark-extension-gfm-task-list-item",
  "micromark-factory-destination",
  "micromark-factory-label",
  "micromark-factory-space",
  "micromark-factory-title",
  "micromark-factory-whitespace",
  "micromark-util-character",
  "micromark-util-chunked",
  "micromark-util-classify-character",
  "micromark-util-combine-extensions",
  "micromark-util-decode-numeric-character-reference",
  "micromark-util-decode-string",
  "micromark-util-encode",
  "micromark-util-html-tag-name",
  "micromark-util-normalize-identifier",
  "micromark-util-resolve-all",
  "micromark-util-sanitize-uri",
  "micromark-util-subtokenize",
  "micromark-util-symbol",
  "micromark-util-types",
  "parse-entities",
  "property-information",
  "react-markdown",
  "remark-gfm",
  "remark-parse",
  "remark-rehype",
  "remark-stringify",
  "space-separated-tokens",
  "stringify-entities",
  "trim-lines",
  "trough",
  "unified",
  "unist-util-is",
  "unist-util-position",
  "unist-util-stringify-position",
  "unist-util-visit",
  "unist-util-visit-parents",
  "vfile",
  "vfile-message",
  "zwitch"
];

module.exports = {
  moduleNameMapper: {
    "\\.(scss|sass|css)$": "identity-obj-proxy",
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  testEnvironment: 'jsdom',
  transform: {
    "\\.[jt]sx?$": [
      "ts-jest",
      {
        tsconfig: {
          allowJs: true,
          module: "commonjs",
          moduleResolution: "node"
        }
      }
    ]
  },
  transformIgnorePatterns: [
    `/node_modules/(?!(${esmPackages.join("|")})/)`
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'scss'],
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts?(x)'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};
