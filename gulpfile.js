var gulp = require('gulp');
var clean = require('gulp-clean');
var jasmine = require('gulp-jasmine');
var connect = require('gulp-connect');
var browserify = require('gulp-browserify');
var less = require('gulp-less');
var autoprefixer = require('gulp-autoprefixer');
var LessPluginAutoPrefix = require('less-plugin-autoprefix'),
    autoprefix= new LessPluginAutoPrefix({browsers: ["last 2 versions"]});
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

gulp.task('clean', ['clean scripts', 'clean styles']);

gulp.task('default', ['clean', 'scripts', 'styles', 'watch', 'serve']);

gulp.task('test', function() {
  gulp.src(path.tests)
    .pipe(jasmine());
});

gulp.task('scripts', function() {
  gulp.src(path.scripts)
    .pipe(browserify({
      debug: !gulp.env.production
    }))
    .pipe(gulp.dest('./dist/scripts'))
    .pipe(connect.reload());
});

gulp.task('clean scripts', function() {
  return gulp.src(path.scriptsDestination, {
      read: false
    })
    .pipe(clean());
});

gulp.task('styles', function() {
  gulp.src(path.styles)
    .pipe(less())
    .pipe(autoprefixer())
    .pipe(gulp.dest('./dist/styles'))
    .pipe(connect.reload());
});

gulp.task('clean styles', function() {
  return gulp.src(path.stylesDestination, {
      read: false
    })
    .pipe(clean());
});

gulp.task('chambers', function() {
  gulp.src(path.hardcodedChamberToReloadOnlyOnce)
    .pipe(connect.reload());
});

gulp.task('watch', function() {
  gulp.watch(path.scripts, ['scripts']);
  gulp.watch(path.styles, ['styles']);
  gulp.watch(path.chambers, ['chambers']);
 // gulp.watch(path.html, ['chambers']);
});

gulp.task('serve', connect.server({
  root: [__dirname],
  port: 8000,
  open: true,
  livereload: true
}));