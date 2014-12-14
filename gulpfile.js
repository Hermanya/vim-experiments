var gulp = require('gulp');
var jasmine = require('gulp-jasmine');
var connect = require('gulp-connect');
var es = require('event-stream');
var clean = require('gulp-clean');
var rename = require("gulp-rename");
var browserify = require('gulp-browserify');

gulp.task('test', function () {
    return gulp.src('spec/test.js')
        .pipe(jasmine());
});

gulp.task('clean', function(){
	//./dist/**/*.*
    gulp.src('./main.js')
        .pipe(clean());
});

gulp.task('scripts', function() {
    gulp.src('src/main.js')
        .pipe(browserify({
          insertGlobals : true,
          debug : !gulp.env.production
        }))
        .pipe(gulp.dest('./'))
});

gulp.task('watch', function() {
  gulp.watch('./scr/**/*.js', ['clean', 'scripts']);
});

gulp.task('default', ['clean', 'scripts']);

gulp.task('serve', connect.server({
  root: [__dirname],
  port: 8000,
  open: true,
  livereload: false
}));
