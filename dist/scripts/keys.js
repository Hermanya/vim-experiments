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
	toString: function() {
		var propertyToClassName = {
				'isText': 'text',
				'isUnderCursor': 'cursor',
				'isVerticalLazerBeam': 'vertical-lazer-beam',
				'isHorizontalLazerBeam': 'horizontal-lazer-beam'
			},
			classNames = Object.keys(propertyToClassName).filter(function(key) {
				return this[key];
			}.bind(this)).map(function(key) {
				return propertyToClassName[key];
			}).join(' ');
			
		return '<span  class="' + classNames + '">' + this.character + '</span>';
	}
};
},{}],2:[function(require,module,exports){
var matrixDecorator = require('./matrix-decorator.js'),
	cellDecorator = require('./cell-decorator.js'),
	cursor = require('./cursor.js');

var chamber = Object.create(matrixDecorator);

chamber.fromJSON = function(json) {
	this.fromArrayOfStrings(json.scene);
	Object.keys(json).filter(function(key) {
		return key !== 'scene';
	}).forEach(function(key) {
		this[key] = json[key];
	});
};

chamber.initialize = function() {
	this.replaceCharactersWithCells();
	this.markText();
	this.markLazers();
	this.markCursor();
};

chamber.replaceCharactersWithCells = function() {
	var chamber = this;
	chamber.matrix = chamber.map(function(character, row, column) {
		if (character === '@') {
			chamber.spawnPosition = {
				row: row,
				column: column
			};
		}
		var cell = Object.create(cellDecorator);
		cell.row = row;
		cell.column = column;
		cell.character = character;
		return cell;
	});
};

chamber.markCursor = function() {
	cursor.reset();
	cursor.column = this.spawnPosition.column;
	cursor.row = this.spawnPosition.row;
};

chamber.markText = function() {
	var isSequenceOfTextInProgress = false,
		lastCellInSequence;
	this.matrix = this.map(function(cell, row, column) {
		if (isSequenceOfTextInProgress) {
			if (cell.character === '`') {
				isSequenceOfTextInProgress = false;
				lastCellInSequence = chamber.matrix[row][column - 1];
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
			}
		}
		return cell;
	});
};

chamber.markLazers = function() {
	var matrix = this.matrix;
	this.matrix = this.map(function(cell, row, column) {
		var character = cell.character,
			isVerticalLazerBeam = function() {
				return ['<','>'].indexOf(character) === -1;
			},
			beamProperty = isVerticalLazerBeam() ? 'isVerticalLazerBeam' : 'isHorizontalLazerBeam',
			isBeamContinuing = function() {
				return matrix[row][column].isLazerBeam() || !matrix[row][column].isBlocking();
			},
			next = {
				'V': function() {
					return matrix[row++][column];
				},
				'^': function() {
					return matrix[row--][column];
				},
				'>': function() {
					return matrix[row][column++];
				},
				'<': function() {
					return matrix[row][column--];
				}
			}[character];
		if (next) {
			next();
			while (isBeamContinuing()) {
				next()[beamProperty] = true;
			}
		}
		return cell;
	});
};

chamber.getCellUnderCursor = function() {
	return this.matrix[cursor.row][cursor.column];
};

chamber.render = function() {
	var element = document.querySelector('#scene');
	element.innerHTML = chamber.matrix.map(function(array) {
		array.forEach(function(cell) {
			cell.isUnderCursor = cell.row === cursor.row && cell.column === cursor.column;
		});
		return array.join('');
	}).join('<br>');
};

module.exports = chamber;
},{"./cell-decorator.js":1,"./cursor.js":5,"./matrix-decorator.js":8}],3:[function(require,module,exports){
var commands = require('./commands.js');

var commandLine = {
	execute: function() {
		var givenCommand = this.element.value.slice(1); // strip colon
		Object.keys(commands).forEach(function(key) {
			var matches = givenCommand.match(new RegExp(key));
			if (matches) {
				commands[key].apply(this, matches.slice(1)); // strip matching line
			}
		});
	}
};

if (typeof window !== 'undefined') {
	commandLine.element = window.document.querySelector('#command-line');
	commandLine.element.addEventListener('blur', function() {
		if (commandLine.element.value) {
			commandLine.element.focus();
		}
	});
	commandLine.element.addEventListener('keypress', function(e) {
		if (e.which === 13) {
			commandLine.execute();
			commandLine.deactivate();
		}
		e.stopPropagation();
	});
	commandLine.element.addEventListener('keyup', function() {
		if (commandLine.element.value === '') {
			commandLine.deactivate();
		}
	});
	commandLine.activate = function() {
		this.element.focus();
	};
	commandLine.deactivate = function() {
		this.element.value = '';
		this.element.blur();
	};
}

module.exports = commandLine;
},{"./commands.js":4}],4:[function(require,module,exports){
var commands = {},
	mainFunction;
module.exports = commands;

commands['chamber (\\d+)'] = function(chamberNumber) {
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState !== 4) {
			return;
		}
		var defaultAction = function() {
				window.alert(xmlhttp.status);
			},
			action = {
				'200': function() {
					localStorage.chamber = chamberNumber;
					mainFunction(JSON.parse(xmlhttp.responseText));
				},
				'404': function() {
					window.alert('Out of such chambers');
				}
			}[xmlhttp.status] || defaultAction;
		action();

	};
	chamberNumber = chamberNumber || localStorage.chamber || 0;
	xmlhttp.open('GET', './chambers/' + chamberNumber + '.json', true);
	xmlhttp.send();
};

commands.loadNextChamber = function() {
	var nextChamberNumber = Number(localStorage.chamber) + 1;
	commands['chamber (\\d+)'](nextChamberNumber);
};

