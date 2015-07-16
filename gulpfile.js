var gulp = require('gulp'),
  boilerplate = require('boilerplate-gulp');

boilerplate(gulp, {
  pkg: require('./package.json'),
  jsMain: './src/createClient.js',
  karmaConfig: require('./dev/karmaConfig'),
  jsHintConfig: './dev/.jshintrc',
  disableCss: true
});
