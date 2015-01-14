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

},{}],2:[function(require,module,exports){
var matrixDecorator = require('./matrix-decorator.js'),
	cellDecorator = require('./cell-decorator.js'),
	turretDecorator = require('./turret-decorator.js'),
	cursor = require('./cursor.js');

var chamber = Object.create(matrixDecorator);

chamber.fromJSON = function(json) {
	this.fromArrayOfStrings(json.scene);
	Object.keys(json).filter(function(key) {
		return key !== 'scene';
	}).forEach(function(key) {
		this[key] = json[key];
	}.bind(this));
    this.configuration = json.configuration || {};
};

chamber.initialize = function() {
	this.replaceCharactersWithCells();
	this.markText();
	this.markLazers();
	this.markCursor();
	this.markTurrets();
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
	cursor.setPositionFrom(this.spawnPosition);
};

chamber.markText = function() {
	var isSequenceOfTextInProgress = false,
		lastCellInSequence,
        previousBeginningOfLine;
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
		} else if (cell.character === '`') {
			isSequenceOfTextInProgress = true;
            previousBeginningOfLine = chamber.matrix[row - 1][column];
            if (previousBeginningOfLine.lineNumber) {
                cell.lineNumber = previousBeginningOfLine.lineNumber + 1;
            } else {
                lastCellInSequence = undefined;
                cell.lineNumber = 1;
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

chamber.markTurrets = function() {
	var chamber = this;
	this.turrets = [];
	this.matrix = this.map(function(cell, row, column) {
		if (cell.character === '&') {
			var turret = Object.create(turretDecorator);
			turret.row = row;
			turret.column = column;
			turret.cell = cell;
			chamber.turrets.push(turret);
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
		array = array.map(function(cell) {
			cell.isUnderCursor = cell.row === cursor.row && cell.column === cursor.column;
            cell = cell.toString(chamber.configuration);
            return cell;
		});
		return array.join('');
	}).join('<br>');
};

chamber.actOnCursor = function() {
	this.turrets.forEach(function(turret) {
		turret.findAndTryToKill(cursor, chamber);
	});
};

module.exports = chamber;

},{"./cell-decorator.js":1,"./cursor.js":4,"./matrix-decorator.js":6,"./turret-decorator.js":8}],3:[function(require,module,exports){
var commands = {},
    mainFunction,
    printText = require('./print.js');
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
                    window.alert('This is the last chamber at this moment. ' +
                        'Next you are going to be redirected to the repo of this game. ' +
                        'Let me know your favorite VIM features which are missing.');
                    window.location.href = 'https://github.com/hermanya/vim-experiments';
                }
            }[xmlhttp.status] || defaultAction;
        action();

    };
    chamberNumber = chamberNumber || localStorage.chamber || 0;
    xmlhttp.open('GET', './chambers/' + chamberNumber + '.json', true);
    xmlhttp.send();
};

commands['set number'] = function() {
    require('./chamber.js').configuration['display line numbers'] = true;
    require('./chamber.js').render();
};
commands['set nu'] = commands['set number'];

commands['set nonumber'] = function() {
    require('./chamber.js').configuration['display line numbers'] = false;
    require('./chamber.js').render();
};
commands['set nonu'] = commands['set nonumber'];

commands['cake is a lie'] = function() {
    require('./chamber.js').configuration['killing mode on'] = true;
    printText(['','Now you are going to die. Every time.','']);
};

commands.loadNextChamber = function() {
    var nextChamberNumber = Number(localStorage.chamber) + 1;
    commands['chamber (\\d+)'](nextChamberNumber);
};

commands['initialize chamber'] = function(main) {
    mainFunction = main;
    commands['chamber (\\d+)']();
};

},{"./chamber.js":2,"./print.js":7}],4:[function(require,module,exports){
var commands = require('./commands.js'),
    printText = require('./print.js');
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
                        printText(['', congratulationMessage, '']);
                        commands.loadNextChamber();
                    }
                },
                '&': function() {
                    cell.isDeactivatedTurret = true;
                    cell.character = ' <div class="deactivated-turret">&</div>';
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
    setPositionFrom: function(anotherObject) {
        this.column = anotherObject.column;
        this.row = anotherObject.row;
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

},{"./commands.js":3,"./print.js":7}],5:[function(require,module,exports){
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

function getAdjacentTextCellInSameLine(forwardOrBackward) {
    var adjacentColumn, cell;
    if (forwardOrBackward === 'forward') {
        adjacentColumn = cursor.column + 1;
    } else {
        adjacentColumn = cursor.column - 1;
    }
    cell = chamber.matrix[cursor.row][adjacentColumn];
    if (cell.isText) {
        return cell;
    }
}

function getAdjacentTextCellInAnotherLine(forwardOrBackward) {
    var linkToAdjacentCell = forwardOrBackward === 'forward' ? 'nextTextCell' : 'previousTextCell';
    return chamber.getCellUnderCursor()[linkToAdjacentCell];
}

function getAdjacentTextCell(forwardOrBackward) {
    return getAdjacentTextCellInSameLine(forwardOrBackward) || getAdjacentTextCellInAnotherLine(forwardOrBackward);
}

function makeFunctionWhichLimitsMovement(forwardOrBackward) {
    return function() {
        return !getAdjacentTextCell(forwardOrBackward);
    };
}

function toEndOfNonWhiteSpaceSequence(moveToNextCharacter, isLimitingCharacter) {
    var predicate = isWordCharacter() ? isWordCharacter : isOtherCharacter;
    while (predicate() && !isLimitingCharacter()) {
        moveToNextCharacter();
    }
}

function toEndOfWhiteSpaceSequence(moveToNextCharacter, isLimitingCharacter) {
    while (isWhiteSpaceCharacter() && !isLimitingCharacter()) {
        moveToNextCharacter();
    }
}

function makeFunctionToMoveOneCharacterInText(forwardOrBackward) {
    return function() {
        var adjacentCell = getAdjacentTextCell(forwardOrBackward);
        if (adjacentCell) {
            cursor.setPositionFrom(adjacentCell);
        }
    };
}

function makeFunctionWhichDecidesIfIsMovingOneCharacterFirst(forwardOrBackward) {
    return function() {
        if (isWhiteSpaceCharacter()) {
            return;
        }
        var predicate = isWordCharacter() ? isWordCharacter : isOtherCharacter;
        var cell = getAdjacentTextCell(forwardOrBackward);
        if (cell) {
            return !predicate(cell.character);
        }
    };
}

module.exports = {
    'move horizontally': function(options) {
        cursor.saveCurrentPosition();

        cursor.column += options.direction === 'left' ? -1 : 1;
        if (!chamber.getCellUnderCursor().isBlocking()) {
            cursor.forgetColumnForVerticalMovement();
        }

        if (chamber.configuration['killing mode on'] && chamber.getCellUnderCursor().isLazerBeam()) {
            cursor.setPositionFrom(chamber.spawnPosition);
        } else if (chamber.getCellUnderCursor().isBlocking()) {
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

        if (chamber.configuration['killing mode on'] && chamber.getCellUnderCursor().isLazerBeam()) {
            cursor.setPositionFrom(chamber.spawnPosition);
        } else if (chamber.getCellUnderCursor().isBlocking()) {
            cursor.restoreToSavedPosition();
        }
    },
    'move by word': function(options) {
        cursor.saveCurrentPosition();

        if (!chamber.getCellUnderCursor().isText) {
            return;
        }
        var direction = options.direction,
            oppositeDirection = direction === 'forward' ? 'backward' : 'forward',
            moveToNextChar = makeFunctionToMoveOneCharacterInText(direction),
            moveToPreviousChar = makeFunctionToMoveOneCharacterInText(oppositeDirection),
            isLimitingCharacter = makeFunctionWhichLimitsMovement(direction),
            isMovingOneCharacterFirst = makeFunctionWhichDecidesIfIsMovingOneCharacterFirst(direction);

        if (isMovingOneCharacterFirst()) {
            moveToNextChar();
        }
        if (direction === 'forward' && options.to === 'beginning') {
            toEndOfNonWhiteSpaceSequence(moveToNextChar, isLimitingCharacter);
        }
        toEndOfWhiteSpaceSequence(moveToNextChar, isLimitingCharacter);
        if (direction === 'forward' && options.to === 'ending' ||
            direction === 'backward' && options.to === 'beginning') {
            toEndOfNonWhiteSpaceSequence(moveToNextChar, isLimitingCharacter);
            if (!isLimitingCharacter()) {
                moveToPreviousChar();
            }
        }

        if (chamber.configuration['killing mode on'] && chamber.getCellUnderCursor().isLazerBeam()) {
            cursor.setPositionFrom(chamber.spawnPosition);
        } else if (chamber.getCellUnderCursor().isBlocking()) {
            cursor.restoreToSavedPosition();
        }
    },
    'move to end of text': function(options) {
        cursor.saveCurrentPosition();

        var adjacentCell = getAdjacentTextCell(options.direction);
        while (adjacentCell) {
            cursor.setPositionFrom(adjacentCell);
            adjacentCell = getAdjacentTextCell(options.direction);
        }

        if (chamber.configuration['killing mode on'] && chamber.getCellUnderCursor().isLazerBeam()) {
            cursor.setPositionFrom(chamber.spawnPosition);
        } else if (chamber.getCellUnderCursor().isBlocking()) {
            cursor.restoreToSavedPosition();
        }
    },
    'move to end of line': function(options) {
        cursor.saveCurrentPosition();

        var adjacentCell = getAdjacentTextCellInSameLine(options.direction);
        while (adjacentCell) {
            cursor.setPositionFrom(adjacentCell);
            adjacentCell = getAdjacentTextCellInSameLine(options.direction);
        }

        if (chamber.configuration['killing mode on'] && chamber.getCellUnderCursor().isLazerBeam()) {
            cursor.setPositionFrom(chamber.spawnPosition);
        } else if (chamber.getCellUnderCursor().isBlocking()) {
            cursor.restoreToSavedPosition();
        }
    },
    'move to beginning of line number': function(options) {
        cursor.saveCurrentPosition();

        this['move to end of line']({
            direction: 'backward'
        });
        var targetLineNumber = options.lineNumber,
            lineNumberCell = chamber.matrix[cursor.row][cursor.column - 1],
            currentLineNumber = lineNumberCell.lineNumber,
            step = targetLineNumber > currentLineNumber ? 1 : -1;
        while (currentLineNumber && currentLineNumber !== targetLineNumber) {
            cursor.row += step;
            lineNumberCell = chamber.matrix[cursor.row][cursor.column - 1];
            currentLineNumber = lineNumberCell.lineNumber;
        }
        if (!currentLineNumber) {
            cursor.row -= step;
        }

        if (chamber.configuration['killing mode on'] && chamber.getCellUnderCursor().isLazerBeam()) {
            cursor.setPositionFrom(chamber.spawnPosition);
        } else if (chamber.getCellUnderCursor().isBlocking()) {
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
},{}],7:[function(require,module,exports){
var console;
if (typeof window !== 'undefined') {
    console = document.querySelector('#console');
}

var printText = function(text) {
    var line = text.shift();
    if (line !== undefined) {
        window.setTimeout (function() {
            console.innerHTML += text.by + line + '<br>';
            console.scrollTop +=100;
            printText(text);
        }, line.length * 40);
    }

};

module.exports = function(text) {
    if (!Array.isArray(text)) {
        text = [text];
    }
    text.by = text.by ? text.by + '> ' : '';
    printText(text);
};

},{}],8:[function(require,module,exports){
var printText = require('./print.js');
module.exports = {
	findAndTryToKill: function(cursor, chamber) {
	// add some funny excuse for the kill from turret
		if (this.isShooting || this.cell.isDeactivatedTurret) {
			return;
		}
		var turret = this,
		rise = cursor.row - turret.row,
		run = cursor.column - turret.column,
		count = Math.max(Math.abs(rise), Math.abs(run)),
		total = count,
		path = [],
		cell;
		if (!rise && !run) {
			return;
		}
		for (var i = 0; i <= count; i++) {
			cell = chamber.matrix[Math.round(turret.row + rise*(i/total))][Math.round(turret.column + run*(i/total))];
			if (!cell.isLazerBeam() && cell.isBlocking()) {
				break;
			}
			if (cell !== turret.cell && path.indexOf(cell) === -1) {
				path.push(cell);
			}
			if (cell.row === cursor.row && cell.column === cursor.column) {
				turret.tryToKill(cursor, chamber, path);
				break;
			}
		}
	},
	tryToKill: function(cursor, chamber, path) {
		var turret = this;
		setTimeout(function() {
			var isCursorUnderLazer = !path.every(function(cell) {
                return !cell.isUnderCursor;
            });
			if (isCursorUnderLazer) {
				turret.isShooting = true;
				path.forEach(function(cell) {
					cell.isUnderTurretFire = true;
				});
                var message = 'turret> ' + [
                    'I did not mean to.',
                    'They made me do this.',
                    'I am trully sorry.',
                    'Sometimes I can not help myself.',
                    'Watch out.',
                    'Please do not think less of me.'
                ][Math.floor(Math.random() * 3)];
                printText(message);
                if (require('./chamber.js').configuration['killing mode on']) {
                    cursor.setPositionFrom(require('./chamber.js').spawnPosition);
                }
				chamber.render();
				window.setTimeout(function() {
					turret.isShooting = false;
					path.forEach(function(cell) {
						cell.isUnderTurretFire = false;
					});
					chamber.render();
				}, 1000);
			} else {
				turret.findAndTryToKill(cursor, chamber);
			}
		}, 1000);
	}
};

},{"./chamber.js":2,"./print.js":7}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NlbGwtZGVjb3JhdG9yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jaGFtYmVyLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jb21tYW5kcy5qcyIsIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9zcmMvY3Vyc29yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9mYWtlX2Q4ZjI3NDdhLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9tYXRyaXgtZGVjb3JhdG9yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9wcmludC5qcyIsIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9zcmMvdHVycmV0LWRlY29yYXRvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRpc1dhbGw6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBbJysnLCAnLScsICd8J10uaW5kZXhPZih0aGlzLmNoYXJhY3RlcikgIT09IC0xICYmICF0aGlzLmlzVGV4dDtcblx0fSxcblx0aXNMYXplcjogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIFsnVicsICdeJywgJz4nLCAnPCddLmluZGV4T2YodGhpcy5jaGFyYWN0ZXIpICE9PSAtMSAmJiAhdGhpcy5pc1RleHQ7XG5cdH0sXG5cdGlzTGF6ZXJCZWFtOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5pc1ZlcnRpY2FsTGF6ZXJCZWFtIHx8IHRoaXMuaXNIb3Jpem9udGFsTGF6ZXJCZWFtO1xuXHR9LFxuXHRpc0Jsb2NraW5nOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5pc1dhbGwoKSB8fCB0aGlzLmlzTGF6ZXIoKSB8fCB0aGlzLmlzTGF6ZXJCZWFtKCk7XG5cdH0sXG5cdHRvU3RyaW5nOiBmdW5jdGlvbihjb25maWd1cmF0aW9uKSB7XG5cdFx0dmFyIHByb3BlcnR5VG9DbGFzc05hbWUgPSB7XG5cdFx0XHRcdCdpc1RleHQnOiAndGV4dCcsXG5cdFx0XHRcdCdpc1VuZGVyQ3Vyc29yJzogJ2N1cnNvcicsXG5cdFx0XHRcdCdpc1ZlcnRpY2FsTGF6ZXJCZWFtJzogJ3ZlcnRpY2FsLWxhemVyLWJlYW0nLFxuXHRcdFx0XHQnaXNIb3Jpem9udGFsTGF6ZXJCZWFtJzogJ2hvcml6b250YWwtbGF6ZXItYmVhbScsXG5cdFx0XHRcdCdpc1VuZGVyVHVycmV0RmlyZSc6ICd0dXJyZXQtZmlyZSdcblx0XHRcdH0sXG5cdFx0XHRjbGFzc05hbWVzID0gT2JqZWN0LmtleXMocHJvcGVydHlUb0NsYXNzTmFtZSkuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRyZXR1cm4gdGhpc1trZXldO1xuXHRcdFx0fS5iaW5kKHRoaXMpKS5tYXAoZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdHJldHVybiBwcm9wZXJ0eVRvQ2xhc3NOYW1lW2tleV07XG5cdFx0XHR9KS5qb2luKCcgJyk7XG4gICAgICAgIGlmICh0aGlzLmxpbmVOdW1iZXIpIHtcbiAgICAgICAgICAgIHRoaXMuY2hhcmFjdGVyID0gY29uZmlndXJhdGlvblsnZGlzcGxheSBsaW5lIG51bWJlcnMnXSA/IHRoaXMubGluZU51bWJlciA6ICcgJztcbiAgICAgICAgfVxuXG5cdFx0cmV0dXJuICc8c3BhbiAgY2xhc3M9XCInICsgY2xhc3NOYW1lcyArICdcIj4nICsgdGhpcy5jaGFyYWN0ZXIgKyAnPC9zcGFuPic7XG5cdH1cbn07XG4iLCJ2YXIgbWF0cml4RGVjb3JhdG9yID0gcmVxdWlyZSgnLi9tYXRyaXgtZGVjb3JhdG9yLmpzJyksXG5cdGNlbGxEZWNvcmF0b3IgPSByZXF1aXJlKCcuL2NlbGwtZGVjb3JhdG9yLmpzJyksXG5cdHR1cnJldERlY29yYXRvciA9IHJlcXVpcmUoJy4vdHVycmV0LWRlY29yYXRvci5qcycpLFxuXHRjdXJzb3IgPSByZXF1aXJlKCcuL2N1cnNvci5qcycpO1xuXG52YXIgY2hhbWJlciA9IE9iamVjdC5jcmVhdGUobWF0cml4RGVjb3JhdG9yKTtcblxuY2hhbWJlci5mcm9tSlNPTiA9IGZ1bmN0aW9uKGpzb24pIHtcblx0dGhpcy5mcm9tQXJyYXlPZlN0cmluZ3MoanNvbi5zY2VuZSk7XG5cdE9iamVjdC5rZXlzKGpzb24pLmZpbHRlcihmdW5jdGlvbihrZXkpIHtcblx0XHRyZXR1cm4ga2V5ICE9PSAnc2NlbmUnO1xuXHR9KS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuXHRcdHRoaXNba2V5XSA9IGpzb25ba2V5XTtcblx0fS5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmNvbmZpZ3VyYXRpb24gPSBqc29uLmNvbmZpZ3VyYXRpb24gfHwge307XG59O1xuXG5jaGFtYmVyLmluaXRpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5yZXBsYWNlQ2hhcmFjdGVyc1dpdGhDZWxscygpO1xuXHR0aGlzLm1hcmtUZXh0KCk7XG5cdHRoaXMubWFya0xhemVycygpO1xuXHR0aGlzLm1hcmtDdXJzb3IoKTtcblx0dGhpcy5tYXJrVHVycmV0cygpO1xufTtcblxuY2hhbWJlci5yZXBsYWNlQ2hhcmFjdGVyc1dpdGhDZWxscyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgY2hhbWJlciA9IHRoaXM7XG5cdGNoYW1iZXIubWF0cml4ID0gY2hhbWJlci5tYXAoZnVuY3Rpb24oY2hhcmFjdGVyLCByb3csIGNvbHVtbikge1xuXHRcdGlmIChjaGFyYWN0ZXIgPT09ICdAJykge1xuXHRcdFx0Y2hhbWJlci5zcGF3blBvc2l0aW9uID0ge1xuXHRcdFx0XHRyb3c6IHJvdyxcblx0XHRcdFx0Y29sdW1uOiBjb2x1bW5cblx0XHRcdH07XG5cdFx0fVxuXHRcdHZhciBjZWxsID0gT2JqZWN0LmNyZWF0ZShjZWxsRGVjb3JhdG9yKTtcblx0XHRjZWxsLnJvdyA9IHJvdztcblx0XHRjZWxsLmNvbHVtbiA9IGNvbHVtbjtcblx0XHRjZWxsLmNoYXJhY3RlciA9IGNoYXJhY3Rlcjtcblx0XHRyZXR1cm4gY2VsbDtcblx0fSk7XG59O1xuXG5jaGFtYmVyLm1hcmtDdXJzb3IgPSBmdW5jdGlvbigpIHtcblx0Y3Vyc29yLnJlc2V0KCk7XG5cdGN1cnNvci5zZXRQb3NpdGlvbkZyb20odGhpcy5zcGF3blBvc2l0aW9uKTtcbn07XG5cbmNoYW1iZXIubWFya1RleHQgPSBmdW5jdGlvbigpIHtcblx0dmFyIGlzU2VxdWVuY2VPZlRleHRJblByb2dyZXNzID0gZmFsc2UsXG5cdFx0bGFzdENlbGxJblNlcXVlbmNlLFxuICAgICAgICBwcmV2aW91c0JlZ2lubmluZ09mTGluZTtcblx0dGhpcy5tYXRyaXggPSB0aGlzLm1hcChmdW5jdGlvbihjZWxsLCByb3csIGNvbHVtbikge1xuXHRcdGlmIChpc1NlcXVlbmNlT2ZUZXh0SW5Qcm9ncmVzcykge1xuXHRcdFx0aWYgKGNlbGwuY2hhcmFjdGVyID09PSAnYCcpIHtcblx0XHRcdFx0aXNTZXF1ZW5jZU9mVGV4dEluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdFx0bGFzdENlbGxJblNlcXVlbmNlID0gY2hhbWJlci5tYXRyaXhbcm93XVtjb2x1bW4gLSAxXTtcblx0XHRcdFx0Y2VsbC5jaGFyYWN0ZXIgPSAnICc7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjZWxsLmlzVGV4dCA9IHRydWU7XG5cdFx0XHRcdGlmIChsYXN0Q2VsbEluU2VxdWVuY2UpIHtcblx0XHRcdFx0XHRpZiAoTWF0aC5hYnMobGFzdENlbGxJblNlcXVlbmNlLnJvdyAtIGNlbGwucm93KSA9PT0gMSkge1xuXHRcdFx0XHRcdFx0Y2VsbC5wcmV2aW91c1RleHRDZWxsID0gbGFzdENlbGxJblNlcXVlbmNlO1xuXHRcdFx0XHRcdFx0bGFzdENlbGxJblNlcXVlbmNlLm5leHRUZXh0Q2VsbCA9IGNlbGw7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGxhc3RDZWxsSW5TZXF1ZW5jZSA9IHVuZGVmaW5lZDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSBpZiAoY2VsbC5jaGFyYWN0ZXIgPT09ICdgJykge1xuXHRcdFx0aXNTZXF1ZW5jZU9mVGV4dEluUHJvZ3Jlc3MgPSB0cnVlO1xuICAgICAgICAgICAgcHJldmlvdXNCZWdpbm5pbmdPZkxpbmUgPSBjaGFtYmVyLm1hdHJpeFtyb3cgLSAxXVtjb2x1bW5dO1xuICAgICAgICAgICAgaWYgKHByZXZpb3VzQmVnaW5uaW5nT2ZMaW5lLmxpbmVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICBjZWxsLmxpbmVOdW1iZXIgPSBwcmV2aW91c0JlZ2lubmluZ09mTGluZS5saW5lTnVtYmVyICsgMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGFzdENlbGxJblNlcXVlbmNlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIGNlbGwubGluZU51bWJlciA9IDE7XG4gICAgICAgICAgICB9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGNlbGw7XG5cdH0pO1xufTtcblxuY2hhbWJlci5tYXJrTGF6ZXJzID0gZnVuY3Rpb24oKSB7XG5cdHZhciBtYXRyaXggPSB0aGlzLm1hdHJpeDtcblx0dGhpcy5tYXRyaXggPSB0aGlzLm1hcChmdW5jdGlvbihjZWxsLCByb3csIGNvbHVtbikge1xuXHRcdHZhciBjaGFyYWN0ZXIgPSBjZWxsLmNoYXJhY3Rlcixcblx0XHRcdGlzVmVydGljYWxMYXplckJlYW0gPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIFsnPCcsJz4nXS5pbmRleE9mKGNoYXJhY3RlcikgPT09IC0xO1xuXHRcdFx0fSxcblx0XHRcdGJlYW1Qcm9wZXJ0eSA9IGlzVmVydGljYWxMYXplckJlYW0oKSA/ICdpc1ZlcnRpY2FsTGF6ZXJCZWFtJyA6ICdpc0hvcml6b250YWxMYXplckJlYW0nLFxuXHRcdFx0aXNCZWFtQ29udGludWluZyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gbWF0cml4W3Jvd11bY29sdW1uXS5pc0xhemVyQmVhbSgpIHx8ICFtYXRyaXhbcm93XVtjb2x1bW5dLmlzQmxvY2tpbmcoKTtcblx0XHRcdH0sXG5cdFx0XHRuZXh0ID0ge1xuXHRcdFx0XHQnVic6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBtYXRyaXhbcm93KytdW2NvbHVtbl07XG5cdFx0XHRcdH0sXG5cdFx0XHRcdCdeJzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG1hdHJpeFtyb3ctLV1bY29sdW1uXTtcblx0XHRcdFx0fSxcblx0XHRcdFx0Jz4nOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gbWF0cml4W3Jvd11bY29sdW1uKytdO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQnPCc6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBtYXRyaXhbcm93XVtjb2x1bW4tLV07XG5cdFx0XHRcdH1cblx0XHRcdH1bY2hhcmFjdGVyXTtcblx0XHRpZiAobmV4dCkge1xuXHRcdFx0bmV4dCgpO1xuXHRcdFx0d2hpbGUgKGlzQmVhbUNvbnRpbnVpbmcoKSkge1xuXHRcdFx0XHRuZXh0KClbYmVhbVByb3BlcnR5XSA9IHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBjZWxsO1xuXHR9KTtcbn07XG5cbmNoYW1iZXIubWFya1R1cnJldHMgPSBmdW5jdGlvbigpIHtcblx0dmFyIGNoYW1iZXIgPSB0aGlzO1xuXHR0aGlzLnR1cnJldHMgPSBbXTtcblx0dGhpcy5tYXRyaXggPSB0aGlzLm1hcChmdW5jdGlvbihjZWxsLCByb3csIGNvbHVtbikge1xuXHRcdGlmIChjZWxsLmNoYXJhY3RlciA9PT0gJyYnKSB7XG5cdFx0XHR2YXIgdHVycmV0ID0gT2JqZWN0LmNyZWF0ZSh0dXJyZXREZWNvcmF0b3IpO1xuXHRcdFx0dHVycmV0LnJvdyA9IHJvdztcblx0XHRcdHR1cnJldC5jb2x1bW4gPSBjb2x1bW47XG5cdFx0XHR0dXJyZXQuY2VsbCA9IGNlbGw7XG5cdFx0XHRjaGFtYmVyLnR1cnJldHMucHVzaCh0dXJyZXQpO1xuXHRcdH1cblx0XHRyZXR1cm4gY2VsbDtcblx0fSk7XG59O1xuXG5jaGFtYmVyLmdldENlbGxVbmRlckN1cnNvciA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5tYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbl07XG59O1xuXG5jaGFtYmVyLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzY2VuZScpO1xuXHRlbGVtZW50LmlubmVySFRNTCA9IGNoYW1iZXIubWF0cml4Lm1hcChmdW5jdGlvbihhcnJheSkge1xuXHRcdGFycmF5ID0gYXJyYXkubWFwKGZ1bmN0aW9uKGNlbGwpIHtcblx0XHRcdGNlbGwuaXNVbmRlckN1cnNvciA9IGNlbGwucm93ID09PSBjdXJzb3Iucm93ICYmIGNlbGwuY29sdW1uID09PSBjdXJzb3IuY29sdW1uO1xuICAgICAgICAgICAgY2VsbCA9IGNlbGwudG9TdHJpbmcoY2hhbWJlci5jb25maWd1cmF0aW9uKTtcbiAgICAgICAgICAgIHJldHVybiBjZWxsO1xuXHRcdH0pO1xuXHRcdHJldHVybiBhcnJheS5qb2luKCcnKTtcblx0fSkuam9pbignPGJyPicpO1xufTtcblxuY2hhbWJlci5hY3RPbkN1cnNvciA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnR1cnJldHMuZm9yRWFjaChmdW5jdGlvbih0dXJyZXQpIHtcblx0XHR0dXJyZXQuZmluZEFuZFRyeVRvS2lsbChjdXJzb3IsIGNoYW1iZXIpO1xuXHR9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gY2hhbWJlcjtcbiIsInZhciBjb21tYW5kcyA9IHt9LFxuICAgIG1haW5GdW5jdGlvbixcbiAgICBwcmludFRleHQgPSByZXF1aXJlKCcuL3ByaW50LmpzJyk7XG5tb2R1bGUuZXhwb3J0cyA9IGNvbW1hbmRzO1xuXG5jb21tYW5kc1snY2hhbWJlciAoXFxcXGQrKSddID0gZnVuY3Rpb24oY2hhbWJlck51bWJlcikge1xuICAgIHZhciB4bWxodHRwID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgeG1saHR0cC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHhtbGh0dHAucmVhZHlTdGF0ZSAhPT0gNCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBkZWZhdWx0QWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmFsZXJ0KHhtbGh0dHAuc3RhdHVzKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhY3Rpb24gPSB7XG4gICAgICAgICAgICAgICAgJzIwMCc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UuY2hhbWJlciA9IGNoYW1iZXJOdW1iZXI7XG4gICAgICAgICAgICAgICAgICAgIG1haW5GdW5jdGlvbihKU09OLnBhcnNlKHhtbGh0dHAucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAnNDA0JzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5hbGVydCgnVGhpcyBpcyB0aGUgbGFzdCBjaGFtYmVyIGF0IHRoaXMgbW9tZW50LiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICdOZXh0IHlvdSBhcmUgZ29pbmcgdG8gYmUgcmVkaXJlY3RlZCB0byB0aGUgcmVwbyBvZiB0aGlzIGdhbWUuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ0xldCBtZSBrbm93IHlvdXIgZmF2b3JpdGUgVklNIGZlYXR1cmVzIHdoaWNoIGFyZSBtaXNzaW5nLicpO1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9ICdodHRwczovL2dpdGh1Yi5jb20vaGVybWFueWEvdmltLWV4cGVyaW1lbnRzJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9W3htbGh0dHAuc3RhdHVzXSB8fCBkZWZhdWx0QWN0aW9uO1xuICAgICAgICBhY3Rpb24oKTtcblxuICAgIH07XG4gICAgY2hhbWJlck51bWJlciA9IGNoYW1iZXJOdW1iZXIgfHwgbG9jYWxTdG9yYWdlLmNoYW1iZXIgfHwgMDtcbiAgICB4bWxodHRwLm9wZW4oJ0dFVCcsICcuL2NoYW1iZXJzLycgKyBjaGFtYmVyTnVtYmVyICsgJy5qc29uJywgdHJ1ZSk7XG4gICAgeG1saHR0cC5zZW5kKCk7XG59O1xuXG5jb21tYW5kc1snc2V0IG51bWJlciddID0gZnVuY3Rpb24oKSB7XG4gICAgcmVxdWlyZSgnLi9jaGFtYmVyLmpzJykuY29uZmlndXJhdGlvblsnZGlzcGxheSBsaW5lIG51bWJlcnMnXSA9IHRydWU7XG4gICAgcmVxdWlyZSgnLi9jaGFtYmVyLmpzJykucmVuZGVyKCk7XG59O1xuY29tbWFuZHNbJ3NldCBudSddID0gY29tbWFuZHNbJ3NldCBudW1iZXInXTtcblxuY29tbWFuZHNbJ3NldCBub251bWJlciddID0gZnVuY3Rpb24oKSB7XG4gICAgcmVxdWlyZSgnLi9jaGFtYmVyLmpzJykuY29uZmlndXJhdGlvblsnZGlzcGxheSBsaW5lIG51bWJlcnMnXSA9IGZhbHNlO1xuICAgIHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLnJlbmRlcigpO1xufTtcbmNvbW1hbmRzWydzZXQgbm9udSddID0gY29tbWFuZHNbJ3NldCBub251bWJlciddO1xuXG5jb21tYW5kc1snY2FrZSBpcyBhIGxpZSddID0gZnVuY3Rpb24oKSB7XG4gICAgcmVxdWlyZSgnLi9jaGFtYmVyLmpzJykuY29uZmlndXJhdGlvblsna2lsbGluZyBtb2RlIG9uJ10gPSB0cnVlO1xuICAgIHByaW50VGV4dChbJycsJ05vdyB5b3UgYXJlIGdvaW5nIHRvIGRpZS4gRXZlcnkgdGltZS4nLCcnXSk7XG59O1xuXG5jb21tYW5kcy5sb2FkTmV4dENoYW1iZXIgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbmV4dENoYW1iZXJOdW1iZXIgPSBOdW1iZXIobG9jYWxTdG9yYWdlLmNoYW1iZXIpICsgMTtcbiAgICBjb21tYW5kc1snY2hhbWJlciAoXFxcXGQrKSddKG5leHRDaGFtYmVyTnVtYmVyKTtcbn07XG5cbmNvbW1hbmRzWydpbml0aWFsaXplIGNoYW1iZXInXSA9IGZ1bmN0aW9uKG1haW4pIHtcbiAgICBtYWluRnVuY3Rpb24gPSBtYWluO1xuICAgIGNvbW1hbmRzWydjaGFtYmVyIChcXFxcZCspJ10oKTtcbn07XG4iLCJ2YXIgY29tbWFuZHMgPSByZXF1aXJlKCcuL2NvbW1hbmRzLmpzJyksXG4gICAgcHJpbnRUZXh0ID0gcmVxdWlyZSgnLi9wcmludC5qcycpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgc2NvcmU6IDAsXG4gICAgYWN0T25DdXJyZW50Q2VsbDogZnVuY3Rpb24oY2hhbWJlcikge1xuICAgICAgICB2YXIgY3Vyc29yID0gdGhpcyxcbiAgICAgICAgICAgIGNlbGwgPSBjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLFxuICAgICAgICAgICAgYWN0aW9uID0ge1xuICAgICAgICAgICAgICAgICcqJzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNlbGwuY2hhcmFjdGVyID0gJyAnO1xuICAgICAgICAgICAgICAgICAgICBjdXJzb3Iuc2NvcmUrKztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICdPJzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5oYXNDb21wbGV0ZWRMZXZlbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb25ncmF0dWxhdGlvbk1lc3NhZ2UgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnMCc6ICdZb3UgZGlkIGl0LCBJIGFtIGJvcmVkIHdhdGNoaW5nIHlvdS4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgJzEnOiAnT25seSBvbmUgcGF0aGV0aWMgc3Rhcj8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgJzInOiAnRGlkIHlvdSBldmVuIHRyeT8nXG4gICAgICAgICAgICAgICAgICAgIH1bY3Vyc29yLnNjb3JlXSB8fCAnU2F0aXNmeWluZyBwZXJmb3JtYWNlLic7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRUZXh0KFsnJywgY29uZ3JhdHVsYXRpb25NZXNzYWdlLCAnJ10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tbWFuZHMubG9hZE5leHRDaGFtYmVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICcmJzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNlbGwuaXNEZWFjdGl2YXRlZFR1cnJldCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGNlbGwuY2hhcmFjdGVyID0gJyA8ZGl2IGNsYXNzPVwiZGVhY3RpdmF0ZWQtdHVycmV0XCI+JjwvZGl2Pic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVtjZWxsLmNoYXJhY3Rlcl07XG4gICAgICAgIGlmICghY2VsbC5pc1RleHQgJiYgYWN0aW9uKSB7XG4gICAgICAgICAgICBhY3Rpb24oKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmhhc0NvbXBsZXRlZExldmVsID0gZmFsc2U7XG4gICAgICAgIHRoaXMuc2NvcmUgPSAwO1xuICAgICAgICB0aGlzLmZvcmdldENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQoKTtcbiAgICB9LFxuICAgIHNldFBvc2l0aW9uRnJvbTogZnVuY3Rpb24oYW5vdGhlck9iamVjdCkge1xuICAgICAgICB0aGlzLmNvbHVtbiA9IGFub3RoZXJPYmplY3QuY29sdW1uO1xuICAgICAgICB0aGlzLnJvdyA9IGFub3RoZXJPYmplY3Qucm93O1xuICAgIH0sXG4gICAgcmVtZW1iZXJDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKCF0aGlzLnJlbWVtYmVyZWRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50KSB7XG4gICAgICAgICAgICB0aGlzLnJlbWVtYmVyZWRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50ID0gdGhpcy5jb2x1bW47XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGZvcmdldENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBkZWxldGUgdGhpcy5yZW1lbWJlcmVkQ29sdW1uRm9yVmVydGljYWxNb3ZlbWVudDtcbiAgICB9LFxuICAgIHNhdmVDdXJyZW50UG9zaXRpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnNhdmVkQ29sdW1uID0gdGhpcy5jb2x1bW47XG4gICAgICAgIHRoaXMuc2F2ZWRSb3cgPSB0aGlzLnJvdztcbiAgICB9LFxuICAgIHJlc3RvcmVUb1NhdmVkUG9zaXRpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmNvbHVtbiA9IHRoaXMuc2F2ZWRDb2x1bW47XG4gICAgICAgIHRoaXMucm93ID0gdGhpcy5zYXZlZFJvdztcbiAgICB9XG59O1xuIiwidmFyIGNoYW1iZXIgPSByZXF1aXJlKCcuL2NoYW1iZXIuanMnKSxcbiAgICBjdXJzb3IgPSByZXF1aXJlKCcuL2N1cnNvci5qcycpO1xuXG5mdW5jdGlvbiBnZXRDdXJyZW50Q2hhcmFjdGVyKCkge1xuICAgIHJldHVybiBjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmNoYXJhY3Rlcjtcbn1cblxuZnVuY3Rpb24gaXNXb3JkQ2hhcmFjdGVyKGNoYXJhY3Rlcikge1xuICAgIHJldHVybiAvW0EtWmEtel8wLTldLy50ZXN0KGNoYXJhY3RlciB8fCBnZXRDdXJyZW50Q2hhcmFjdGVyKCkpO1xufVxuXG5mdW5jdGlvbiBpc1doaXRlU3BhY2VDaGFyYWN0ZXIoY2hhcmFjdGVyKSB7XG4gICAgcmV0dXJuIC9cXHMvLnRlc3QoY2hhcmFjdGVyIHx8IGdldEN1cnJlbnRDaGFyYWN0ZXIoKSk7XG59XG5cbmZ1bmN0aW9uIGlzT3RoZXJDaGFyYWN0ZXIoY2hhcmFjdGVyKSB7XG4gICAgcmV0dXJuIC9bXkEtWmEtel8wLTlcXHNdLy50ZXN0KGNoYXJhY3RlciB8fCBnZXRDdXJyZW50Q2hhcmFjdGVyKCkpO1xufVxuXG5mdW5jdGlvbiBnZXRBZGphY2VudFRleHRDZWxsSW5TYW1lTGluZShmb3J3YXJkT3JCYWNrd2FyZCkge1xuICAgIHZhciBhZGphY2VudENvbHVtbiwgY2VsbDtcbiAgICBpZiAoZm9yd2FyZE9yQmFja3dhcmQgPT09ICdmb3J3YXJkJykge1xuICAgICAgICBhZGphY2VudENvbHVtbiA9IGN1cnNvci5jb2x1bW4gKyAxO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGFkamFjZW50Q29sdW1uID0gY3Vyc29yLmNvbHVtbiAtIDE7XG4gICAgfVxuICAgIGNlbGwgPSBjaGFtYmVyLm1hdHJpeFtjdXJzb3Iucm93XVthZGphY2VudENvbHVtbl07XG4gICAgaWYgKGNlbGwuaXNUZXh0KSB7XG4gICAgICAgIHJldHVybiBjZWxsO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0QWRqYWNlbnRUZXh0Q2VsbEluQW5vdGhlckxpbmUoZm9yd2FyZE9yQmFja3dhcmQpIHtcbiAgICB2YXIgbGlua1RvQWRqYWNlbnRDZWxsID0gZm9yd2FyZE9yQmFja3dhcmQgPT09ICdmb3J3YXJkJyA/ICduZXh0VGV4dENlbGwnIDogJ3ByZXZpb3VzVGV4dENlbGwnO1xuICAgIHJldHVybiBjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpW2xpbmtUb0FkamFjZW50Q2VsbF07XG59XG5cbmZ1bmN0aW9uIGdldEFkamFjZW50VGV4dENlbGwoZm9yd2FyZE9yQmFja3dhcmQpIHtcbiAgICByZXR1cm4gZ2V0QWRqYWNlbnRUZXh0Q2VsbEluU2FtZUxpbmUoZm9yd2FyZE9yQmFja3dhcmQpIHx8IGdldEFkamFjZW50VGV4dENlbGxJbkFub3RoZXJMaW5lKGZvcndhcmRPckJhY2t3YXJkKTtcbn1cblxuZnVuY3Rpb24gbWFrZUZ1bmN0aW9uV2hpY2hMaW1pdHNNb3ZlbWVudChmb3J3YXJkT3JCYWNrd2FyZCkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICFnZXRBZGphY2VudFRleHRDZWxsKGZvcndhcmRPckJhY2t3YXJkKTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiB0b0VuZE9mTm9uV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyYWN0ZXIsIGlzTGltaXRpbmdDaGFyYWN0ZXIpIHtcbiAgICB2YXIgcHJlZGljYXRlID0gaXNXb3JkQ2hhcmFjdGVyKCkgPyBpc1dvcmRDaGFyYWN0ZXIgOiBpc090aGVyQ2hhcmFjdGVyO1xuICAgIHdoaWxlIChwcmVkaWNhdGUoKSAmJiAhaXNMaW1pdGluZ0NoYXJhY3RlcigpKSB7XG4gICAgICAgIG1vdmVUb05leHRDaGFyYWN0ZXIoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHRvRW5kT2ZXaGl0ZVNwYWNlU2VxdWVuY2UobW92ZVRvTmV4dENoYXJhY3RlciwgaXNMaW1pdGluZ0NoYXJhY3Rlcikge1xuICAgIHdoaWxlIChpc1doaXRlU3BhY2VDaGFyYWN0ZXIoKSAmJiAhaXNMaW1pdGluZ0NoYXJhY3RlcigpKSB7XG4gICAgICAgIG1vdmVUb05leHRDaGFyYWN0ZXIoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIG1ha2VGdW5jdGlvblRvTW92ZU9uZUNoYXJhY3RlckluVGV4dChmb3J3YXJkT3JCYWNrd2FyZCkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFkamFjZW50Q2VsbCA9IGdldEFkamFjZW50VGV4dENlbGwoZm9yd2FyZE9yQmFja3dhcmQpO1xuICAgICAgICBpZiAoYWRqYWNlbnRDZWxsKSB7XG4gICAgICAgICAgICBjdXJzb3Iuc2V0UG9zaXRpb25Gcm9tKGFkamFjZW50Q2VsbCk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5mdW5jdGlvbiBtYWtlRnVuY3Rpb25XaGljaERlY2lkZXNJZklzTW92aW5nT25lQ2hhcmFjdGVyRmlyc3QoZm9yd2FyZE9yQmFja3dhcmQpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChpc1doaXRlU3BhY2VDaGFyYWN0ZXIoKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwcmVkaWNhdGUgPSBpc1dvcmRDaGFyYWN0ZXIoKSA/IGlzV29yZENoYXJhY3RlciA6IGlzT3RoZXJDaGFyYWN0ZXI7XG4gICAgICAgIHZhciBjZWxsID0gZ2V0QWRqYWNlbnRUZXh0Q2VsbChmb3J3YXJkT3JCYWNrd2FyZCk7XG4gICAgICAgIGlmIChjZWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gIXByZWRpY2F0ZShjZWxsLmNoYXJhY3Rlcik7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAnbW92ZSBob3Jpem9udGFsbHknOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIGN1cnNvci5zYXZlQ3VycmVudFBvc2l0aW9uKCk7XG5cbiAgICAgICAgY3Vyc29yLmNvbHVtbiArPSBvcHRpb25zLmRpcmVjdGlvbiA9PT0gJ2xlZnQnID8gLTEgOiAxO1xuICAgICAgICBpZiAoIWNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNCbG9ja2luZygpKSB7XG4gICAgICAgICAgICBjdXJzb3IuZm9yZ2V0Q29sdW1uRm9yVmVydGljYWxNb3ZlbWVudCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoYW1iZXIuY29uZmlndXJhdGlvblsna2lsbGluZyBtb2RlIG9uJ10gJiYgY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0xhemVyQmVhbSgpKSB7XG4gICAgICAgICAgICBjdXJzb3Iuc2V0UG9zaXRpb25Gcm9tKGNoYW1iZXIuc3Bhd25Qb3NpdGlvbik7XG4gICAgICAgIH0gZWxzZSBpZiAoY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0Jsb2NraW5nKCkpIHtcbiAgICAgICAgICAgIGN1cnNvci5yZXN0b3JlVG9TYXZlZFBvc2l0aW9uKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdtb3ZlIHZlcnRpY2FsbHknOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIGN1cnNvci5zYXZlQ3VycmVudFBvc2l0aW9uKCk7XG5cbiAgICAgICAgdmFyIG1hdHJpeCA9IGNoYW1iZXIubWF0cml4O1xuICAgICAgICBjdXJzb3IucmVtZW1iZXJDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50KCk7XG4gICAgICAgIHZhciBzdGVwc0FzaWRlID0gMCxcbiAgICAgICAgICAgIHNpZ24gPSBvcHRpb25zLmRpcmVjdGlvbiA9PT0gJ3VwJyA/IC0xIDogMTtcbiAgICAgICAgaWYgKCFtYXRyaXhbY3Vyc29yLnJvdyArIDEgKiBzaWduXVtjdXJzb3IuY29sdW1uXS5pc1dhbGwoKSkge1xuICAgICAgICAgICAgd2hpbGUgKCFtYXRyaXhbY3Vyc29yLnJvdyArIDEgKiBzaWduXVtjdXJzb3IuY29sdW1uICsgc3RlcHNBc2lkZSArIDFdLmlzV2FsbCgpICYmXG4gICAgICAgICAgICAgICAgY3Vyc29yLmNvbHVtbiArIHN0ZXBzQXNpZGUgPCBjdXJzb3IucmVtZW1iZXJlZENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBzdGVwc0FzaWRlKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdXJzb3IuY29sdW1uICs9IHN0ZXBzQXNpZGU7XG4gICAgICAgICAgICBjdXJzb3Iucm93ICs9IDEgKiBzaWduO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2hpbGUgKCFtYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbiArIHN0ZXBzQXNpZGVdLmlzQmxvY2tpbmcoKSkge1xuICAgICAgICAgICAgICAgIGlmICghbWF0cml4W2N1cnNvci5yb3cgKyAxICogc2lnbl1bY3Vyc29yLmNvbHVtbiArIHN0ZXBzQXNpZGVdLmlzQmxvY2tpbmcoKSkge1xuICAgICAgICAgICAgICAgICAgICBjdXJzb3Iucm93ICs9IDEgKiBzaWduO1xuICAgICAgICAgICAgICAgICAgICBjdXJzb3IuY29sdW1uICs9IHN0ZXBzQXNpZGU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHN0ZXBzQXNpZGUtLTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2hhbWJlci5jb25maWd1cmF0aW9uWydraWxsaW5nIG1vZGUgb24nXSAmJiBjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmlzTGF6ZXJCZWFtKCkpIHtcbiAgICAgICAgICAgIGN1cnNvci5zZXRQb3NpdGlvbkZyb20oY2hhbWJlci5zcGF3blBvc2l0aW9uKTtcbiAgICAgICAgfSBlbHNlIGlmIChjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmlzQmxvY2tpbmcoKSkge1xuICAgICAgICAgICAgY3Vyc29yLnJlc3RvcmVUb1NhdmVkUG9zaXRpb24oKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ21vdmUgYnkgd29yZCc6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgY3Vyc29yLnNhdmVDdXJyZW50UG9zaXRpb24oKTtcblxuICAgICAgICBpZiAoIWNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNUZXh0KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGRpcmVjdGlvbiA9IG9wdGlvbnMuZGlyZWN0aW9uLFxuICAgICAgICAgICAgb3Bwb3NpdGVEaXJlY3Rpb24gPSBkaXJlY3Rpb24gPT09ICdmb3J3YXJkJyA/ICdiYWNrd2FyZCcgOiAnZm9yd2FyZCcsXG4gICAgICAgICAgICBtb3ZlVG9OZXh0Q2hhciA9IG1ha2VGdW5jdGlvblRvTW92ZU9uZUNoYXJhY3RlckluVGV4dChkaXJlY3Rpb24pLFxuICAgICAgICAgICAgbW92ZVRvUHJldmlvdXNDaGFyID0gbWFrZUZ1bmN0aW9uVG9Nb3ZlT25lQ2hhcmFjdGVySW5UZXh0KG9wcG9zaXRlRGlyZWN0aW9uKSxcbiAgICAgICAgICAgIGlzTGltaXRpbmdDaGFyYWN0ZXIgPSBtYWtlRnVuY3Rpb25XaGljaExpbWl0c01vdmVtZW50KGRpcmVjdGlvbiksXG4gICAgICAgICAgICBpc01vdmluZ09uZUNoYXJhY3RlckZpcnN0ID0gbWFrZUZ1bmN0aW9uV2hpY2hEZWNpZGVzSWZJc01vdmluZ09uZUNoYXJhY3RlckZpcnN0KGRpcmVjdGlvbik7XG5cbiAgICAgICAgaWYgKGlzTW92aW5nT25lQ2hhcmFjdGVyRmlyc3QoKSkge1xuICAgICAgICAgICAgbW92ZVRvTmV4dENoYXIoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGlyZWN0aW9uID09PSAnZm9yd2FyZCcgJiYgb3B0aW9ucy50byA9PT0gJ2JlZ2lubmluZycpIHtcbiAgICAgICAgICAgIHRvRW5kT2ZOb25XaGl0ZVNwYWNlU2VxdWVuY2UobW92ZVRvTmV4dENoYXIsIGlzTGltaXRpbmdDaGFyYWN0ZXIpO1xuICAgICAgICB9XG4gICAgICAgIHRvRW5kT2ZXaGl0ZVNwYWNlU2VxdWVuY2UobW92ZVRvTmV4dENoYXIsIGlzTGltaXRpbmdDaGFyYWN0ZXIpO1xuICAgICAgICBpZiAoZGlyZWN0aW9uID09PSAnZm9yd2FyZCcgJiYgb3B0aW9ucy50byA9PT0gJ2VuZGluZycgfHxcbiAgICAgICAgICAgIGRpcmVjdGlvbiA9PT0gJ2JhY2t3YXJkJyAmJiBvcHRpb25zLnRvID09PSAnYmVnaW5uaW5nJykge1xuICAgICAgICAgICAgdG9FbmRPZk5vbldoaXRlU3BhY2VTZXF1ZW5jZShtb3ZlVG9OZXh0Q2hhciwgaXNMaW1pdGluZ0NoYXJhY3Rlcik7XG4gICAgICAgICAgICBpZiAoIWlzTGltaXRpbmdDaGFyYWN0ZXIoKSkge1xuICAgICAgICAgICAgICAgIG1vdmVUb1ByZXZpb3VzQ2hhcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoYW1iZXIuY29uZmlndXJhdGlvblsna2lsbGluZyBtb2RlIG9uJ10gJiYgY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0xhemVyQmVhbSgpKSB7XG4gICAgICAgICAgICBjdXJzb3Iuc2V0UG9zaXRpb25Gcm9tKGNoYW1iZXIuc3Bhd25Qb3NpdGlvbik7XG4gICAgICAgIH0gZWxzZSBpZiAoY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0Jsb2NraW5nKCkpIHtcbiAgICAgICAgICAgIGN1cnNvci5yZXN0b3JlVG9TYXZlZFBvc2l0aW9uKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdtb3ZlIHRvIGVuZCBvZiB0ZXh0JzogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICBjdXJzb3Iuc2F2ZUN1cnJlbnRQb3NpdGlvbigpO1xuXG4gICAgICAgIHZhciBhZGphY2VudENlbGwgPSBnZXRBZGphY2VudFRleHRDZWxsKG9wdGlvbnMuZGlyZWN0aW9uKTtcbiAgICAgICAgd2hpbGUgKGFkamFjZW50Q2VsbCkge1xuICAgICAgICAgICAgY3Vyc29yLnNldFBvc2l0aW9uRnJvbShhZGphY2VudENlbGwpO1xuICAgICAgICAgICAgYWRqYWNlbnRDZWxsID0gZ2V0QWRqYWNlbnRUZXh0Q2VsbChvcHRpb25zLmRpcmVjdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2hhbWJlci5jb25maWd1cmF0aW9uWydraWxsaW5nIG1vZGUgb24nXSAmJiBjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmlzTGF6ZXJCZWFtKCkpIHtcbiAgICAgICAgICAgIGN1cnNvci5zZXRQb3NpdGlvbkZyb20oY2hhbWJlci5zcGF3blBvc2l0aW9uKTtcbiAgICAgICAgfSBlbHNlIGlmIChjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmlzQmxvY2tpbmcoKSkge1xuICAgICAgICAgICAgY3Vyc29yLnJlc3RvcmVUb1NhdmVkUG9zaXRpb24oKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ21vdmUgdG8gZW5kIG9mIGxpbmUnOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIGN1cnNvci5zYXZlQ3VycmVudFBvc2l0aW9uKCk7XG5cbiAgICAgICAgdmFyIGFkamFjZW50Q2VsbCA9IGdldEFkamFjZW50VGV4dENlbGxJblNhbWVMaW5lKG9wdGlvbnMuZGlyZWN0aW9uKTtcbiAgICAgICAgd2hpbGUgKGFkamFjZW50Q2VsbCkge1xuICAgICAgICAgICAgY3Vyc29yLnNldFBvc2l0aW9uRnJvbShhZGphY2VudENlbGwpO1xuICAgICAgICAgICAgYWRqYWNlbnRDZWxsID0gZ2V0QWRqYWNlbnRUZXh0Q2VsbEluU2FtZUxpbmUob3B0aW9ucy5kaXJlY3Rpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoYW1iZXIuY29uZmlndXJhdGlvblsna2lsbGluZyBtb2RlIG9uJ10gJiYgY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0xhemVyQmVhbSgpKSB7XG4gICAgICAgICAgICBjdXJzb3Iuc2V0UG9zaXRpb25Gcm9tKGNoYW1iZXIuc3Bhd25Qb3NpdGlvbik7XG4gICAgICAgIH0gZWxzZSBpZiAoY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0Jsb2NraW5nKCkpIHtcbiAgICAgICAgICAgIGN1cnNvci5yZXN0b3JlVG9TYXZlZFBvc2l0aW9uKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdtb3ZlIHRvIGJlZ2lubmluZyBvZiBsaW5lIG51bWJlcic6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgY3Vyc29yLnNhdmVDdXJyZW50UG9zaXRpb24oKTtcblxuICAgICAgICB0aGlzWydtb3ZlIHRvIGVuZCBvZiBsaW5lJ10oe1xuICAgICAgICAgICAgZGlyZWN0aW9uOiAnYmFja3dhcmQnXG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgdGFyZ2V0TGluZU51bWJlciA9IG9wdGlvbnMubGluZU51bWJlcixcbiAgICAgICAgICAgIGxpbmVOdW1iZXJDZWxsID0gY2hhbWJlci5tYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbiAtIDFdLFxuICAgICAgICAgICAgY3VycmVudExpbmVOdW1iZXIgPSBsaW5lTnVtYmVyQ2VsbC5saW5lTnVtYmVyLFxuICAgICAgICAgICAgc3RlcCA9IHRhcmdldExpbmVOdW1iZXIgPiBjdXJyZW50TGluZU51bWJlciA/IDEgOiAtMTtcbiAgICAgICAgd2hpbGUgKGN1cnJlbnRMaW5lTnVtYmVyICYmIGN1cnJlbnRMaW5lTnVtYmVyICE9PSB0YXJnZXRMaW5lTnVtYmVyKSB7XG4gICAgICAgICAgICBjdXJzb3Iucm93ICs9IHN0ZXA7XG4gICAgICAgICAgICBsaW5lTnVtYmVyQ2VsbCA9IGNoYW1iZXIubWF0cml4W2N1cnNvci5yb3ddW2N1cnNvci5jb2x1bW4gLSAxXTtcbiAgICAgICAgICAgIGN1cnJlbnRMaW5lTnVtYmVyID0gbGluZU51bWJlckNlbGwubGluZU51bWJlcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWN1cnJlbnRMaW5lTnVtYmVyKSB7XG4gICAgICAgICAgICBjdXJzb3Iucm93IC09IHN0ZXA7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2hhbWJlci5jb25maWd1cmF0aW9uWydraWxsaW5nIG1vZGUgb24nXSAmJiBjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmlzTGF6ZXJCZWFtKCkpIHtcbiAgICAgICAgICAgIGN1cnNvci5zZXRQb3NpdGlvbkZyb20oY2hhbWJlci5zcGF3blBvc2l0aW9uKTtcbiAgICAgICAgfSBlbHNlIGlmIChjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmlzQmxvY2tpbmcoKSkge1xuICAgICAgICAgICAgY3Vyc29yLnJlc3RvcmVUb1NhdmVkUG9zaXRpb24oKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0ZnJvbUFycmF5T2ZTdHJpbmdzOiBmdW5jdGlvbiAoYXJyYXlPZlN0cmluZ3MpIHtcblx0XHR0aGlzLm1hdHJpeCA9IGFycmF5T2ZTdHJpbmdzLm1hcChmdW5jdGlvbihzdHJpbmcpIHtcblx0XHRcdHJldHVybiBzdHJpbmcuc3BsaXQoJycpO1xuXHRcdH0pO1xuXHR9LFxuXHRtYXA6IGZ1bmN0aW9uKGZuKSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0cml4Lm1hcChmdW5jdGlvbihhcnJheSwgcm93KSB7XG5cdFx0XHRyZXR1cm4gYXJyYXkubWFwKGZ1bmN0aW9uKGl0ZW0sIGNvbHVtbikge1xuXHRcdFx0XHRyZXR1cm4gZm4oaXRlbSwgcm93LCBjb2x1bW4pO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0sXG5cdGdldENvb3JkaW5hdGVzT2Y6IGZ1bmN0aW9uICh0aGluZ1RvRmluZCkge1xuXHRcdHZhciBwcmVkaWNhdGU7XG5cdFx0aWYgKHR5cGVvZiB0aGluZ1RvRmluZCA9PT0gJ3N0cmluZycpIHtcblx0XHRcdHByZWRpY2F0ZSA9IGZ1bmN0aW9uKHN0cmluZywgYW5vdGhlclN0cmluZykge1xuXHRcdFx0XHRyZXR1cm4gc3RyaW5nID09PSBhbm90aGVyU3RyaW5nO1xuXHRcdFx0fTtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiB0aGluZ1RvRmluZCA9PT0gJ29iamVjdCcpIHtcblx0XHRcdHByZWRpY2F0ZSA9IGZ1bmN0aW9uKHRoaW5nVG9GaW5kLCBhbm90aGVyT2JqZWN0KSB7XG5cdFx0XHRcdHJldHVybiBPYmplY3Qua2V5cyh0aGluZ1RvRmluZCkuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRcdHJldHVybiB0aGluZ1RvRmluZFtrZXldICE9PSBhbm90aGVyT2JqZWN0W2tleV07XG5cdFx0XHRcdH0pLmxlbmd0aCA9PT0gMDtcblxuXHRcdFx0fTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMubWF0cml4LnJlZHVjZShmdW5jdGlvbihmb3VuZCwgYXJyYXksIHJvdykge1xuXHRcdFx0YXJyYXkuZm9yRWFjaChmdW5jdGlvbihjZWxsLCBjb2x1bW4pIHtcblx0XHRcdFx0aWYgKHByZWRpY2F0ZSh0aGluZ1RvRmluZCwgY2VsbCkpIHtcblx0XHRcdFx0XHRmb3VuZC5wdXNoKHtcblx0XHRcdFx0XHRcdHJvdzogcm93LFxuXHRcdFx0XHRcdFx0Y29sdW1uOiBjb2x1bW5cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gZm91bmQ7XG5cdFx0fSwgW10pO1xuXHR9XG59OyIsInZhciBjb25zb2xlO1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgY29uc29sZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNjb25zb2xlJyk7XG59XG5cbnZhciBwcmludFRleHQgPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgdmFyIGxpbmUgPSB0ZXh0LnNoaWZ0KCk7XG4gICAgaWYgKGxpbmUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB3aW5kb3cuc2V0VGltZW91dCAoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zb2xlLmlubmVySFRNTCArPSB0ZXh0LmJ5ICsgbGluZSArICc8YnI+JztcbiAgICAgICAgICAgIGNvbnNvbGUuc2Nyb2xsVG9wICs9MTAwO1xuICAgICAgICAgICAgcHJpbnRUZXh0KHRleHQpO1xuICAgICAgICB9LCBsaW5lLmxlbmd0aCAqIDQwKTtcbiAgICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGV4dCkge1xuICAgIGlmICghQXJyYXkuaXNBcnJheSh0ZXh0KSkge1xuICAgICAgICB0ZXh0ID0gW3RleHRdO1xuICAgIH1cbiAgICB0ZXh0LmJ5ID0gdGV4dC5ieSA/IHRleHQuYnkgKyAnPiAnIDogJyc7XG4gICAgcHJpbnRUZXh0KHRleHQpO1xufTtcbiIsInZhciBwcmludFRleHQgPSByZXF1aXJlKCcuL3ByaW50LmpzJyk7XG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0ZmluZEFuZFRyeVRvS2lsbDogZnVuY3Rpb24oY3Vyc29yLCBjaGFtYmVyKSB7XG5cdC8vIGFkZCBzb21lIGZ1bm55IGV4Y3VzZSBmb3IgdGhlIGtpbGwgZnJvbSB0dXJyZXRcblx0XHRpZiAodGhpcy5pc1Nob290aW5nIHx8IHRoaXMuY2VsbC5pc0RlYWN0aXZhdGVkVHVycmV0KSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHZhciB0dXJyZXQgPSB0aGlzLFxuXHRcdHJpc2UgPSBjdXJzb3Iucm93IC0gdHVycmV0LnJvdyxcblx0XHRydW4gPSBjdXJzb3IuY29sdW1uIC0gdHVycmV0LmNvbHVtbixcblx0XHRjb3VudCA9IE1hdGgubWF4KE1hdGguYWJzKHJpc2UpLCBNYXRoLmFicyhydW4pKSxcblx0XHR0b3RhbCA9IGNvdW50LFxuXHRcdHBhdGggPSBbXSxcblx0XHRjZWxsO1xuXHRcdGlmICghcmlzZSAmJiAhcnVuKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDw9IGNvdW50OyBpKyspIHtcblx0XHRcdGNlbGwgPSBjaGFtYmVyLm1hdHJpeFtNYXRoLnJvdW5kKHR1cnJldC5yb3cgKyByaXNlKihpL3RvdGFsKSldW01hdGgucm91bmQodHVycmV0LmNvbHVtbiArIHJ1biooaS90b3RhbCkpXTtcblx0XHRcdGlmICghY2VsbC5pc0xhemVyQmVhbSgpICYmIGNlbGwuaXNCbG9ja2luZygpKSB7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNlbGwgIT09IHR1cnJldC5jZWxsICYmIHBhdGguaW5kZXhPZihjZWxsKSA9PT0gLTEpIHtcblx0XHRcdFx0cGF0aC5wdXNoKGNlbGwpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNlbGwucm93ID09PSBjdXJzb3Iucm93ICYmIGNlbGwuY29sdW1uID09PSBjdXJzb3IuY29sdW1uKSB7XG5cdFx0XHRcdHR1cnJldC50cnlUb0tpbGwoY3Vyc29yLCBjaGFtYmVyLCBwYXRoKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXHR0cnlUb0tpbGw6IGZ1bmN0aW9uKGN1cnNvciwgY2hhbWJlciwgcGF0aCkge1xuXHRcdHZhciB0dXJyZXQgPSB0aGlzO1xuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgaXNDdXJzb3JVbmRlckxhemVyID0gIXBhdGguZXZlcnkoZnVuY3Rpb24oY2VsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhY2VsbC5pc1VuZGVyQ3Vyc29yO1xuICAgICAgICAgICAgfSk7XG5cdFx0XHRpZiAoaXNDdXJzb3JVbmRlckxhemVyKSB7XG5cdFx0XHRcdHR1cnJldC5pc1Nob290aW5nID0gdHJ1ZTtcblx0XHRcdFx0cGF0aC5mb3JFYWNoKGZ1bmN0aW9uKGNlbGwpIHtcblx0XHRcdFx0XHRjZWxsLmlzVW5kZXJUdXJyZXRGaXJlID0gdHJ1ZTtcblx0XHRcdFx0fSk7XG4gICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSAndHVycmV0PiAnICsgW1xuICAgICAgICAgICAgICAgICAgICAnSSBkaWQgbm90IG1lYW4gdG8uJyxcbiAgICAgICAgICAgICAgICAgICAgJ1RoZXkgbWFkZSBtZSBkbyB0aGlzLicsXG4gICAgICAgICAgICAgICAgICAgICdJIGFtIHRydWxseSBzb3JyeS4nLFxuICAgICAgICAgICAgICAgICAgICAnU29tZXRpbWVzIEkgY2FuIG5vdCBoZWxwIG15c2VsZi4nLFxuICAgICAgICAgICAgICAgICAgICAnV2F0Y2ggb3V0LicsXG4gICAgICAgICAgICAgICAgICAgICdQbGVhc2UgZG8gbm90IHRoaW5rIGxlc3Mgb2YgbWUuJ1xuICAgICAgICAgICAgICAgIF1bTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMyldO1xuICAgICAgICAgICAgICAgIHByaW50VGV4dChtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICBpZiAocmVxdWlyZSgnLi9jaGFtYmVyLmpzJykuY29uZmlndXJhdGlvblsna2lsbGluZyBtb2RlIG9uJ10pIHtcbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yLnNldFBvc2l0aW9uRnJvbShyZXF1aXJlKCcuL2NoYW1iZXIuanMnKS5zcGF3blBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG5cdFx0XHRcdGNoYW1iZXIucmVuZGVyKCk7XG5cdFx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHR1cnJldC5pc1Nob290aW5nID0gZmFsc2U7XG5cdFx0XHRcdFx0cGF0aC5mb3JFYWNoKGZ1bmN0aW9uKGNlbGwpIHtcblx0XHRcdFx0XHRcdGNlbGwuaXNVbmRlclR1cnJldEZpcmUgPSBmYWxzZTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRjaGFtYmVyLnJlbmRlcigpO1xuXHRcdFx0XHR9LCAxMDAwKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHR1cnJldC5maW5kQW5kVHJ5VG9LaWxsKGN1cnNvciwgY2hhbWJlcik7XG5cdFx0XHR9XG5cdFx0fSwgMTAwMCk7XG5cdH1cbn07XG4iXX0=
