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
var commands = {}, mainFunction;
module.exports = commands;

commands['chamber (\\d+)'] = function(chamberNumber) {
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState !== 4) {
			return;
		} else if (xmlhttp.status === 200) {
			localStorage.chamber = chamberNumber;
			mainFunction(JSON.parse(xmlhttp.responseText));
		} else if (xmlhttp.status === 404) {
			alert('Out of chambers');
		} else {
			alert(xmlhttp.status);
		}
		
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
} 
},{}],3:[function(require,module,exports){
var commands = require('./commands.js');
module.exports = {
	score: 0,
	reactOnCurrentCellOnScene: function(scene) {
		var cursor = this,
		cell = scene.getCellUnderCursor(),
		reaction = {
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
						alert(congratulationMessage);
						commands.loadNextChamber();
					}, 0);
				}
			}
		}[cell.character];
		if (!cell.isText && reaction) {
			reaction();
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
},{"./commands.js":2}],4:[function(require,module,exports){
var scene = require('./scene.js'),
	cursor = require('./cursor.js');



module.exports = {
	'move horizontally': function(options) {
		var matrix = scene.matrix;
		var _column = cursor.column + (options.direction === 'left' ? -1 : 1);

		if (!matrix[cursor.row][_column].isBlocking()) {
			cursor.column = _column;
			cursor.forgetColumnForVerticalMovement();
		}
	},
	'move vertically': function(options) {
		var matrix = scene.matrix;
		cursor.saveCurrentPosition();
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
		if (matrix[cursor.row][cursor.column].isBlocking()) {
			cursor.restoreToSavedPosition();
		}
	},
	'move by word': function(options) {
		if (!scene.getCellUnderCursor().isText) {
			return;
		}
		var moveToNextChar, isLastCharacter;
		cursor.saveCurrentPosition();
		
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
				if (!scene.getCellUnderCursor().isEndOfFile) {
					moveOneCharacterBackward();
				}
				
			} else if (options.direction === 'backward' && options.to === 'beginning') {
				toEndOfNonWhiteSpaceSequence(moveToNextChar, isLastCharacter);
				
				if (!scene.getCellUnderCursor().isBeginningOfFile) {
					moveOneCharacterForward();
				}
			}
		} else {

			if (options.direction === 'forward' && options.to === 'ending') {
				toEndOfNonWhiteSpaceSequence(moveToNextChar, isLastCharacter);
				if (!scene.getCellUnderCursor().isEndOfFile) {
					moveOneCharacterBackward();
				}
			} else if (options.direction === 'forward' && options.to === 'beginning') {
				toEndOfNonWhiteSpaceSequence(moveToNextChar, isLastCharacter);
				toEndOfWhiteSpaceSequence(moveToNextChar, isLastCharacter);
			} else if (options.direction === 'backward' && options.to === 'beginning') {
				toEndOfNonWhiteSpaceSequence(moveToNextChar, isLastCharacter);
				if (!scene.getCellUnderCursor().isBeginningOfFile) {
					moveOneCharacterForward();
				}
			}
		}
		if (scene.matrix[cursor.row][cursor.column].isBlocking()) {
			cursor.restoreToSavedPosition();
		}
	}
};


function getCurrentCharacter() {
	return scene.getCellUnderCursor().character;
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
	return scene.getCellUnderCursor().isEndOfFile;
}

function isBeginningOfFile() {
	return scene.getCellUnderCursor().isBeginningOfFile;
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
	var previousTextCell = scene.getCellUnderCursor().previousTextCell;
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

	var nextTextCell = scene.getCellUnderCursor().nextTextCell;
	if (nextTextCell) {
		return !predicate(nextTextCell.character)
	}

	return !predicate(scene.matrix[cursor.row][cursor.column + 1].character);
}

function isFirstCharacterInWord () {
	var predicate = isWordCharacter() ? isWordCharacter : isOtherCharacter;

	var previousTextCell = scene.getCellUnderCursor().previousTextCell;
	if (previousTextCell) {
		return !predicate(previousTextCell.character)
	}

	return !predicate(scene.matrix[cursor.row][cursor.column - 1].character);
}
},{"./cursor.js":3,"./scene.js":6}],5:[function(require,module,exports){
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
},{}],6:[function(require,module,exports){
var matrixDecorator = require('./matrix-decorator.js'),
	cellDecorator = require('./cell-decorator.js'),
	cursor = require('./cursor.js');

var scene = Object.create(matrixDecorator);

scene.fromJSON = function(json) {
	this.fromArrayOfStrings(json.scene);
	Object.keys(json).filter(function(key) {
		return key !== 'scene'
	}).forEach(function(key) {
		this[key] = json[key];
	})
};

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
		var cell = Object.create(cellDecorator);
		cell.row = row;
		cell.column = column;
		cell.character = character;
		return cell;
	}, scene);
};

