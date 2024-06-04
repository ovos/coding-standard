import * as prettier from 'prettier';

const config: prettier.Options = {
  // i know i know, prettier recommends against setting printWidth to more than 80
  // but how about they change their mindset a bit and allow it to be more flexible
  // https://github.com/prettier/prettier/issues/4093 (even with proof-of-concept)
  // https://github.com/prettier/prettier/issues/4160
  // https://github.com/prettier/prettier/issues/4298
  // https://github.com/prettier/prettier/issues/4658
  printWidth: 100,
  singleQuote: true,
  trailingComma: 'es5',
};

export default config;
