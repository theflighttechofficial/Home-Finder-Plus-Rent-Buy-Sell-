const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
    { ignores: ["node_modules/", "uploads/", "coverage/"] },
    js.configs.recommended,
    {
        files: ["server/**/*.js", "api/**/*.js", "test/**/*.js", "*.js"],
        languageOptions: { ecmaVersion: 2023, sourceType: "commonjs", globals: globals.node },
    },
    {
        files: ["public/js/**/*.js"],
        languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: { ...globals.browser, L: "readonly" } },
    },
    {
        files: ["public/js/theme.js"],
        languageOptions: { sourceType: "script" },
    },
    {
        rules: {
            "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
            eqeqeq: ["error", "smart"],
            "prefer-const": "error",
        },
    },
];
