export default {
   '*.go': (files) => files.map((file) => `go fmt "${file}"`),
   '*.sql': (files) => files.map((file) => `sql-formatter --fix "${file}"`),
   '*.{json,yml,yaml,sh,bash,toml,md,mjs,html,css,ts}': 'prettier --write',
   'Dockerfile': 'prettier --write',
};
