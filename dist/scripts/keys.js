(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var commands = require('./commands.js'),
	newLineCharacter = String.fromCharCode(13);

var commandLine = {
	isActive: false,
	commands: commands,
	activate: function() {
		this.isActive = true;
		this.element.focus();
		this.value = ':';
	},
	input: function(character) {
		if (character === newLineCharacter) {
			this.execute();
			this.clear();
		}
	},
	execute: function() {
		var givenCommand = this.element.value.slice(1);
		Object.keys(this.commands).every(function(key) {
			var matches = givenCommand.match(new RegExp(key));
			if (!matches) {
				return true;
			}
			commands[key].apply(this, matches.slice(1));
		});
	},
	clear: function() {
		this.isActive = false;
		this.element.blur();
		this.element.value = '';
	}
};

if (typeof window !== 'undefined') {
	commandLine.element = window.document.querySelector('#command-line');

	commandLine.element.addEventListener('blur', function(e) {
		if (commandLine.isActive) {
			commandLine.element.focus();
		}
	});
}



module.exports = commandLine;
},{"./commands.js":2}],2:[function(require,module,exports){
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
},{}],3:[function(require,module,exports){
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
},{"./commands.js":2}],4:[function(require,module,exports){
var lib = require('./lib.js'),
	commandLine = require('./command-line.js');

var keys = {
	'h': function() {
		lib['move horizontally']({
			direction: 'left'
		});
	},
	'l': function() {
		lib['move horizontally']({
			direction: 'right'
		});
	},
	'k': function() {
		lib['move vertically']({
			direction: 'up'
		});
	},
	'j': function() {
		lib['move vertically']({
			direction: 'down'
		});
	},
	':': function() {
		commandLine.activate();
	},
	'w': function() {
		lib['move by word']({
			direction: 'forward',
			to: 'beginning'
		});
	},
	'e': function() {
		lib['move by word']({
			direction: 'forward',
			to: 'ending'
		});
	},
	'b': function() {
		lib['move by word']({
			direction: 'backward',
			to: 'beginning'
		});
	}
};

module.exports = {};

Object.keys(keys).map(function(key) {
	module.exports[key] = function(numberOfTimes) {
		numberOfTimes = numberOfTimes || 1;
		while (numberOfTimes > 0) {
			keys[key]();
			numberOfTimes--;
		}
	}
})
},{"./command-line.js":1,"./lib.js":5}],5:[function(require,module,exports){
var scene = require('./scene.js'),
	cursor = require('./cursor.js');



module.exports = {
	'move horizontally': function(options) {
		var matrix = scene.matrix;
		var _column = cursor.column + (options.direction === 'left' ? -1 : 1);

		if (!matrix[cursor.row][_column].isBlocking()) {
			cursor.column = _column;
			cursor.forgetColumn();
		}
	},
	'move vertically': function(options) {
		var matrix = scene.matrix;
		cursor.save();
		cursor.rememberColumn();
		var stepsAside = 0,
			sign = options.direction === 'up' ? -1 : 1;
		if (!matrix[cursor.row + 1 * sign][cursor.column].isWall()) {
			while (!matrix[cursor.row + 1 * sign][cursor.column + stepsAside + 1].isWall() &&
			 cursor.column + stepsAside < cursor.rememberedColumn) {
				stepsAside++;
			}
			cursor.column += stepsAside;
			cursor.row += 1 * sign;
		} else {
			while (!matrix[cursor.row][cursor.column + stepsAside].isBlocking()) {
				if (!matrix[cursor.row + 1 * sign][cursor.column + stepsAside].isBlocking()) {
					cursor.row += 1 * sign;
					cursor.column += stepsAside;
					break;
				} else {
					stepsAside--;
				}
			}
		}
		if (matrix[cursor.row][cursor.column].isBlocking()) {
			cursor.restore();
		}
	},
	'move by word': function(options) {
		if (!scene.getCurrentCell().isText) {
			return;
		}
		var moveToNextChar, isLastCharacter;
		cursor.save();
		
		if (options.direction === 'forward') {
			moveToNextChar = moveOneCharacterForward;
			isLastCharacter = isEndOfFile;
			if (!isWhiteSpaceCharacter() && isLastCharacterInWord()) {
				moveOneCharacterForward();
			}
		} else {
			moveToNextChar = moveOneCharacterBackward;
			isLastCharacter = isBeginningOfFile;
			if (!isWhiteSpaceCharacter() && isFirstCharacterInWord()) {
				moveOneCharacterBackward();
			}
		}

		if (isWhiteSpaceCharacter()) {
			toEndOfWhiteSpaceSequence(moveToNextChar, isLastCharacter);
			if (options.direction === 'forward' && options.to === 'ending') {
				toEndOfNonWhiteSpaceSequence(moveToNextChar, isLastCharacter);
				if (!scene.getCurrentCell().isEndOfFile) {
					moveOneCharacterBackward();
				}
				
			} else if (options.direction === 'backward' && options.to === 'beginning') {
				toEndOfNonWhiteSpaceSequence(moveToNextChar, isLastCharacter);
				
				if (!scene.getCurrentCell().isBeginningOfFile) {
					moveOneCharacterForward();
				}
			}
		} else {

			if (options.direction === 'forward' && options.to === 'ending') {
				toEndOfNonWhiteSpaceSequence(moveToNextChar, isLastCharacter);
				if (!scene.getCurrentCell().isEndOfFile) {
					moveOneCharacterBackward();
				}
			} else if (options.direction === 'forward' && options.to === 'beginning') {
				toEndOfNonWhiteSpaceSequence(moveToNextChar, isLastCharacter);
				toEndOfWhiteSpaceSequence(moveToNextChar, isLastCharacter);
			} else if (options.direction === 'backward' && options.to === 'beginning') {
				toEndOfNonWhiteSpaceSequence(moveToNextChar, isLastCharacter);
				if (!scene.getCurrentCell().isBeginningOfFile) {
					moveOneCharacterForward();
				}
			}
		}
		if (scene.matrix[cursor.row][cursor.column].isBlocking()) {
			cursor.restore();
		}
	}
};


function getCurrentCharacter() {
	return scene.getCurrentCell().character;
}

function isWordCharacter(character) {
	return /[A-Za-z_0-9]/.test(character || getCurrentCharacter());
}

function isWhiteSpaceCharacter(character) {
	return /\s/.test(character || getCurrentCharacter());
}

function isOtherCharacter(character) {
	return /[^A-Za-z_0-9\s]/.test(character || getCurrentCharacter());
}

function isEndOfFile() {
	return scene.getCurrentCell().isEndOfFile;
}

function isBeginningOfFile() {
	return scene.getCurrentCell().isBeginningOfFile;
}

function toEndOfNonWhiteSpaceSequence(moveToNextCharacter, isLastCharacter) {
	if (isWordCharacter()) {
		while (isWordCharacter() && !isLastCharacter()) {
			moveToNextCharacter();
		}
	} else {
		while (isOtherCharacter() && !isLastCharacter()) {
			moveToNextCharacter();
		}
	}
}

function toEndOfWhiteSpaceSequence(moveToNextCharacter, isLastCharacter) {
	while (isWhiteSpaceCharacter() && !isLastCharacter()) {
		moveToNextCharacter();
	}
}

function moveOneCharacterBackward () {
	var previousTextCell = scene.getCurrentCell().previousTextCell;
	if (previousTextCell) {
		cursor.column = previousTextCell.column;
		cursor.row = previousTextCell.row;
	} else if (scene.matrix[cursor.row][cursor.column - 1].isText) {
		cursor.column--;
	} else {
		scene.matrix[cursor.row][cursor.column].isBeginningOfFile = true;
	}
}

function moveOneCharacterForward() {
	var nextTextCell = scene.matrix[cursor.row][cursor.column].nextTextCell;
	if (nextTextCell) {
		cursor.column = nextTextCell.column;
		cursor.row = nextTextCell.row;
	} else {
		if (scene.matrix[cursor.row][cursor.column + 1].isText) {
			cursor.column++;
		} else {
			scene.matrix[cursor.row][cursor.column].isEndOfFile = true;
		}
	}
}

function isLastCharacterInWord () {
	var predicate = isWordCharacter() ? isWordCharacter : isOtherCharacter;

	var nextTextCell = scene.getCurrentCell().nextTextCell;
	if (nextTextCell) {
		return !predicate(nextTextCell.character)
	}

	return !predicate(scene.matrix[cursor.row][cursor.column + 1].character);
}

function isFirstCharacterInWord () {
	var predicate = isWordCharacter() ? isWordCharacter : isOtherCharacter;

	var previousTextCell = scene.getCurrentCell().previousTextCell;
	if (previousTextCell) {
		return !predicate(previousTextCell.character)
	}

	return !predicate(scene.matrix[cursor.row][cursor.column - 1].character);
}
},{"./cursor.js":3,"./scene.js":7}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
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
},{"./cursor.js":3,"./matrix-decorator.js":6}]},{},[4])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NvbW1hbmQtbGluZS5qcyIsIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9zcmMvY29tbWFuZHMuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2N1cnNvci5qcyIsIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9zcmMvZmFrZV8zZGE4N2ZmZi5qcyIsIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9zcmMvbGliLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9tYXRyaXgtZGVjb3JhdG9yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9zY2VuZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBjb21tYW5kcyA9IHJlcXVpcmUoJy4vY29tbWFuZHMuanMnKSxcblx0bmV3TGluZUNoYXJhY3RlciA9IFN0cmluZy5mcm9tQ2hhckNvZGUoMTMpO1xuXG52YXIgY29tbWFuZExpbmUgPSB7XG5cdGlzQWN0aXZlOiBmYWxzZSxcblx0Y29tbWFuZHM6IGNvbW1hbmRzLFxuXHRhY3RpdmF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5pc0FjdGl2ZSA9IHRydWU7XG5cdFx0dGhpcy5lbGVtZW50LmZvY3VzKCk7XG5cdFx0dGhpcy52YWx1ZSA9ICc6Jztcblx0fSxcblx0aW5wdXQ6IGZ1bmN0aW9uKGNoYXJhY3Rlcikge1xuXHRcdGlmIChjaGFyYWN0ZXIgPT09IG5ld0xpbmVDaGFyYWN0ZXIpIHtcblx0XHRcdHRoaXMuZXhlY3V0ZSgpO1xuXHRcdFx0dGhpcy5jbGVhcigpO1xuXHRcdH1cblx0fSxcblx0ZXhlY3V0ZTogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGdpdmVuQ29tbWFuZCA9IHRoaXMuZWxlbWVudC52YWx1ZS5zbGljZSgxKTtcblx0XHRPYmplY3Qua2V5cyh0aGlzLmNvbW1hbmRzKS5ldmVyeShmdW5jdGlvbihrZXkpIHtcblx0XHRcdHZhciBtYXRjaGVzID0gZ2l2ZW5Db21tYW5kLm1hdGNoKG5ldyBSZWdFeHAoa2V5KSk7XG5cdFx0XHRpZiAoIW1hdGNoZXMpIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0XHRjb21tYW5kc1trZXldLmFwcGx5KHRoaXMsIG1hdGNoZXMuc2xpY2UoMSkpO1xuXHRcdH0pO1xuXHR9LFxuXHRjbGVhcjogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuXHRcdHRoaXMuZWxlbWVudC5ibHVyKCk7XG5cdFx0dGhpcy5lbGVtZW50LnZhbHVlID0gJyc7XG5cdH1cbn07XG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuXHRjb21tYW5kTGluZS5lbGVtZW50ID0gd2luZG93LmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNjb21tYW5kLWxpbmUnKTtcblxuXHRjb21tYW5kTGluZS5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCBmdW5jdGlvbihlKSB7XG5cdFx0aWYgKGNvbW1hbmRMaW5lLmlzQWN0aXZlKSB7XG5cdFx0XHRjb21tYW5kTGluZS5lbGVtZW50LmZvY3VzKCk7XG5cdFx0fVxuXHR9KTtcbn1cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gY29tbWFuZExpbmU7IiwidmFyIGNvbW1hbmRzID0ge30sIG1haW5GdW5jdGlvbjtcbm1vZHVsZS5leHBvcnRzID0gY29tbWFuZHM7XG5cbmNvbW1hbmRzWydjaGFtYmVyIChcXFxcZCspJ10gPSBmdW5jdGlvbihjaGFtYmVyTnVtYmVyKSB7XG5cdHZhciB4bWxodHRwID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdHhtbGh0dHAub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHhtbGh0dHAucmVhZHlTdGF0ZSA9PT0gNCkge1xuXHRcdFx0aWYgKHhtbGh0dHAuc3RhdHVzID09PSAyMDApIHtcblx0XHRcdFx0aWYgKHdpbmRvdykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhbFN0b3JhZ2UuY2hhbWJlciA9IGNoYW1iZXJOdW1iZXI7XG5cdFx0XHRcdH1cblx0XHRcdFx0bWFpbkZ1bmN0aW9uKEpTT04ucGFyc2UoeG1saHR0cC5yZXNwb25zZVRleHQpKTtcblx0XHRcdH0gZWxzZSBpZiAoeG1saHR0cC5zdGF0dXMgPT09IDQwNCkge1xuXHRcdFx0XHR3aW5kb3cuYWxlcnQoJ091dCBvZiBjaGFtYmVycycpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0d2luZG93LmFsZXJ0KHhtbGh0dHAuc3RhdHVzKTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0Y2hhbWJlck51bWJlciA9IGNoYW1iZXJOdW1iZXIgfHwgMDtcblxuXHRpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRjaGFtYmVyTnVtYmVyID0gY2hhbWJlck51bWJlciB8fCB3aW5kb3cubG9jYWxTdG9yYWdlLmNoYW1iZXIgfHwgMDtcblx0fVxuXHR4bWxodHRwLm9wZW4oJ0dFVCcsICcuL2NoYW1iZXJzLycgKyBjaGFtYmVyTnVtYmVyICsgJy5qc29uJywgdHJ1ZSk7XG5cdHhtbGh0dHAuc2VuZCgpO1xufTtcblxuY29tbWFuZHNbJ2xvYWQgY2hhbWJlciddID0gY29tbWFuZHNbJ2NoYW1iZXIgKFxcXFxkKyknXTtcblxuY29tbWFuZHNbJ2luaXRpYWxpemUgY2hhbWJlciddID0gZnVuY3Rpb24obWFpbikge1xuXHRtYWluRnVuY3Rpb24gPSBtYWluO1xuXHRjb21tYW5kc1snY2hhbWJlciAoXFxcXGQrKSddKCk7XG59ICIsInZhciBjb21tYW5kcyA9IHJlcXVpcmUoJy4vY29tbWFuZHMuanMnKTtcbm1vZHVsZS5leHBvcnRzID0ge1xuXHRzY29yZTogMCxcblx0cmVhY3RPbkN1cnJlbnRDZWxsT25TY2VuZTogZnVuY3Rpb24oc2NlbmUpIHtcblx0XHR2YXIgY2VsbCA9IHNjZW5lLmdldEN1cnJlbnRDZWxsKHRoaXMpO1xuXHRcdGlmIChjZWxsLmlzVGV4dCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRzd2l0Y2ggKGNlbGwuY2hhcmFjdGVyKSB7XG5cdFx0XHRjYXNlICcqJzpcblx0XHRcdFx0Y2VsbC5jaGFyYWN0ZXIgPSAnJm5ic3A7Jztcblx0XHRcdFx0dGhpcy5zY29yZSsrO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ08nOlxuXHRcdFx0XHR2YXIgbnVtYmVyT2ZQaWVjZXM7XG5cdFx0XHRcdHN3aXRjaCAodGhpcy5zY29yZSkge1xuXHRcdFx0XHRcdGNhc2UgMDpcblx0XHRcdFx0XHRcdG51bWJlck9mUGllY2VzID0gJ25vJztcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgMTpcblx0XHRcdFx0XHRcdG51bWJlck9mUGllY2VzID0gJ2EgcGllY2Ugb2YnO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdG51bWJlck9mUGllY2VzID0gdGhpcy5zY29yZSArICcgcGllY2VzIG9mJztcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLmlzRG9uZSA9IHRydWU7XG5cdFx0XHRcdHRoaXMuZm9yZ2V0Q29sdW1uKCk7XG5cdFx0XHRcdGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyl7XG5cdFx0XHRcdFx0d2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHR3aW5kb3cuYWxlcnQoJ2dldCAnICsgbnVtYmVyT2ZQaWVjZXMgKyAnIGNha2UnKTtcblx0XHRcdFx0XHRcdGNvbW1hbmRzWydsb2FkIGNoYW1iZXInXShOdW1iZXIod2luZG93LmxvY2FsU3RvcmFnZS5jaGFtYmVyKSArIDEpO1xuXHRcdFx0XHRcdH0sIDApOyBcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblxuXHRcdH1cblx0fSxcblxuXHRyZW1lbWJlckNvbHVtbjogZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCF0aGlzLnJlbWVtYmVyZWRDb2x1bW4pIHtcblx0XHRcdHRoaXMucmVtZW1iZXJlZENvbHVtbiA9IHRoaXMuY29sdW1uO1xuXHRcdH1cblx0fSxcblxuXHRmb3JnZXRDb2x1bW46IGZ1bmN0aW9uKCkge1xuXHRcdGRlbGV0ZSB0aGlzLnJlbWVtYmVyZWRDb2x1bW47XG5cdH0sXG5cblx0c2F2ZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5zYXZlZENvbHVtbiA9IHRoaXMuY29sdW1uO1xuXHRcdHRoaXMuc2F2ZWRSb3cgPSB0aGlzLnJvdztcblx0fSxcblx0cmVzdG9yZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5jb2x1bW4gPSB0aGlzLnNhdmVkQ29sdW1uO1xuXHRcdHRoaXMucm93ID0gdGhpcy5zYXZlZFJvdztcblx0fVxufTsiLCJ2YXIgbGliID0gcmVxdWlyZSgnLi9saWIuanMnKSxcblx0Y29tbWFuZExpbmUgPSByZXF1aXJlKCcuL2NvbW1hbmQtbGluZS5qcycpO1xuXG52YXIga2V5cyA9IHtcblx0J2gnOiBmdW5jdGlvbigpIHtcblx0XHRsaWJbJ21vdmUgaG9yaXpvbnRhbGx5J10oe1xuXHRcdFx0ZGlyZWN0aW9uOiAnbGVmdCdcblx0XHR9KTtcblx0fSxcblx0J2wnOiBmdW5jdGlvbigpIHtcblx0XHRsaWJbJ21vdmUgaG9yaXpvbnRhbGx5J10oe1xuXHRcdFx0ZGlyZWN0aW9uOiAncmlnaHQnXG5cdFx0fSk7XG5cdH0sXG5cdCdrJzogZnVuY3Rpb24oKSB7XG5cdFx0bGliWydtb3ZlIHZlcnRpY2FsbHknXSh7XG5cdFx0XHRkaXJlY3Rpb246ICd1cCdcblx0XHR9KTtcblx0fSxcblx0J2onOiBmdW5jdGlvbigpIHtcblx0XHRsaWJbJ21vdmUgdmVydGljYWxseSddKHtcblx0XHRcdGRpcmVjdGlvbjogJ2Rvd24nXG5cdFx0fSk7XG5cdH0sXG5cdCc6JzogZnVuY3Rpb24oKSB7XG5cdFx0Y29tbWFuZExpbmUuYWN0aXZhdGUoKTtcblx0fSxcblx0J3cnOiBmdW5jdGlvbigpIHtcblx0XHRsaWJbJ21vdmUgYnkgd29yZCddKHtcblx0XHRcdGRpcmVjdGlvbjogJ2ZvcndhcmQnLFxuXHRcdFx0dG86ICdiZWdpbm5pbmcnXG5cdFx0fSk7XG5cdH0sXG5cdCdlJzogZnVuY3Rpb24oKSB7XG5cdFx0bGliWydtb3ZlIGJ5IHdvcmQnXSh7XG5cdFx0XHRkaXJlY3Rpb246ICdmb3J3YXJkJyxcblx0XHRcdHRvOiAnZW5kaW5nJ1xuXHRcdH0pO1xuXHR9LFxuXHQnYic6IGZ1bmN0aW9uKCkge1xuXHRcdGxpYlsnbW92ZSBieSB3b3JkJ10oe1xuXHRcdFx0ZGlyZWN0aW9uOiAnYmFja3dhcmQnLFxuXHRcdFx0dG86ICdiZWdpbm5pbmcnXG5cdFx0fSk7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge307XG5cbk9iamVjdC5rZXlzKGtleXMpLm1hcChmdW5jdGlvbihrZXkpIHtcblx0bW9kdWxlLmV4cG9ydHNba2V5XSA9IGZ1bmN0aW9uKG51bWJlck9mVGltZXMpIHtcblx0XHRudW1iZXJPZlRpbWVzID0gbnVtYmVyT2ZUaW1lcyB8fCAxO1xuXHRcdHdoaWxlIChudW1iZXJPZlRpbWVzID4gMCkge1xuXHRcdFx0a2V5c1trZXldKCk7XG5cdFx0XHRudW1iZXJPZlRpbWVzLS07XG5cdFx0fVxuXHR9XG59KSIsInZhciBzY2VuZSA9IHJlcXVpcmUoJy4vc2NlbmUuanMnKSxcblx0Y3Vyc29yID0gcmVxdWlyZSgnLi9jdXJzb3IuanMnKTtcblxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHQnbW92ZSBob3Jpem9udGFsbHknOiBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0dmFyIG1hdHJpeCA9IHNjZW5lLm1hdHJpeDtcblx0XHR2YXIgX2NvbHVtbiA9IGN1cnNvci5jb2x1bW4gKyAob3B0aW9ucy5kaXJlY3Rpb24gPT09ICdsZWZ0JyA/IC0xIDogMSk7XG5cblx0XHRpZiAoIW1hdHJpeFtjdXJzb3Iucm93XVtfY29sdW1uXS5pc0Jsb2NraW5nKCkpIHtcblx0XHRcdGN1cnNvci5jb2x1bW4gPSBfY29sdW1uO1xuXHRcdFx0Y3Vyc29yLmZvcmdldENvbHVtbigpO1xuXHRcdH1cblx0fSxcblx0J21vdmUgdmVydGljYWxseSc6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHR2YXIgbWF0cml4ID0gc2NlbmUubWF0cml4O1xuXHRcdGN1cnNvci5zYXZlKCk7XG5cdFx0Y3Vyc29yLnJlbWVtYmVyQ29sdW1uKCk7XG5cdFx0dmFyIHN0ZXBzQXNpZGUgPSAwLFxuXHRcdFx0c2lnbiA9IG9wdGlvbnMuZGlyZWN0aW9uID09PSAndXAnID8gLTEgOiAxO1xuXHRcdGlmICghbWF0cml4W2N1cnNvci5yb3cgKyAxICogc2lnbl1bY3Vyc29yLmNvbHVtbl0uaXNXYWxsKCkpIHtcblx0XHRcdHdoaWxlICghbWF0cml4W2N1cnNvci5yb3cgKyAxICogc2lnbl1bY3Vyc29yLmNvbHVtbiArIHN0ZXBzQXNpZGUgKyAxXS5pc1dhbGwoKSAmJlxuXHRcdFx0IGN1cnNvci5jb2x1bW4gKyBzdGVwc0FzaWRlIDwgY3Vyc29yLnJlbWVtYmVyZWRDb2x1bW4pIHtcblx0XHRcdFx0c3RlcHNBc2lkZSsrO1xuXHRcdFx0fVxuXHRcdFx0Y3Vyc29yLmNvbHVtbiArPSBzdGVwc0FzaWRlO1xuXHRcdFx0Y3Vyc29yLnJvdyArPSAxICogc2lnbjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0d2hpbGUgKCFtYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbiArIHN0ZXBzQXNpZGVdLmlzQmxvY2tpbmcoKSkge1xuXHRcdFx0XHRpZiAoIW1hdHJpeFtjdXJzb3Iucm93ICsgMSAqIHNpZ25dW2N1cnNvci5jb2x1bW4gKyBzdGVwc0FzaWRlXS5pc0Jsb2NraW5nKCkpIHtcblx0XHRcdFx0XHRjdXJzb3Iucm93ICs9IDEgKiBzaWduO1xuXHRcdFx0XHRcdGN1cnNvci5jb2x1bW4gKz0gc3RlcHNBc2lkZTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRzdGVwc0FzaWRlLS07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKG1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uXS5pc0Jsb2NraW5nKCkpIHtcblx0XHRcdGN1cnNvci5yZXN0b3JlKCk7XG5cdFx0fVxuXHR9LFxuXHQnbW92ZSBieSB3b3JkJzogZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdGlmICghc2NlbmUuZ2V0Q3VycmVudENlbGwoKS5pc1RleHQpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dmFyIG1vdmVUb05leHRDaGFyLCBpc0xhc3RDaGFyYWN0ZXI7XG5cdFx0Y3Vyc29yLnNhdmUoKTtcblx0XHRcblx0XHRpZiAob3B0aW9ucy5kaXJlY3Rpb24gPT09ICdmb3J3YXJkJykge1xuXHRcdFx0bW92ZVRvTmV4dENoYXIgPSBtb3ZlT25lQ2hhcmFjdGVyRm9yd2FyZDtcblx0XHRcdGlzTGFzdENoYXJhY3RlciA9IGlzRW5kT2ZGaWxlO1xuXHRcdFx0aWYgKCFpc1doaXRlU3BhY2VDaGFyYWN0ZXIoKSAmJiBpc0xhc3RDaGFyYWN0ZXJJbldvcmQoKSkge1xuXHRcdFx0XHRtb3ZlT25lQ2hhcmFjdGVyRm9yd2FyZCgpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRtb3ZlVG9OZXh0Q2hhciA9IG1vdmVPbmVDaGFyYWN0ZXJCYWNrd2FyZDtcblx0XHRcdGlzTGFzdENoYXJhY3RlciA9IGlzQmVnaW5uaW5nT2ZGaWxlO1xuXHRcdFx0aWYgKCFpc1doaXRlU3BhY2VDaGFyYWN0ZXIoKSAmJiBpc0ZpcnN0Q2hhcmFjdGVySW5Xb3JkKCkpIHtcblx0XHRcdFx0bW92ZU9uZUNoYXJhY3RlckJhY2t3YXJkKCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGlzV2hpdGVTcGFjZUNoYXJhY3RlcigpKSB7XG5cdFx0XHR0b0VuZE9mV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyLCBpc0xhc3RDaGFyYWN0ZXIpO1xuXHRcdFx0aWYgKG9wdGlvbnMuZGlyZWN0aW9uID09PSAnZm9yd2FyZCcgJiYgb3B0aW9ucy50byA9PT0gJ2VuZGluZycpIHtcblx0XHRcdFx0dG9FbmRPZk5vbldoaXRlU3BhY2VTZXF1ZW5jZShtb3ZlVG9OZXh0Q2hhciwgaXNMYXN0Q2hhcmFjdGVyKTtcblx0XHRcdFx0aWYgKCFzY2VuZS5nZXRDdXJyZW50Q2VsbCgpLmlzRW5kT2ZGaWxlKSB7XG5cdFx0XHRcdFx0bW92ZU9uZUNoYXJhY3RlckJhY2t3YXJkKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHR9IGVsc2UgaWYgKG9wdGlvbnMuZGlyZWN0aW9uID09PSAnYmFja3dhcmQnICYmIG9wdGlvbnMudG8gPT09ICdiZWdpbm5pbmcnKSB7XG5cdFx0XHRcdHRvRW5kT2ZOb25XaGl0ZVNwYWNlU2VxdWVuY2UobW92ZVRvTmV4dENoYXIsIGlzTGFzdENoYXJhY3Rlcik7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoIXNjZW5lLmdldEN1cnJlbnRDZWxsKCkuaXNCZWdpbm5pbmdPZkZpbGUpIHtcblx0XHRcdFx0XHRtb3ZlT25lQ2hhcmFjdGVyRm9yd2FyZCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblxuXHRcdFx0aWYgKG9wdGlvbnMuZGlyZWN0aW9uID09PSAnZm9yd2FyZCcgJiYgb3B0aW9ucy50byA9PT0gJ2VuZGluZycpIHtcblx0XHRcdFx0dG9FbmRPZk5vbldoaXRlU3BhY2VTZXF1ZW5jZShtb3ZlVG9OZXh0Q2hhciwgaXNMYXN0Q2hhcmFjdGVyKTtcblx0XHRcdFx0aWYgKCFzY2VuZS5nZXRDdXJyZW50Q2VsbCgpLmlzRW5kT2ZGaWxlKSB7XG5cdFx0XHRcdFx0bW92ZU9uZUNoYXJhY3RlckJhY2t3YXJkKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAob3B0aW9ucy5kaXJlY3Rpb24gPT09ICdmb3J3YXJkJyAmJiBvcHRpb25zLnRvID09PSAnYmVnaW5uaW5nJykge1xuXHRcdFx0XHR0b0VuZE9mTm9uV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyLCBpc0xhc3RDaGFyYWN0ZXIpO1xuXHRcdFx0XHR0b0VuZE9mV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyLCBpc0xhc3RDaGFyYWN0ZXIpO1xuXHRcdFx0fSBlbHNlIGlmIChvcHRpb25zLmRpcmVjdGlvbiA9PT0gJ2JhY2t3YXJkJyAmJiBvcHRpb25zLnRvID09PSAnYmVnaW5uaW5nJykge1xuXHRcdFx0XHR0b0VuZE9mTm9uV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyLCBpc0xhc3RDaGFyYWN0ZXIpO1xuXHRcdFx0XHRpZiAoIXNjZW5lLmdldEN1cnJlbnRDZWxsKCkuaXNCZWdpbm5pbmdPZkZpbGUpIHtcblx0XHRcdFx0XHRtb3ZlT25lQ2hhcmFjdGVyRm9yd2FyZCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmIChzY2VuZS5tYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbl0uaXNCbG9ja2luZygpKSB7XG5cdFx0XHRjdXJzb3IucmVzdG9yZSgpO1xuXHRcdH1cblx0fVxufTtcblxuXG5mdW5jdGlvbiBnZXRDdXJyZW50Q2hhcmFjdGVyKCkge1xuXHRyZXR1cm4gc2NlbmUuZ2V0Q3VycmVudENlbGwoKS5jaGFyYWN0ZXI7XG59XG5cbmZ1bmN0aW9uIGlzV29yZENoYXJhY3RlcihjaGFyYWN0ZXIpIHtcblx0cmV0dXJuIC9bQS1aYS16XzAtOV0vLnRlc3QoY2hhcmFjdGVyIHx8IGdldEN1cnJlbnRDaGFyYWN0ZXIoKSk7XG59XG5cbmZ1bmN0aW9uIGlzV2hpdGVTcGFjZUNoYXJhY3RlcihjaGFyYWN0ZXIpIHtcblx0cmV0dXJuIC9cXHMvLnRlc3QoY2hhcmFjdGVyIHx8IGdldEN1cnJlbnRDaGFyYWN0ZXIoKSk7XG59XG5cbmZ1bmN0aW9uIGlzT3RoZXJDaGFyYWN0ZXIoY2hhcmFjdGVyKSB7XG5cdHJldHVybiAvW15BLVphLXpfMC05XFxzXS8udGVzdChjaGFyYWN0ZXIgfHwgZ2V0Q3VycmVudENoYXJhY3RlcigpKTtcbn1cblxuZnVuY3Rpb24gaXNFbmRPZkZpbGUoKSB7XG5cdHJldHVybiBzY2VuZS5nZXRDdXJyZW50Q2VsbCgpLmlzRW5kT2ZGaWxlO1xufVxuXG5mdW5jdGlvbiBpc0JlZ2lubmluZ09mRmlsZSgpIHtcblx0cmV0dXJuIHNjZW5lLmdldEN1cnJlbnRDZWxsKCkuaXNCZWdpbm5pbmdPZkZpbGU7XG59XG5cbmZ1bmN0aW9uIHRvRW5kT2ZOb25XaGl0ZVNwYWNlU2VxdWVuY2UobW92ZVRvTmV4dENoYXJhY3RlciwgaXNMYXN0Q2hhcmFjdGVyKSB7XG5cdGlmIChpc1dvcmRDaGFyYWN0ZXIoKSkge1xuXHRcdHdoaWxlIChpc1dvcmRDaGFyYWN0ZXIoKSAmJiAhaXNMYXN0Q2hhcmFjdGVyKCkpIHtcblx0XHRcdG1vdmVUb05leHRDaGFyYWN0ZXIoKTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0d2hpbGUgKGlzT3RoZXJDaGFyYWN0ZXIoKSAmJiAhaXNMYXN0Q2hhcmFjdGVyKCkpIHtcblx0XHRcdG1vdmVUb05leHRDaGFyYWN0ZXIoKTtcblx0XHR9XG5cdH1cbn1cblxuZnVuY3Rpb24gdG9FbmRPZldoaXRlU3BhY2VTZXF1ZW5jZShtb3ZlVG9OZXh0Q2hhcmFjdGVyLCBpc0xhc3RDaGFyYWN0ZXIpIHtcblx0d2hpbGUgKGlzV2hpdGVTcGFjZUNoYXJhY3RlcigpICYmICFpc0xhc3RDaGFyYWN0ZXIoKSkge1xuXHRcdG1vdmVUb05leHRDaGFyYWN0ZXIoKTtcblx0fVxufVxuXG5mdW5jdGlvbiBtb3ZlT25lQ2hhcmFjdGVyQmFja3dhcmQgKCkge1xuXHR2YXIgcHJldmlvdXNUZXh0Q2VsbCA9IHNjZW5lLmdldEN1cnJlbnRDZWxsKCkucHJldmlvdXNUZXh0Q2VsbDtcblx0aWYgKHByZXZpb3VzVGV4dENlbGwpIHtcblx0XHRjdXJzb3IuY29sdW1uID0gcHJldmlvdXNUZXh0Q2VsbC5jb2x1bW47XG5cdFx0Y3Vyc29yLnJvdyA9IHByZXZpb3VzVGV4dENlbGwucm93O1xuXHR9IGVsc2UgaWYgKHNjZW5lLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uIC0gMV0uaXNUZXh0KSB7XG5cdFx0Y3Vyc29yLmNvbHVtbi0tO1xuXHR9IGVsc2Uge1xuXHRcdHNjZW5lLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uXS5pc0JlZ2lubmluZ09mRmlsZSA9IHRydWU7XG5cdH1cbn1cblxuZnVuY3Rpb24gbW92ZU9uZUNoYXJhY3RlckZvcndhcmQoKSB7XG5cdHZhciBuZXh0VGV4dENlbGwgPSBzY2VuZS5tYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbl0ubmV4dFRleHRDZWxsO1xuXHRpZiAobmV4dFRleHRDZWxsKSB7XG5cdFx0Y3Vyc29yLmNvbHVtbiA9IG5leHRUZXh0Q2VsbC5jb2x1bW47XG5cdFx0Y3Vyc29yLnJvdyA9IG5leHRUZXh0Q2VsbC5yb3c7XG5cdH0gZWxzZSB7XG5cdFx0aWYgKHNjZW5lLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uICsgMV0uaXNUZXh0KSB7XG5cdFx0XHRjdXJzb3IuY29sdW1uKys7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNjZW5lLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uXS5pc0VuZE9mRmlsZSA9IHRydWU7XG5cdFx0fVxuXHR9XG59XG5cbmZ1bmN0aW9uIGlzTGFzdENoYXJhY3RlckluV29yZCAoKSB7XG5cdHZhciBwcmVkaWNhdGUgPSBpc1dvcmRDaGFyYWN0ZXIoKSA/IGlzV29yZENoYXJhY3RlciA6IGlzT3RoZXJDaGFyYWN0ZXI7XG5cblx0dmFyIG5leHRUZXh0Q2VsbCA9IHNjZW5lLmdldEN1cnJlbnRDZWxsKCkubmV4dFRleHRDZWxsO1xuXHRpZiAobmV4dFRleHRDZWxsKSB7XG5cdFx0cmV0dXJuICFwcmVkaWNhdGUobmV4dFRleHRDZWxsLmNoYXJhY3Rlcilcblx0fVxuXG5cdHJldHVybiAhcHJlZGljYXRlKHNjZW5lLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uICsgMV0uY2hhcmFjdGVyKTtcbn1cblxuZnVuY3Rpb24gaXNGaXJzdENoYXJhY3RlckluV29yZCAoKSB7XG5cdHZhciBwcmVkaWNhdGUgPSBpc1dvcmRDaGFyYWN0ZXIoKSA/IGlzV29yZENoYXJhY3RlciA6IGlzT3RoZXJDaGFyYWN0ZXI7XG5cblx0dmFyIHByZXZpb3VzVGV4dENlbGwgPSBzY2VuZS5nZXRDdXJyZW50Q2VsbCgpLnByZXZpb3VzVGV4dENlbGw7XG5cdGlmIChwcmV2aW91c1RleHRDZWxsKSB7XG5cdFx0cmV0dXJuICFwcmVkaWNhdGUocHJldmlvdXNUZXh0Q2VsbC5jaGFyYWN0ZXIpXG5cdH1cblxuXHRyZXR1cm4gIXByZWRpY2F0ZShzY2VuZS5tYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbiAtIDFdLmNoYXJhY3Rlcik7XG59IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdGZyb21BcnJheU9mU3RyaW5nczogZnVuY3Rpb24gKGFycmF5T2ZTdHJpbmdzKSB7XG5cdFx0dGhpcy5tYXRyaXggPSBhcnJheU9mU3RyaW5ncy5tYXAoZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gc3RyaW5nLnNwbGl0KCcnKTtcblx0XHR9KTtcblx0fSxcblx0bWFwOiBmdW5jdGlvbihmbikge1xuXHRcdHJldHVybiB0aGlzLm1hdHJpeC5tYXAoZnVuY3Rpb24oYXJyYXksIHJvdykge1xuXHRcdFx0cmV0dXJuIGFycmF5Lm1hcChmdW5jdGlvbihpdGVtLCBjb2x1bW4pIHtcblx0XHRcdFx0cmV0dXJuIGZuKGl0ZW0sIHJvdywgY29sdW1uKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9LFxuXHRnZXRDb29yZGluYXRlc09mOiBmdW5jdGlvbiAodGhpbmdUb0ZpbmQpIHtcblx0XHR2YXIgcHJlZGljYXRlO1xuXHRcdGlmICh0eXBlb2YgdGhpbmdUb0ZpbmQgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRwcmVkaWNhdGUgPSBmdW5jdGlvbihzdHJpbmcsIGFub3RoZXJTdHJpbmcpIHtcblx0XHRcdFx0cmV0dXJuIHN0cmluZyA9PT0gYW5vdGhlclN0cmluZztcblx0XHRcdH07XG5cdFx0fVxuXHRcdGlmICh0eXBlb2YgdGhpbmdUb0ZpbmQgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRwcmVkaWNhdGUgPSBmdW5jdGlvbih0aGluZ1RvRmluZCwgYW5vdGhlck9iamVjdCkge1xuXHRcdFx0XHRyZXR1cm4gT2JqZWN0LmtleXModGhpbmdUb0ZpbmQpLmZpbHRlcihmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpbmdUb0ZpbmRba2V5XSAhPT0gYW5vdGhlck9iamVjdFtrZXldO1xuXHRcdFx0XHR9KS5sZW5ndGggPT09IDA7XG5cblx0XHRcdH07XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLm1hdHJpeC5yZWR1Y2UoZnVuY3Rpb24oZm91bmQsIGFycmF5LCByb3cpIHtcblx0XHRcdGFycmF5LmZvckVhY2goZnVuY3Rpb24oY2VsbCwgY29sdW1uKSB7XG5cdFx0XHRcdGlmIChwcmVkaWNhdGUodGhpbmdUb0ZpbmQsIGNlbGwpKSB7XG5cdFx0XHRcdFx0Zm91bmQucHVzaCh7XG5cdFx0XHRcdFx0XHRyb3c6IHJvdyxcblx0XHRcdFx0XHRcdGNvbHVtbjogY29sdW1uXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGZvdW5kO1xuXHRcdH0sIFtdKTtcblx0fVxufTsiLCJ2YXIgbWF0cml4RGVjb3JhdG9yID0gcmVxdWlyZSgnLi9tYXRyaXgtZGVjb3JhdG9yLmpzJyksXG5cdGN1cnNvciA9IHJlcXVpcmUoJy4vY3Vyc29yLmpzJyk7XG5cbnZhciBzY2VuZSA9IE9iamVjdC5jcmVhdGUobWF0cml4RGVjb3JhdG9yKTtcblxuc2NlbmUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnJlcGxhY2VDaGFyYWN0ZXJzV2l0aENlbGxzKCk7XG5cdHRoaXMubWFya1RleHQoKTtcblx0dGhpcy5tYXJrTGF6ZXJzKCk7XG5cdHRoaXMubWFya0N1cnNvcigpO1xufTtcblxuc2NlbmUucmVwbGFjZUNoYXJhY3RlcnNXaXRoQ2VsbHMgPSBmdW5jdGlvbigpIHtcblx0dmFyIHNjZW5lID0gdGhpcztcblx0c2NlbmUubWF0cml4ID0gc2NlbmUubWFwKGZ1bmN0aW9uKGNoYXJhY3Rlciwgcm93LCBjb2x1bW4pIHtcblx0XHRpZiAoY2hhcmFjdGVyID09PSAnQCcpIHtcblx0XHRcdHNjZW5lLnNwYXduUG9zaXRpb24gPSB7XG5cdFx0XHRcdHJvdzogcm93LFxuXHRcdFx0XHRjb2x1bW46IGNvbHVtblxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4ge1xuXHRcdFx0cm93OiByb3csXG5cdFx0XHRjb2x1bW46IGNvbHVtbixcblx0XHRcdGlzVW5kZXJDdXJzb3I6IGNoYXJhY3RlciA9PT0gJ0AnLFxuXHRcdFx0Y2hhcmFjdGVyOiBbJ0AnXS5pbmRleE9mKGNoYXJhY3RlcikgIT09IC0xID8gJyAnIDogY2hhcmFjdGVyLFxuXHRcdFx0aXNXYWxsOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIFsnKycsICctJywgJ3wnXS5pbmRleE9mKGNoYXJhY3RlcikgIT09IC0xICYmICF0aGlzLmlzVGV4dDtcblx0XHRcdH0sXG5cdFx0XHRpc0xhemVyOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIFsnVicsICdeJywgJz4nLCAnPCddLmluZGV4T2YoY2hhcmFjdGVyKSAhPT0gLTEgJiYgIXRoaXMuaXNUZXh0O1xuXHRcdFx0fSxcblx0XHRcdGlzQmxvY2tpbmc6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5pc1dhbGwoKSB8fCB0aGlzLmlzTGF6ZXIoKSB8fCB0aGlzLmlzVmVydGljYWxMYXplckJlYW0gfHwgdGhpcy5pc0hvcml6b250YWxMYXplckJlYW07XG5cdFx0XHR9LFxuXHRcdFx0dG9TdHJpbmc6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gJzxzcGFuICBjbGFzcz1cIicgKyBcblx0XHRcdFx0KHRoaXMuaXNVbmRlckN1cnNvciA/ICcgY3Vyc29yJyA6ICcnKSArXG5cdFx0XHRcdCh0aGlzLmlzVGV4dCA/ICcgdGV4dCcgOiAnJykgK1xuXHRcdFx0XHQodGhpcy5pc1ZlcnRpY2FsTGF6ZXJCZWFtID8gJyB2ZXJ0aWNhbC1sYXplci1iZWFtJyA6ICcnKSArXG5cdFx0XHRcdCh0aGlzLmlzSG9yaXpvbnRhbExhemVyQmVhbSA/ICcgaG9yaXpvbnRhbC1sYXplci1iZWFtJyA6ICcnKSArXG5cdFx0XHRcdCAnXCI+JyArIHRoaXMuY2hhcmFjdGVyICsgJzwvc3Bhbj4nO1xuXHRcdFx0fVxuXHRcdH07XG5cdH0sIHNjZW5lKTtcbn07XG5cbnNjZW5lLm1hcmtDdXJzb3IgPSBmdW5jdGlvbigpIHtcblx0Y3Vyc29yLmNvbHVtbiA9IHRoaXMuc3Bhd25Qb3NpdGlvbi5jb2x1bW47XG5cdGN1cnNvci5yb3cgPSB0aGlzLnNwYXduUG9zaXRpb24ucm93O1xuXHRjdXJzb3IuaXNEb25lID0gZmFsc2U7XG59O1xuXG5zY2VuZS5tYXJrVGV4dCA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgaXNTZXF1ZW5jZU9mVGV4dEluUHJvZ3Jlc3MgPSBmYWxzZSxcblx0bGFzdENlbGxJblNlcXVlbmNlO1xuXHR0aGlzLm1hdHJpeCA9IHRoaXMubWFwKGZ1bmN0aW9uKGNlbGwsIHJvdywgY29sdW1uKSB7XG5cdFx0aWYgKGlzU2VxdWVuY2VPZlRleHRJblByb2dyZXNzKSB7XG5cdFx0XHRpZiAoY2VsbC5jaGFyYWN0ZXIgPT09ICdgJykge1xuXHRcdFx0XHRpc1NlcXVlbmNlT2ZUZXh0SW5Qcm9ncmVzcyA9IGZhbHNlO1xuXHRcdFx0XHRsYXN0Q2VsbEluU2VxdWVuY2UgPSBzY2VuZS5tYXRyaXhbcm93XVtjb2x1bW4gLSAxXTtcblx0XHRcdFx0Y2VsbC5jaGFyYWN0ZXIgPSAnICc7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjZWxsLmlzVGV4dCA9IHRydWU7XG5cdFx0XHRcdGlmIChsYXN0Q2VsbEluU2VxdWVuY2UpIHtcblx0XHRcdFx0XHRpZiAoTWF0aC5hYnMobGFzdENlbGxJblNlcXVlbmNlLnJvdyAtIGNlbGwucm93KSA9PT0gMSkge1xuXHRcdFx0XHRcdFx0Y2VsbC5wcmV2aW91c1RleHRDZWxsID0gbGFzdENlbGxJblNlcXVlbmNlO1xuXHRcdFx0XHRcdFx0bGFzdENlbGxJblNlcXVlbmNlLm5leHRUZXh0Q2VsbCA9IGNlbGw7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGxhc3RDZWxsSW5TZXF1ZW5jZSA9IHVuZGVmaW5lZDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoY2VsbC5jaGFyYWN0ZXIgPT09ICdgJykge1xuXHRcdFx0XHRpc1NlcXVlbmNlT2ZUZXh0SW5Qcm9ncmVzcyA9IHRydWU7XG5cdFx0XHRcdGNlbGwuY2hhcmFjdGVyID0gJyAnO1xuXG5cdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHR9XG5cblx0XHR9XG5cdFx0cmV0dXJuIGNlbGw7XG5cdH0pO1xufTtcblxuc2NlbmUubWFya0xhemVycyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgbWF0cml4ID0gdGhpcy5tYXRyaXg7XG5cdG1hdHJpeCA9IHRoaXMubWFwKGZ1bmN0aW9uKGNlbGwsIHJvdywgY29sdW1uKSB7XG5cdFx0dmFyIHByb3BlcnR5TmFtZVxuXHRcdHN3aXRjaCAoY2VsbC5jaGFyYWN0ZXIpIHtcblx0XHRcdGNhc2UgJ1YnOlxuXHRcdFx0XHRyb3crKztcblx0XHRcdFx0d2hpbGUgKG1hdHJpeFtyb3ddW2NvbHVtbl0uaXNIb3Jpem9udGFsTGF6ZXJCZWFtIHx8ICFtYXRyaXhbcm93XVtjb2x1bW5dLmlzQmxvY2tpbmcoKSkge1xuXHRcdFx0XHRcdG1hdHJpeFtyb3ddW2NvbHVtbl0uaXNWZXJ0aWNhbExhemVyQmVhbSA9IHRydWU7XG5cdFx0XHRcdFx0cm93Kys7XG5cdFx0XHRcdH1cblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdeJzpcblx0XHRcdFx0cm93LS07XG5cdFx0XHRcdHdoaWxlIChtYXRyaXhbcm93XVtjb2x1bW5dLmlzSG9yaXpvbnRhbExhemVyQmVhbSB8fCAhbWF0cml4W3Jvd11bY29sdW1uXS5pc0Jsb2NraW5nKCkpIHtcblx0XHRcdFx0XHRtYXRyaXhbcm93XVtjb2x1bW5dLmlzVmVydGljYWxMYXplckJlYW0gPSB0cnVlO1xuXHRcdFx0XHRcdHJvdy0tO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnPic6XG5cdFx0XHRcdGNvbHVtbisrO1xuXHRcdFx0XHR3aGlsZSAobWF0cml4W3Jvd11bY29sdW1uXS5pc1ZlcnRpY2FsTGF6ZXJCZWFtIHx8ICFtYXRyaXhbcm93XVtjb2x1bW5dLmlzQmxvY2tpbmcoKSkge1xuXHRcdFx0XHRcdG1hdHJpeFtyb3ddW2NvbHVtbl0uaXNIb3Jpem9udGFsTGF6ZXJCZWFtID0gdHJ1ZTtcblx0XHRcdFx0XHRjb2x1bW4rKztcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJzwnOlxuXHRcdFx0XHRjb2x1bW4tLTtcblx0XHRcdFx0d2hpbGUgKG1hdHJpeFtyb3ddW2NvbHVtbl0uaXNWZXJ0aWNhbExhemVyQmVhbSB8fCAhbWF0cml4W3Jvd11bY29sdW1uXS5pc0Jsb2NraW5nKCkpIHtcblx0XHRcdFx0XHRtYXRyaXhbcm93XVtjb2x1bW5dLmlzSG9yaXpvbnRhbExhemVyQmVhbSA9IHRydWU7XG5cdFx0XHRcdFx0Y29sdW1uLS07XG5cdFx0XHRcdH1cblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXHRcdHJldHVybiBjZWxsO1xuXHR9KTtcbn07XG5cbnNjZW5lLmdldEN1cnJlbnRDZWxsID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uXTtcbn07XG5cbnNjZW5lLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzY2VuZScpO1xuXHRlbGVtZW50LmlubmVySFRNTCA9IHNjZW5lLm1hdHJpeC5tYXAoZnVuY3Rpb24oYXJyYXkpIHtcblx0XHRyZXR1cm4gYXJyYXkuam9pbignJyk7XG5cdH0pLmpvaW4oJzxicj4nKTtcbn07XG5cbnNjZW5lLnRvZ2dsZUN1cnNvciA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgY2VsbCA9IHNjZW5lLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uXTtcblx0Y2VsbC5pc1VuZGVyQ3Vyc29yID0gIWNlbGwuaXNVbmRlckN1cnNvcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gc2NlbmU7Il19
