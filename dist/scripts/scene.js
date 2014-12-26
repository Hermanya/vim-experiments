(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var commands = {}, mainFunction;
module.exports = commands;

commands['chamber (\\d+)'] = function(chamberNumber) {
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState === 4) {
			if (xmlhttp.status === 200) {
				if (window) {
					window.localStorage.chamber = chamberNumber;
				}
				mainFunction(JSON.parse(xmlhttp.responseText));
			} else if (xmlhttp.status === 404) {
				window.alert('Out of chambers');
			} else {
				window.alert(xmlhttp.status);
			}
		}
	};

	chamberNumber = chamberNumber || 0;

	if (typeof window !== 'undefined') {
		chamberNumber = chamberNumber || window.localStorage.chamber || 0;
	}
	xmlhttp.open('GET', './chambers/' + chamberNumber + '.json', true);
	xmlhttp.send();
};

commands['load chamber'] = commands['chamber (\\d+)'];

commands['initialize chamber'] = function(main) {
	mainFunction = main;
	commands['chamber (\\d+)']();
} 
},{}],2:[function(require,module,exports){
var commands = require('./commands.js');
module.exports = {
	score: 0,
	reactOnCurrentCellOnScene: function(scene) {
		var cell = scene.getCurrentCell(this);
		if (cell.isText) {
			return;
		}
		switch (cell.character) {
			case '*':
				cell.character = '&nbsp;';
				this.score++;
				break;
			case 'O':
				var numberOfPieces;
				switch (this.score) {
					case 0:
						numberOfPieces = 'no';
						break;
					case 1:
						numberOfPieces = 'a piece of';
						break;
					default:
						numberOfPieces = this.score + ' pieces of';
				}
				this.isDone = true;
				this.forgetColumn();
				if (typeof window !== 'undefined'){
					window.setTimeout(function() {
						window.alert('get ' + numberOfPieces + ' cake');
						commands['load chamber'](Number(window.localStorage.chamber) + 1);
					}, 0); 
				}
				break;

		}
	},

	rememberColumn: function() {
		if (!this.rememberedColumn) {
			this.rememberedColumn = this.column;
		}
	},

	forgetColumn: function() {
		delete this.rememberedColumn;
	},

	save: function() {
		this.savedColumn = this.column;
		this.savedRow = this.row;
	},
	restore: function() {
		this.column = this.savedColumn;
		this.row = this.savedRow;
	}
};
},{"./commands.js":1}],3:[function(require,module,exports){
var matrixDecorator = require('./matrix-decorator.js'),
	cursor = require('./cursor.js');

var scene = Object.create(matrixDecorator);

scene.initialize = function() {
	this.replaceCharactersWithCells();
	this.markText();
	this.markLazers();
	this.markCursor();
};

scene.replaceCharactersWithCells = function() {
	var scene = this;
	scene.matrix = scene.map(function(character, row, column) {
		if (character === '@') {
			scene.spawnPosition = {
				row: row,
				column: column
			}
		}
		return {
			row: row,
			column: column,
			isUnderCursor: character === '@',
			character: ['@'].indexOf(character) !== -1 ? ' ' : character,
			isWall: function() {
				return ['+', '-', '|'].indexOf(character) !== -1 && !this.isText;
			},
			isLazer: function() {
				return ['V', '^', '>', '<'].indexOf(character) !== -1 && !this.isText;
			},
			isBlocking: function() {
				return this.isWall() || this.isLazer() || this.isVerticalLazerBeam || this.isHorizontalLazerBeam;
			},
			toString: function() {
				return '<span  class="' + 
				(this.isUnderCursor ? ' cursor' : '') +
				(this.isText ? ' text' : '') +
				(this.isVerticalLazerBeam ? ' vertical-lazer-beam' : '') +
				(this.isHorizontalLazerBeam ? ' horizontal-lazer-beam' : '') +
				 '">' + this.character + '</span>';
			}
		};
	}, scene);
};

scene.markCursor = function() {
	cursor.column = this.spawnPosition.column;
	cursor.row = this.spawnPosition.row;
	cursor.isDone = false;
};

scene.markText = function() {
	var isSequenceOfTextInProgress = false,
	lastCellInSequence;
	this.matrix = this.map(function(cell, row, column) {
		if (isSequenceOfTextInProgress) {
			if (cell.character === '`') {
				isSequenceOfTextInProgress = false;
				lastCellInSequence = scene.matrix[row][column - 1];
				cell.character = ' ';
			} else {
				cell.isText = true;
				if (lastCellInSequence) {
					if (Math.abs(lastCellInSequence.row - cell.row) === 1) {
						cell.previousTextCell = lastCellInSequence;
						lastCellInSequence.nextTextCell = cell;
					}
					lastCellInSequence = undefined;
				}
			}
		} else {
			if (cell.character === '`') {
				isSequenceOfTextInProgress = true;
				cell.character = ' ';

			} else {

			}

		}
		return cell;
	});
};

scene.markLazers = function() {
	var matrix = this.matrix;
	matrix = this.map(function(cell, row, column) {
		var propertyName
		switch (cell.character) {
			case 'V':
				row++;
				while (matrix[row][column].isHorizontalLazerBeam || !matrix[row][column].isBlocking()) {
					matrix[row][column].isVerticalLazerBeam = true;
					row++;
				}
				break;
			case '^':
				row--;
				while (matrix[row][column].isHorizontalLazerBeam || !matrix[row][column].isBlocking()) {
					matrix[row][column].isVerticalLazerBeam = true;
					row--;
				}
				break;
			case '>':
				column++;
				while (matrix[row][column].isVerticalLazerBeam || !matrix[row][column].isBlocking()) {
					matrix[row][column].isHorizontalLazerBeam = true;
					column++;
				}
				break;
			case '<':
				column--;
				while (matrix[row][column].isVerticalLazerBeam || !matrix[row][column].isBlocking()) {
					matrix[row][column].isHorizontalLazerBeam = true;
					column--;
				}
				break;
		}
		return cell;
	});
};

scene.getCurrentCell = function() {
	return this.matrix[cursor.row][cursor.column];
};

scene.render = function() {
	var element = document.querySelector('#scene');
	element.innerHTML = scene.matrix.map(function(array) {
		return array.join('');
	}).join('<br>');
};

scene.toggleCursor = function() {
	var cell = scene.matrix[cursor.row][cursor.column];
	cell.isUnderCursor = !cell.isUnderCursor;
};

module.exports = scene;
},{"./cursor.js":2,"./matrix-decorator.js":4}],4:[function(require,module,exports){
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
},{}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NvbW1hbmRzLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jdXJzb3IuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2Zha2VfYWUyZTg2NDEuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL21hdHJpeC1kZWNvcmF0b3IuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgY29tbWFuZHMgPSB7fSwgbWFpbkZ1bmN0aW9uO1xubW9kdWxlLmV4cG9ydHMgPSBjb21tYW5kcztcblxuY29tbWFuZHNbJ2NoYW1iZXIgKFxcXFxkKyknXSA9IGZ1bmN0aW9uKGNoYW1iZXJOdW1iZXIpIHtcblx0dmFyIHhtbGh0dHAgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0eG1saHR0cC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcblx0XHRpZiAoeG1saHR0cC5yZWFkeVN0YXRlID09PSA0KSB7XG5cdFx0XHRpZiAoeG1saHR0cC5zdGF0dXMgPT09IDIwMCkge1xuXHRcdFx0XHRpZiAod2luZG93KSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2FsU3RvcmFnZS5jaGFtYmVyID0gY2hhbWJlck51bWJlcjtcblx0XHRcdFx0fVxuXHRcdFx0XHRtYWluRnVuY3Rpb24oSlNPTi5wYXJzZSh4bWxodHRwLnJlc3BvbnNlVGV4dCkpO1xuXHRcdFx0fSBlbHNlIGlmICh4bWxodHRwLnN0YXR1cyA9PT0gNDA0KSB7XG5cdFx0XHRcdHdpbmRvdy5hbGVydCgnT3V0IG9mIGNoYW1iZXJzJyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR3aW5kb3cuYWxlcnQoeG1saHR0cC5zdGF0dXMpO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHRjaGFtYmVyTnVtYmVyID0gY2hhbWJlck51bWJlciB8fCAwO1xuXG5cdGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuXHRcdGNoYW1iZXJOdW1iZXIgPSBjaGFtYmVyTnVtYmVyIHx8IHdpbmRvdy5sb2NhbFN0b3JhZ2UuY2hhbWJlciB8fCAwO1xuXHR9XG5cdHhtbGh0dHAub3BlbignR0VUJywgJy4vY2hhbWJlcnMvJyArIGNoYW1iZXJOdW1iZXIgKyAnLmpzb24nLCB0cnVlKTtcblx0eG1saHR0cC5zZW5kKCk7XG59O1xuXG5jb21tYW5kc1snbG9hZCBjaGFtYmVyJ10gPSBjb21tYW5kc1snY2hhbWJlciAoXFxcXGQrKSddO1xuXG5jb21tYW5kc1snaW5pdGlhbGl6ZSBjaGFtYmVyJ10gPSBmdW5jdGlvbihtYWluKSB7XG5cdG1haW5GdW5jdGlvbiA9IG1haW47XG5cdGNvbW1hbmRzWydjaGFtYmVyIChcXFxcZCspJ10oKTtcbn0gIiwidmFyIGNvbW1hbmRzID0gcmVxdWlyZSgnLi9jb21tYW5kcy5qcycpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG5cdHNjb3JlOiAwLFxuXHRyZWFjdE9uQ3VycmVudENlbGxPblNjZW5lOiBmdW5jdGlvbihzY2VuZSkge1xuXHRcdHZhciBjZWxsID0gc2NlbmUuZ2V0Q3VycmVudENlbGwodGhpcyk7XG5cdFx0aWYgKGNlbGwuaXNUZXh0KSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHN3aXRjaCAoY2VsbC5jaGFyYWN0ZXIpIHtcblx0XHRcdGNhc2UgJyonOlxuXHRcdFx0XHRjZWxsLmNoYXJhY3RlciA9ICcmbmJzcDsnO1xuXHRcdFx0XHR0aGlzLnNjb3JlKys7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnTyc6XG5cdFx0XHRcdHZhciBudW1iZXJPZlBpZWNlcztcblx0XHRcdFx0c3dpdGNoICh0aGlzLnNjb3JlKSB7XG5cdFx0XHRcdFx0Y2FzZSAwOlxuXHRcdFx0XHRcdFx0bnVtYmVyT2ZQaWVjZXMgPSAnbm8nO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHRcdFx0bnVtYmVyT2ZQaWVjZXMgPSAnYSBwaWVjZSBvZic7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0bnVtYmVyT2ZQaWVjZXMgPSB0aGlzLnNjb3JlICsgJyBwaWVjZXMgb2YnO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuaXNEb25lID0gdHJ1ZTtcblx0XHRcdFx0dGhpcy5mb3JnZXRDb2x1bW4oKTtcblx0XHRcdFx0aWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKXtcblx0XHRcdFx0XHR3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHdpbmRvdy5hbGVydCgnZ2V0ICcgKyBudW1iZXJPZlBpZWNlcyArICcgY2FrZScpO1xuXHRcdFx0XHRcdFx0Y29tbWFuZHNbJ2xvYWQgY2hhbWJlciddKE51bWJlcih3aW5kb3cubG9jYWxTdG9yYWdlLmNoYW1iZXIpICsgMSk7XG5cdFx0XHRcdFx0fSwgMCk7IFxuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXG5cdFx0fVxuXHR9LFxuXG5cdHJlbWVtYmVyQ29sdW1uOiBmdW5jdGlvbigpIHtcblx0XHRpZiAoIXRoaXMucmVtZW1iZXJlZENvbHVtbikge1xuXHRcdFx0dGhpcy5yZW1lbWJlcmVkQ29sdW1uID0gdGhpcy5jb2x1bW47XG5cdFx0fVxuXHR9LFxuXG5cdGZvcmdldENvbHVtbjogZnVuY3Rpb24oKSB7XG5cdFx0ZGVsZXRlIHRoaXMucmVtZW1iZXJlZENvbHVtbjtcblx0fSxcblxuXHRzYXZlOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnNhdmVkQ29sdW1uID0gdGhpcy5jb2x1bW47XG5cdFx0dGhpcy5zYXZlZFJvdyA9IHRoaXMucm93O1xuXHR9LFxuXHRyZXN0b3JlOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmNvbHVtbiA9IHRoaXMuc2F2ZWRDb2x1bW47XG5cdFx0dGhpcy5yb3cgPSB0aGlzLnNhdmVkUm93O1xuXHR9XG59OyIsInZhciBtYXRyaXhEZWNvcmF0b3IgPSByZXF1aXJlKCcuL21hdHJpeC1kZWNvcmF0b3IuanMnKSxcblx0Y3Vyc29yID0gcmVxdWlyZSgnLi9jdXJzb3IuanMnKTtcblxudmFyIHNjZW5lID0gT2JqZWN0LmNyZWF0ZShtYXRyaXhEZWNvcmF0b3IpO1xuXG5zY2VuZS5pbml0aWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMucmVwbGFjZUNoYXJhY3RlcnNXaXRoQ2VsbHMoKTtcblx0dGhpcy5tYXJrVGV4dCgpO1xuXHR0aGlzLm1hcmtMYXplcnMoKTtcblx0dGhpcy5tYXJrQ3Vyc29yKCk7XG59O1xuXG5zY2VuZS5yZXBsYWNlQ2hhcmFjdGVyc1dpdGhDZWxscyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgc2NlbmUgPSB0aGlzO1xuXHRzY2VuZS5tYXRyaXggPSBzY2VuZS5tYXAoZnVuY3Rpb24oY2hhcmFjdGVyLCByb3csIGNvbHVtbikge1xuXHRcdGlmIChjaGFyYWN0ZXIgPT09ICdAJykge1xuXHRcdFx0c2NlbmUuc3Bhd25Qb3NpdGlvbiA9IHtcblx0XHRcdFx0cm93OiByb3csXG5cdFx0XHRcdGNvbHVtbjogY29sdW1uXG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiB7XG5cdFx0XHRyb3c6IHJvdyxcblx0XHRcdGNvbHVtbjogY29sdW1uLFxuXHRcdFx0aXNVbmRlckN1cnNvcjogY2hhcmFjdGVyID09PSAnQCcsXG5cdFx0XHRjaGFyYWN0ZXI6IFsnQCddLmluZGV4T2YoY2hhcmFjdGVyKSAhPT0gLTEgPyAnICcgOiBjaGFyYWN0ZXIsXG5cdFx0XHRpc1dhbGw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gWycrJywgJy0nLCAnfCddLmluZGV4T2YoY2hhcmFjdGVyKSAhPT0gLTEgJiYgIXRoaXMuaXNUZXh0O1xuXHRcdFx0fSxcblx0XHRcdGlzTGF6ZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gWydWJywgJ14nLCAnPicsICc8J10uaW5kZXhPZihjaGFyYWN0ZXIpICE9PSAtMSAmJiAhdGhpcy5pc1RleHQ7XG5cdFx0XHR9LFxuXHRcdFx0aXNCbG9ja2luZzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLmlzV2FsbCgpIHx8IHRoaXMuaXNMYXplcigpIHx8IHRoaXMuaXNWZXJ0aWNhbExhemVyQmVhbSB8fCB0aGlzLmlzSG9yaXpvbnRhbExhemVyQmVhbTtcblx0XHRcdH0sXG5cdFx0XHR0b1N0cmluZzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiAnPHNwYW4gIGNsYXNzPVwiJyArIFxuXHRcdFx0XHQodGhpcy5pc1VuZGVyQ3Vyc29yID8gJyBjdXJzb3InIDogJycpICtcblx0XHRcdFx0KHRoaXMuaXNUZXh0ID8gJyB0ZXh0JyA6ICcnKSArXG5cdFx0XHRcdCh0aGlzLmlzVmVydGljYWxMYXplckJlYW0gPyAnIHZlcnRpY2FsLWxhemVyLWJlYW0nIDogJycpICtcblx0XHRcdFx0KHRoaXMuaXNIb3Jpem9udGFsTGF6ZXJCZWFtID8gJyBob3Jpem9udGFsLWxhemVyLWJlYW0nIDogJycpICtcblx0XHRcdFx0ICdcIj4nICsgdGhpcy5jaGFyYWN0ZXIgKyAnPC9zcGFuPic7XG5cdFx0XHR9XG5cdFx0fTtcblx0fSwgc2NlbmUpO1xufTtcblxuc2NlbmUubWFya0N1cnNvciA9IGZ1bmN0aW9uKCkge1xuXHRjdXJzb3IuY29sdW1uID0gdGhpcy5zcGF3blBvc2l0aW9uLmNvbHVtbjtcblx0Y3Vyc29yLnJvdyA9IHRoaXMuc3Bhd25Qb3NpdGlvbi5yb3c7XG5cdGN1cnNvci5pc0RvbmUgPSBmYWxzZTtcbn07XG5cbnNjZW5lLm1hcmtUZXh0ID0gZnVuY3Rpb24oKSB7XG5cdHZhciBpc1NlcXVlbmNlT2ZUZXh0SW5Qcm9ncmVzcyA9IGZhbHNlLFxuXHRsYXN0Q2VsbEluU2VxdWVuY2U7XG5cdHRoaXMubWF0cml4ID0gdGhpcy5tYXAoZnVuY3Rpb24oY2VsbCwgcm93LCBjb2x1bW4pIHtcblx0XHRpZiAoaXNTZXF1ZW5jZU9mVGV4dEluUHJvZ3Jlc3MpIHtcblx0XHRcdGlmIChjZWxsLmNoYXJhY3RlciA9PT0gJ2AnKSB7XG5cdFx0XHRcdGlzU2VxdWVuY2VPZlRleHRJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHRcdGxhc3RDZWxsSW5TZXF1ZW5jZSA9IHNjZW5lLm1hdHJpeFtyb3ddW2NvbHVtbiAtIDFdO1xuXHRcdFx0XHRjZWxsLmNoYXJhY3RlciA9ICcgJztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNlbGwuaXNUZXh0ID0gdHJ1ZTtcblx0XHRcdFx0aWYgKGxhc3RDZWxsSW5TZXF1ZW5jZSkge1xuXHRcdFx0XHRcdGlmIChNYXRoLmFicyhsYXN0Q2VsbEluU2VxdWVuY2Uucm93IC0gY2VsbC5yb3cpID09PSAxKSB7XG5cdFx0XHRcdFx0XHRjZWxsLnByZXZpb3VzVGV4dENlbGwgPSBsYXN0Q2VsbEluU2VxdWVuY2U7XG5cdFx0XHRcdFx0XHRsYXN0Q2VsbEluU2VxdWVuY2UubmV4dFRleHRDZWxsID0gY2VsbDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bGFzdENlbGxJblNlcXVlbmNlID0gdW5kZWZpbmVkO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChjZWxsLmNoYXJhY3RlciA9PT0gJ2AnKSB7XG5cdFx0XHRcdGlzU2VxdWVuY2VPZlRleHRJblByb2dyZXNzID0gdHJ1ZTtcblx0XHRcdFx0Y2VsbC5jaGFyYWN0ZXIgPSAnICc7XG5cblx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdH1cblxuXHRcdH1cblx0XHRyZXR1cm4gY2VsbDtcblx0fSk7XG59O1xuXG5zY2VuZS5tYXJrTGF6ZXJzID0gZnVuY3Rpb24oKSB7XG5cdHZhciBtYXRyaXggPSB0aGlzLm1hdHJpeDtcblx0bWF0cml4ID0gdGhpcy5tYXAoZnVuY3Rpb24oY2VsbCwgcm93LCBjb2x1bW4pIHtcblx0XHR2YXIgcHJvcGVydHlOYW1lXG5cdFx0c3dpdGNoIChjZWxsLmNoYXJhY3Rlcikge1xuXHRcdFx0Y2FzZSAnVic6XG5cdFx0XHRcdHJvdysrO1xuXHRcdFx0XHR3aGlsZSAobWF0cml4W3Jvd11bY29sdW1uXS5pc0hvcml6b250YWxMYXplckJlYW0gfHwgIW1hdHJpeFtyb3ddW2NvbHVtbl0uaXNCbG9ja2luZygpKSB7XG5cdFx0XHRcdFx0bWF0cml4W3Jvd11bY29sdW1uXS5pc1ZlcnRpY2FsTGF6ZXJCZWFtID0gdHJ1ZTtcblx0XHRcdFx0XHRyb3crKztcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ14nOlxuXHRcdFx0XHRyb3ctLTtcblx0XHRcdFx0d2hpbGUgKG1hdHJpeFtyb3ddW2NvbHVtbl0uaXNIb3Jpem9udGFsTGF6ZXJCZWFtIHx8ICFtYXRyaXhbcm93XVtjb2x1bW5dLmlzQmxvY2tpbmcoKSkge1xuXHRcdFx0XHRcdG1hdHJpeFtyb3ddW2NvbHVtbl0uaXNWZXJ0aWNhbExhemVyQmVhbSA9IHRydWU7XG5cdFx0XHRcdFx0cm93LS07XG5cdFx0XHRcdH1cblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICc+Jzpcblx0XHRcdFx0Y29sdW1uKys7XG5cdFx0XHRcdHdoaWxlIChtYXRyaXhbcm93XVtjb2x1bW5dLmlzVmVydGljYWxMYXplckJlYW0gfHwgIW1hdHJpeFtyb3ddW2NvbHVtbl0uaXNCbG9ja2luZygpKSB7XG5cdFx0XHRcdFx0bWF0cml4W3Jvd11bY29sdW1uXS5pc0hvcml6b250YWxMYXplckJlYW0gPSB0cnVlO1xuXHRcdFx0XHRcdGNvbHVtbisrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnPCc6XG5cdFx0XHRcdGNvbHVtbi0tO1xuXHRcdFx0XHR3aGlsZSAobWF0cml4W3Jvd11bY29sdW1uXS5pc1ZlcnRpY2FsTGF6ZXJCZWFtIHx8ICFtYXRyaXhbcm93XVtjb2x1bW5dLmlzQmxvY2tpbmcoKSkge1xuXHRcdFx0XHRcdG1hdHJpeFtyb3ddW2NvbHVtbl0uaXNIb3Jpem9udGFsTGF6ZXJCZWFtID0gdHJ1ZTtcblx0XHRcdFx0XHRjb2x1bW4tLTtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cdFx0cmV0dXJuIGNlbGw7XG5cdH0pO1xufTtcblxuc2NlbmUuZ2V0Q3VycmVudENlbGwgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMubWF0cml4W2N1cnNvci5yb3ddW2N1cnNvci5jb2x1bW5dO1xufTtcblxuc2NlbmUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG5cdHZhciBlbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NjZW5lJyk7XG5cdGVsZW1lbnQuaW5uZXJIVE1MID0gc2NlbmUubWF0cml4Lm1hcChmdW5jdGlvbihhcnJheSkge1xuXHRcdHJldHVybiBhcnJheS5qb2luKCcnKTtcblx0fSkuam9pbignPGJyPicpO1xufTtcblxuc2NlbmUudG9nZ2xlQ3Vyc29yID0gZnVuY3Rpb24oKSB7XG5cdHZhciBjZWxsID0gc2NlbmUubWF0cml4W2N1cnNvci5yb3ddW2N1cnNvci5jb2x1bW5dO1xuXHRjZWxsLmlzVW5kZXJDdXJzb3IgPSAhY2VsbC5pc1VuZGVyQ3Vyc29yO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzY2VuZTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0ZnJvbUFycmF5T2ZTdHJpbmdzOiBmdW5jdGlvbiAoYXJyYXlPZlN0cmluZ3MpIHtcblx0XHR0aGlzLm1hdHJpeCA9IGFycmF5T2ZTdHJpbmdzLm1hcChmdW5jdGlvbihzdHJpbmcpIHtcblx0XHRcdHJldHVybiBzdHJpbmcuc3BsaXQoJycpO1xuXHRcdH0pO1xuXHR9LFxuXHRtYXA6IGZ1bmN0aW9uKGZuKSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0cml4Lm1hcChmdW5jdGlvbihhcnJheSwgcm93KSB7XG5cdFx0XHRyZXR1cm4gYXJyYXkubWFwKGZ1bmN0aW9uKGl0ZW0sIGNvbHVtbikge1xuXHRcdFx0XHRyZXR1cm4gZm4oaXRlbSwgcm93LCBjb2x1bW4pO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0sXG5cdGdldENvb3JkaW5hdGVzT2Y6IGZ1bmN0aW9uICh0aGluZ1RvRmluZCkge1xuXHRcdHZhciBwcmVkaWNhdGU7XG5cdFx0aWYgKHR5cGVvZiB0aGluZ1RvRmluZCA9PT0gJ3N0cmluZycpIHtcblx0XHRcdHByZWRpY2F0ZSA9IGZ1bmN0aW9uKHN0cmluZywgYW5vdGhlclN0cmluZykge1xuXHRcdFx0XHRyZXR1cm4gc3RyaW5nID09PSBhbm90aGVyU3RyaW5nO1xuXHRcdFx0fTtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiB0aGluZ1RvRmluZCA9PT0gJ29iamVjdCcpIHtcblx0XHRcdHByZWRpY2F0ZSA9IGZ1bmN0aW9uKHRoaW5nVG9GaW5kLCBhbm90aGVyT2JqZWN0KSB7XG5cdFx0XHRcdHJldHVybiBPYmplY3Qua2V5cyh0aGluZ1RvRmluZCkuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRcdHJldHVybiB0aGluZ1RvRmluZFtrZXldICE9PSBhbm90aGVyT2JqZWN0W2tleV07XG5cdFx0XHRcdH0pLmxlbmd0aCA9PT0gMDtcblxuXHRcdFx0fTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMubWF0cml4LnJlZHVjZShmdW5jdGlvbihmb3VuZCwgYXJyYXksIHJvdykge1xuXHRcdFx0YXJyYXkuZm9yRWFjaChmdW5jdGlvbihjZWxsLCBjb2x1bW4pIHtcblx0XHRcdFx0aWYgKHByZWRpY2F0ZSh0aGluZ1RvRmluZCwgY2VsbCkpIHtcblx0XHRcdFx0XHRmb3VuZC5wdXNoKHtcblx0XHRcdFx0XHRcdHJvdzogcm93LFxuXHRcdFx0XHRcdFx0Y29sdW1uOiBjb2x1bW5cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gZm91bmQ7XG5cdFx0fSwgW10pO1xuXHR9XG59OyJdfQ==
