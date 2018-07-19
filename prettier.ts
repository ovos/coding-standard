import * as prettier from 'prettier';

const config: prettier.Options = {
  // i know i know, prettier recommends against setting printWidth to more than 80
  // but how about they change their mindset a bit and allow it to be more flexible
  // https://github.com/prettier/prettier/issues/4093 (even with proof-of-concept)
  // https://github.com/prettier/prettier/issues/4160
  // https://github.com/prettier/prettier/issues/4298
  // https://github.com/prettier/prettier/issues/4658
  printWidth: 120,
  singleQuote: true,
  trailingComma: "es5",
  // neither "avoid" nor "always" plays well with tslint's "ter-arrow-parens"
  // with "as-needed" + "requireForBlockBody": true...
  // but of two evils, choose the least
  arrowParens: "always",
};

export default config;
