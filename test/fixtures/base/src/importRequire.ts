import fs from 'node:fs';

// `require` calls come last, in the order they were written, because that order decides what runs first
const zebra = require('zebra');
const apple = require('apple');

function load() {
  const later = require('later');
  const early = require('early');
  return [early, later];
}

export { apple, fs, load, zebra };
