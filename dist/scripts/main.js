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
},{"./cell-decorator.js":1,"./cursor.js":5,"./matrix-decorator.js":9}],3:[function(require,module,exports){
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
var chamber = require('./chamber.js'),
	keys = require('./keys.js'),
	commands = require('./commands.js');

function keypressHandler(e) {
	var character = String.fromCharCode(e.charCode);
	if (keys[character]) {
		keys[character]();
	}
	chamber.render();
}

function changeTheme() {
	var index = changeTheme.currentThemeIndex,
		themes = changeTheme.themes,
		currentTheme = themes[index],
		body = document.querySelector('body');
	body.classList.remove(currentTheme);
	index = (index + 1) % themes.length;
	changeTheme.currentThemeIndex = index;
	currentTheme = themes[index];
	body.classList.add(currentTheme);
}
changeTheme.themes = ['amber', 'green', 'white'];
changeTheme.currentThemeIndex = 0;

function main(json) {
	chamber.fromJSON(json);
	chamber.initialize();
	chamber.render();
	window.removeEventListener('keypress', keypressHandler);
	window.addEventListener('keypress', keypressHandler);
	window.removeEventListener('click', changeTheme);
	window.addEventListener('click', changeTheme);
}

commands['initialize chamber'](main);
},{"./chamber.js":2,"./commands.js":4,"./keys.js":7}],7:[function(require,module,exports){
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
},{"./chamber.js":2,"./command-line.js":3,"./cursor.js":5,"./lib.js":8}],8:[function(require,module,exports){
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
},{"./chamber.js":2,"./cursor.js":5}],9:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NlbGwtZGVjb3JhdG9yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jaGFtYmVyLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jb21tYW5kLWxpbmUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NvbW1hbmRzLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jdXJzb3IuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2Zha2VfNzk2MjNkMTYuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2tleXMuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2xpYi5qcyIsIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9zcmMvbWF0cml4LWRlY29yYXRvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRpc1dhbGw6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBbJysnLCAnLScsICd8J10uaW5kZXhPZih0aGlzLmNoYXJhY3RlcikgIT09IC0xICYmICF0aGlzLmlzVGV4dDtcblx0fSxcblx0aXNMYXplcjogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIFsnVicsICdeJywgJz4nLCAnPCddLmluZGV4T2YodGhpcy5jaGFyYWN0ZXIpICE9PSAtMSAmJiAhdGhpcy5pc1RleHQ7XG5cdH0sXG5cdGlzTGF6ZXJCZWFtOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5pc1ZlcnRpY2FsTGF6ZXJCZWFtIHx8IHRoaXMuaXNIb3Jpem9udGFsTGF6ZXJCZWFtO1xuXHR9LFxuXHRpc0Jsb2NraW5nOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5pc1dhbGwoKSB8fCB0aGlzLmlzTGF6ZXIoKSB8fCB0aGlzLmlzTGF6ZXJCZWFtKCk7XG5cdH0sXG5cdHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgcHJvcGVydHlUb0NsYXNzTmFtZSA9IHtcblx0XHRcdFx0J2lzVGV4dCc6ICd0ZXh0Jyxcblx0XHRcdFx0J2lzVW5kZXJDdXJzb3InOiAnY3Vyc29yJyxcblx0XHRcdFx0J2lzVmVydGljYWxMYXplckJlYW0nOiAndmVydGljYWwtbGF6ZXItYmVhbScsXG5cdFx0XHRcdCdpc0hvcml6b250YWxMYXplckJlYW0nOiAnaG9yaXpvbnRhbC1sYXplci1iZWFtJ1xuXHRcdFx0fSxcblx0XHRcdGNsYXNzTmFtZXMgPSBPYmplY3Qua2V5cyhwcm9wZXJ0eVRvQ2xhc3NOYW1lKS5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdHJldHVybiB0aGlzW2tleV07XG5cdFx0XHR9LmJpbmQodGhpcykpLm1hcChmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0cmV0dXJuIHByb3BlcnR5VG9DbGFzc05hbWVba2V5XTtcblx0XHRcdH0pLmpvaW4oJyAnKTtcblx0XHRcdFxuXHRcdHJldHVybiAnPHNwYW4gIGNsYXNzPVwiJyArIGNsYXNzTmFtZXMgKyAnXCI+JyArIHRoaXMuY2hhcmFjdGVyICsgJzwvc3Bhbj4nO1xuXHR9XG59OyIsInZhciBtYXRyaXhEZWNvcmF0b3IgPSByZXF1aXJlKCcuL21hdHJpeC1kZWNvcmF0b3IuanMnKSxcblx0Y2VsbERlY29yYXRvciA9IHJlcXVpcmUoJy4vY2VsbC1kZWNvcmF0b3IuanMnKSxcblx0Y3Vyc29yID0gcmVxdWlyZSgnLi9jdXJzb3IuanMnKTtcblxudmFyIGNoYW1iZXIgPSBPYmplY3QuY3JlYXRlKG1hdHJpeERlY29yYXRvcik7XG5cbmNoYW1iZXIuZnJvbUpTT04gPSBmdW5jdGlvbihqc29uKSB7XG5cdHRoaXMuZnJvbUFycmF5T2ZTdHJpbmdzKGpzb24uc2NlbmUpO1xuXHRPYmplY3Qua2V5cyhqc29uKS5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7XG5cdFx0cmV0dXJuIGtleSAhPT0gJ3NjZW5lJztcblx0fSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcblx0XHR0aGlzW2tleV0gPSBqc29uW2tleV07XG5cdH0pO1xufTtcblxuY2hhbWJlci5pbml0aWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMucmVwbGFjZUNoYXJhY3RlcnNXaXRoQ2VsbHMoKTtcblx0dGhpcy5tYXJrVGV4dCgpO1xuXHR0aGlzLm1hcmtMYXplcnMoKTtcblx0dGhpcy5tYXJrQ3Vyc29yKCk7XG59O1xuXG5jaGFtYmVyLnJlcGxhY2VDaGFyYWN0ZXJzV2l0aENlbGxzID0gZnVuY3Rpb24oKSB7XG5cdHZhciBjaGFtYmVyID0gdGhpcztcblx0Y2hhbWJlci5tYXRyaXggPSBjaGFtYmVyLm1hcChmdW5jdGlvbihjaGFyYWN0ZXIsIHJvdywgY29sdW1uKSB7XG5cdFx0aWYgKGNoYXJhY3RlciA9PT0gJ0AnKSB7XG5cdFx0XHRjaGFtYmVyLnNwYXduUG9zaXRpb24gPSB7XG5cdFx0XHRcdHJvdzogcm93LFxuXHRcdFx0XHRjb2x1bW46IGNvbHVtblxuXHRcdFx0fTtcblx0XHR9XG5cdFx0dmFyIGNlbGwgPSBPYmplY3QuY3JlYXRlKGNlbGxEZWNvcmF0b3IpO1xuXHRcdGNlbGwucm93ID0gcm93O1xuXHRcdGNlbGwuY29sdW1uID0gY29sdW1uO1xuXHRcdGNlbGwuY2hhcmFjdGVyID0gY2hhcmFjdGVyO1xuXHRcdHJldHVybiBjZWxsO1xuXHR9KTtcbn07XG5cbmNoYW1iZXIubWFya0N1cnNvciA9IGZ1bmN0aW9uKCkge1xuXHRjdXJzb3IucmVzZXQoKTtcblx0Y3Vyc29yLmNvbHVtbiA9IHRoaXMuc3Bhd25Qb3NpdGlvbi5jb2x1bW47XG5cdGN1cnNvci5yb3cgPSB0aGlzLnNwYXduUG9zaXRpb24ucm93O1xufTtcblxuY2hhbWJlci5tYXJrVGV4dCA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgaXNTZXF1ZW5jZU9mVGV4dEluUHJvZ3Jlc3MgPSBmYWxzZSxcblx0XHRsYXN0Q2VsbEluU2VxdWVuY2U7XG5cdHRoaXMubWF0cml4ID0gdGhpcy5tYXAoZnVuY3Rpb24oY2VsbCwgcm93LCBjb2x1bW4pIHtcblx0XHRpZiAoaXNTZXF1ZW5jZU9mVGV4dEluUHJvZ3Jlc3MpIHtcblx0XHRcdGlmIChjZWxsLmNoYXJhY3RlciA9PT0gJ2AnKSB7XG5cdFx0XHRcdGlzU2VxdWVuY2VPZlRleHRJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHRcdGxhc3RDZWxsSW5TZXF1ZW5jZSA9IGNoYW1iZXIubWF0cml4W3Jvd11bY29sdW1uIC0gMV07XG5cdFx0XHRcdGNlbGwuY2hhcmFjdGVyID0gJyAnO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y2VsbC5pc1RleHQgPSB0cnVlO1xuXHRcdFx0XHRpZiAobGFzdENlbGxJblNlcXVlbmNlKSB7XG5cdFx0XHRcdFx0aWYgKE1hdGguYWJzKGxhc3RDZWxsSW5TZXF1ZW5jZS5yb3cgLSBjZWxsLnJvdykgPT09IDEpIHtcblx0XHRcdFx0XHRcdGNlbGwucHJldmlvdXNUZXh0Q2VsbCA9IGxhc3RDZWxsSW5TZXF1ZW5jZTtcblx0XHRcdFx0XHRcdGxhc3RDZWxsSW5TZXF1ZW5jZS5uZXh0VGV4dENlbGwgPSBjZWxsO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRsYXN0Q2VsbEluU2VxdWVuY2UgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKGNlbGwuY2hhcmFjdGVyID09PSAnYCcpIHtcblx0XHRcdFx0aXNTZXF1ZW5jZU9mVGV4dEluUHJvZ3Jlc3MgPSB0cnVlO1xuXHRcdFx0XHRjZWxsLmNoYXJhY3RlciA9ICcgJztcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGNlbGw7XG5cdH0pO1xufTtcblxuY2hhbWJlci5tYXJrTGF6ZXJzID0gZnVuY3Rpb24oKSB7XG5cdHZhciBtYXRyaXggPSB0aGlzLm1hdHJpeDtcblx0dGhpcy5tYXRyaXggPSB0aGlzLm1hcChmdW5jdGlvbihjZWxsLCByb3csIGNvbHVtbikge1xuXHRcdHZhciBjaGFyYWN0ZXIgPSBjZWxsLmNoYXJhY3Rlcixcblx0XHRcdGlzVmVydGljYWxMYXplckJlYW0gPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIFsnPCcsJz4nXS5pbmRleE9mKGNoYXJhY3RlcikgPT09IC0xO1xuXHRcdFx0fSxcblx0XHRcdGJlYW1Qcm9wZXJ0eSA9IGlzVmVydGljYWxMYXplckJlYW0oKSA/ICdpc1ZlcnRpY2FsTGF6ZXJCZWFtJyA6ICdpc0hvcml6b250YWxMYXplckJlYW0nLFxuXHRcdFx0aXNCZWFtQ29udGludWluZyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gbWF0cml4W3Jvd11bY29sdW1uXS5pc0xhemVyQmVhbSgpIHx8ICFtYXRyaXhbcm93XVtjb2x1bW5dLmlzQmxvY2tpbmcoKTtcblx0XHRcdH0sXG5cdFx0XHRuZXh0ID0ge1xuXHRcdFx0XHQnVic6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBtYXRyaXhbcm93KytdW2NvbHVtbl07XG5cdFx0XHRcdH0sXG5cdFx0XHRcdCdeJzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG1hdHJpeFtyb3ctLV1bY29sdW1uXTtcblx0XHRcdFx0fSxcblx0XHRcdFx0Jz4nOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gbWF0cml4W3Jvd11bY29sdW1uKytdO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQnPCc6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBtYXRyaXhbcm93XVtjb2x1bW4tLV07XG5cdFx0XHRcdH1cblx0XHRcdH1bY2hhcmFjdGVyXTtcblx0XHRpZiAobmV4dCkge1xuXHRcdFx0bmV4dCgpO1xuXHRcdFx0d2hpbGUgKGlzQmVhbUNvbnRpbnVpbmcoKSkge1xuXHRcdFx0XHRuZXh0KClbYmVhbVByb3BlcnR5XSA9IHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBjZWxsO1xuXHR9KTtcbn07XG5cbmNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uXTtcbn07XG5cbmNoYW1iZXIucmVuZGVyID0gZnVuY3Rpb24oKSB7XG5cdHZhciBlbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NjZW5lJyk7XG5cdGVsZW1lbnQuaW5uZXJIVE1MID0gY2hhbWJlci5tYXRyaXgubWFwKGZ1bmN0aW9uKGFycmF5KSB7XG5cdFx0YXJyYXkuZm9yRWFjaChmdW5jdGlvbihjZWxsKSB7XG5cdFx0XHRjZWxsLmlzVW5kZXJDdXJzb3IgPSBjZWxsLnJvdyA9PT0gY3Vyc29yLnJvdyAmJiBjZWxsLmNvbHVtbiA9PT0gY3Vyc29yLmNvbHVtbjtcblx0XHR9KTtcblx0XHRyZXR1cm4gYXJyYXkuam9pbignJyk7XG5cdH0pLmpvaW4oJzxicj4nKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gY2hhbWJlcjsiLCJ2YXIgY29tbWFuZHMgPSByZXF1aXJlKCcuL2NvbW1hbmRzLmpzJyk7XG5cbnZhciBjb21tYW5kTGluZSA9IHtcblx0ZXhlY3V0ZTogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGdpdmVuQ29tbWFuZCA9IHRoaXMuZWxlbWVudC52YWx1ZS5zbGljZSgxKTsgLy8gc3RyaXAgY29sb25cblx0XHRPYmplY3Qua2V5cyhjb21tYW5kcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcblx0XHRcdHZhciBtYXRjaGVzID0gZ2l2ZW5Db21tYW5kLm1hdGNoKG5ldyBSZWdFeHAoa2V5KSk7XG5cdFx0XHRpZiAobWF0Y2hlcykge1xuXHRcdFx0XHRjb21tYW5kc1trZXldLmFwcGx5KHRoaXMsIG1hdGNoZXMuc2xpY2UoMSkpOyAvLyBzdHJpcCBtYXRjaGluZyBsaW5lXG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn07XG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuXHRjb21tYW5kTGluZS5lbGVtZW50ID0gd2luZG93LmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNjb21tYW5kLWxpbmUnKTtcblx0Y29tbWFuZExpbmUuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgZnVuY3Rpb24oKSB7XG5cdFx0aWYgKGNvbW1hbmRMaW5lLmVsZW1lbnQudmFsdWUpIHtcblx0XHRcdGNvbW1hbmRMaW5lLmVsZW1lbnQuZm9jdXMoKTtcblx0XHR9XG5cdH0pO1xuXHRjb21tYW5kTGluZS5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXByZXNzJywgZnVuY3Rpb24oZSkge1xuXHRcdGlmIChlLndoaWNoID09PSAxMykge1xuXHRcdFx0Y29tbWFuZExpbmUuZXhlY3V0ZSgpO1xuXHRcdFx0Y29tbWFuZExpbmUuZGVhY3RpdmF0ZSgpO1xuXHRcdH1cblx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHR9KTtcblx0Y29tbWFuZExpbmUuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0aW9uKCkge1xuXHRcdGlmIChjb21tYW5kTGluZS5lbGVtZW50LnZhbHVlID09PSAnJykge1xuXHRcdFx0Y29tbWFuZExpbmUuZGVhY3RpdmF0ZSgpO1xuXHRcdH1cblx0fSk7XG5cdGNvbW1hbmRMaW5lLmFjdGl2YXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5lbGVtZW50LmZvY3VzKCk7XG5cdH07XG5cdGNvbW1hbmRMaW5lLmRlYWN0aXZhdGUgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmVsZW1lbnQudmFsdWUgPSAnJztcblx0XHR0aGlzLmVsZW1lbnQuYmx1cigpO1xuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbW1hbmRMaW5lOyIsInZhciBjb21tYW5kcyA9IHt9LFxuXHRtYWluRnVuY3Rpb247XG5tb2R1bGUuZXhwb3J0cyA9IGNvbW1hbmRzO1xuXG5jb21tYW5kc1snY2hhbWJlciAoXFxcXGQrKSddID0gZnVuY3Rpb24oY2hhbWJlck51bWJlcikge1xuXHR2YXIgeG1saHR0cCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHR4bWxodHRwLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuXHRcdGlmICh4bWxodHRwLnJlYWR5U3RhdGUgIT09IDQpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dmFyIGRlZmF1bHRBY3Rpb24gPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0d2luZG93LmFsZXJ0KHhtbGh0dHAuc3RhdHVzKTtcblx0XHRcdH0sXG5cdFx0XHRhY3Rpb24gPSB7XG5cdFx0XHRcdCcyMDAnOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRsb2NhbFN0b3JhZ2UuY2hhbWJlciA9IGNoYW1iZXJOdW1iZXI7XG5cdFx0XHRcdFx0bWFpbkZ1bmN0aW9uKEpTT04ucGFyc2UoeG1saHR0cC5yZXNwb25zZVRleHQpKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0JzQwNCc6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHdpbmRvdy5hbGVydCgnT3V0IG9mIHN1Y2ggY2hhbWJlcnMnKTtcblx0XHRcdFx0fVxuXHRcdFx0fVt4bWxodHRwLnN0YXR1c10gfHwgZGVmYXVsdEFjdGlvbjtcblx0XHRhY3Rpb24oKTtcblxuXHR9O1xuXHRjaGFtYmVyTnVtYmVyID0gY2hhbWJlck51bWJlciB8fCBsb2NhbFN0b3JhZ2UuY2hhbWJlciB8fCAwO1xuXHR4bWxodHRwLm9wZW4oJ0dFVCcsICcuL2NoYW1iZXJzLycgKyBjaGFtYmVyTnVtYmVyICsgJy5qc29uJywgdHJ1ZSk7XG5cdHhtbGh0dHAuc2VuZCgpO1xufTtcblxuY29tbWFuZHMubG9hZE5leHRDaGFtYmVyID0gZnVuY3Rpb24oKSB7XG5cdHZhciBuZXh0Q2hhbWJlck51bWJlciA9IE51bWJlcihsb2NhbFN0b3JhZ2UuY2hhbWJlcikgKyAxO1xuXHRjb21tYW5kc1snY2hhbWJlciAoXFxcXGQrKSddKG5leHRDaGFtYmVyTnVtYmVyKTtcbn07XG5cbmNvbW1hbmRzWydpbml0aWFsaXplIGNoYW1iZXInXSA9IGZ1bmN0aW9uKG1haW4pIHtcblx0bWFpbkZ1bmN0aW9uID0gbWFpbjtcblx0Y29tbWFuZHNbJ2NoYW1iZXIgKFxcXFxkKyknXSgpO1xufTsiLCJ2YXIgY29tbWFuZHMgPSByZXF1aXJlKCcuL2NvbW1hbmRzLmpzJyk7XG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0c2NvcmU6IDAsXG5cdGFjdE9uQ3VycmVudENlbGw6IGZ1bmN0aW9uKGNoYW1iZXIpIHtcblx0XHR2YXIgY3Vyc29yID0gdGhpcyxcblx0XHRjZWxsID0gY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKSxcblx0XHRhY3Rpb24gPSB7XG5cdFx0XHQnKic6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjZWxsLmNoYXJhY3RlciA9ICcgJztcblx0XHRcdFx0Y3Vyc29yLnNjb3JlKys7XG5cdFx0XHR9LFxuXHRcdFx0J08nOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0Y3Vyc29yLmhhc0NvbXBsZXRlZExldmVsID0gdHJ1ZTtcblx0XHRcdFx0dmFyIGNvbmdyYXR1bGF0aW9uTWVzc2FnZSA9IHtcblx0XHRcdFx0XHQnMCc6ICdZb3UgZGlkIGl0LCBJIGFtIGJvcmVkIHdhdGNoaW5nIHlvdS4nLFxuXHRcdFx0XHRcdCcxJzogJ09ubHkgb25lIHBhdGhldGljIHN0YXI/Jyxcblx0XHRcdFx0XHQnMic6ICdEaWQgeW91IGV2ZW4gdHJ5Pydcblx0XHRcdFx0fVtjdXJzb3Iuc2NvcmVdIHx8ICdTYXRpc2Z5aW5nIHBlcmZvcm1hY2UuJztcblx0XHRcdFx0aWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHdpbmRvdy5hbGVydChjb25ncmF0dWxhdGlvbk1lc3NhZ2UpO1xuXHRcdFx0XHRcdFx0Y29tbWFuZHMubG9hZE5leHRDaGFtYmVyKCk7XG5cdFx0XHRcdFx0fSwgMCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9W2NlbGwuY2hhcmFjdGVyXTtcblx0XHRpZiAoIWNlbGwuaXNUZXh0ICYmIGFjdGlvbikge1xuXHRcdFx0YWN0aW9uKCk7XG5cdFx0fVxuXHR9LFxuXHRyZXNldDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5oYXNDb21wbGV0ZWRMZXZlbCA9IGZhbHNlO1xuXHRcdHRoaXMuc2NvcmUgPSAwO1xuXHRcdHRoaXMuZm9yZ2V0Q29sdW1uRm9yVmVydGljYWxNb3ZlbWVudCgpO1xuXHR9LFxuXHRyZW1lbWJlckNvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQ6IGZ1bmN0aW9uKCkge1xuXHRcdGlmICghdGhpcy5yZW1lbWJlcmVkQ29sdW1uRm9yVmVydGljYWxNb3ZlbWVudCkge1xuXHRcdFx0dGhpcy5yZW1lbWJlcmVkQ29sdW1uRm9yVmVydGljYWxNb3ZlbWVudCA9IHRoaXMuY29sdW1uO1xuXHRcdH1cblx0fSxcblx0Zm9yZ2V0Q29sdW1uRm9yVmVydGljYWxNb3ZlbWVudDogZnVuY3Rpb24oKSB7XG5cdFx0ZGVsZXRlIHRoaXMucmVtZW1iZXJlZENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQ7XG5cdH0sXG5cdHNhdmVDdXJyZW50UG9zaXRpb246IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuc2F2ZWRDb2x1bW4gPSB0aGlzLmNvbHVtbjtcblx0XHR0aGlzLnNhdmVkUm93ID0gdGhpcy5yb3c7XG5cdH0sXG5cdHJlc3RvcmVUb1NhdmVkUG9zaXRpb246IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuY29sdW1uID0gdGhpcy5zYXZlZENvbHVtbjtcblx0XHR0aGlzLnJvdyA9IHRoaXMuc2F2ZWRSb3c7XG5cdH1cbn07IiwidmFyIGNoYW1iZXIgPSByZXF1aXJlKCcuL2NoYW1iZXIuanMnKSxcblx0a2V5cyA9IHJlcXVpcmUoJy4va2V5cy5qcycpLFxuXHRjb21tYW5kcyA9IHJlcXVpcmUoJy4vY29tbWFuZHMuanMnKTtcblxuZnVuY3Rpb24ga2V5cHJlc3NIYW5kbGVyKGUpIHtcblx0dmFyIGNoYXJhY3RlciA9IFN0cmluZy5mcm9tQ2hhckNvZGUoZS5jaGFyQ29kZSk7XG5cdGlmIChrZXlzW2NoYXJhY3Rlcl0pIHtcblx0XHRrZXlzW2NoYXJhY3Rlcl0oKTtcblx0fVxuXHRjaGFtYmVyLnJlbmRlcigpO1xufVxuXG5mdW5jdGlvbiBjaGFuZ2VUaGVtZSgpIHtcblx0dmFyIGluZGV4ID0gY2hhbmdlVGhlbWUuY3VycmVudFRoZW1lSW5kZXgsXG5cdFx0dGhlbWVzID0gY2hhbmdlVGhlbWUudGhlbWVzLFxuXHRcdGN1cnJlbnRUaGVtZSA9IHRoZW1lc1tpbmRleF0sXG5cdFx0Ym9keSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2JvZHknKTtcblx0Ym9keS5jbGFzc0xpc3QucmVtb3ZlKGN1cnJlbnRUaGVtZSk7XG5cdGluZGV4ID0gKGluZGV4ICsgMSkgJSB0aGVtZXMubGVuZ3RoO1xuXHRjaGFuZ2VUaGVtZS5jdXJyZW50VGhlbWVJbmRleCA9IGluZGV4O1xuXHRjdXJyZW50VGhlbWUgPSB0aGVtZXNbaW5kZXhdO1xuXHRib2R5LmNsYXNzTGlzdC5hZGQoY3VycmVudFRoZW1lKTtcbn1cbmNoYW5nZVRoZW1lLnRoZW1lcyA9IFsnYW1iZXInLCAnZ3JlZW4nLCAnd2hpdGUnXTtcbmNoYW5nZVRoZW1lLmN1cnJlbnRUaGVtZUluZGV4ID0gMDtcblxuZnVuY3Rpb24gbWFpbihqc29uKSB7XG5cdGNoYW1iZXIuZnJvbUpTT04oanNvbik7XG5cdGNoYW1iZXIuaW5pdGlhbGl6ZSgpO1xuXHRjaGFtYmVyLnJlbmRlcigpO1xuXHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5cHJlc3MnLCBrZXlwcmVzc0hhbmRsZXIpO1xuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5cHJlc3MnLCBrZXlwcmVzc0hhbmRsZXIpO1xuXHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjaGFuZ2VUaGVtZSk7XG5cdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGNoYW5nZVRoZW1lKTtcbn1cblxuY29tbWFuZHNbJ2luaXRpYWxpemUgY2hhbWJlciddKG1haW4pOyIsInZhciBsaWIgPSByZXF1aXJlKCcuL2xpYi5qcycpLFxuXHRjb21tYW5kTGluZSA9IHJlcXVpcmUoJy4vY29tbWFuZC1saW5lLmpzJyksXG5cdGN1cnNvciA9IHJlcXVpcmUoJy4vY3Vyc29yLmpzJyksXG5cdGNoYW1iZXIgPSByZXF1aXJlKCcuL2NoYW1iZXIuanMnKTtcblxudmFyIGtleXMgPSB7XG5cdCdoJzogZnVuY3Rpb24oKSB7XG5cdFx0bGliWydtb3ZlIGhvcml6b250YWxseSddKHtcblx0XHRcdGRpcmVjdGlvbjogJ2xlZnQnXG5cdFx0fSk7XG5cdH0sXG5cdCdsJzogZnVuY3Rpb24oKSB7XG5cdFx0bGliWydtb3ZlIGhvcml6b250YWxseSddKHtcblx0XHRcdGRpcmVjdGlvbjogJ3JpZ2h0J1xuXHRcdH0pO1xuXHR9LFxuXHQnayc6IGZ1bmN0aW9uKCkge1xuXHRcdGxpYlsnbW92ZSB2ZXJ0aWNhbGx5J10oe1xuXHRcdFx0ZGlyZWN0aW9uOiAndXAnXG5cdFx0fSk7XG5cdH0sXG5cdCdqJzogZnVuY3Rpb24oKSB7XG5cdFx0bGliWydtb3ZlIHZlcnRpY2FsbHknXSh7XG5cdFx0XHRkaXJlY3Rpb246ICdkb3duJ1xuXHRcdH0pO1xuXHR9LFxuXHQnOic6IGZ1bmN0aW9uKCkge1xuXHRcdGNvbW1hbmRMaW5lLmFjdGl2YXRlKCk7XG5cdH0sXG5cdCd3JzogZnVuY3Rpb24oKSB7XG5cdFx0bGliWydtb3ZlIGJ5IHdvcmQnXSh7XG5cdFx0XHRkaXJlY3Rpb246ICdmb3J3YXJkJyxcblx0XHRcdHRvOiAnYmVnaW5uaW5nJ1xuXHRcdH0pO1xuXHR9LFxuXHQnZSc6IGZ1bmN0aW9uKCkge1xuXHRcdGxpYlsnbW92ZSBieSB3b3JkJ10oe1xuXHRcdFx0ZGlyZWN0aW9uOiAnZm9yd2FyZCcsXG5cdFx0XHR0bzogJ2VuZGluZydcblx0XHR9KTtcblx0fSxcblx0J2InOiBmdW5jdGlvbigpIHtcblx0XHRsaWJbJ21vdmUgYnkgd29yZCddKHtcblx0XHRcdGRpcmVjdGlvbjogJ2JhY2t3YXJkJyxcblx0XHRcdHRvOiAnYmVnaW5uaW5nJ1xuXHRcdH0pO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5PYmplY3Qua2V5cyhrZXlzKS5tYXAoZnVuY3Rpb24oa2V5KSB7XG5cdG1vZHVsZS5leHBvcnRzW2tleV0gPSBmdW5jdGlvbihudW1iZXJPZlRpbWVzKSB7XG5cdFx0bnVtYmVyT2ZUaW1lcyA9IG51bWJlck9mVGltZXMgfHwgMTtcblx0XHR3aGlsZSAobnVtYmVyT2ZUaW1lcy0tID4gMCkge1xuXHRcdFx0a2V5c1trZXldKCk7XG5cdFx0XHRjdXJzb3IuYWN0T25DdXJyZW50Q2VsbChjaGFtYmVyKTtcblx0XHR9XG5cdH07XG59KTsiLCJ2YXIgY2hhbWJlciA9IHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLFxuXHRjdXJzb3IgPSByZXF1aXJlKCcuL2N1cnNvci5qcycpO1xuXG5mdW5jdGlvbiBnZXRDdXJyZW50Q2hhcmFjdGVyKCkge1xuXHRyZXR1cm4gY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5jaGFyYWN0ZXI7XG59XG5cbmZ1bmN0aW9uIGlzV29yZENoYXJhY3RlcihjaGFyYWN0ZXIpIHtcblx0cmV0dXJuIC9bQS1aYS16XzAtOV0vLnRlc3QoY2hhcmFjdGVyIHx8IGdldEN1cnJlbnRDaGFyYWN0ZXIoKSk7XG59XG5cbmZ1bmN0aW9uIGlzV2hpdGVTcGFjZUNoYXJhY3RlcihjaGFyYWN0ZXIpIHtcblx0cmV0dXJuIC9cXHMvLnRlc3QoY2hhcmFjdGVyIHx8IGdldEN1cnJlbnRDaGFyYWN0ZXIoKSk7XG59XG5cbmZ1bmN0aW9uIGlzT3RoZXJDaGFyYWN0ZXIoY2hhcmFjdGVyKSB7XG5cdHJldHVybiAvW15BLVphLXpfMC05XFxzXS8udGVzdChjaGFyYWN0ZXIgfHwgZ2V0Q3VycmVudENoYXJhY3RlcigpKTtcbn1cblxuZnVuY3Rpb24gaXNFbmRPZkZpbGUoKSB7XG5cdHJldHVybiBjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmlzRW5kT2ZGaWxlO1xufVxuXG5mdW5jdGlvbiBpc0JlZ2lubmluZ09mRmlsZSgpIHtcblx0cmV0dXJuIGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNCZWdpbm5pbmdPZkZpbGU7XG59XG5cbmZ1bmN0aW9uIHRvRW5kT2ZOb25XaGl0ZVNwYWNlU2VxdWVuY2UobW92ZVRvTmV4dENoYXJhY3RlciwgaXNMaW1pdGluZ0NoYXJhY3Rlcikge1xuXHR2YXIgcHJlZGljYXRlID0gaXNXb3JkQ2hhcmFjdGVyKCkgPyBpc1dvcmRDaGFyYWN0ZXIgOiBpc090aGVyQ2hhcmFjdGVyO1xuXHR3aGlsZSAocHJlZGljYXRlKCkgJiYgIWlzTGltaXRpbmdDaGFyYWN0ZXIoKSkge1xuXHRcdG1vdmVUb05leHRDaGFyYWN0ZXIoKTtcblx0fVxufVxuXG5mdW5jdGlvbiB0b0VuZE9mV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyYWN0ZXIsIGlzTGFzdENoYXJhY3Rlcikge1xuXHR3aGlsZSAoaXNXaGl0ZVNwYWNlQ2hhcmFjdGVyKCkgJiYgIWlzTGFzdENoYXJhY3RlcigpKSB7XG5cdFx0bW92ZVRvTmV4dENoYXJhY3RlcigpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIG1vdmVPbmVDaGFyYWN0ZXJCYWNrd2FyZCAoKSB7XG5cdHZhciBwcmV2aW91c1RleHRDZWxsID0gY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5wcmV2aW91c1RleHRDZWxsO1xuXHRpZiAocHJldmlvdXNUZXh0Q2VsbCkge1xuXHRcdGN1cnNvci5jb2x1bW4gPSBwcmV2aW91c1RleHRDZWxsLmNvbHVtbjtcblx0XHRjdXJzb3Iucm93ID0gcHJldmlvdXNUZXh0Q2VsbC5yb3c7XG5cdH0gZWxzZSBpZiAoY2hhbWJlci5tYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbiAtIDFdLmlzVGV4dCkge1xuXHRcdGN1cnNvci5jb2x1bW4tLTtcblx0fSBlbHNlIHtcblx0XHRjaGFtYmVyLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uXS5pc0JlZ2lubmluZ09mRmlsZSA9IHRydWU7XG5cdH1cbn1cblxuZnVuY3Rpb24gbW92ZU9uZUNoYXJhY3RlckZvcndhcmQoKSB7XG5cdHZhciBuZXh0VGV4dENlbGwgPSBjaGFtYmVyLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uXS5uZXh0VGV4dENlbGw7XG5cdGlmIChuZXh0VGV4dENlbGwpIHtcblx0XHRjdXJzb3IuY29sdW1uID0gbmV4dFRleHRDZWxsLmNvbHVtbjtcblx0XHRjdXJzb3Iucm93ID0gbmV4dFRleHRDZWxsLnJvdztcblx0fSBlbHNlIGlmIChjaGFtYmVyLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uICsgMV0uaXNUZXh0KSB7XG5cdFx0Y3Vyc29yLmNvbHVtbisrO1xuXHR9IGVsc2Uge1xuXHRcdGNoYW1iZXIubWF0cml4W2N1cnNvci5yb3ddW2N1cnNvci5jb2x1bW5dLmlzRW5kT2ZGaWxlID0gdHJ1ZTtcblx0fVxuXHRcbn1cblxuZnVuY3Rpb24gaXNMYXN0Q2hhcmFjdGVySW5Xb3JkICgpIHtcblx0aWYgKGlzV2hpdGVTcGFjZUNoYXJhY3RlcigpKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHZhciBwcmVkaWNhdGUgPSBpc1dvcmRDaGFyYWN0ZXIoKSA/IGlzV29yZENoYXJhY3RlciA6IGlzT3RoZXJDaGFyYWN0ZXI7XG5cblx0dmFyIG5leHRUZXh0Q2VsbCA9IGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkubmV4dFRleHRDZWxsO1xuXHRpZiAobmV4dFRleHRDZWxsKSB7XG5cdFx0cmV0dXJuICFwcmVkaWNhdGUobmV4dFRleHRDZWxsLmNoYXJhY3Rlcik7XG5cdH1cblx0cmV0dXJuICFwcmVkaWNhdGUoY2hhbWJlci5tYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbiArIDFdLmNoYXJhY3Rlcik7XG59XG5cbmZ1bmN0aW9uIGlzRmlyc3RDaGFyYWN0ZXJJbldvcmQgKCkge1xuXHRpZiAoaXNXaGl0ZVNwYWNlQ2hhcmFjdGVyKCkpIHtcblx0XHRyZXR1cm47XG5cdH1cblx0dmFyIHByZWRpY2F0ZSA9IGlzV29yZENoYXJhY3RlcigpID8gaXNXb3JkQ2hhcmFjdGVyIDogaXNPdGhlckNoYXJhY3RlcjtcblxuXHR2YXIgcHJldmlvdXNUZXh0Q2VsbCA9IGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkucHJldmlvdXNUZXh0Q2VsbDtcblx0aWYgKHByZXZpb3VzVGV4dENlbGwpIHtcblx0XHRyZXR1cm4gIXByZWRpY2F0ZShwcmV2aW91c1RleHRDZWxsLmNoYXJhY3Rlcik7XG5cdH1cblx0cmV0dXJuICFwcmVkaWNhdGUoY2hhbWJlci5tYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbiAtIDFdLmNoYXJhY3Rlcik7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHQnbW92ZSBob3Jpem9udGFsbHknOiBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0Y3Vyc29yLnNhdmVDdXJyZW50UG9zaXRpb24oKTtcblxuXHRcdGN1cnNvci5jb2x1bW4gKz0gb3B0aW9ucy5kaXJlY3Rpb24gPT09ICdsZWZ0JyA/IC0xIDogMTtcblx0XHRpZiAoIWNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNCbG9ja2luZygpKSB7XG5cdFx0XHRjdXJzb3IuZm9yZ2V0Q29sdW1uRm9yVmVydGljYWxNb3ZlbWVudCgpO1xuXHRcdH1cblxuXHRcdGlmIChjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmlzQmxvY2tpbmcoKSkge1xuXHRcdFx0Y3Vyc29yLnJlc3RvcmVUb1NhdmVkUG9zaXRpb24oKTtcblx0XHR9XG5cdH0sXG5cdCdtb3ZlIHZlcnRpY2FsbHknOiBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0Y3Vyc29yLnNhdmVDdXJyZW50UG9zaXRpb24oKTtcblxuXHRcdHZhciBtYXRyaXggPSBjaGFtYmVyLm1hdHJpeDtcblx0XHRjdXJzb3IucmVtZW1iZXJDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50KCk7XG5cdFx0dmFyIHN0ZXBzQXNpZGUgPSAwLFxuXHRcdFx0c2lnbiA9IG9wdGlvbnMuZGlyZWN0aW9uID09PSAndXAnID8gLTEgOiAxO1xuXHRcdGlmICghbWF0cml4W2N1cnNvci5yb3cgKyAxICogc2lnbl1bY3Vyc29yLmNvbHVtbl0uaXNXYWxsKCkpIHtcblx0XHRcdHdoaWxlICghbWF0cml4W2N1cnNvci5yb3cgKyAxICogc2lnbl1bY3Vyc29yLmNvbHVtbiArIHN0ZXBzQXNpZGUgKyAxXS5pc1dhbGwoKSAmJlxuXHRcdFx0IGN1cnNvci5jb2x1bW4gKyBzdGVwc0FzaWRlIDwgY3Vyc29yLnJlbWVtYmVyZWRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50KSB7XG5cdFx0XHRcdHN0ZXBzQXNpZGUrKztcblx0XHRcdH1cblx0XHRcdGN1cnNvci5jb2x1bW4gKz0gc3RlcHNBc2lkZTtcblx0XHRcdGN1cnNvci5yb3cgKz0gMSAqIHNpZ247XG5cdFx0fSBlbHNlIHtcblx0XHRcdHdoaWxlICghbWF0cml4W2N1cnNvci5yb3ddW2N1cnNvci5jb2x1bW4gKyBzdGVwc0FzaWRlXS5pc0Jsb2NraW5nKCkpIHtcblx0XHRcdFx0aWYgKCFtYXRyaXhbY3Vyc29yLnJvdyArIDEgKiBzaWduXVtjdXJzb3IuY29sdW1uICsgc3RlcHNBc2lkZV0uaXNCbG9ja2luZygpKSB7XG5cdFx0XHRcdFx0Y3Vyc29yLnJvdyArPSAxICogc2lnbjtcblx0XHRcdFx0XHRjdXJzb3IuY29sdW1uICs9IHN0ZXBzQXNpZGU7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0c3RlcHNBc2lkZS0tO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNCbG9ja2luZygpKSB7XG5cdFx0XHRjdXJzb3IucmVzdG9yZVRvU2F2ZWRQb3NpdGlvbigpO1xuXHRcdH1cblx0fSxcblx0J21vdmUgYnkgd29yZCc6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHRjdXJzb3Iuc2F2ZUN1cnJlbnRQb3NpdGlvbigpO1xuXG5cdFx0aWYgKCFjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmlzVGV4dCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR2YXIgbW92ZVRvTmV4dENoYXIsIG1vdmVUb1ByZXZpb3VzQ2hhciwgaXNMaW1pdGluZ0NoYXJhY3RlciwgaXNMaW1pdGluZ0NoYXJhY3RlckluV29yZDtcblx0XHRcblx0XHRpZiAob3B0aW9ucy5kaXJlY3Rpb24gPT09ICdmb3J3YXJkJykge1xuXHRcdFx0bW92ZVRvTmV4dENoYXIgPSBtb3ZlT25lQ2hhcmFjdGVyRm9yd2FyZDtcblx0XHRcdG1vdmVUb1ByZXZpb3VzQ2hhciA9IG1vdmVPbmVDaGFyYWN0ZXJCYWNrd2FyZDtcblx0XHRcdGlzTGltaXRpbmdDaGFyYWN0ZXIgPSBpc0VuZE9mRmlsZTtcblx0XHRcdGlzTGltaXRpbmdDaGFyYWN0ZXJJbldvcmQgPSBpc0xhc3RDaGFyYWN0ZXJJbldvcmQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG1vdmVUb05leHRDaGFyID0gbW92ZU9uZUNoYXJhY3RlckJhY2t3YXJkO1xuXHRcdFx0bW92ZVRvUHJldmlvdXNDaGFyID0gbW92ZU9uZUNoYXJhY3RlckZvcndhcmQ7XG5cdFx0XHRpc0xpbWl0aW5nQ2hhcmFjdGVyID0gaXNCZWdpbm5pbmdPZkZpbGU7XG5cdFx0XHRpc0xpbWl0aW5nQ2hhcmFjdGVySW5Xb3JkID0gaXNGaXJzdENoYXJhY3RlckluV29yZDtcblx0XHR9XG5cblx0XHRpZiAoaXNMaW1pdGluZ0NoYXJhY3RlckluV29yZCgpKSB7XG5cdFx0XHRtb3ZlVG9OZXh0Q2hhcigpO1xuXHRcdH1cblxuXHRcdGlmIChvcHRpb25zLmRpcmVjdGlvbiA9PT0gJ2ZvcndhcmQnICYmIG9wdGlvbnMudG8gPT09ICdiZWdpbm5pbmcnKSB7XG5cdFx0XHR0b0VuZE9mTm9uV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyLCBpc0xpbWl0aW5nQ2hhcmFjdGVyKTtcblx0XHR9XG5cdFx0XG5cdFx0dG9FbmRPZldoaXRlU3BhY2VTZXF1ZW5jZShtb3ZlVG9OZXh0Q2hhciwgaXNMaW1pdGluZ0NoYXJhY3Rlcik7XG5cblx0XHRpZiAob3B0aW9ucy5kaXJlY3Rpb24gPT09ICdmb3J3YXJkJyAmJiBvcHRpb25zLnRvID09PSAnZW5kaW5nJyB8fFxuXHRcdFx0b3B0aW9ucy5kaXJlY3Rpb24gPT09ICdiYWNrd2FyZCcgJiYgb3B0aW9ucy50byA9PT0gJ2JlZ2lubmluZycpIHtcblx0XHRcdHRvRW5kT2ZOb25XaGl0ZVNwYWNlU2VxdWVuY2UobW92ZVRvTmV4dENoYXIsIGlzTGltaXRpbmdDaGFyYWN0ZXIpO1xuXHRcdFx0aWYgKCFpc0xpbWl0aW5nQ2hhcmFjdGVyKCkpIHtcblx0XHRcdFx0bW92ZVRvUHJldmlvdXNDaGFyKCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNCbG9ja2luZygpKSB7XG5cdFx0XHRjdXJzb3IucmVzdG9yZVRvU2F2ZWRQb3NpdGlvbigpO1xuXHRcdH1cblx0fVxufTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0ZnJvbUFycmF5T2ZTdHJpbmdzOiBmdW5jdGlvbiAoYXJyYXlPZlN0cmluZ3MpIHtcblx0XHR0aGlzLm1hdHJpeCA9IGFycmF5T2ZTdHJpbmdzLm1hcChmdW5jdGlvbihzdHJpbmcpIHtcblx0XHRcdHJldHVybiBzdHJpbmcuc3BsaXQoJycpO1xuXHRcdH0pO1xuXHR9LFxuXHRtYXA6IGZ1bmN0aW9uKGZuKSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0cml4Lm1hcChmdW5jdGlvbihhcnJheSwgcm93KSB7XG5cdFx0XHRyZXR1cm4gYXJyYXkubWFwKGZ1bmN0aW9uKGl0ZW0sIGNvbHVtbikge1xuXHRcdFx0XHRyZXR1cm4gZm4oaXRlbSwgcm93LCBjb2x1bW4pO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0sXG5cdGdldENvb3JkaW5hdGVzT2Y6IGZ1bmN0aW9uICh0aGluZ1RvRmluZCkge1xuXHRcdHZhciBwcmVkaWNhdGU7XG5cdFx0aWYgKHR5cGVvZiB0aGluZ1RvRmluZCA9PT0gJ3N0cmluZycpIHtcblx0XHRcdHByZWRpY2F0ZSA9IGZ1bmN0aW9uKHN0cmluZywgYW5vdGhlclN0cmluZykge1xuXHRcdFx0XHRyZXR1cm4gc3RyaW5nID09PSBhbm90aGVyU3RyaW5nO1xuXHRcdFx0fTtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiB0aGluZ1RvRmluZCA9PT0gJ29iamVjdCcpIHtcblx0XHRcdHByZWRpY2F0ZSA9IGZ1bmN0aW9uKHRoaW5nVG9GaW5kLCBhbm90aGVyT2JqZWN0KSB7XG5cdFx0XHRcdHJldHVybiBPYmplY3Qua2V5cyh0aGluZ1RvRmluZCkuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRcdHJldHVybiB0aGluZ1RvRmluZFtrZXldICE9PSBhbm90aGVyT2JqZWN0W2tleV07XG5cdFx0XHRcdH0pLmxlbmd0aCA9PT0gMDtcblxuXHRcdFx0fTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMubWF0cml4LnJlZHVjZShmdW5jdGlvbihmb3VuZCwgYXJyYXksIHJvdykge1xuXHRcdFx0YXJyYXkuZm9yRWFjaChmdW5jdGlvbihjZWxsLCBjb2x1bW4pIHtcblx0XHRcdFx0aWYgKHByZWRpY2F0ZSh0aGluZ1RvRmluZCwgY2VsbCkpIHtcblx0XHRcdFx0XHRmb3VuZC5wdXNoKHtcblx0XHRcdFx0XHRcdHJvdzogcm93LFxuXHRcdFx0XHRcdFx0Y29sdW1uOiBjb2x1bW5cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gZm91bmQ7XG5cdFx0fSwgW10pO1xuXHR9XG59OyJdfQ==
