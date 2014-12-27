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
},{"./cell-decorator.js":1,"./cursor.js":4,"./matrix-decorator.js":6}],3:[function(require,module,exports){
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
},{}],4:[function(require,module,exports){
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
},{"./commands.js":3}],5:[function(require,module,exports){
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
},{"./chamber.js":2,"./cursor.js":4}],6:[function(require,module,exports){
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
},{}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NlbGwtZGVjb3JhdG9yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jaGFtYmVyLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jb21tYW5kcy5qcyIsIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9zcmMvY3Vyc29yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9mYWtlXzNmYmZkODMuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL21hdHJpeC1kZWNvcmF0b3IuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRpc1dhbGw6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBbJysnLCAnLScsICd8J10uaW5kZXhPZih0aGlzLmNoYXJhY3RlcikgIT09IC0xICYmICF0aGlzLmlzVGV4dDtcblx0fSxcblx0aXNMYXplcjogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIFsnVicsICdeJywgJz4nLCAnPCddLmluZGV4T2YodGhpcy5jaGFyYWN0ZXIpICE9PSAtMSAmJiAhdGhpcy5pc1RleHQ7XG5cdH0sXG5cdGlzTGF6ZXJCZWFtOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5pc1ZlcnRpY2FsTGF6ZXJCZWFtIHx8IHRoaXMuaXNIb3Jpem9udGFsTGF6ZXJCZWFtO1xuXHR9LFxuXHRpc0Jsb2NraW5nOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5pc1dhbGwoKSB8fCB0aGlzLmlzTGF6ZXIoKSB8fCB0aGlzLmlzTGF6ZXJCZWFtKCk7XG5cdH0sXG5cdHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgcHJvcGVydHlUb0NsYXNzTmFtZSA9IHtcblx0XHRcdFx0J2lzVGV4dCc6ICd0ZXh0Jyxcblx0XHRcdFx0J2lzVW5kZXJDdXJzb3InOiAnY3Vyc29yJyxcblx0XHRcdFx0J2lzVmVydGljYWxMYXplckJlYW0nOiAndmVydGljYWwtbGF6ZXItYmVhbScsXG5cdFx0XHRcdCdpc0hvcml6b250YWxMYXplckJlYW0nOiAnaG9yaXpvbnRhbC1sYXplci1iZWFtJ1xuXHRcdFx0fSxcblx0XHRcdGNsYXNzTmFtZXMgPSBPYmplY3Qua2V5cyhwcm9wZXJ0eVRvQ2xhc3NOYW1lKS5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdHJldHVybiB0aGlzW2tleV07XG5cdFx0XHR9LmJpbmQodGhpcykpLm1hcChmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0cmV0dXJuIHByb3BlcnR5VG9DbGFzc05hbWVba2V5XTtcblx0XHRcdH0pLmpvaW4oJyAnKTtcblx0XHRcdFxuXHRcdHJldHVybiAnPHNwYW4gIGNsYXNzPVwiJyArIGNsYXNzTmFtZXMgKyAnXCI+JyArIHRoaXMuY2hhcmFjdGVyICsgJzwvc3Bhbj4nO1xuXHR9XG59OyIsInZhciBtYXRyaXhEZWNvcmF0b3IgPSByZXF1aXJlKCcuL21hdHJpeC1kZWNvcmF0b3IuanMnKSxcblx0Y2VsbERlY29yYXRvciA9IHJlcXVpcmUoJy4vY2VsbC1kZWNvcmF0b3IuanMnKSxcblx0Y3Vyc29yID0gcmVxdWlyZSgnLi9jdXJzb3IuanMnKTtcblxudmFyIGNoYW1iZXIgPSBPYmplY3QuY3JlYXRlKG1hdHJpeERlY29yYXRvcik7XG5cbmNoYW1iZXIuZnJvbUpTT04gPSBmdW5jdGlvbihqc29uKSB7XG5cdHRoaXMuZnJvbUFycmF5T2ZTdHJpbmdzKGpzb24uc2NlbmUpO1xuXHRPYmplY3Qua2V5cyhqc29uKS5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7XG5cdFx0cmV0dXJuIGtleSAhPT0gJ3NjZW5lJztcblx0fSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcblx0XHR0aGlzW2tleV0gPSBqc29uW2tleV07XG5cdH0pO1xufTtcblxuY2hhbWJlci5pbml0aWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMucmVwbGFjZUNoYXJhY3RlcnNXaXRoQ2VsbHMoKTtcblx0dGhpcy5tYXJrVGV4dCgpO1xuXHR0aGlzLm1hcmtMYXplcnMoKTtcblx0dGhpcy5tYXJrQ3Vyc29yKCk7XG59O1xuXG5jaGFtYmVyLnJlcGxhY2VDaGFyYWN0ZXJzV2l0aENlbGxzID0gZnVuY3Rpb24oKSB7XG5cdHZhciBjaGFtYmVyID0gdGhpcztcblx0Y2hhbWJlci5tYXRyaXggPSBjaGFtYmVyLm1hcChmdW5jdGlvbihjaGFyYWN0ZXIsIHJvdywgY29sdW1uKSB7XG5cdFx0aWYgKGNoYXJhY3RlciA9PT0gJ0AnKSB7XG5cdFx0XHRjaGFtYmVyLnNwYXduUG9zaXRpb24gPSB7XG5cdFx0XHRcdHJvdzogcm93LFxuXHRcdFx0XHRjb2x1bW46IGNvbHVtblxuXHRcdFx0fTtcblx0XHR9XG5cdFx0dmFyIGNlbGwgPSBPYmplY3QuY3JlYXRlKGNlbGxEZWNvcmF0b3IpO1xuXHRcdGNlbGwucm93ID0gcm93O1xuXHRcdGNlbGwuY29sdW1uID0gY29sdW1uO1xuXHRcdGNlbGwuY2hhcmFjdGVyID0gY2hhcmFjdGVyO1xuXHRcdHJldHVybiBjZWxsO1xuXHR9KTtcbn07XG5cbmNoYW1iZXIubWFya0N1cnNvciA9IGZ1bmN0aW9uKCkge1xuXHRjdXJzb3IucmVzZXQoKTtcblx0Y3Vyc29yLmNvbHVtbiA9IHRoaXMuc3Bhd25Qb3NpdGlvbi5jb2x1bW47XG5cdGN1cnNvci5yb3cgPSB0aGlzLnNwYXduUG9zaXRpb24ucm93O1xufTtcblxuY2hhbWJlci5tYXJrVGV4dCA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgaXNTZXF1ZW5jZU9mVGV4dEluUHJvZ3Jlc3MgPSBmYWxzZSxcblx0XHRsYXN0Q2VsbEluU2VxdWVuY2U7XG5cdHRoaXMubWF0cml4ID0gdGhpcy5tYXAoZnVuY3Rpb24oY2VsbCwgcm93LCBjb2x1bW4pIHtcblx0XHRpZiAoaXNTZXF1ZW5jZU9mVGV4dEluUHJvZ3Jlc3MpIHtcblx0XHRcdGlmIChjZWxsLmNoYXJhY3RlciA9PT0gJ2AnKSB7XG5cdFx0XHRcdGlzU2VxdWVuY2VPZlRleHRJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHRcdGxhc3RDZWxsSW5TZXF1ZW5jZSA9IGNoYW1iZXIubWF0cml4W3Jvd11bY29sdW1uIC0gMV07XG5cdFx0XHRcdGNlbGwuY2hhcmFjdGVyID0gJyAnO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y2VsbC5pc1RleHQgPSB0cnVlO1xuXHRcdFx0XHRpZiAobGFzdENlbGxJblNlcXVlbmNlKSB7XG5cdFx0XHRcdFx0aWYgKE1hdGguYWJzKGxhc3RDZWxsSW5TZXF1ZW5jZS5yb3cgLSBjZWxsLnJvdykgPT09IDEpIHtcblx0XHRcdFx0XHRcdGNlbGwucHJldmlvdXNUZXh0Q2VsbCA9IGxhc3RDZWxsSW5TZXF1ZW5jZTtcblx0XHRcdFx0XHRcdGxhc3RDZWxsSW5TZXF1ZW5jZS5uZXh0VGV4dENlbGwgPSBjZWxsO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRsYXN0Q2VsbEluU2VxdWVuY2UgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKGNlbGwuY2hhcmFjdGVyID09PSAnYCcpIHtcblx0XHRcdFx0aXNTZXF1ZW5jZU9mVGV4dEluUHJvZ3Jlc3MgPSB0cnVlO1xuXHRcdFx0XHRjZWxsLmNoYXJhY3RlciA9ICcgJztcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGNlbGw7XG5cdH0pO1xufTtcblxuY2hhbWJlci5tYXJrTGF6ZXJzID0gZnVuY3Rpb24oKSB7XG5cdHZhciBtYXRyaXggPSB0aGlzLm1hdHJpeDtcblx0dGhpcy5tYXRyaXggPSB0aGlzLm1hcChmdW5jdGlvbihjZWxsLCByb3csIGNvbHVtbikge1xuXHRcdHZhciBjaGFyYWN0ZXIgPSBjZWxsLmNoYXJhY3Rlcixcblx0XHRcdGlzVmVydGljYWxMYXplckJlYW0gPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIFsnPCcsJz4nXS5pbmRleE9mKGNoYXJhY3RlcikgPT09IC0xO1xuXHRcdFx0fSxcblx0XHRcdGJlYW1Qcm9wZXJ0eSA9IGlzVmVydGljYWxMYXplckJlYW0oKSA/ICdpc1ZlcnRpY2FsTGF6ZXJCZWFtJyA6ICdpc0hvcml6b250YWxMYXplckJlYW0nLFxuXHRcdFx0aXNCZWFtQ29udGludWluZyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gbWF0cml4W3Jvd11bY29sdW1uXS5pc0xhemVyQmVhbSgpIHx8ICFtYXRyaXhbcm93XVtjb2x1bW5dLmlzQmxvY2tpbmcoKTtcblx0XHRcdH0sXG5cdFx0XHRuZXh0ID0ge1xuXHRcdFx0XHQnVic6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBtYXRyaXhbcm93KytdW2NvbHVtbl07XG5cdFx0XHRcdH0sXG5cdFx0XHRcdCdeJzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG1hdHJpeFtyb3ctLV1bY29sdW1uXTtcblx0XHRcdFx0fSxcblx0XHRcdFx0Jz4nOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gbWF0cml4W3Jvd11bY29sdW1uKytdO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQnPCc6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBtYXRyaXhbcm93XVtjb2x1bW4tLV07XG5cdFx0XHRcdH1cblx0XHRcdH1bY2hhcmFjdGVyXTtcblx0XHRpZiAobmV4dCkge1xuXHRcdFx0bmV4dCgpO1xuXHRcdFx0d2hpbGUgKGlzQmVhbUNvbnRpbnVpbmcoKSkge1xuXHRcdFx0XHRuZXh0KClbYmVhbVByb3BlcnR5XSA9IHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBjZWxsO1xuXHR9KTtcbn07XG5cbmNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uXTtcbn07XG5cbmNoYW1iZXIucmVuZGVyID0gZnVuY3Rpb24oKSB7XG5cdHZhciBlbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NjZW5lJyk7XG5cdGVsZW1lbnQuaW5uZXJIVE1MID0gY2hhbWJlci5tYXRyaXgubWFwKGZ1bmN0aW9uKGFycmF5KSB7XG5cdFx0YXJyYXkuZm9yRWFjaChmdW5jdGlvbihjZWxsKSB7XG5cdFx0XHRjZWxsLmlzVW5kZXJDdXJzb3IgPSBjZWxsLnJvdyA9PT0gY3Vyc29yLnJvdyAmJiBjZWxsLmNvbHVtbiA9PT0gY3Vyc29yLmNvbHVtbjtcblx0XHR9KTtcblx0XHRyZXR1cm4gYXJyYXkuam9pbignJyk7XG5cdH0pLmpvaW4oJzxicj4nKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gY2hhbWJlcjsiLCJ2YXIgY29tbWFuZHMgPSB7fSxcblx0bWFpbkZ1bmN0aW9uO1xubW9kdWxlLmV4cG9ydHMgPSBjb21tYW5kcztcblxuY29tbWFuZHNbJ2NoYW1iZXIgKFxcXFxkKyknXSA9IGZ1bmN0aW9uKGNoYW1iZXJOdW1iZXIpIHtcblx0dmFyIHhtbGh0dHAgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0eG1saHR0cC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcblx0XHRpZiAoeG1saHR0cC5yZWFkeVN0YXRlICE9PSA0KSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHZhciBkZWZhdWx0QWN0aW9uID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHdpbmRvdy5hbGVydCh4bWxodHRwLnN0YXR1cyk7XG5cdFx0XHR9LFxuXHRcdFx0YWN0aW9uID0ge1xuXHRcdFx0XHQnMjAwJzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0bG9jYWxTdG9yYWdlLmNoYW1iZXIgPSBjaGFtYmVyTnVtYmVyO1xuXHRcdFx0XHRcdG1haW5GdW5jdGlvbihKU09OLnBhcnNlKHhtbGh0dHAucmVzcG9uc2VUZXh0KSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdCc0MDQnOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR3aW5kb3cuYWxlcnQoJ091dCBvZiBzdWNoIGNoYW1iZXJzJyk7XG5cdFx0XHRcdH1cblx0XHRcdH1beG1saHR0cC5zdGF0dXNdIHx8IGRlZmF1bHRBY3Rpb247XG5cdFx0YWN0aW9uKCk7XG5cblx0fTtcblx0Y2hhbWJlck51bWJlciA9IGNoYW1iZXJOdW1iZXIgfHwgbG9jYWxTdG9yYWdlLmNoYW1iZXIgfHwgMDtcblx0eG1saHR0cC5vcGVuKCdHRVQnLCAnLi9jaGFtYmVycy8nICsgY2hhbWJlck51bWJlciArICcuanNvbicsIHRydWUpO1xuXHR4bWxodHRwLnNlbmQoKTtcbn07XG5cbmNvbW1hbmRzLmxvYWROZXh0Q2hhbWJlciA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgbmV4dENoYW1iZXJOdW1iZXIgPSBOdW1iZXIobG9jYWxTdG9yYWdlLmNoYW1iZXIpICsgMTtcblx0Y29tbWFuZHNbJ2NoYW1iZXIgKFxcXFxkKyknXShuZXh0Q2hhbWJlck51bWJlcik7XG59O1xuXG5jb21tYW5kc1snaW5pdGlhbGl6ZSBjaGFtYmVyJ10gPSBmdW5jdGlvbihtYWluKSB7XG5cdG1haW5GdW5jdGlvbiA9IG1haW47XG5cdGNvbW1hbmRzWydjaGFtYmVyIChcXFxcZCspJ10oKTtcbn07IiwidmFyIGNvbW1hbmRzID0gcmVxdWlyZSgnLi9jb21tYW5kcy5qcycpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG5cdHNjb3JlOiAwLFxuXHRhY3RPbkN1cnJlbnRDZWxsOiBmdW5jdGlvbihjaGFtYmVyKSB7XG5cdFx0dmFyIGN1cnNvciA9IHRoaXMsXG5cdFx0Y2VsbCA9IGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCksXG5cdFx0YWN0aW9uID0ge1xuXHRcdFx0JyonOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0Y2VsbC5jaGFyYWN0ZXIgPSAnICc7XG5cdFx0XHRcdGN1cnNvci5zY29yZSsrO1xuXHRcdFx0fSxcblx0XHRcdCdPJzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGN1cnNvci5oYXNDb21wbGV0ZWRMZXZlbCA9IHRydWU7XG5cdFx0XHRcdHZhciBjb25ncmF0dWxhdGlvbk1lc3NhZ2UgPSB7XG5cdFx0XHRcdFx0JzAnOiAnWW91IGRpZCBpdCwgSSBhbSBib3JlZCB3YXRjaGluZyB5b3UuJyxcblx0XHRcdFx0XHQnMSc6ICdPbmx5IG9uZSBwYXRoZXRpYyBzdGFyPycsXG5cdFx0XHRcdFx0JzInOiAnRGlkIHlvdSBldmVuIHRyeT8nXG5cdFx0XHRcdH1bY3Vyc29yLnNjb3JlXSB8fCAnU2F0aXNmeWluZyBwZXJmb3JtYWNlLic7XG5cdFx0XHRcdGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHR3aW5kb3cuYWxlcnQoY29uZ3JhdHVsYXRpb25NZXNzYWdlKTtcblx0XHRcdFx0XHRcdGNvbW1hbmRzLmxvYWROZXh0Q2hhbWJlcigpO1xuXHRcdFx0XHRcdH0sIDApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVtjZWxsLmNoYXJhY3Rlcl07XG5cdFx0aWYgKCFjZWxsLmlzVGV4dCAmJiBhY3Rpb24pIHtcblx0XHRcdGFjdGlvbigpO1xuXHRcdH1cblx0fSxcblx0cmVzZXQ6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuaGFzQ29tcGxldGVkTGV2ZWwgPSBmYWxzZTtcblx0XHR0aGlzLnNjb3JlID0gMDtcblx0XHR0aGlzLmZvcmdldENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQoKTtcblx0fSxcblx0cmVtZW1iZXJDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50OiBmdW5jdGlvbigpIHtcblx0XHRpZiAoIXRoaXMucmVtZW1iZXJlZENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQpIHtcblx0XHRcdHRoaXMucmVtZW1iZXJlZENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQgPSB0aGlzLmNvbHVtbjtcblx0XHR9XG5cdH0sXG5cdGZvcmdldENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQ6IGZ1bmN0aW9uKCkge1xuXHRcdGRlbGV0ZSB0aGlzLnJlbWVtYmVyZWRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50O1xuXHR9LFxuXHRzYXZlQ3VycmVudFBvc2l0aW9uOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnNhdmVkQ29sdW1uID0gdGhpcy5jb2x1bW47XG5cdFx0dGhpcy5zYXZlZFJvdyA9IHRoaXMucm93O1xuXHR9LFxuXHRyZXN0b3JlVG9TYXZlZFBvc2l0aW9uOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmNvbHVtbiA9IHRoaXMuc2F2ZWRDb2x1bW47XG5cdFx0dGhpcy5yb3cgPSB0aGlzLnNhdmVkUm93O1xuXHR9XG59OyIsInZhciBjaGFtYmVyID0gcmVxdWlyZSgnLi9jaGFtYmVyLmpzJyksXG5cdGN1cnNvciA9IHJlcXVpcmUoJy4vY3Vyc29yLmpzJyk7XG5cbmZ1bmN0aW9uIGdldEN1cnJlbnRDaGFyYWN0ZXIoKSB7XG5cdHJldHVybiBjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmNoYXJhY3Rlcjtcbn1cblxuZnVuY3Rpb24gaXNXb3JkQ2hhcmFjdGVyKGNoYXJhY3Rlcikge1xuXHRyZXR1cm4gL1tBLVphLXpfMC05XS8udGVzdChjaGFyYWN0ZXIgfHwgZ2V0Q3VycmVudENoYXJhY3RlcigpKTtcbn1cblxuZnVuY3Rpb24gaXNXaGl0ZVNwYWNlQ2hhcmFjdGVyKGNoYXJhY3Rlcikge1xuXHRyZXR1cm4gL1xccy8udGVzdChjaGFyYWN0ZXIgfHwgZ2V0Q3VycmVudENoYXJhY3RlcigpKTtcbn1cblxuZnVuY3Rpb24gaXNPdGhlckNoYXJhY3RlcihjaGFyYWN0ZXIpIHtcblx0cmV0dXJuIC9bXkEtWmEtel8wLTlcXHNdLy50ZXN0KGNoYXJhY3RlciB8fCBnZXRDdXJyZW50Q2hhcmFjdGVyKCkpO1xufVxuXG5mdW5jdGlvbiBpc0VuZE9mRmlsZSgpIHtcblx0cmV0dXJuIGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNFbmRPZkZpbGU7XG59XG5cbmZ1bmN0aW9uIGlzQmVnaW5uaW5nT2ZGaWxlKCkge1xuXHRyZXR1cm4gY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0JlZ2lubmluZ09mRmlsZTtcbn1cblxuZnVuY3Rpb24gdG9FbmRPZk5vbldoaXRlU3BhY2VTZXF1ZW5jZShtb3ZlVG9OZXh0Q2hhcmFjdGVyLCBpc0xpbWl0aW5nQ2hhcmFjdGVyKSB7XG5cdHZhciBwcmVkaWNhdGUgPSBpc1dvcmRDaGFyYWN0ZXIoKSA/IGlzV29yZENoYXJhY3RlciA6IGlzT3RoZXJDaGFyYWN0ZXI7XG5cdHdoaWxlIChwcmVkaWNhdGUoKSAmJiAhaXNMaW1pdGluZ0NoYXJhY3RlcigpKSB7XG5cdFx0bW92ZVRvTmV4dENoYXJhY3RlcigpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHRvRW5kT2ZXaGl0ZVNwYWNlU2VxdWVuY2UobW92ZVRvTmV4dENoYXJhY3RlciwgaXNMYXN0Q2hhcmFjdGVyKSB7XG5cdHdoaWxlIChpc1doaXRlU3BhY2VDaGFyYWN0ZXIoKSAmJiAhaXNMYXN0Q2hhcmFjdGVyKCkpIHtcblx0XHRtb3ZlVG9OZXh0Q2hhcmFjdGVyKCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gbW92ZU9uZUNoYXJhY3RlckJhY2t3YXJkICgpIHtcblx0dmFyIHByZXZpb3VzVGV4dENlbGwgPSBjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLnByZXZpb3VzVGV4dENlbGw7XG5cdGlmIChwcmV2aW91c1RleHRDZWxsKSB7XG5cdFx0Y3Vyc29yLmNvbHVtbiA9IHByZXZpb3VzVGV4dENlbGwuY29sdW1uO1xuXHRcdGN1cnNvci5yb3cgPSBwcmV2aW91c1RleHRDZWxsLnJvdztcblx0fSBlbHNlIGlmIChjaGFtYmVyLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uIC0gMV0uaXNUZXh0KSB7XG5cdFx0Y3Vyc29yLmNvbHVtbi0tO1xuXHR9IGVsc2Uge1xuXHRcdGNoYW1iZXIubWF0cml4W2N1cnNvci5yb3ddW2N1cnNvci5jb2x1bW5dLmlzQmVnaW5uaW5nT2ZGaWxlID0gdHJ1ZTtcblx0fVxufVxuXG5mdW5jdGlvbiBtb3ZlT25lQ2hhcmFjdGVyRm9yd2FyZCgpIHtcblx0dmFyIG5leHRUZXh0Q2VsbCA9IGNoYW1iZXIubWF0cml4W2N1cnNvci5yb3ddW2N1cnNvci5jb2x1bW5dLm5leHRUZXh0Q2VsbDtcblx0aWYgKG5leHRUZXh0Q2VsbCkge1xuXHRcdGN1cnNvci5jb2x1bW4gPSBuZXh0VGV4dENlbGwuY29sdW1uO1xuXHRcdGN1cnNvci5yb3cgPSBuZXh0VGV4dENlbGwucm93O1xuXHR9IGVsc2UgaWYgKGNoYW1iZXIubWF0cml4W2N1cnNvci5yb3ddW2N1cnNvci5jb2x1bW4gKyAxXS5pc1RleHQpIHtcblx0XHRjdXJzb3IuY29sdW1uKys7XG5cdH0gZWxzZSB7XG5cdFx0Y2hhbWJlci5tYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbl0uaXNFbmRPZkZpbGUgPSB0cnVlO1xuXHR9XG5cdFxufVxuXG5mdW5jdGlvbiBpc0xhc3RDaGFyYWN0ZXJJbldvcmQgKCkge1xuXHRpZiAoaXNXaGl0ZVNwYWNlQ2hhcmFjdGVyKCkpIHtcblx0XHRyZXR1cm47XG5cdH1cblx0dmFyIHByZWRpY2F0ZSA9IGlzV29yZENoYXJhY3RlcigpID8gaXNXb3JkQ2hhcmFjdGVyIDogaXNPdGhlckNoYXJhY3RlcjtcblxuXHR2YXIgbmV4dFRleHRDZWxsID0gY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5uZXh0VGV4dENlbGw7XG5cdGlmIChuZXh0VGV4dENlbGwpIHtcblx0XHRyZXR1cm4gIXByZWRpY2F0ZShuZXh0VGV4dENlbGwuY2hhcmFjdGVyKTtcblx0fVxuXHRyZXR1cm4gIXByZWRpY2F0ZShjaGFtYmVyLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uICsgMV0uY2hhcmFjdGVyKTtcbn1cblxuZnVuY3Rpb24gaXNGaXJzdENoYXJhY3RlckluV29yZCAoKSB7XG5cdGlmIChpc1doaXRlU3BhY2VDaGFyYWN0ZXIoKSkge1xuXHRcdHJldHVybjtcblx0fVxuXHR2YXIgcHJlZGljYXRlID0gaXNXb3JkQ2hhcmFjdGVyKCkgPyBpc1dvcmRDaGFyYWN0ZXIgOiBpc090aGVyQ2hhcmFjdGVyO1xuXG5cdHZhciBwcmV2aW91c1RleHRDZWxsID0gY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5wcmV2aW91c1RleHRDZWxsO1xuXHRpZiAocHJldmlvdXNUZXh0Q2VsbCkge1xuXHRcdHJldHVybiAhcHJlZGljYXRlKHByZXZpb3VzVGV4dENlbGwuY2hhcmFjdGVyKTtcblx0fVxuXHRyZXR1cm4gIXByZWRpY2F0ZShjaGFtYmVyLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uIC0gMV0uY2hhcmFjdGVyKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdCdtb3ZlIGhvcml6b250YWxseSc6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHRjdXJzb3Iuc2F2ZUN1cnJlbnRQb3NpdGlvbigpO1xuXG5cdFx0Y3Vyc29yLmNvbHVtbiArPSBvcHRpb25zLmRpcmVjdGlvbiA9PT0gJ2xlZnQnID8gLTEgOiAxO1xuXHRcdGlmICghY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0Jsb2NraW5nKCkpIHtcblx0XHRcdGN1cnNvci5mb3JnZXRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50KCk7XG5cdFx0fVxuXG5cdFx0aWYgKGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNCbG9ja2luZygpKSB7XG5cdFx0XHRjdXJzb3IucmVzdG9yZVRvU2F2ZWRQb3NpdGlvbigpO1xuXHRcdH1cblx0fSxcblx0J21vdmUgdmVydGljYWxseSc6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHRjdXJzb3Iuc2F2ZUN1cnJlbnRQb3NpdGlvbigpO1xuXG5cdFx0dmFyIG1hdHJpeCA9IGNoYW1iZXIubWF0cml4O1xuXHRcdGN1cnNvci5yZW1lbWJlckNvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQoKTtcblx0XHR2YXIgc3RlcHNBc2lkZSA9IDAsXG5cdFx0XHRzaWduID0gb3B0aW9ucy5kaXJlY3Rpb24gPT09ICd1cCcgPyAtMSA6IDE7XG5cdFx0aWYgKCFtYXRyaXhbY3Vyc29yLnJvdyArIDEgKiBzaWduXVtjdXJzb3IuY29sdW1uXS5pc1dhbGwoKSkge1xuXHRcdFx0d2hpbGUgKCFtYXRyaXhbY3Vyc29yLnJvdyArIDEgKiBzaWduXVtjdXJzb3IuY29sdW1uICsgc3RlcHNBc2lkZSArIDFdLmlzV2FsbCgpICYmXG5cdFx0XHQgY3Vyc29yLmNvbHVtbiArIHN0ZXBzQXNpZGUgPCBjdXJzb3IucmVtZW1iZXJlZENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQpIHtcblx0XHRcdFx0c3RlcHNBc2lkZSsrO1xuXHRcdFx0fVxuXHRcdFx0Y3Vyc29yLmNvbHVtbiArPSBzdGVwc0FzaWRlO1xuXHRcdFx0Y3Vyc29yLnJvdyArPSAxICogc2lnbjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0d2hpbGUgKCFtYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbiArIHN0ZXBzQXNpZGVdLmlzQmxvY2tpbmcoKSkge1xuXHRcdFx0XHRpZiAoIW1hdHJpeFtjdXJzb3Iucm93ICsgMSAqIHNpZ25dW2N1cnNvci5jb2x1bW4gKyBzdGVwc0FzaWRlXS5pc0Jsb2NraW5nKCkpIHtcblx0XHRcdFx0XHRjdXJzb3Iucm93ICs9IDEgKiBzaWduO1xuXHRcdFx0XHRcdGN1cnNvci5jb2x1bW4gKz0gc3RlcHNBc2lkZTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRzdGVwc0FzaWRlLS07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0Jsb2NraW5nKCkpIHtcblx0XHRcdGN1cnNvci5yZXN0b3JlVG9TYXZlZFBvc2l0aW9uKCk7XG5cdFx0fVxuXHR9LFxuXHQnbW92ZSBieSB3b3JkJzogZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdGN1cnNvci5zYXZlQ3VycmVudFBvc2l0aW9uKCk7XG5cblx0XHRpZiAoIWNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNUZXh0KSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHZhciBtb3ZlVG9OZXh0Q2hhciwgbW92ZVRvUHJldmlvdXNDaGFyLCBpc0xpbWl0aW5nQ2hhcmFjdGVyLCBpc0xpbWl0aW5nQ2hhcmFjdGVySW5Xb3JkO1xuXHRcdFxuXHRcdGlmIChvcHRpb25zLmRpcmVjdGlvbiA9PT0gJ2ZvcndhcmQnKSB7XG5cdFx0XHRtb3ZlVG9OZXh0Q2hhciA9IG1vdmVPbmVDaGFyYWN0ZXJGb3J3YXJkO1xuXHRcdFx0bW92ZVRvUHJldmlvdXNDaGFyID0gbW92ZU9uZUNoYXJhY3RlckJhY2t3YXJkO1xuXHRcdFx0aXNMaW1pdGluZ0NoYXJhY3RlciA9IGlzRW5kT2ZGaWxlO1xuXHRcdFx0aXNMaW1pdGluZ0NoYXJhY3RlckluV29yZCA9IGlzTGFzdENoYXJhY3RlckluV29yZDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bW92ZVRvTmV4dENoYXIgPSBtb3ZlT25lQ2hhcmFjdGVyQmFja3dhcmQ7XG5cdFx0XHRtb3ZlVG9QcmV2aW91c0NoYXIgPSBtb3ZlT25lQ2hhcmFjdGVyRm9yd2FyZDtcblx0XHRcdGlzTGltaXRpbmdDaGFyYWN0ZXIgPSBpc0JlZ2lubmluZ09mRmlsZTtcblx0XHRcdGlzTGltaXRpbmdDaGFyYWN0ZXJJbldvcmQgPSBpc0ZpcnN0Q2hhcmFjdGVySW5Xb3JkO1xuXHRcdH1cblxuXHRcdGlmIChpc0xpbWl0aW5nQ2hhcmFjdGVySW5Xb3JkKCkpIHtcblx0XHRcdG1vdmVUb05leHRDaGFyKCk7XG5cdFx0fVxuXG5cdFx0aWYgKG9wdGlvbnMuZGlyZWN0aW9uID09PSAnZm9yd2FyZCcgJiYgb3B0aW9ucy50byA9PT0gJ2JlZ2lubmluZycpIHtcblx0XHRcdHRvRW5kT2ZOb25XaGl0ZVNwYWNlU2VxdWVuY2UobW92ZVRvTmV4dENoYXIsIGlzTGltaXRpbmdDaGFyYWN0ZXIpO1xuXHRcdH1cblx0XHRcblx0XHR0b0VuZE9mV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyLCBpc0xpbWl0aW5nQ2hhcmFjdGVyKTtcblxuXHRcdGlmIChvcHRpb25zLmRpcmVjdGlvbiA9PT0gJ2ZvcndhcmQnICYmIG9wdGlvbnMudG8gPT09ICdlbmRpbmcnIHx8XG5cdFx0XHRvcHRpb25zLmRpcmVjdGlvbiA9PT0gJ2JhY2t3YXJkJyAmJiBvcHRpb25zLnRvID09PSAnYmVnaW5uaW5nJykge1xuXHRcdFx0dG9FbmRPZk5vbldoaXRlU3BhY2VTZXF1ZW5jZShtb3ZlVG9OZXh0Q2hhciwgaXNMaW1pdGluZ0NoYXJhY3Rlcik7XG5cdFx0XHRpZiAoIWlzTGltaXRpbmdDaGFyYWN0ZXIoKSkge1xuXHRcdFx0XHRtb3ZlVG9QcmV2aW91c0NoYXIoKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0Jsb2NraW5nKCkpIHtcblx0XHRcdGN1cnNvci5yZXN0b3JlVG9TYXZlZFBvc2l0aW9uKCk7XG5cdFx0fVxuXHR9XG59OyIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRmcm9tQXJyYXlPZlN0cmluZ3M6IGZ1bmN0aW9uIChhcnJheU9mU3RyaW5ncykge1xuXHRcdHRoaXMubWF0cml4ID0gYXJyYXlPZlN0cmluZ3MubWFwKGZ1bmN0aW9uKHN0cmluZykge1xuXHRcdFx0cmV0dXJuIHN0cmluZy5zcGxpdCgnJyk7XG5cdFx0fSk7XG5cdH0sXG5cdG1hcDogZnVuY3Rpb24oZm4pIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRyaXgubWFwKGZ1bmN0aW9uKGFycmF5LCByb3cpIHtcblx0XHRcdHJldHVybiBhcnJheS5tYXAoZnVuY3Rpb24oaXRlbSwgY29sdW1uKSB7XG5cdFx0XHRcdHJldHVybiBmbihpdGVtLCByb3csIGNvbHVtbik7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fSxcblx0Z2V0Q29vcmRpbmF0ZXNPZjogZnVuY3Rpb24gKHRoaW5nVG9GaW5kKSB7XG5cdFx0dmFyIHByZWRpY2F0ZTtcblx0XHRpZiAodHlwZW9mIHRoaW5nVG9GaW5kID09PSAnc3RyaW5nJykge1xuXHRcdFx0cHJlZGljYXRlID0gZnVuY3Rpb24oc3RyaW5nLCBhbm90aGVyU3RyaW5nKSB7XG5cdFx0XHRcdHJldHVybiBzdHJpbmcgPT09IGFub3RoZXJTdHJpbmc7XG5cdFx0XHR9O1xuXHRcdH1cblx0XHRpZiAodHlwZW9mIHRoaW5nVG9GaW5kID09PSAnb2JqZWN0Jykge1xuXHRcdFx0cHJlZGljYXRlID0gZnVuY3Rpb24odGhpbmdUb0ZpbmQsIGFub3RoZXJPYmplY3QpIHtcblx0XHRcdFx0cmV0dXJuIE9iamVjdC5rZXlzKHRoaW5nVG9GaW5kKS5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaW5nVG9GaW5kW2tleV0gIT09IGFub3RoZXJPYmplY3Rba2V5XTtcblx0XHRcdFx0fSkubGVuZ3RoID09PSAwO1xuXG5cdFx0XHR9O1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5tYXRyaXgucmVkdWNlKGZ1bmN0aW9uKGZvdW5kLCBhcnJheSwgcm93KSB7XG5cdFx0XHRhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKGNlbGwsIGNvbHVtbikge1xuXHRcdFx0XHRpZiAocHJlZGljYXRlKHRoaW5nVG9GaW5kLCBjZWxsKSkge1xuXHRcdFx0XHRcdGZvdW5kLnB1c2goe1xuXHRcdFx0XHRcdFx0cm93OiByb3csXG5cdFx0XHRcdFx0XHRjb2x1bW46IGNvbHVtblxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmb3VuZDtcblx0XHR9LCBbXSk7XG5cdH1cbn07Il19
