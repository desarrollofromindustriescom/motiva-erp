export default {
   '*.sql': (files) => files.map((file) => `sql-formatter --fix "${file}"`),
   '*.{json,yml,yaml,sh,bash,,toml,md,mjs}': 'prettier --write',
   'Dockerfile': 'prettier --write',
};
