(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = {
	isWall: function() {
		return ['+', '-', '|'].indexOf(this.character) !== -1 && !this.isText;
	},
	isLazer: function() {
		return ['V', '^', '>', '<'].indexOf(this.character) !== -1 && !this.isText;
	},
	isLazerBeam: function() {
		return this.isVerticalLazerBeam || this.isHorizontalLazerBeam;
	},
	isBlocking: function() {
		return this.isWall() || this.isLazer() || this.isLazerBeam();
	},
	toString: function(configuration) {
		var propertyToClassName = {
				'isText': 'text',
				'isUnderCursor': 'cursor',
				'isVerticalLazerBeam': 'vertical-lazer-beam',
				'isHorizontalLazerBeam': 'horizontal-lazer-beam',
				'isUnderTurretFire': 'turret-fire'
			},
			classNames = Object.keys(propertyToClassName).filter(function(key) {
				return this[key];
			}.bind(this)).map(function(key) {
				return propertyToClassName[key];
			}).join(' ');
        if (this.lineNumber) {
            this.character = configuration['display line numbers'] ? this.lineNumber : ' ';
        }

		return '<span  class="' + classNames + '">' + this.character + '</span>';
	}
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2Zha2VfOTc1Y2E3Ni5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRpc1dhbGw6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBbJysnLCAnLScsICd8J10uaW5kZXhPZih0aGlzLmNoYXJhY3RlcikgIT09IC0xICYmICF0aGlzLmlzVGV4dDtcblx0fSxcblx0aXNMYXplcjogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIFsnVicsICdeJywgJz4nLCAnPCddLmluZGV4T2YodGhpcy5jaGFyYWN0ZXIpICE9PSAtMSAmJiAhdGhpcy5pc1RleHQ7XG5cdH0sXG5cdGlzTGF6ZXJCZWFtOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5pc1ZlcnRpY2FsTGF6ZXJCZWFtIHx8IHRoaXMuaXNIb3Jpem9udGFsTGF6ZXJCZWFtO1xuXHR9LFxuXHRpc0Jsb2NraW5nOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5pc1dhbGwoKSB8fCB0aGlzLmlzTGF6ZXIoKSB8fCB0aGlzLmlzTGF6ZXJCZWFtKCk7XG5cdH0sXG5cdHRvU3RyaW5nOiBmdW5jdGlvbihjb25maWd1cmF0aW9uKSB7XG5cdFx0dmFyIHByb3BlcnR5VG9DbGFzc05hbWUgPSB7XG5cdFx0XHRcdCdpc1RleHQnOiAndGV4dCcsXG5cdFx0XHRcdCdpc1VuZGVyQ3Vyc29yJzogJ2N1cnNvcicsXG5cdFx0XHRcdCdpc1ZlcnRpY2FsTGF6ZXJCZWFtJzogJ3ZlcnRpY2FsLWxhemVyLWJlYW0nLFxuXHRcdFx0XHQnaXNIb3Jpem9udGFsTGF6ZXJCZWFtJzogJ2hvcml6b250YWwtbGF6ZXItYmVhbScsXG5cdFx0XHRcdCdpc1VuZGVyVHVycmV0RmlyZSc6ICd0dXJyZXQtZmlyZSdcblx0XHRcdH0sXG5cdFx0XHRjbGFzc05hbWVzID0gT2JqZWN0LmtleXMocHJvcGVydHlUb0NsYXNzTmFtZSkuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRyZXR1cm4gdGhpc1trZXldO1xuXHRcdFx0fS5iaW5kKHRoaXMpKS5tYXAoZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdHJldHVybiBwcm9wZXJ0eVRvQ2xhc3NOYW1lW2tleV07XG5cdFx0XHR9KS5qb2luKCcgJyk7XG4gICAgICAgIGlmICh0aGlzLmxpbmVOdW1iZXIpIHtcbiAgICAgICAgICAgIHRoaXMuY2hhcmFjdGVyID0gY29uZmlndXJhdGlvblsnZGlzcGxheSBsaW5lIG51bWJlcnMnXSA/IHRoaXMubGluZU51bWJlciA6ICcgJztcbiAgICAgICAgfVxuXG5cdFx0cmV0dXJuICc8c3BhbiAgY2xhc3M9XCInICsgY2xhc3NOYW1lcyArICdcIj4nICsgdGhpcy5jaGFyYWN0ZXIgKyAnPC9zcGFuPic7XG5cdH1cbn07XG4iXX0=