scene.markCursor = function() {
	cursor.reset();
	cursor.column = this.spawnPosition.column;
	cursor.row = this.spawnPosition.row;
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
	this.matrix = this.map(function(cell, row, column) {
		var continueBeam,
			character = cell.character,
			isVerticalLazerBeam = function() {
				return ['<','>'].indexOf(character) === -1;
			},
			beamProperty = isVerticalLazerBeam() ? 'isVerticalLazerBeam' : 'isHorizontalLazerBeam';
			isBeamContinuing = function() {
				return matrix[row][column].isLazerBeam() || !matrix[row][column].isBlocking();
			},
			nextCell = {
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
		if (nextCell) {
			nextCell();
			while (isBeamContinuing()) {
				nextCell()[beamProperty] = true;
			}
		}
		return cell;
	});
};

scene.getCellUnderCursor = function() {
	return this.matrix[cursor.row][cursor.column];
};

scene.render = function() {
	var element = document.querySelector('#scene');
	element.innerHTML = scene.matrix.map(function(array) {
		array.forEach(function(cell) {
			cell.isUnderCursor = cell.row === cursor.row && cell.column === cursor.column;
		})
		return array.join('');
	}).join('<br>');
};

module.exports = scene;
},{"./cell-decorator.js":1,"./cursor.js":3,"./matrix-decorator.js":5}]},{},[4])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NlbGwtZGVjb3JhdG9yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jb21tYW5kcy5qcyIsIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9zcmMvY3Vyc29yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9mYWtlXzNlZGVhZWVhLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9tYXRyaXgtZGVjb3JhdG9yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9zY2VuZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0aXNXYWxsOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gWycrJywgJy0nLCAnfCddLmluZGV4T2YodGhpcy5jaGFyYWN0ZXIpICE9PSAtMSAmJiAhdGhpcy5pc1RleHQ7XG5cdH0sXG5cdGlzTGF6ZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBbJ1YnLCAnXicsICc+JywgJzwnXS5pbmRleE9mKHRoaXMuY2hhcmFjdGVyKSAhPT0gLTEgJiYgIXRoaXMuaXNUZXh0O1xuXHR9LFxuXHRpc0xhemVyQmVhbTogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuaXNWZXJ0aWNhbExhemVyQmVhbSB8fCB0aGlzLmlzSG9yaXpvbnRhbExhemVyQmVhbTtcblx0fSxcblx0aXNCbG9ja2luZzogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuaXNXYWxsKCkgfHwgdGhpcy5pc0xhemVyKCkgfHwgdGhpcy5pc0xhemVyQmVhbSgpO1xuXHR9LFxuXHR0b1N0cmluZzogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHByb3BlcnR5VG9DbGFzc05hbWUgPSB7XG5cdFx0XHRcdCdpc1RleHQnOiAndGV4dCcsXG5cdFx0XHRcdCdpc1VuZGVyQ3Vyc29yJzogJ2N1cnNvcicsXG5cdFx0XHRcdCdpc1ZlcnRpY2FsTGF6ZXJCZWFtJzogJ3ZlcnRpY2FsLWxhemVyLWJlYW0nLFxuXHRcdFx0XHQnaXNIb3Jpem9udGFsTGF6ZXJCZWFtJzogJ2hvcml6b250YWwtbGF6ZXItYmVhbSdcblx0XHRcdH0sXG5cdFx0XHRjbGFzc05hbWVzID0gT2JqZWN0LmtleXMocHJvcGVydHlUb0NsYXNzTmFtZSkuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRyZXR1cm4gdGhpc1trZXldO1xuXHRcdFx0fS5iaW5kKHRoaXMpKS5tYXAoZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdHJldHVybiBwcm9wZXJ0eVRvQ2xhc3NOYW1lW2tleV07XG5cdFx0XHR9KS5qb2luKCcgJyk7XG5cdFx0XHRcblx0XHRyZXR1cm4gJzxzcGFuICBjbGFzcz1cIicgKyBjbGFzc05hbWVzICsgJ1wiPicgKyB0aGlzLmNoYXJhY3RlciArICc8L3NwYW4+Jztcblx0fVxufTsiLCJ2YXIgY29tbWFuZHMgPSB7fSwgbWFpbkZ1bmN0aW9uO1xubW9kdWxlLmV4cG9ydHMgPSBjb21tYW5kcztcblxuY29tbWFuZHNbJ2NoYW1iZXIgKFxcXFxkKyknXSA9IGZ1bmN0aW9uKGNoYW1iZXJOdW1iZXIpIHtcblx0dmFyIHhtbGh0dHAgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0eG1saHR0cC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcblx0XHRpZiAoeG1saHR0cC5yZWFkeVN0YXRlICE9PSA0KSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fSBlbHNlIGlmICh4bWxodHRwLnN0YXR1cyA9PT0gMjAwKSB7XG5cdFx0XHRsb2NhbFN0b3JhZ2UuY2hhbWJlciA9IGNoYW1iZXJOdW1iZXI7XG5cdFx0XHRtYWluRnVuY3Rpb24oSlNPTi5wYXJzZSh4bWxodHRwLnJlc3BvbnNlVGV4dCkpO1xuXHRcdH0gZWxzZSBpZiAoeG1saHR0cC5zdGF0dXMgPT09IDQwNCkge1xuXHRcdFx0YWxlcnQoJ091dCBvZiBjaGFtYmVycycpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRhbGVydCh4bWxodHRwLnN0YXR1cyk7XG5cdFx0fVxuXHRcdFxuXHR9O1xuXHRjaGFtYmVyTnVtYmVyID0gY2hhbWJlck51bWJlciB8fCBsb2NhbFN0b3JhZ2UuY2hhbWJlciB8fCAwO1xuXHR4bWxodHRwLm9wZW4oJ0dFVCcsICcuL2NoYW1iZXJzLycgKyBjaGFtYmVyTnVtYmVyICsgJy5qc29uJywgdHJ1ZSk7XG5cdHhtbGh0dHAuc2VuZCgpO1xufTtcblxuY29tbWFuZHMubG9hZE5leHRDaGFtYmVyID0gZnVuY3Rpb24oKSB7XG5cdHZhciBuZXh0Q2hhbWJlck51bWJlciA9IE51bWJlcihsb2NhbFN0b3JhZ2UuY2hhbWJlcikgKyAxO1xuXHRjb21tYW5kc1snY2hhbWJlciAoXFxcXGQrKSddKG5leHRDaGFtYmVyTnVtYmVyKTtcbn07XG5cbmNvbW1hbmRzWydpbml0aWFsaXplIGNoYW1iZXInXSA9IGZ1bmN0aW9uKG1haW4pIHtcblx0bWFpbkZ1bmN0aW9uID0gbWFpbjtcblx0Y29tbWFuZHNbJ2NoYW1iZXIgKFxcXFxkKyknXSgpO1xufSAiLCJ2YXIgY29tbWFuZHMgPSByZXF1aXJlKCcuL2NvbW1hbmRzLmpzJyk7XG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0c2NvcmU6IDAsXG5cdHJlYWN0T25DdXJyZW50Q2VsbE9uU2NlbmU6IGZ1bmN0aW9uKHNjZW5lKSB7XG5cdFx0dmFyIGN1cnNvciA9IHRoaXMsXG5cdFx0Y2VsbCA9IHNjZW5lLmdldENlbGxVbmRlckN1cnNvcigpLFxuXHRcdHJlYWN0aW9uID0ge1xuXHRcdFx0JyonOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0Y2VsbC5jaGFyYWN0ZXIgPSAnICc7XG5cdFx0XHRcdGN1cnNvci5zY29yZSsrO1xuXHRcdFx0fSxcblx0XHRcdCdPJzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGN1cnNvci5oYXNDb21wbGV0ZWRMZXZlbCA9IHRydWU7XG5cdFx0XHRcdHZhciBjb25ncmF0dWxhdGlvbk1lc3NhZ2UgPSB7XG5cdFx0XHRcdFx0JzAnOiAnWW91IGRpZCBpdCwgSSBhbSBib3JlZCB3YXRjaGluZyB5b3UuJyxcblx0XHRcdFx0XHQnMSc6ICdPbmx5IG9uZSBwYXRoZXRpYyBzdGFyPycsXG5cdFx0XHRcdFx0JzInOiAnRGlkIHlvdSBldmVuIHRyeT8nXG5cdFx0XHRcdH1bY3Vyc29yLnNjb3JlXSB8fCAnU2F0aXNmeWluZyBwZXJmb3JtYWNlLic7XG5cdFx0XHRcdGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRhbGVydChjb25ncmF0dWxhdGlvbk1lc3NhZ2UpO1xuXHRcdFx0XHRcdFx0Y29tbWFuZHMubG9hZE5leHRDaGFtYmVyKCk7XG5cdFx0XHRcdFx0fSwgMCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9W2NlbGwuY2hhcmFjdGVyXTtcblx0XHRpZiAoIWNlbGwuaXNUZXh0ICYmIHJlYWN0aW9uKSB7XG5cdFx0XHRyZWFjdGlvbigpO1xuXHRcdH1cblx0fSxcblx0cmVzZXQ6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuaGFzQ29tcGxldGVkTGV2ZWwgPSBmYWxzZTtcblx0XHR0aGlzLnNjb3JlID0gMDtcblx0XHR0aGlzLmZvcmdldENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQoKTtcblx0fSxcblx0cmVtZW1iZXJDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50OiBmdW5jdGlvbigpIHtcblx0XHRpZiAoIXRoaXMucmVtZW1iZXJlZENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQpIHtcblx0XHRcdHRoaXMucmVtZW1iZXJlZENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQgPSB0aGlzLmNvbHVtbjtcblx0XHR9XG5cdH0sXG5cdGZvcmdldENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQ6IGZ1bmN0aW9uKCkge1xuXHRcdGRlbGV0ZSB0aGlzLnJlbWVtYmVyZWRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50O1xuXHR9LFxuXHRzYXZlQ3VycmVudFBvc2l0aW9uOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnNhdmVkQ29sdW1uID0gdGhpcy5jb2x1bW47XG5cdFx0dGhpcy5zYXZlZFJvdyA9IHRoaXMucm93O1xuXHR9LFxuXHRyZXN0b3JlVG9TYXZlZFBvc2l0aW9uOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmNvbHVtbiA9IHRoaXMuc2F2ZWRDb2x1bW47XG5cdFx0dGhpcy5yb3cgPSB0aGlzLnNhdmVkUm93O1xuXHR9XG59OyIsInZhciBzY2VuZSA9IHJlcXVpcmUoJy4vc2NlbmUuanMnKSxcblx0Y3Vyc29yID0gcmVxdWlyZSgnLi9jdXJzb3IuanMnKTtcblxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHQnbW92ZSBob3Jpem9udGFsbHknOiBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0dmFyIG1hdHJpeCA9IHNjZW5lLm1hdHJpeDtcblx0XHR2YXIgX2NvbHVtbiA9IGN1cnNvci5jb2x1bW4gKyAob3B0aW9ucy5kaXJlY3Rpb24gPT09ICdsZWZ0JyA/IC0xIDogMSk7XG5cblx0XHRpZiAoIW1hdHJpeFtjdXJzb3Iucm93XVtfY29sdW1uXS5pc0Jsb2NraW5nKCkpIHtcblx0XHRcdGN1cnNvci5jb2x1bW4gPSBfY29sdW1uO1xuXHRcdFx0Y3Vyc29yLmZvcmdldENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQoKTtcblx0XHR9XG5cdH0sXG5cdCdtb3ZlIHZlcnRpY2FsbHknOiBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0dmFyIG1hdHJpeCA9IHNjZW5lLm1hdHJpeDtcblx0XHRjdXJzb3Iuc2F2ZUN1cnJlbnRQb3NpdGlvbigpO1xuXHRcdGN1cnNvci5yZW1lbWJlckNvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQoKTtcblx0XHR2YXIgc3RlcHNBc2lkZSA9IDAsXG5cdFx0XHRzaWduID0gb3B0aW9ucy5kaXJlY3Rpb24gPT09ICd1cCcgPyAtMSA6IDE7XG5cdFx0aWYgKCFtYXRyaXhbY3Vyc29yLnJvdyArIDEgKiBzaWduXVtjdXJzb3IuY29sdW1uXS5pc1dhbGwoKSkge1xuXHRcdFx0d2hpbGUgKCFtYXRyaXhbY3Vyc29yLnJvdyArIDEgKiBzaWduXVtjdXJzb3IuY29sdW1uICsgc3RlcHNBc2lkZSArIDFdLmlzV2FsbCgpICYmXG5cdFx0XHQgY3Vyc29yLmNvbHVtbiArIHN0ZXBzQXNpZGUgPCBjdXJzb3IucmVtZW1iZXJlZENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQpIHtcblx0XHRcdFx0c3RlcHNBc2lkZSsrO1xuXHRcdFx0fVxuXHRcdFx0Y3Vyc29yLmNvbHVtbiArPSBzdGVwc0FzaWRlO1xuXHRcdFx0Y3Vyc29yLnJvdyArPSAxICogc2lnbjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0d2hpbGUgKCFtYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbiArIHN0ZXBzQXNpZGVdLmlzQmxvY2tpbmcoKSkge1xuXHRcdFx0XHRpZiAoIW1hdHJpeFtjdXJzb3Iucm93ICsgMSAqIHNpZ25dW2N1cnNvci5jb2x1bW4gKyBzdGVwc0FzaWRlXS5pc0Jsb2NraW5nKCkpIHtcblx0XHRcdFx0XHRjdXJzb3Iucm93ICs9IDEgKiBzaWduO1xuXHRcdFx0XHRcdGN1cnNvci5jb2x1bW4gKz0gc3RlcHNBc2lkZTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRzdGVwc0FzaWRlLS07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKG1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uXS5pc0Jsb2NraW5nKCkpIHtcblx0XHRcdGN1cnNvci5yZXN0b3JlVG9TYXZlZFBvc2l0aW9uKCk7XG5cdFx0fVxuXHR9LFxuXHQnbW92ZSBieSB3b3JkJzogZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdGlmICghc2NlbmUuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNUZXh0KSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHZhciBtb3ZlVG9OZXh0Q2hhciwgaXNMYXN0Q2hhcmFjdGVyO1xuXHRcdGN1cnNvci5zYXZlQ3VycmVudFBvc2l0aW9uKCk7XG5cdFx0XG5cdFx0aWYgKG9wdGlvbnMuZGlyZWN0aW9uID09PSAnZm9yd2FyZCcpIHtcblx0XHRcdG1vdmVUb05leHRDaGFyID0gbW92ZU9uZUNoYXJhY3RlckZvcndhcmQ7XG5cdFx0XHRpc0xhc3RDaGFyYWN0ZXIgPSBpc0VuZE9mRmlsZTtcblx0XHRcdGlmICghaXNXaGl0ZVNwYWNlQ2hhcmFjdGVyKCkgJiYgaXNMYXN0Q2hhcmFjdGVySW5Xb3JkKCkpIHtcblx0XHRcdFx0bW92ZU9uZUNoYXJhY3RlckZvcndhcmQoKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0bW92ZVRvTmV4dENoYXIgPSBtb3ZlT25lQ2hhcmFjdGVyQmFja3dhcmQ7XG5cdFx0XHRpc0xhc3RDaGFyYWN0ZXIgPSBpc0JlZ2lubmluZ09mRmlsZTtcblx0XHRcdGlmICghaXNXaGl0ZVNwYWNlQ2hhcmFjdGVyKCkgJiYgaXNGaXJzdENoYXJhY3RlckluV29yZCgpKSB7XG5cdFx0XHRcdG1vdmVPbmVDaGFyYWN0ZXJCYWNrd2FyZCgpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChpc1doaXRlU3BhY2VDaGFyYWN0ZXIoKSkge1xuXHRcdFx0dG9FbmRPZldoaXRlU3BhY2VTZXF1ZW5jZShtb3ZlVG9OZXh0Q2hhciwgaXNMYXN0Q2hhcmFjdGVyKTtcblx0XHRcdGlmIChvcHRpb25zLmRpcmVjdGlvbiA9PT0gJ2ZvcndhcmQnICYmIG9wdGlvbnMudG8gPT09ICdlbmRpbmcnKSB7XG5cdFx0XHRcdHRvRW5kT2ZOb25XaGl0ZVNwYWNlU2VxdWVuY2UobW92ZVRvTmV4dENoYXIsIGlzTGFzdENoYXJhY3Rlcik7XG5cdFx0XHRcdGlmICghc2NlbmUuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNFbmRPZkZpbGUpIHtcblx0XHRcdFx0XHRtb3ZlT25lQ2hhcmFjdGVyQmFja3dhcmQoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdH0gZWxzZSBpZiAob3B0aW9ucy5kaXJlY3Rpb24gPT09ICdiYWNrd2FyZCcgJiYgb3B0aW9ucy50byA9PT0gJ2JlZ2lubmluZycpIHtcblx0XHRcdFx0dG9FbmRPZk5vbldoaXRlU3BhY2VTZXF1ZW5jZShtb3ZlVG9OZXh0Q2hhciwgaXNMYXN0Q2hhcmFjdGVyKTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmICghc2NlbmUuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNCZWdpbm5pbmdPZkZpbGUpIHtcblx0XHRcdFx0XHRtb3ZlT25lQ2hhcmFjdGVyRm9yd2FyZCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblxuXHRcdFx0aWYgKG9wdGlvbnMuZGlyZWN0aW9uID09PSAnZm9yd2FyZCcgJiYgb3B0aW9ucy50byA9PT0gJ2VuZGluZycpIHtcblx0XHRcdFx0dG9FbmRPZk5vbldoaXRlU3BhY2VTZXF1ZW5jZShtb3ZlVG9OZXh0Q2hhciwgaXNMYXN0Q2hhcmFjdGVyKTtcblx0XHRcdFx0aWYgKCFzY2VuZS5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0VuZE9mRmlsZSkge1xuXHRcdFx0XHRcdG1vdmVPbmVDaGFyYWN0ZXJCYWNrd2FyZCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKG9wdGlvbnMuZGlyZWN0aW9uID09PSAnZm9yd2FyZCcgJiYgb3B0aW9ucy50byA9PT0gJ2JlZ2lubmluZycpIHtcblx0XHRcdFx0dG9FbmRPZk5vbldoaXRlU3BhY2VTZXF1ZW5jZShtb3ZlVG9OZXh0Q2hhciwgaXNMYXN0Q2hhcmFjdGVyKTtcblx0XHRcdFx0dG9FbmRPZldoaXRlU3BhY2VTZXF1ZW5jZShtb3ZlVG9OZXh0Q2hhciwgaXNMYXN0Q2hhcmFjdGVyKTtcblx0XHRcdH0gZWxzZSBpZiAob3B0aW9ucy5kaXJlY3Rpb24gPT09ICdiYWNrd2FyZCcgJiYgb3B0aW9ucy50byA9PT0gJ2JlZ2lubmluZycpIHtcblx0XHRcdFx0dG9FbmRPZk5vbldoaXRlU3BhY2VTZXF1ZW5jZShtb3ZlVG9OZXh0Q2hhciwgaXNMYXN0Q2hhcmFjdGVyKTtcblx0XHRcdFx0aWYgKCFzY2VuZS5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0JlZ2lubmluZ09mRmlsZSkge1xuXHRcdFx0XHRcdG1vdmVPbmVDaGFyYWN0ZXJGb3J3YXJkKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKHNjZW5lLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uXS5pc0Jsb2NraW5nKCkpIHtcblx0XHRcdGN1cnNvci5yZXN0b3JlVG9TYXZlZFBvc2l0aW9uKCk7XG5cdFx0fVxuXHR9XG59O1xuXG5cbmZ1bmN0aW9uIGdldEN1cnJlbnRDaGFyYWN0ZXIoKSB7XG5cdHJldHVybiBzY2VuZS5nZXRDZWxsVW5kZXJDdXJzb3IoKS5jaGFyYWN0ZXI7XG59XG5cbmZ1bmN0aW9uIGlzV29yZENoYXJhY3RlcihjaGFyYWN0ZXIpIHtcblx0cmV0dXJuIC9bQS1aYS16XzAtOV0vLnRlc3QoY2hhcmFjdGVyIHx8IGdldEN1cnJlbnRDaGFyYWN0ZXIoKSk7XG59XG5cbmZ1bmN0aW9uIGlzV2hpdGVTcGFjZUNoYXJhY3RlcihjaGFyYWN0ZXIpIHtcblx0cmV0dXJuIC9cXHMvLnRlc3QoY2hhcmFjdGVyIHx8IGdldEN1cnJlbnRDaGFyYWN0ZXIoKSk7XG59XG5cbmZ1bmN0aW9uIGlzT3RoZXJDaGFyYWN0ZXIoY2hhcmFjdGVyKSB7XG5cdHJldHVybiAvW15BLVphLXpfMC05XFxzXS8udGVzdChjaGFyYWN0ZXIgfHwgZ2V0Q3VycmVudENoYXJhY3RlcigpKTtcbn1cblxuZnVuY3Rpb24gaXNFbmRPZkZpbGUoKSB7XG5cdHJldHVybiBzY2VuZS5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0VuZE9mRmlsZTtcbn1cblxuZnVuY3Rpb24gaXNCZWdpbm5pbmdPZkZpbGUoKSB7XG5cdHJldHVybiBzY2VuZS5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0JlZ2lubmluZ09mRmlsZTtcbn1cblxuZnVuY3Rpb24gdG9FbmRPZk5vbldoaXRlU3BhY2VTZXF1ZW5jZShtb3ZlVG9OZXh0Q2hhcmFjdGVyLCBpc0xhc3RDaGFyYWN0ZXIpIHtcblx0aWYgKGlzV29yZENoYXJhY3RlcigpKSB7XG5cdFx0d2hpbGUgKGlzV29yZENoYXJhY3RlcigpICYmICFpc0xhc3RDaGFyYWN0ZXIoKSkge1xuXHRcdFx0bW92ZVRvTmV4dENoYXJhY3RlcigpO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHR3aGlsZSAoaXNPdGhlckNoYXJhY3RlcigpICYmICFpc0xhc3RDaGFyYWN0ZXIoKSkge1xuXHRcdFx0bW92ZVRvTmV4dENoYXJhY3RlcigpO1xuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiB0b0VuZE9mV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyYWN0ZXIsIGlzTGFzdENoYXJhY3Rlcikge1xuXHR3aGlsZSAoaXNXaGl0ZVNwYWNlQ2hhcmFjdGVyKCkgJiYgIWlzTGFzdENoYXJhY3RlcigpKSB7XG5cdFx0bW92ZVRvTmV4dENoYXJhY3RlcigpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIG1vdmVPbmVDaGFyYWN0ZXJCYWNrd2FyZCAoKSB7XG5cdHZhciBwcmV2aW91c1RleHRDZWxsID0gc2NlbmUuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkucHJldmlvdXNUZXh0Q2VsbDtcblx0aWYgKHByZXZpb3VzVGV4dENlbGwpIHtcblx0XHRjdXJzb3IuY29sdW1uID0gcHJldmlvdXNUZXh0Q2VsbC5jb2x1bW47XG5cdFx0Y3Vyc29yLnJvdyA9IHByZXZpb3VzVGV4dENlbGwucm93O1xuXHR9IGVsc2UgaWYgKHNjZW5lLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uIC0gMV0uaXNUZXh0KSB7XG5cdFx0Y3Vyc29yLmNvbHVtbi0tO1xuXHR9IGVsc2Uge1xuXHRcdHNjZW5lLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uXS5pc0JlZ2lubmluZ09mRmlsZSA9IHRydWU7XG5cdH1cbn1cblxuZnVuY3Rpb24gbW92ZU9uZUNoYXJhY3RlckZvcndhcmQoKSB7XG5cdHZhciBuZXh0VGV4dENlbGwgPSBzY2VuZS5tYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbl0ubmV4dFRleHRDZWxsO1xuXHRpZiAobmV4dFRleHRDZWxsKSB7XG5cdFx0Y3Vyc29yLmNvbHVtbiA9IG5leHRUZXh0Q2VsbC5jb2x1bW47XG5cdFx0Y3Vyc29yLnJvdyA9IG5leHRUZXh0Q2VsbC5yb3c7XG5cdH0gZWxzZSB7XG5cdFx0aWYgKHNjZW5lLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uICsgMV0uaXNUZXh0KSB7XG5cdFx0XHRjdXJzb3IuY29sdW1uKys7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNjZW5lLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uXS5pc0VuZE9mRmlsZSA9IHRydWU7XG5cdFx0fVxuXHR9XG59XG5cbmZ1bmN0aW9uIGlzTGFzdENoYXJhY3RlckluV29yZCAoKSB7XG5cdHZhciBwcmVkaWNhdGUgPSBpc1dvcmRDaGFyYWN0ZXIoKSA/IGlzV29yZENoYXJhY3RlciA6IGlzT3RoZXJDaGFyYWN0ZXI7XG5cblx0dmFyIG5leHRUZXh0Q2VsbCA9IHNjZW5lLmdldENlbGxVbmRlckN1cnNvcigpLm5leHRUZXh0Q2VsbDtcblx0aWYgKG5leHRUZXh0Q2VsbCkge1xuXHRcdHJldHVybiAhcHJlZGljYXRlKG5leHRUZXh0Q2VsbC5jaGFyYWN0ZXIpXG5cdH1cblxuXHRyZXR1cm4gIXByZWRpY2F0ZShzY2VuZS5tYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbiArIDFdLmNoYXJhY3Rlcik7XG59XG5cbmZ1bmN0aW9uIGlzRmlyc3RDaGFyYWN0ZXJJbldvcmQgKCkge1xuXHR2YXIgcHJlZGljYXRlID0gaXNXb3JkQ2hhcmFjdGVyKCkgPyBpc1dvcmRDaGFyYWN0ZXIgOiBpc090aGVyQ2hhcmFjdGVyO1xuXG5cdHZhciBwcmV2aW91c1RleHRDZWxsID0gc2NlbmUuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkucHJldmlvdXNUZXh0Q2VsbDtcblx0aWYgKHByZXZpb3VzVGV4dENlbGwpIHtcblx0XHRyZXR1cm4gIXByZWRpY2F0ZShwcmV2aW91c1RleHRDZWxsLmNoYXJhY3Rlcilcblx0fVxuXG5cdHJldHVybiAhcHJlZGljYXRlKHNjZW5lLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uIC0gMV0uY2hhcmFjdGVyKTtcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0ZnJvbUFycmF5T2ZTdHJpbmdzOiBmdW5jdGlvbiAoYXJyYXlPZlN0cmluZ3MpIHtcblx0XHR0aGlzLm1hdHJpeCA9IGFycmF5T2ZTdHJpbmdzLm1hcChmdW5jdGlvbihzdHJpbmcpIHtcblx0XHRcdHJldHVybiBzdHJpbmcuc3BsaXQoJycpO1xuXHRcdH0pO1xuXHR9LFxuXHRtYXA6IGZ1bmN0aW9uKGZuKSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0cml4Lm1hcChmdW5jdGlvbihhcnJheSwgcm93KSB7XG5cdFx0XHRyZXR1cm4gYXJyYXkubWFwKGZ1bmN0aW9uKGl0ZW0sIGNvbHVtbikge1xuXHRcdFx0XHRyZXR1cm4gZm4oaXRlbSwgcm93LCBjb2x1bW4pO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0sXG5cdGdldENvb3JkaW5hdGVzT2Y6IGZ1bmN0aW9uICh0aGluZ1RvRmluZCkge1xuXHRcdHZhciBwcmVkaWNhdGU7XG5cdFx0aWYgKHR5cGVvZiB0aGluZ1RvRmluZCA9PT0gJ3N0cmluZycpIHtcblx0XHRcdHByZWRpY2F0ZSA9IGZ1bmN0aW9uKHN0cmluZywgYW5vdGhlclN0cmluZykge1xuXHRcdFx0XHRyZXR1cm4gc3RyaW5nID09PSBhbm90aGVyU3RyaW5nO1xuXHRcdFx0fTtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiB0aGluZ1RvRmluZCA9PT0gJ29iamVjdCcpIHtcblx0XHRcdHByZWRpY2F0ZSA9IGZ1bmN0aW9uKHRoaW5nVG9GaW5kLCBhbm90aGVyT2JqZWN0KSB7XG5cdFx0XHRcdHJldHVybiBPYmplY3Qua2V5cyh0aGluZ1RvRmluZCkuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRcdHJldHVybiB0aGluZ1RvRmluZFtrZXldICE9PSBhbm90aGVyT2JqZWN0W2tleV07XG5cdFx0XHRcdH0pLmxlbmd0aCA9PT0gMDtcblxuXHRcdFx0fTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMubWF0cml4LnJlZHVjZShmdW5jdGlvbihmb3VuZCwgYXJyYXksIHJvdykge1xuXHRcdFx0YXJyYXkuZm9yRWFjaChmdW5jdGlvbihjZWxsLCBjb2x1bW4pIHtcblx0XHRcdFx0aWYgKHByZWRpY2F0ZSh0aGluZ1RvRmluZCwgY2VsbCkpIHtcblx0XHRcdFx0XHRmb3VuZC5wdXNoKHtcblx0XHRcdFx0XHRcdHJvdzogcm93LFxuXHRcdFx0XHRcdFx0Y29sdW1uOiBjb2x1bW5cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gZm91bmQ7XG5cdFx0fSwgW10pO1xuXHR9XG59OyIsInZhciBtYXRyaXhEZWNvcmF0b3IgPSByZXF1aXJlKCcuL21hdHJpeC1kZWNvcmF0b3IuanMnKSxcblx0Y2VsbERlY29yYXRvciA9IHJlcXVpcmUoJy4vY2VsbC1kZWNvcmF0b3IuanMnKSxcblx0Y3Vyc29yID0gcmVxdWlyZSgnLi9jdXJzb3IuanMnKTtcblxudmFyIHNjZW5lID0gT2JqZWN0LmNyZWF0ZShtYXRyaXhEZWNvcmF0b3IpO1xuXG5zY2VuZS5mcm9tSlNPTiA9IGZ1bmN0aW9uKGpzb24pIHtcblx0dGhpcy5mcm9tQXJyYXlPZlN0cmluZ3MoanNvbi5zY2VuZSk7XG5cdE9iamVjdC5rZXlzKGpzb24pLmZpbHRlcihmdW5jdGlvbihrZXkpIHtcblx0XHRyZXR1cm4ga2V5ICE9PSAnc2NlbmUnXG5cdH0pLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG5cdFx0dGhpc1trZXldID0ganNvbltrZXldO1xuXHR9KVxufTtcblxuc2NlbmUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnJlcGxhY2VDaGFyYWN0ZXJzV2l0aENlbGxzKCk7XG5cdHRoaXMubWFya1RleHQoKTtcblx0dGhpcy5tYXJrTGF6ZXJzKCk7XG5cdHRoaXMubWFya0N1cnNvcigpO1xufTtcblxuc2NlbmUucmVwbGFjZUNoYXJhY3RlcnNXaXRoQ2VsbHMgPSBmdW5jdGlvbigpIHtcblx0dmFyIHNjZW5lID0gdGhpcztcblx0c2NlbmUubWF0cml4ID0gc2NlbmUubWFwKGZ1bmN0aW9uKGNoYXJhY3Rlciwgcm93LCBjb2x1bW4pIHtcblx0XHRpZiAoY2hhcmFjdGVyID09PSAnQCcpIHtcblx0XHRcdHNjZW5lLnNwYXduUG9zaXRpb24gPSB7XG5cdFx0XHRcdHJvdzogcm93LFxuXHRcdFx0XHRjb2x1bW46IGNvbHVtblxuXHRcdFx0fVxuXHRcdH1cblx0XHR2YXIgY2VsbCA9IE9iamVjdC5jcmVhdGUoY2VsbERlY29yYXRvcik7XG5cdFx0Y2VsbC5yb3cgPSByb3c7XG5cdFx0Y2VsbC5jb2x1bW4gPSBjb2x1bW47XG5cdFx0Y2VsbC5jaGFyYWN0ZXIgPSBjaGFyYWN0ZXI7XG5cdFx0cmV0dXJuIGNlbGw7XG5cdH0sIHNjZW5lKTtcbn07XG5cbnNjZW5lLm1hcmtDdXJzb3IgPSBmdW5jdGlvbigpIHtcblx0Y3Vyc29yLnJlc2V0KCk7XG5cdGN1cnNvci5jb2x1bW4gPSB0aGlzLnNwYXduUG9zaXRpb24uY29sdW1uO1xuXHRjdXJzb3Iucm93ID0gdGhpcy5zcGF3blBvc2l0aW9uLnJvdztcbn07XG5cbnNjZW5lLm1hcmtUZXh0ID0gZnVuY3Rpb24oKSB7XG5cdHZhciBpc1NlcXVlbmNlT2ZUZXh0SW5Qcm9ncmVzcyA9IGZhbHNlLFxuXHRcdGxhc3RDZWxsSW5TZXF1ZW5jZTtcblx0dGhpcy5tYXRyaXggPSB0aGlzLm1hcChmdW5jdGlvbihjZWxsLCByb3csIGNvbHVtbikge1xuXHRcdGlmIChpc1NlcXVlbmNlT2ZUZXh0SW5Qcm9ncmVzcykge1xuXHRcdFx0aWYgKGNlbGwuY2hhcmFjdGVyID09PSAnYCcpIHtcblx0XHRcdFx0aXNTZXF1ZW5jZU9mVGV4dEluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdFx0bGFzdENlbGxJblNlcXVlbmNlID0gc2NlbmUubWF0cml4W3Jvd11bY29sdW1uIC0gMV07XG5cdFx0XHRcdGNlbGwuY2hhcmFjdGVyID0gJyAnO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y2VsbC5pc1RleHQgPSB0cnVlO1xuXHRcdFx0XHRpZiAobGFzdENlbGxJblNlcXVlbmNlKSB7XG5cdFx0XHRcdFx0aWYgKE1hdGguYWJzKGxhc3RDZWxsSW5TZXF1ZW5jZS5yb3cgLSBjZWxsLnJvdykgPT09IDEpIHtcblx0XHRcdFx0XHRcdGNlbGwucHJldmlvdXNUZXh0Q2VsbCA9IGxhc3RDZWxsSW5TZXF1ZW5jZTtcblx0XHRcdFx0XHRcdGxhc3RDZWxsSW5TZXF1ZW5jZS5uZXh0VGV4dENlbGwgPSBjZWxsO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRsYXN0Q2VsbEluU2VxdWVuY2UgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKGNlbGwuY2hhcmFjdGVyID09PSAnYCcpIHtcblx0XHRcdFx0aXNTZXF1ZW5jZU9mVGV4dEluUHJvZ3Jlc3MgPSB0cnVlO1xuXHRcdFx0XHRjZWxsLmNoYXJhY3RlciA9ICcgJztcblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0fVxuXG5cdFx0fVxuXHRcdHJldHVybiBjZWxsO1xuXHR9KTtcbn07XG5cbnNjZW5lLm1hcmtMYXplcnMgPSBmdW5jdGlvbigpIHtcblx0dmFyIG1hdHJpeCA9IHRoaXMubWF0cml4O1xuXHR0aGlzLm1hdHJpeCA9IHRoaXMubWFwKGZ1bmN0aW9uKGNlbGwsIHJvdywgY29sdW1uKSB7XG5cdFx0dmFyIGNvbnRpbnVlQmVhbSxcblx0XHRcdGNoYXJhY3RlciA9IGNlbGwuY2hhcmFjdGVyLFxuXHRcdFx0aXNWZXJ0aWNhbExhemVyQmVhbSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gWyc8JywnPiddLmluZGV4T2YoY2hhcmFjdGVyKSA9PT0gLTE7XG5cdFx0XHR9LFxuXHRcdFx0YmVhbVByb3BlcnR5ID0gaXNWZXJ0aWNhbExhemVyQmVhbSgpID8gJ2lzVmVydGljYWxMYXplckJlYW0nIDogJ2lzSG9yaXpvbnRhbExhemVyQmVhbSc7XG5cdFx0XHRpc0JlYW1Db250aW51aW5nID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBtYXRyaXhbcm93XVtjb2x1bW5dLmlzTGF6ZXJCZWFtKCkgfHwgIW1hdHJpeFtyb3ddW2NvbHVtbl0uaXNCbG9ja2luZygpO1xuXHRcdFx0fSxcblx0XHRcdG5leHRDZWxsID0ge1xuXHRcdFx0XHQnVic6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBtYXRyaXhbcm93KytdW2NvbHVtbl07XG5cdFx0XHRcdH0sXG5cdFx0XHRcdCdeJzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG1hdHJpeFtyb3ctLV1bY29sdW1uXTtcblx0XHRcdFx0fSxcblx0XHRcdFx0Jz4nOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gbWF0cml4W3Jvd11bY29sdW1uKytdO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQnPCc6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBtYXRyaXhbcm93XVtjb2x1bW4tLV07XG5cdFx0XHRcdH1cblx0XHRcdH1bY2hhcmFjdGVyXTtcblx0XHRpZiAobmV4dENlbGwpIHtcblx0XHRcdG5leHRDZWxsKCk7XG5cdFx0XHR3aGlsZSAoaXNCZWFtQ29udGludWluZygpKSB7XG5cdFx0XHRcdG5leHRDZWxsKClbYmVhbVByb3BlcnR5XSA9IHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBjZWxsO1xuXHR9KTtcbn07XG5cbnNjZW5lLmdldENlbGxVbmRlckN1cnNvciA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5tYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbl07XG59O1xuXG5zY2VuZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcblx0dmFyIGVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2NlbmUnKTtcblx0ZWxlbWVudC5pbm5lckhUTUwgPSBzY2VuZS5tYXRyaXgubWFwKGZ1bmN0aW9uKGFycmF5KSB7XG5cdFx0YXJyYXkuZm9yRWFjaChmdW5jdGlvbihjZWxsKSB7XG5cdFx0XHRjZWxsLmlzVW5kZXJDdXJzb3IgPSBjZWxsLnJvdyA9PT0gY3Vyc29yLnJvdyAmJiBjZWxsLmNvbHVtbiA9PT0gY3Vyc29yLmNvbHVtbjtcblx0XHR9KVxuXHRcdHJldHVybiBhcnJheS5qb2luKCcnKTtcblx0fSkuam9pbignPGJyPicpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzY2VuZTsiXX0=
