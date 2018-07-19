## Install

```sh
# using npm
npm install --save-dev @ovos-media/coding-standard

# using yarn
yarn add --dev @ovos-media/coding-standard
```

## Usage

- prettier.config.js

```js
module.exports = require('@ovos-media/coding-standard').prettier;
```

- tslint.json

```json
{
  "extends": [
    "@ovos-media/coding-standard/tslint"
  ]
}
```