commands['initialize chamber'] = function(main) {
	mainFunction = main;
	commands['chamber (\\d+)']();
};
},{}],5:[function(require,module,exports){
var commands = require('./commands.js');
module.exports = {
	score: 0,
	actOnCurrentCell: function(chamber) {
		var cursor = this,
		cell = chamber.getCellUnderCursor(),
		action = {
			'*': function() {
				cell.character = ' ';
				cursor.score++;
			},
			'O': function() {
				cursor.hasCompletedLevel = true;
				var congratulationMessage = {
					'0': 'You did it, I am bored watching you.',
					'1': 'Only one pathetic star?',
					'2': 'Did you even try?'
				}[cursor.score] || 'Satisfying performace.';
				if (typeof window !== 'undefined') {
					setTimeout(function() {
						window.alert(congratulationMessage);
						commands.loadNextChamber();
					}, 0);
				}
			}
		}[cell.character];
		if (!cell.isText && action) {
			action();
		}
	},
	reset: function() {
		this.hasCompletedLevel = false;
		this.score = 0;
		this.forgetColumnForVerticalMovement();
	},
	rememberColumnForVerticalMovement: function() {
		if (!this.rememberedColumnForVerticalMovement) {
			this.rememberedColumnForVerticalMovement = this.column;
		}
	},
	forgetColumnForVerticalMovement: function() {
		delete this.rememberedColumnForVerticalMovement;
	},
	saveCurrentPosition: function() {
		this.savedColumn = this.column;
		this.savedRow = this.row;
	},
	restoreToSavedPosition: function() {
		this.column = this.savedColumn;
		this.row = this.savedRow;
	}
};
},{"./commands.js":4}],6:[function(require,module,exports){
var lib = require('./lib.js'),
	commandLine = require('./command-line.js'),
	cursor = require('./cursor.js'),
	chamber = require('./chamber.js');

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
		while (numberOfTimes-- > 0) {
			keys[key]();
			cursor.actOnCurrentCell(chamber);
		}
	};
});
},{"./chamber.js":2,"./command-line.js":3,"./cursor.js":5,"./lib.js":7}],7:[function(require,module,exports){
var chamber = require('./chamber.js'),
	cursor = require('./cursor.js');

function getCurrentCharacter() {
	return chamber.getCellUnderCursor().character;
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
	return chamber.getCellUnderCursor().isEndOfFile;
}

function isBeginningOfFile() {
	return chamber.getCellUnderCursor().isBeginningOfFile;
}

function toEndOfNonWhiteSpaceSequence(moveToNextCharacter, isLimitingCharacter) {
	var predicate = isWordCharacter() ? isWordCharacter : isOtherCharacter;
	while (predicate() && !isLimitingCharacter()) {
		moveToNextCharacter();
	}
}

function toEndOfWhiteSpaceSequence(moveToNextCharacter, isLastCharacter) {
	while (isWhiteSpaceCharacter() && !isLastCharacter()) {
		moveToNextCharacter();
	}
}

function moveOneCharacterBackward () {
	var previousTextCell = chamber.getCellUnderCursor().previousTextCell;
	if (previousTextCell) {
		cursor.column = previousTextCell.column;
		cursor.row = previousTextCell.row;
	} else if (chamber.matrix[cursor.row][cursor.column - 1].isText) {
		cursor.column--;
	} else {
		chamber.matrix[cursor.row][cursor.column].isBeginningOfFile = true;
	}
}

function moveOneCharacterForward() {
	var nextTextCell = chamber.matrix[cursor.row][cursor.column].nextTextCell;
	if (nextTextCell) {
		cursor.column = nextTextCell.column;
		cursor.row = nextTextCell.row;
	} else if (chamber.matrix[cursor.row][cursor.column + 1].isText) {
		cursor.column++;
	} else {
		chamber.matrix[cursor.row][cursor.column].isEndOfFile = true;
	}
	
}

function isLastCharacterInWord () {
	if (isWhiteSpaceCharacter()) {
		return;
	}
	var predicate = isWordCharacter() ? isWordCharacter : isOtherCharacter;

	var nextTextCell = chamber.getCellUnderCursor().nextTextCell;
	if (nextTextCell) {
		return !predicate(nextTextCell.character);
	}
	return !predicate(chamber.matrix[cursor.row][cursor.column + 1].character);
}

function isFirstCharacterInWord () {
	if (isWhiteSpaceCharacter()) {
		return;
	}
	var predicate = isWordCharacter() ? isWordCharacter : isOtherCharacter;

	var previousTextCell = chamber.getCellUnderCursor().previousTextCell;
	if (previousTextCell) {
		return !predicate(previousTextCell.character);
	}
	return !predicate(chamber.matrix[cursor.row][cursor.column - 1].character);
}

module.exports = {
	'move horizontally': function(options) {
		cursor.saveCurrentPosition();

		cursor.column += options.direction === 'left' ? -1 : 1;
		if (!chamber.getCellUnderCursor().isBlocking()) {
			cursor.forgetColumnForVerticalMovement();
		}

		if (chamber.getCellUnderCursor().isBlocking()) {
			cursor.restoreToSavedPosition();
		}
	},
	'move vertically': function(options) {
		cursor.saveCurrentPosition();

		var matrix = chamber.matrix;
		cursor.rememberColumnForVerticalMovement();
		var stepsAside = 0,
			sign = options.direction === 'up' ? -1 : 1;
		if (!matrix[cursor.row + 1 * sign][cursor.column].isWall()) {
			while (!matrix[cursor.row + 1 * sign][cursor.column + stepsAside + 1].isWall() &&
			 cursor.column + stepsAside < cursor.rememberedColumnForVerticalMovement) {
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

		if (chamber.getCellUnderCursor().isBlocking()) {
			cursor.restoreToSavedPosition();
		}
	},
	'move by word': function(options) {
		cursor.saveCurrentPosition();

		if (!chamber.getCellUnderCursor().isText) {
			return;
		}
		var moveToNextChar, moveToPreviousChar, isLimitingCharacter, isLimitingCharacterInWord;
		
		if (options.direction === 'forward') {
			moveToNextChar = moveOneCharacterForward;
			moveToPreviousChar = moveOneCharacterBackward;
			isLimitingCharacter = isEndOfFile;
			isLimitingCharacterInWord = isLastCharacterInWord;
		} else {
			moveToNextChar = moveOneCharacterBackward;
			moveToPreviousChar = moveOneCharacterForward;
			isLimitingCharacter = isBeginningOfFile;
			isLimitingCharacterInWord = isFirstCharacterInWord;
		}

		if (isLimitingCharacterInWord()) {
			moveToNextChar();
		}

		if (options.direction === 'forward' && options.to === 'beginning') {
			toEndOfNonWhiteSpaceSequence(moveToNextChar, isLimitingCharacter);
		}
		
		toEndOfWhiteSpaceSequence(moveToNextChar, isLimitingCharacter);

		if (options.direction === 'forward' && options.to === 'ending' ||
			options.direction === 'backward' && options.to === 'beginning') {
			toEndOfNonWhiteSpaceSequence(moveToNextChar, isLimitingCharacter);
			if (!isLimitingCharacter()) {
				moveToPreviousChar();
			}
		}

		if (chamber.getCellUnderCursor().isBlocking()) {
			cursor.restoreToSavedPosition();
		}
	}
};
},{"./chamber.js":2,"./cursor.js":5}],8:[function(require,module,exports){
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
},{}]},{},[6])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NlbGwtZGVjb3JhdG9yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jaGFtYmVyLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jb21tYW5kLWxpbmUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NvbW1hbmRzLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jdXJzb3IuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2Zha2VfOGFjOGRmMy5qcyIsIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9zcmMvbGliLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9tYXRyaXgtZGVjb3JhdG9yLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0aXNXYWxsOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gWycrJywgJy0nLCAnfCddLmluZGV4T2YodGhpcy5jaGFyYWN0ZXIpICE9PSAtMSAmJiAhdGhpcy5pc1RleHQ7XG5cdH0sXG5cdGlzTGF6ZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBbJ1YnLCAnXicsICc+JywgJzwnXS5pbmRleE9mKHRoaXMuY2hhcmFjdGVyKSAhPT0gLTEgJiYgIXRoaXMuaXNUZXh0O1xuXHR9LFxuXHRpc0xhemVyQmVhbTogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuaXNWZXJ0aWNhbExhemVyQmVhbSB8fCB0aGlzLmlzSG9yaXpvbnRhbExhemVyQmVhbTtcblx0fSxcblx0aXNCbG9ja2luZzogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuaXNXYWxsKCkgfHwgdGhpcy5pc0xhemVyKCkgfHwgdGhpcy5pc0xhemVyQmVhbSgpO1xuXHR9LFxuXHR0b1N0cmluZzogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHByb3BlcnR5VG9DbGFzc05hbWUgPSB7XG5cdFx0XHRcdCdpc1RleHQnOiAndGV4dCcsXG5cdFx0XHRcdCdpc1VuZGVyQ3Vyc29yJzogJ2N1cnNvcicsXG5cdFx0XHRcdCdpc1ZlcnRpY2FsTGF6ZXJCZWFtJzogJ3ZlcnRpY2FsLWxhemVyLWJlYW0nLFxuXHRcdFx0XHQnaXNIb3Jpem9udGFsTGF6ZXJCZWFtJzogJ2hvcml6b250YWwtbGF6ZXItYmVhbSdcblx0XHRcdH0sXG5cdFx0XHRjbGFzc05hbWVzID0gT2JqZWN0LmtleXMocHJvcGVydHlUb0NsYXNzTmFtZSkuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRyZXR1cm4gdGhpc1trZXldO1xuXHRcdFx0fS5iaW5kKHRoaXMpKS5tYXAoZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdHJldHVybiBwcm9wZXJ0eVRvQ2xhc3NOYW1lW2tleV07XG5cdFx0XHR9KS5qb2luKCcgJyk7XG5cdFx0XHRcblx0XHRyZXR1cm4gJzxzcGFuICBjbGFzcz1cIicgKyBjbGFzc05hbWVzICsgJ1wiPicgKyB0aGlzLmNoYXJhY3RlciArICc8L3NwYW4+Jztcblx0fVxufTsiLCJ2YXIgbWF0cml4RGVjb3JhdG9yID0gcmVxdWlyZSgnLi9tYXRyaXgtZGVjb3JhdG9yLmpzJyksXG5cdGNlbGxEZWNvcmF0b3IgPSByZXF1aXJlKCcuL2NlbGwtZGVjb3JhdG9yLmpzJyksXG5cdGN1cnNvciA9IHJlcXVpcmUoJy4vY3Vyc29yLmpzJyk7XG5cbnZhciBjaGFtYmVyID0gT2JqZWN0LmNyZWF0ZShtYXRyaXhEZWNvcmF0b3IpO1xuXG5jaGFtYmVyLmZyb21KU09OID0gZnVuY3Rpb24oanNvbikge1xuXHR0aGlzLmZyb21BcnJheU9mU3RyaW5ncyhqc29uLnNjZW5lKTtcblx0T2JqZWN0LmtleXMoanNvbikuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuXHRcdHJldHVybiBrZXkgIT09ICdzY2VuZSc7XG5cdH0pLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG5cdFx0dGhpc1trZXldID0ganNvbltrZXldO1xuXHR9KTtcbn07XG5cbmNoYW1iZXIuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnJlcGxhY2VDaGFyYWN0ZXJzV2l0aENlbGxzKCk7XG5cdHRoaXMubWFya1RleHQoKTtcblx0dGhpcy5tYXJrTGF6ZXJzKCk7XG5cdHRoaXMubWFya0N1cnNvcigpO1xufTtcblxuY2hhbWJlci5yZXBsYWNlQ2hhcmFjdGVyc1dpdGhDZWxscyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgY2hhbWJlciA9IHRoaXM7XG5cdGNoYW1iZXIubWF0cml4ID0gY2hhbWJlci5tYXAoZnVuY3Rpb24oY2hhcmFjdGVyLCByb3csIGNvbHVtbikge1xuXHRcdGlmIChjaGFyYWN0ZXIgPT09ICdAJykge1xuXHRcdFx0Y2hhbWJlci5zcGF3blBvc2l0aW9uID0ge1xuXHRcdFx0XHRyb3c6IHJvdyxcblx0XHRcdFx0Y29sdW1uOiBjb2x1bW5cblx0XHRcdH07XG5cdFx0fVxuXHRcdHZhciBjZWxsID0gT2JqZWN0LmNyZWF0ZShjZWxsRGVjb3JhdG9yKTtcblx0XHRjZWxsLnJvdyA9IHJvdztcblx0XHRjZWxsLmNvbHVtbiA9IGNvbHVtbjtcblx0XHRjZWxsLmNoYXJhY3RlciA9IGNoYXJhY3Rlcjtcblx0XHRyZXR1cm4gY2VsbDtcblx0fSk7XG59O1xuXG5jaGFtYmVyLm1hcmtDdXJzb3IgPSBmdW5jdGlvbigpIHtcblx0Y3Vyc29yLnJlc2V0KCk7XG5cdGN1cnNvci5jb2x1bW4gPSB0aGlzLnNwYXduUG9zaXRpb24uY29sdW1uO1xuXHRjdXJzb3Iucm93ID0gdGhpcy5zcGF3blBvc2l0aW9uLnJvdztcbn07XG5cbmNoYW1iZXIubWFya1RleHQgPSBmdW5jdGlvbigpIHtcblx0dmFyIGlzU2VxdWVuY2VPZlRleHRJblByb2dyZXNzID0gZmFsc2UsXG5cdFx0bGFzdENlbGxJblNlcXVlbmNlO1xuXHR0aGlzLm1hdHJpeCA9IHRoaXMubWFwKGZ1bmN0aW9uKGNlbGwsIHJvdywgY29sdW1uKSB7XG5cdFx0aWYgKGlzU2VxdWVuY2VPZlRleHRJblByb2dyZXNzKSB7XG5cdFx0XHRpZiAoY2VsbC5jaGFyYWN0ZXIgPT09ICdgJykge1xuXHRcdFx0XHRpc1NlcXVlbmNlT2ZUZXh0SW5Qcm9ncmVzcyA9IGZhbHNlO1xuXHRcdFx0XHRsYXN0Q2VsbEluU2VxdWVuY2UgPSBjaGFtYmVyLm1hdHJpeFtyb3ddW2NvbHVtbiAtIDFdO1xuXHRcdFx0XHRjZWxsLmNoYXJhY3RlciA9ICcgJztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNlbGwuaXNUZXh0ID0gdHJ1ZTtcblx0XHRcdFx0aWYgKGxhc3RDZWxsSW5TZXF1ZW5jZSkge1xuXHRcdFx0XHRcdGlmIChNYXRoLmFicyhsYXN0Q2VsbEluU2VxdWVuY2Uucm93IC0gY2VsbC5yb3cpID09PSAxKSB7XG5cdFx0XHRcdFx0XHRjZWxsLnByZXZpb3VzVGV4dENlbGwgPSBsYXN0Q2VsbEluU2VxdWVuY2U7XG5cdFx0XHRcdFx0XHRsYXN0Q2VsbEluU2VxdWVuY2UubmV4dFRleHRDZWxsID0gY2VsbDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bGFzdENlbGxJblNlcXVlbmNlID0gdW5kZWZpbmVkO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChjZWxsLmNoYXJhY3RlciA9PT0gJ2AnKSB7XG5cdFx0XHRcdGlzU2VxdWVuY2VPZlRleHRJblByb2dyZXNzID0gdHJ1ZTtcblx0XHRcdFx0Y2VsbC5jaGFyYWN0ZXIgPSAnICc7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBjZWxsO1xuXHR9KTtcbn07XG5cbmNoYW1iZXIubWFya0xhemVycyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgbWF0cml4ID0gdGhpcy5tYXRyaXg7XG5cdHRoaXMubWF0cml4ID0gdGhpcy5tYXAoZnVuY3Rpb24oY2VsbCwgcm93LCBjb2x1bW4pIHtcblx0XHR2YXIgY2hhcmFjdGVyID0gY2VsbC5jaGFyYWN0ZXIsXG5cdFx0XHRpc1ZlcnRpY2FsTGF6ZXJCZWFtID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBbJzwnLCc+J10uaW5kZXhPZihjaGFyYWN0ZXIpID09PSAtMTtcblx0XHRcdH0sXG5cdFx0XHRiZWFtUHJvcGVydHkgPSBpc1ZlcnRpY2FsTGF6ZXJCZWFtKCkgPyAnaXNWZXJ0aWNhbExhemVyQmVhbScgOiAnaXNIb3Jpem9udGFsTGF6ZXJCZWFtJyxcblx0XHRcdGlzQmVhbUNvbnRpbnVpbmcgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIG1hdHJpeFtyb3ddW2NvbHVtbl0uaXNMYXplckJlYW0oKSB8fCAhbWF0cml4W3Jvd11bY29sdW1uXS5pc0Jsb2NraW5nKCk7XG5cdFx0XHR9LFxuXHRcdFx0bmV4dCA9IHtcblx0XHRcdFx0J1YnOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gbWF0cml4W3JvdysrXVtjb2x1bW5dO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQnXic6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBtYXRyaXhbcm93LS1dW2NvbHVtbl07XG5cdFx0XHRcdH0sXG5cdFx0XHRcdCc+JzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG1hdHJpeFtyb3ddW2NvbHVtbisrXTtcblx0XHRcdFx0fSxcblx0XHRcdFx0JzwnOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gbWF0cml4W3Jvd11bY29sdW1uLS1dO1xuXHRcdFx0XHR9XG5cdFx0XHR9W2NoYXJhY3Rlcl07XG5cdFx0aWYgKG5leHQpIHtcblx0XHRcdG5leHQoKTtcblx0XHRcdHdoaWxlIChpc0JlYW1Db250aW51aW5nKCkpIHtcblx0XHRcdFx0bmV4dCgpW2JlYW1Qcm9wZXJ0eV0gPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gY2VsbDtcblx0fSk7XG59O1xuXG5jaGFtYmVyLmdldENlbGxVbmRlckN1cnNvciA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5tYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbl07XG59O1xuXG5jaGFtYmVyLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzY2VuZScpO1xuXHRlbGVtZW50LmlubmVySFRNTCA9IGNoYW1iZXIubWF0cml4Lm1hcChmdW5jdGlvbihhcnJheSkge1xuXHRcdGFycmF5LmZvckVhY2goZnVuY3Rpb24oY2VsbCkge1xuXHRcdFx0Y2VsbC5pc1VuZGVyQ3Vyc29yID0gY2VsbC5yb3cgPT09IGN1cnNvci5yb3cgJiYgY2VsbC5jb2x1bW4gPT09IGN1cnNvci5jb2x1bW47XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGFycmF5LmpvaW4oJycpO1xuXHR9KS5qb2luKCc8YnI+Jyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNoYW1iZXI7IiwidmFyIGNvbW1hbmRzID0gcmVxdWlyZSgnLi9jb21tYW5kcy5qcycpO1xuXG52YXIgY29tbWFuZExpbmUgPSB7XG5cdGV4ZWN1dGU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBnaXZlbkNvbW1hbmQgPSB0aGlzLmVsZW1lbnQudmFsdWUuc2xpY2UoMSk7IC8vIHN0cmlwIGNvbG9uXG5cdFx0T2JqZWN0LmtleXMoY29tbWFuZHMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHR2YXIgbWF0Y2hlcyA9IGdpdmVuQ29tbWFuZC5tYXRjaChuZXcgUmVnRXhwKGtleSkpO1xuXHRcdFx0aWYgKG1hdGNoZXMpIHtcblx0XHRcdFx0Y29tbWFuZHNba2V5XS5hcHBseSh0aGlzLCBtYXRjaGVzLnNsaWNlKDEpKTsgLy8gc3RyaXAgbWF0Y2hpbmcgbGluZVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59O1xuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0Y29tbWFuZExpbmUuZWxlbWVudCA9IHdpbmRvdy5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjY29tbWFuZC1saW5lJyk7XG5cdGNvbW1hbmRMaW5lLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsIGZ1bmN0aW9uKCkge1xuXHRcdGlmIChjb21tYW5kTGluZS5lbGVtZW50LnZhbHVlKSB7XG5cdFx0XHRjb21tYW5kTGluZS5lbGVtZW50LmZvY3VzKCk7XG5cdFx0fVxuXHR9KTtcblx0Y29tbWFuZExpbmUuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlwcmVzcycsIGZ1bmN0aW9uKGUpIHtcblx0XHRpZiAoZS53aGljaCA9PT0gMTMpIHtcblx0XHRcdGNvbW1hbmRMaW5lLmV4ZWN1dGUoKTtcblx0XHRcdGNvbW1hbmRMaW5lLmRlYWN0aXZhdGUoKTtcblx0XHR9XG5cdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0fSk7XG5cdGNvbW1hbmRMaW5lLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdGlvbigpIHtcblx0XHRpZiAoY29tbWFuZExpbmUuZWxlbWVudC52YWx1ZSA9PT0gJycpIHtcblx0XHRcdGNvbW1hbmRMaW5lLmRlYWN0aXZhdGUoKTtcblx0XHR9XG5cdH0pO1xuXHRjb21tYW5kTGluZS5hY3RpdmF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuZWxlbWVudC5mb2N1cygpO1xuXHR9O1xuXHRjb21tYW5kTGluZS5kZWFjdGl2YXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5lbGVtZW50LnZhbHVlID0gJyc7XG5cdFx0dGhpcy5lbGVtZW50LmJsdXIoKTtcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjb21tYW5kTGluZTsiLCJ2YXIgY29tbWFuZHMgPSB7fSxcblx0bWFpbkZ1bmN0aW9uO1xubW9kdWxlLmV4cG9ydHMgPSBjb21tYW5kcztcblxuY29tbWFuZHNbJ2NoYW1iZXIgKFxcXFxkKyknXSA9IGZ1bmN0aW9uKGNoYW1iZXJOdW1iZXIpIHtcblx0dmFyIHhtbGh0dHAgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0eG1saHR0cC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcblx0XHRpZiAoeG1saHR0cC5yZWFkeVN0YXRlICE9PSA0KSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHZhciBkZWZhdWx0QWN0aW9uID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHdpbmRvdy5hbGVydCh4bWxodHRwLnN0YXR1cyk7XG5cdFx0XHR9LFxuXHRcdFx0YWN0aW9uID0ge1xuXHRcdFx0XHQnMjAwJzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0bG9jYWxTdG9yYWdlLmNoYW1iZXIgPSBjaGFtYmVyTnVtYmVyO1xuXHRcdFx0XHRcdG1haW5GdW5jdGlvbihKU09OLnBhcnNlKHhtbGh0dHAucmVzcG9uc2VUZXh0KSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdCc0MDQnOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR3aW5kb3cuYWxlcnQoJ091dCBvZiBzdWNoIGNoYW1iZXJzJyk7XG5cdFx0XHRcdH1cblx0XHRcdH1beG1saHR0cC5zdGF0dXNdIHx8IGRlZmF1bHRBY3Rpb247XG5cdFx0YWN0aW9uKCk7XG5cblx0fTtcblx0Y2hhbWJlck51bWJlciA9IGNoYW1iZXJOdW1iZXIgfHwgbG9jYWxTdG9yYWdlLmNoYW1iZXIgfHwgMDtcblx0eG1saHR0cC5vcGVuKCdHRVQnLCAnLi9jaGFtYmVycy8nICsgY2hhbWJlck51bWJlciArICcuanNvbicsIHRydWUpO1xuXHR4bWxodHRwLnNlbmQoKTtcbn07XG5cbmNvbW1hbmRzLmxvYWROZXh0Q2hhbWJlciA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgbmV4dENoYW1iZXJOdW1iZXIgPSBOdW1iZXIobG9jYWxTdG9yYWdlLmNoYW1iZXIpICsgMTtcblx0Y29tbWFuZHNbJ2NoYW1iZXIgKFxcXFxkKyknXShuZXh0Q2hhbWJlck51bWJlcik7XG59O1xuXG5jb21tYW5kc1snaW5pdGlhbGl6ZSBjaGFtYmVyJ10gPSBmdW5jdGlvbihtYWluKSB7XG5cdG1haW5GdW5jdGlvbiA9IG1haW47XG5cdGNvbW1hbmRzWydjaGFtYmVyIChcXFxcZCspJ10oKTtcbn07IiwidmFyIGNvbW1hbmRzID0gcmVxdWlyZSgnLi9jb21tYW5kcy5qcycpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG5cdHNjb3JlOiAwLFxuXHRhY3RPbkN1cnJlbnRDZWxsOiBmdW5jdGlvbihjaGFtYmVyKSB7XG5cdFx0dmFyIGN1cnNvciA9IHRoaXMsXG5cdFx0Y2VsbCA9IGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCksXG5cdFx0YWN0aW9uID0ge1xuXHRcdFx0JyonOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0Y2VsbC5jaGFyYWN0ZXIgPSAnICc7XG5cdFx0XHRcdGN1cnNvci5zY29yZSsrO1xuXHRcdFx0fSxcblx0XHRcdCdPJzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGN1cnNvci5oYXNDb21wbGV0ZWRMZXZlbCA9IHRydWU7XG5cdFx0XHRcdHZhciBjb25ncmF0dWxhdGlvbk1lc3NhZ2UgPSB7XG5cdFx0XHRcdFx0JzAnOiAnWW91IGRpZCBpdCwgSSBhbSBib3JlZCB3YXRjaGluZyB5b3UuJyxcblx0XHRcdFx0XHQnMSc6ICdPbmx5IG9uZSBwYXRoZXRpYyBzdGFyPycsXG5cdFx0XHRcdFx0JzInOiAnRGlkIHlvdSBldmVuIHRyeT8nXG5cdFx0XHRcdH1bY3Vyc29yLnNjb3JlXSB8fCAnU2F0aXNmeWluZyBwZXJmb3JtYWNlLic7XG5cdFx0XHRcdGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHR3aW5kb3cuYWxlcnQoY29uZ3JhdHVsYXRpb25NZXNzYWdlKTtcblx0XHRcdFx0XHRcdGNvbW1hbmRzLmxvYWROZXh0Q2hhbWJlcigpO1xuXHRcdFx0XHRcdH0sIDApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVtjZWxsLmNoYXJhY3Rlcl07XG5cdFx0aWYgKCFjZWxsLmlzVGV4dCAmJiBhY3Rpb24pIHtcblx0XHRcdGFjdGlvbigpO1xuXHRcdH1cblx0fSxcblx0cmVzZXQ6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuaGFzQ29tcGxldGVkTGV2ZWwgPSBmYWxzZTtcblx0XHR0aGlzLnNjb3JlID0gMDtcblx0XHR0aGlzLmZvcmdldENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQoKTtcblx0fSxcblx0cmVtZW1iZXJDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50OiBmdW5jdGlvbigpIHtcblx0XHRpZiAoIXRoaXMucmVtZW1iZXJlZENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQpIHtcblx0XHRcdHRoaXMucmVtZW1iZXJlZENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQgPSB0aGlzLmNvbHVtbjtcblx0XHR9XG5cdH0sXG5cdGZvcmdldENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQ6IGZ1bmN0aW9uKCkge1xuXHRcdGRlbGV0ZSB0aGlzLnJlbWVtYmVyZWRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50O1xuXHR9LFxuXHRzYXZlQ3VycmVudFBvc2l0aW9uOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnNhdmVkQ29sdW1uID0gdGhpcy5jb2x1bW47XG5cdFx0dGhpcy5zYXZlZFJvdyA9IHRoaXMucm93O1xuXHR9LFxuXHRyZXN0b3JlVG9TYXZlZFBvc2l0aW9uOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmNvbHVtbiA9IHRoaXMuc2F2ZWRDb2x1bW47XG5cdFx0dGhpcy5yb3cgPSB0aGlzLnNhdmVkUm93O1xuXHR9XG59OyIsInZhciBsaWIgPSByZXF1aXJlKCcuL2xpYi5qcycpLFxuXHRjb21tYW5kTGluZSA9IHJlcXVpcmUoJy4vY29tbWFuZC1saW5lLmpzJyksXG5cdGN1cnNvciA9IHJlcXVpcmUoJy4vY3Vyc29yLmpzJyksXG5cdGNoYW1iZXIgPSByZXF1aXJlKCcuL2NoYW1iZXIuanMnKTtcblxudmFyIGtleXMgPSB7XG5cdCdoJzogZnVuY3Rpb24oKSB7XG5cdFx0bGliWydtb3ZlIGhvcml6b250YWxseSddKHtcblx0XHRcdGRpcmVjdGlvbjogJ2xlZnQnXG5cdFx0fSk7XG5cdH0sXG5cdCdsJzogZnVuY3Rpb24oKSB7XG5cdFx0bGliWydtb3ZlIGhvcml6b250YWxseSddKHtcblx0XHRcdGRpcmVjdGlvbjogJ3JpZ2h0J1xuXHRcdH0pO1xuXHR9LFxuXHQnayc6IGZ1bmN0aW9uKCkge1xuXHRcdGxpYlsnbW92ZSB2ZXJ0aWNhbGx5J10oe1xuXHRcdFx0ZGlyZWN0aW9uOiAndXAnXG5cdFx0fSk7XG5cdH0sXG5cdCdqJzogZnVuY3Rpb24oKSB7XG5cdFx0bGliWydtb3ZlIHZlcnRpY2FsbHknXSh7XG5cdFx0XHRkaXJlY3Rpb246ICdkb3duJ1xuXHRcdH0pO1xuXHR9LFxuXHQnOic6IGZ1bmN0aW9uKCkge1xuXHRcdGNvbW1hbmRMaW5lLmFjdGl2YXRlKCk7XG5cdH0sXG5cdCd3JzogZnVuY3Rpb24oKSB7XG5cdFx0bGliWydtb3ZlIGJ5IHdvcmQnXSh7XG5cdFx0XHRkaXJlY3Rpb246ICdmb3J3YXJkJyxcblx0XHRcdHRvOiAnYmVnaW5uaW5nJ1xuXHRcdH0pO1xuXHR9LFxuXHQnZSc6IGZ1bmN0aW9uKCkge1xuXHRcdGxpYlsnbW92ZSBieSB3b3JkJ10oe1xuXHRcdFx0ZGlyZWN0aW9uOiAnZm9yd2FyZCcsXG5cdFx0XHR0bzogJ2VuZGluZydcblx0XHR9KTtcblx0fSxcblx0J2InOiBmdW5jdGlvbigpIHtcblx0XHRsaWJbJ21vdmUgYnkgd29yZCddKHtcblx0XHRcdGRpcmVjdGlvbjogJ2JhY2t3YXJkJyxcblx0XHRcdHRvOiAnYmVnaW5uaW5nJ1xuXHRcdH0pO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5PYmplY3Qua2V5cyhrZXlzKS5tYXAoZnVuY3Rpb24oa2V5KSB7XG5cdG1vZHVsZS5leHBvcnRzW2tleV0gPSBmdW5jdGlvbihudW1iZXJPZlRpbWVzKSB7XG5cdFx0bnVtYmVyT2ZUaW1lcyA9IG51bWJlck9mVGltZXMgfHwgMTtcblx0XHR3aGlsZSAobnVtYmVyT2ZUaW1lcy0tID4gMCkge1xuXHRcdFx0a2V5c1trZXldKCk7XG5cdFx0XHRjdXJzb3IuYWN0T25DdXJyZW50Q2VsbChjaGFtYmVyKTtcblx0XHR9XG5cdH07XG59KTsiLCJ2YXIgY2hhbWJlciA9IHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLFxuXHRjdXJzb3IgPSByZXF1aXJlKCcuL2N1cnNvci5qcycpO1xuXG5mdW5jdGlvbiBnZXRDdXJyZW50Q2hhcmFjdGVyKCkge1xuXHRyZXR1cm4gY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5jaGFyYWN0ZXI7XG59XG5cbmZ1bmN0aW9uIGlzV29yZENoYXJhY3RlcihjaGFyYWN0ZXIpIHtcblx0cmV0dXJuIC9bQS1aYS16XzAtOV0vLnRlc3QoY2hhcmFjdGVyIHx8IGdldEN1cnJlbnRDaGFyYWN0ZXIoKSk7XG59XG5cbmZ1bmN0aW9uIGlzV2hpdGVTcGFjZUNoYXJhY3RlcihjaGFyYWN0ZXIpIHtcblx0cmV0dXJuIC9cXHMvLnRlc3QoY2hhcmFjdGVyIHx8IGdldEN1cnJlbnRDaGFyYWN0ZXIoKSk7XG59XG5cbmZ1bmN0aW9uIGlzT3RoZXJDaGFyYWN0ZXIoY2hhcmFjdGVyKSB7XG5cdHJldHVybiAvW15BLVphLXpfMC05XFxzXS8udGVzdChjaGFyYWN0ZXIgfHwgZ2V0Q3VycmVudENoYXJhY3RlcigpKTtcbn1cblxuZnVuY3Rpb24gaXNFbmRPZkZpbGUoKSB7XG5cdHJldHVybiBjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmlzRW5kT2ZGaWxlO1xufVxuXG5mdW5jdGlvbiBpc0JlZ2lubmluZ09mRmlsZSgpIHtcblx0cmV0dXJuIGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNCZWdpbm5pbmdPZkZpbGU7XG59XG5cbmZ1bmN0aW9uIHRvRW5kT2ZOb25XaGl0ZVNwYWNlU2VxdWVuY2UobW92ZVRvTmV4dENoYXJhY3RlciwgaXNMaW1pdGluZ0NoYXJhY3Rlcikge1xuXHR2YXIgcHJlZGljYXRlID0gaXNXb3JkQ2hhcmFjdGVyKCkgPyBpc1dvcmRDaGFyYWN0ZXIgOiBpc090aGVyQ2hhcmFjdGVyO1xuXHR3aGlsZSAocHJlZGljYXRlKCkgJiYgIWlzTGltaXRpbmdDaGFyYWN0ZXIoKSkge1xuXHRcdG1vdmVUb05leHRDaGFyYWN0ZXIoKTtcblx0fVxufVxuXG5mdW5jdGlvbiB0b0VuZE9mV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyYWN0ZXIsIGlzTGFzdENoYXJhY3Rlcikge1xuXHR3aGlsZSAoaXNXaGl0ZVNwYWNlQ2hhcmFjdGVyKCkgJiYgIWlzTGFzdENoYXJhY3RlcigpKSB7XG5cdFx0bW92ZVRvTmV4dENoYXJhY3RlcigpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIG1vdmVPbmVDaGFyYWN0ZXJCYWNrd2FyZCAoKSB7XG5cdHZhciBwcmV2aW91c1RleHRDZWxsID0gY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5wcmV2aW91c1RleHRDZWxsO1xuXHRpZiAocHJldmlvdXNUZXh0Q2VsbCkge1xuXHRcdGN1cnNvci5jb2x1bW4gPSBwcmV2aW91c1RleHRDZWxsLmNvbHVtbjtcblx0XHRjdXJzb3Iucm93ID0gcHJldmlvdXNUZXh0Q2VsbC5yb3c7XG5cdH0gZWxzZSBpZiAoY2hhbWJlci5tYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbiAtIDFdLmlzVGV4dCkge1xuXHRcdGN1cnNvci5jb2x1bW4tLTtcblx0fSBlbHNlIHtcblx0XHRjaGFtYmVyLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uXS5pc0JlZ2lubmluZ09mRmlsZSA9IHRydWU7XG5cdH1cbn1cblxuZnVuY3Rpb24gbW92ZU9uZUNoYXJhY3RlckZvcndhcmQoKSB7XG5cdHZhciBuZXh0VGV4dENlbGwgPSBjaGFtYmVyLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uXS5uZXh0VGV4dENlbGw7XG5cdGlmIChuZXh0VGV4dENlbGwpIHtcblx0XHRjdXJzb3IuY29sdW1uID0gbmV4dFRleHRDZWxsLmNvbHVtbjtcblx0XHRjdXJzb3Iucm93ID0gbmV4dFRleHRDZWxsLnJvdztcblx0fSBlbHNlIGlmIChjaGFtYmVyLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uICsgMV0uaXNUZXh0KSB7XG5cdFx0Y3Vyc29yLmNvbHVtbisrO1xuXHR9IGVsc2Uge1xuXHRcdGNoYW1iZXIubWF0cml4W2N1cnNvci5yb3ddW2N1cnNvci5jb2x1bW5dLmlzRW5kT2ZGaWxlID0gdHJ1ZTtcblx0fVxuXHRcbn1cblxuZnVuY3Rpb24gaXNMYXN0Q2hhcmFjdGVySW5Xb3JkICgpIHtcblx0aWYgKGlzV2hpdGVTcGFjZUNoYXJhY3RlcigpKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHZhciBwcmVkaWNhdGUgPSBpc1dvcmRDaGFyYWN0ZXIoKSA/IGlzV29yZENoYXJhY3RlciA6IGlzT3RoZXJDaGFyYWN0ZXI7XG5cblx0dmFyIG5leHRUZXh0Q2VsbCA9IGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkubmV4dFRleHRDZWxsO1xuXHRpZiAobmV4dFRleHRDZWxsKSB7XG5cdFx0cmV0dXJuICFwcmVkaWNhdGUobmV4dFRleHRDZWxsLmNoYXJhY3Rlcik7XG5cdH1cblx0cmV0dXJuICFwcmVkaWNhdGUoY2hhbWJlci5tYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbiArIDFdLmNoYXJhY3Rlcik7XG59XG5cbmZ1bmN0aW9uIGlzRmlyc3RDaGFyYWN0ZXJJbldvcmQgKCkge1xuXHRpZiAoaXNXaGl0ZVNwYWNlQ2hhcmFjdGVyKCkpIHtcblx0XHRyZXR1cm47XG5cdH1cblx0dmFyIHByZWRpY2F0ZSA9IGlzV29yZENoYXJhY3RlcigpID8gaXNXb3JkQ2hhcmFjdGVyIDogaXNPdGhlckNoYXJhY3RlcjtcblxuXHR2YXIgcHJldmlvdXNUZXh0Q2VsbCA9IGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkucHJldmlvdXNUZXh0Q2VsbDtcblx0aWYgKHByZXZpb3VzVGV4dENlbGwpIHtcblx0XHRyZXR1cm4gIXByZWRpY2F0ZShwcmV2aW91c1RleHRDZWxsLmNoYXJhY3Rlcik7XG5cdH1cblx0cmV0dXJuICFwcmVkaWNhdGUoY2hhbWJlci5tYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbiAtIDFdLmNoYXJhY3Rlcik7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHQnbW92ZSBob3Jpem9udGFsbHknOiBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0Y3Vyc29yLnNhdmVDdXJyZW50UG9zaXRpb24oKTtcblxuXHRcdGN1cnNvci5jb2x1bW4gKz0gb3B0aW9ucy5kaXJlY3Rpb24gPT09ICdsZWZ0JyA/IC0xIDogMTtcblx0XHRpZiAoIWNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNCbG9ja2luZygpKSB7XG5cdFx0XHRjdXJzb3IuZm9yZ2V0Q29sdW1uRm9yVmVydGljYWxNb3ZlbWVudCgpO1xuXHRcdH1cblxuXHRcdGlmIChjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmlzQmxvY2tpbmcoKSkge1xuXHRcdFx0Y3Vyc29yLnJlc3RvcmVUb1NhdmVkUG9zaXRpb24oKTtcblx0XHR9XG5cdH0sXG5cdCdtb3ZlIHZlcnRpY2FsbHknOiBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0Y3Vyc29yLnNhdmVDdXJyZW50UG9zaXRpb24oKTtcblxuXHRcdHZhciBtYXRyaXggPSBjaGFtYmVyLm1hdHJpeDtcblx0XHRjdXJzb3IucmVtZW1iZXJDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50KCk7XG5cdFx0dmFyIHN0ZXBzQXNpZGUgPSAwLFxuXHRcdFx0c2lnbiA9IG9wdGlvbnMuZGlyZWN0aW9uID09PSAndXAnID8gLTEgOiAxO1xuXHRcdGlmICghbWF0cml4W2N1cnNvci5yb3cgKyAxICogc2lnbl1bY3Vyc29yLmNvbHVtbl0uaXNXYWxsKCkpIHtcblx0XHRcdHdoaWxlICghbWF0cml4W2N1cnNvci5yb3cgKyAxICogc2lnbl1bY3Vyc29yLmNvbHVtbiArIHN0ZXBzQXNpZGUgKyAxXS5pc1dhbGwoKSAmJlxuXHRcdFx0IGN1cnNvci5jb2x1bW4gKyBzdGVwc0FzaWRlIDwgY3Vyc29yLnJlbWVtYmVyZWRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50KSB7XG5cdFx0XHRcdHN0ZXBzQXNpZGUrKztcblx0XHRcdH1cblx0XHRcdGN1cnNvci5jb2x1bW4gKz0gc3RlcHNBc2lkZTtcblx0XHRcdGN1cnNvci5yb3cgKz0gMSAqIHNpZ247XG5cdFx0fSBlbHNlIHtcblx0XHRcdHdoaWxlICghbWF0cml4W2N1cnNvci5yb3ddW2N1cnNvci5jb2x1bW4gKyBzdGVwc0FzaWRlXS5pc0Jsb2NraW5nKCkpIHtcblx0XHRcdFx0aWYgKCFtYXRyaXhbY3Vyc29yLnJvdyArIDEgKiBzaWduXVtjdXJzb3IuY29sdW1uICsgc3RlcHNBc2lkZV0uaXNCbG9ja2luZygpKSB7XG5cdFx0XHRcdFx0Y3Vyc29yLnJvdyArPSAxICogc2lnbjtcblx0XHRcdFx0XHRjdXJzb3IuY29sdW1uICs9IHN0ZXBzQXNpZGU7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0c3RlcHNBc2lkZS0tO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNCbG9ja2luZygpKSB7XG5cdFx0XHRjdXJzb3IucmVzdG9yZVRvU2F2ZWRQb3NpdGlvbigpO1xuXHRcdH1cblx0fSxcblx0J21vdmUgYnkgd29yZCc6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHRjdXJzb3Iuc2F2ZUN1cnJlbnRQb3NpdGlvbigpO1xuXG5cdFx0aWYgKCFjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmlzVGV4dCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR2YXIgbW92ZVRvTmV4dENoYXIsIG1vdmVUb1ByZXZpb3VzQ2hhciwgaXNMaW1pdGluZ0NoYXJhY3RlciwgaXNMaW1pdGluZ0NoYXJhY3RlckluV29yZDtcblx0XHRcblx0XHRpZiAob3B0aW9ucy5kaXJlY3Rpb24gPT09ICdmb3J3YXJkJykge1xuXHRcdFx0bW92ZVRvTmV4dENoYXIgPSBtb3ZlT25lQ2hhcmFjdGVyRm9yd2FyZDtcblx0XHRcdG1vdmVUb1ByZXZpb3VzQ2hhciA9IG1vdmVPbmVDaGFyYWN0ZXJCYWNrd2FyZDtcblx0XHRcdGlzTGltaXRpbmdDaGFyYWN0ZXIgPSBpc0VuZE9mRmlsZTtcblx0XHRcdGlzTGltaXRpbmdDaGFyYWN0ZXJJbldvcmQgPSBpc0xhc3RDaGFyYWN0ZXJJbldvcmQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG1vdmVUb05leHRDaGFyID0gbW92ZU9uZUNoYXJhY3RlckJhY2t3YXJkO1xuXHRcdFx0bW92ZVRvUHJldmlvdXNDaGFyID0gbW92ZU9uZUNoYXJhY3RlckZvcndhcmQ7XG5cdFx0XHRpc0xpbWl0aW5nQ2hhcmFjdGVyID0gaXNCZWdpbm5pbmdPZkZpbGU7XG5cdFx0XHRpc0xpbWl0aW5nQ2hhcmFjdGVySW5Xb3JkID0gaXNGaXJzdENoYXJhY3RlckluV29yZDtcblx0XHR9XG5cblx0XHRpZiAoaXNMaW1pdGluZ0NoYXJhY3RlckluV29yZCgpKSB7XG5cdFx0XHRtb3ZlVG9OZXh0Q2hhcigpO1xuXHRcdH1cblxuXHRcdGlmIChvcHRpb25zLmRpcmVjdGlvbiA9PT0gJ2ZvcndhcmQnICYmIG9wdGlvbnMudG8gPT09ICdiZWdpbm5pbmcnKSB7XG5cdFx0XHR0b0VuZE9mTm9uV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyLCBpc0xpbWl0aW5nQ2hhcmFjdGVyKTtcblx0XHR9XG5cdFx0XG5cdFx0dG9FbmRPZldoaXRlU3BhY2VTZXF1ZW5jZShtb3ZlVG9OZXh0Q2hhciwgaXNMaW1pdGluZ0NoYXJhY3Rlcik7XG5cblx0XHRpZiAob3B0aW9ucy5kaXJlY3Rpb24gPT09ICdmb3J3YXJkJyAmJiBvcHRpb25zLnRvID09PSAnZW5kaW5nJyB8fFxuXHRcdFx0b3B0aW9ucy5kaXJlY3Rpb24gPT09ICdiYWNrd2FyZCcgJiYgb3B0aW9ucy50byA9PT0gJ2JlZ2lubmluZycpIHtcblx0XHRcdHRvRW5kT2ZOb25XaGl0ZVNwYWNlU2VxdWVuY2UobW92ZVRvTmV4dENoYXIsIGlzTGltaXRpbmdDaGFyYWN0ZXIpO1xuXHRcdFx0aWYgKCFpc0xpbWl0aW5nQ2hhcmFjdGVyKCkpIHtcblx0XHRcdFx0bW92ZVRvUHJldmlvdXNDaGFyKCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNCbG9ja2luZygpKSB7XG5cdFx0XHRjdXJzb3IucmVzdG9yZVRvU2F2ZWRQb3NpdGlvbigpO1xuXHRcdH1cblx0fVxufTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0ZnJvbUFycmF5T2ZTdHJpbmdzOiBmdW5jdGlvbiAoYXJyYXlPZlN0cmluZ3MpIHtcblx0XHR0aGlzLm1hdHJpeCA9IGFycmF5T2ZTdHJpbmdzLm1hcChmdW5jdGlvbihzdHJpbmcpIHtcblx0XHRcdHJldHVybiBzdHJpbmcuc3BsaXQoJycpO1xuXHRcdH0pO1xuXHR9LFxuXHRtYXA6IGZ1bmN0aW9uKGZuKSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0cml4Lm1hcChmdW5jdGlvbihhcnJheSwgcm93KSB7XG5cdFx0XHRyZXR1cm4gYXJyYXkubWFwKGZ1bmN0aW9uKGl0ZW0sIGNvbHVtbikge1xuXHRcdFx0XHRyZXR1cm4gZm4oaXRlbSwgcm93LCBjb2x1bW4pO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0sXG5cdGdldENvb3JkaW5hdGVzT2Y6IGZ1bmN0aW9uICh0aGluZ1RvRmluZCkge1xuXHRcdHZhciBwcmVkaWNhdGU7XG5cdFx0aWYgKHR5cGVvZiB0aGluZ1RvRmluZCA9PT0gJ3N0cmluZycpIHtcblx0XHRcdHByZWRpY2F0ZSA9IGZ1bmN0aW9uKHN0cmluZywgYW5vdGhlclN0cmluZykge1xuXHRcdFx0XHRyZXR1cm4gc3RyaW5nID09PSBhbm90aGVyU3RyaW5nO1xuXHRcdFx0fTtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiB0aGluZ1RvRmluZCA9PT0gJ29iamVjdCcpIHtcblx0XHRcdHByZWRpY2F0ZSA9IGZ1bmN0aW9uKHRoaW5nVG9GaW5kLCBhbm90aGVyT2JqZWN0KSB7XG5cdFx0XHRcdHJldHVybiBPYmplY3Qua2V5cyh0aGluZ1RvRmluZCkuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRcdHJldHVybiB0aGluZ1RvRmluZFtrZXldICE9PSBhbm90aGVyT2JqZWN0W2tleV07XG5cdFx0XHRcdH0pLmxlbmd0aCA9PT0gMDtcblxuXHRcdFx0fTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMubWF0cml4LnJlZHVjZShmdW5jdGlvbihmb3VuZCwgYXJyYXksIHJvdykge1xuXHRcdFx0YXJyYXkuZm9yRWFjaChmdW5jdGlvbihjZWxsLCBjb2x1bW4pIHtcblx0XHRcdFx0aWYgKHByZWRpY2F0ZSh0aGluZ1RvRmluZCwgY2VsbCkpIHtcblx0XHRcdFx0XHRmb3VuZC5wdXNoKHtcblx0XHRcdFx0XHRcdHJvdzogcm93LFxuXHRcdFx0XHRcdFx0Y29sdW1uOiBjb2x1bW5cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gZm91bmQ7XG5cdFx0fSwgW10pO1xuXHR9XG59OyJdfQ==
