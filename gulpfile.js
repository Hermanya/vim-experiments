var gulp = require('gulp');
var clean = require('gulp-clean');
var jasmine = require('gulp-jasmine');
var connect = require('gulp-connect');
var browserify = require('gulp-browserify');
var less = require('gulp-less');
var autoprefixer = require('gulp-autoprefixer');
var jshint = require('gulp-jshint');
var pathFromNode = require('path');
var path = {
  scripts: './src/**/*.js',
  scriptsDestination: './dist/scripts/**/*.js',
  build: './dist/**/*.*',
  chambers: './chambers/*.json',
  hardcodedChamberToReloadOnlyOnce: './chambers/0.json',
  tests: './spec/**/*-test.js',
  styles: './src/styles/**/*.less',
  stylesDestination: './dist/styles/**/*.css',
  html: './index.html'
};

gulp.task('default', ['watch', 'serve']);

gulp.task('clean scripts', function() {
  return gulp.src(path.scriptsDestination, {
      read: false
    })
    .pipe(clean());
});

gulp.task('scripts', ['clean scripts'], function() {
  return gulp.src(path.scripts)
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(browserify({
      debug: !gulp.env.production
    }))
    .pipe(gulp.dest('./dist/scripts'))
    .pipe(connect.reload());
});

gulp.task('tests', ['scripts'], function() {
  Object.keys(require.cache).filter(function(key) {
    return /vim-experiments\/src\//.test(key);
  }).forEach(function(key) {
    delete require.cache[key];
  });
  return gulp.src(path.tests)
    .pipe(jasmine({
      includeStackTrace: true
    }));
});

gulp.task('clean styles', function() {
  return gulp.src(path.stylesDestination, {
      read: false
    })
    .pipe(clean());
});

gulp.task('styles', ['clean styles'], function() {
  return gulp.src(path.styles)
    .pipe(less())
    .pipe(autoprefixer())
    .pipe(gulp.dest('./dist/styles'))
    .pipe(connect.reload());
});

gulp.task('chambers', function() {
  return gulp.src(path.hardcodedChamberToReloadOnlyOnce)
    .pipe(connect.reload());
});

gulp.task('watch', function() {
  gulp.watch(path.scripts, ['tests']);
  gulp.watch(path.styles, ['styles']);
  gulp.watch(path.chambers, ['chambers']);
});

gulp.task('serve', ['tests', 'styles'], connect.server({
  root: [__dirname],
  port: 8000,
  open: true,
  livereload: true
}));