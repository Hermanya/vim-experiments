(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = {
	fromArrayOfStrings: function (arrayOfStrings) {
		this.matrix = arrayOfStrings.map(function(string) {
			return string.split('');
		});
	},
	map: function(fn) {
		return this.matrix.map(function(array, row) {
			return array.map(function(item, column) {
				return fn(item, row, column);
			});
		});
	},
	getCoordinatesOf: function (thingToFind) {
		var predicate;
		if (typeof thingToFind === 'string') {
			predicate = function(string, anotherString) {
				return string === anotherString;
			};
		}
		if (typeof thingToFind === 'object') {
			predicate = function(thingToFind, anotherObject) {
				return Object.keys(thingToFind).filter(function(key) {
					return thingToFind[key] !== anotherObject[key];
				}).length === 0;

			};
		}
		return this.matrix.reduce(function(found, array, row) {
			array.forEach(function(cell, column) {
				if (predicate(thingToFind, cell)) {
					found.push({
						row: row,
						column: column
					});
				}
			});
			return found;
		}, []);
	}
};
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2Zha2VfNTNmYzdjNy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdGZyb21BcnJheU9mU3RyaW5nczogZnVuY3Rpb24gKGFycmF5T2ZTdHJpbmdzKSB7XG5cdFx0dGhpcy5tYXRyaXggPSBhcnJheU9mU3RyaW5ncy5tYXAoZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gc3RyaW5nLnNwbGl0KCcnKTtcblx0XHR9KTtcblx0fSxcblx0bWFwOiBmdW5jdGlvbihmbikge1xuXHRcdHJldHVybiB0aGlzLm1hdHJpeC5tYXAoZnVuY3Rpb24oYXJyYXksIHJvdykge1xuXHRcdFx0cmV0dXJuIGFycmF5Lm1hcChmdW5jdGlvbihpdGVtLCBjb2x1bW4pIHtcblx0XHRcdFx0cmV0dXJuIGZuKGl0ZW0sIHJvdywgY29sdW1uKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9LFxuXHRnZXRDb29yZGluYXRlc09mOiBmdW5jdGlvbiAodGhpbmdUb0ZpbmQpIHtcblx0XHR2YXIgcHJlZGljYXRlO1xuXHRcdGlmICh0eXBlb2YgdGhpbmdUb0ZpbmQgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRwcmVkaWNhdGUgPSBmdW5jdGlvbihzdHJpbmcsIGFub3RoZXJTdHJpbmcpIHtcblx0XHRcdFx0cmV0dXJuIHN0cmluZyA9PT0gYW5vdGhlclN0cmluZztcblx0XHRcdH07XG5cdFx0fVxuXHRcdGlmICh0eXBlb2YgdGhpbmdUb0ZpbmQgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRwcmVkaWNhdGUgPSBmdW5jdGlvbih0aGluZ1RvRmluZCwgYW5vdGhlck9iamVjdCkge1xuXHRcdFx0XHRyZXR1cm4gT2JqZWN0LmtleXModGhpbmdUb0ZpbmQpLmZpbHRlcihmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpbmdUb0ZpbmRba2V5XSAhPT0gYW5vdGhlck9iamVjdFtrZXldO1xuXHRcdFx0XHR9KS5sZW5ndGggPT09IDA7XG5cblx0XHRcdH07XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLm1hdHJpeC5yZWR1Y2UoZnVuY3Rpb24oZm91bmQsIGFycmF5LCByb3cpIHtcblx0XHRcdGFycmF5LmZvckVhY2goZnVuY3Rpb24oY2VsbCwgY29sdW1uKSB7XG5cdFx0XHRcdGlmIChwcmVkaWNhdGUodGhpbmdUb0ZpbmQsIGNlbGwpKSB7XG5cdFx0XHRcdFx0Zm91bmQucHVzaCh7XG5cdFx0XHRcdFx0XHRyb3c6IHJvdyxcblx0XHRcdFx0XHRcdGNvbHVtbjogY29sdW1uXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGZvdW5kO1xuXHRcdH0sIFtdKTtcblx0fVxufTsiXX0=
