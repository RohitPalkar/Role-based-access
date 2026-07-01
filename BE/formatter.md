Docs: https://github.com/typicode/husky/releases/tag/v9.0.1

```
npm install husky -D
npm install lint-staged -D
```

### Add husky to the project

```
npx husky init
```

### Add the hooks

pre-commit

```
echo "npm run pre-commit" > .husky/pre-commit
```

post-commit

```
echo "npm run post-commit" > .husky/post-commit
```

pre-push

```
echo "npm run pre-push" > .husky/pre-push
```

### Add `.lintstagedrc` to the root of the project

```
{
  "*.ts": ["npm run format", "npm run lint"]
}
```

### Update the the scripts in `package.json`

```
  "scripts": {
    .
    .
    .
    "pre-commit": "lint-staged",
    "post-commit": "npm audit",
    "pre-push": "npm run lint"
    .
    .
  }
```

### Make sure `eslint` and `prettier` are installed. Also, `lint` and `format` scripts are present in the `package.json`

```
  "scripts": {
    .
    .
    .
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    .
    .
  }
```
