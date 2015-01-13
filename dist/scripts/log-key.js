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

},{"./cell-decorator.js":1,"./cursor.js":5,"./matrix-decorator.js":7,"./turret-decorator.js":10}],3:[function(require,module,exports){
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
                    window.alert('Out of such chambers');
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

},{"./chamber.js":2,"./print.js":9}],5:[function(require,module,exports){
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

},{"./commands.js":4,"./print.js":9}],6:[function(require,module,exports){
var lib = require('./movements.js'),
    commandLine = require('./command-line.js'),
    cursor = require('./cursor.js'),
    chamber = require('./chamber.js'),
    keylog = [];

var repeatable = {
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
},

other = {
    ':': function() {
        commandLine.activate();
    },
    'G': function(proceedingNumber) {
        if (proceedingNumber) {
            lib['move to beginning of line number']({
                lineNumber: proceedingNumber
            });
        } else {
            lib['move to end of text']({
                direction: 'forward'
            });
        }
    },
    'g': function() {
        if (keylog[keylog.length - 1] === 'g') {
            lib['move to end of text']({
                direction: 'backward'
            });
        }

    },
    '$': function() {
        lib['move to end of line']({
            direction: 'forward'
        });
    },
    '0': function() {
        lib['move to end of line']({
            direction: 'backward'
        });
    }
};

function getNumberFromLog() {
    var digits = [],
        lastLogEntry = keylog.pop();
    while (/\d/.test(lastLogEntry)) {
        digits.push(lastLogEntry);
        lastLogEntry = keylog.pop();
    }
    keylog.push(lastLogEntry);
    return parseInt(digits.reverse().join(''));
}

function getNiceArrayOfCharacters (args) {
    return [].slice.call(args, 0).join('').split('');
}

function logKey(/*characters*/) {
    var characters = getNiceArrayOfCharacters(arguments);
    characters.forEach(function(character) {
        var proceedingNumber, numberOfTimesRemaining;
        if (/[^\d]/.test(character)) {
            proceedingNumber = numberOfTimesRemaining = getNumberFromLog();
            numberOfTimesRemaining = numberOfTimesRemaining || 1;
        }

        if (repeatable[character]) {
            while (numberOfTimesRemaining-- > 0) {
                repeatable[character]();
            }
        }
        if (other[character]) {
            other[character](proceedingNumber);
        }
        cursor.actOnCurrentCell(chamber);
        chamber.actOnCursor();
        keylog.push(character);
    });
    return logKey;
}

module.exports = logKey;

},{"./chamber.js":2,"./command-line.js":3,"./cursor.js":5,"./movements.js":8}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
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

},{"./chamber.js":2,"./cursor.js":5}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{"./chamber.js":2,"./print.js":9}]},{},[6])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NlbGwtZGVjb3JhdG9yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jaGFtYmVyLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jb21tYW5kLWxpbmUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NvbW1hbmRzLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jdXJzb3IuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2Zha2VfMTBhNmVhM2QuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL21hdHJpeC1kZWNvcmF0b3IuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL21vdmVtZW50cy5qcyIsIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9zcmMvcHJpbnQuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL3R1cnJldC1kZWNvcmF0b3IuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0aXNXYWxsOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gWycrJywgJy0nLCAnfCddLmluZGV4T2YodGhpcy5jaGFyYWN0ZXIpICE9PSAtMSAmJiAhdGhpcy5pc1RleHQ7XG5cdH0sXG5cdGlzTGF6ZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBbJ1YnLCAnXicsICc+JywgJzwnXS5pbmRleE9mKHRoaXMuY2hhcmFjdGVyKSAhPT0gLTEgJiYgIXRoaXMuaXNUZXh0O1xuXHR9LFxuXHRpc0xhemVyQmVhbTogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuaXNWZXJ0aWNhbExhemVyQmVhbSB8fCB0aGlzLmlzSG9yaXpvbnRhbExhemVyQmVhbTtcblx0fSxcblx0aXNCbG9ja2luZzogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuaXNXYWxsKCkgfHwgdGhpcy5pc0xhemVyKCkgfHwgdGhpcy5pc0xhemVyQmVhbSgpO1xuXHR9LFxuXHR0b1N0cmluZzogZnVuY3Rpb24oY29uZmlndXJhdGlvbikge1xuXHRcdHZhciBwcm9wZXJ0eVRvQ2xhc3NOYW1lID0ge1xuXHRcdFx0XHQnaXNUZXh0JzogJ3RleHQnLFxuXHRcdFx0XHQnaXNVbmRlckN1cnNvcic6ICdjdXJzb3InLFxuXHRcdFx0XHQnaXNWZXJ0aWNhbExhemVyQmVhbSc6ICd2ZXJ0aWNhbC1sYXplci1iZWFtJyxcblx0XHRcdFx0J2lzSG9yaXpvbnRhbExhemVyQmVhbSc6ICdob3Jpem9udGFsLWxhemVyLWJlYW0nLFxuXHRcdFx0XHQnaXNVbmRlclR1cnJldEZpcmUnOiAndHVycmV0LWZpcmUnXG5cdFx0XHR9LFxuXHRcdFx0Y2xhc3NOYW1lcyA9IE9iamVjdC5rZXlzKHByb3BlcnR5VG9DbGFzc05hbWUpLmZpbHRlcihmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXNba2V5XTtcblx0XHRcdH0uYmluZCh0aGlzKSkubWFwKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRyZXR1cm4gcHJvcGVydHlUb0NsYXNzTmFtZVtrZXldO1xuXHRcdFx0fSkuam9pbignICcpO1xuICAgICAgICBpZiAodGhpcy5saW5lTnVtYmVyKSB7XG4gICAgICAgICAgICB0aGlzLmNoYXJhY3RlciA9IGNvbmZpZ3VyYXRpb25bJ2Rpc3BsYXkgbGluZSBudW1iZXJzJ10gPyB0aGlzLmxpbmVOdW1iZXIgOiAnICc7XG4gICAgICAgIH1cblxuXHRcdHJldHVybiAnPHNwYW4gIGNsYXNzPVwiJyArIGNsYXNzTmFtZXMgKyAnXCI+JyArIHRoaXMuY2hhcmFjdGVyICsgJzwvc3Bhbj4nO1xuXHR9XG59O1xuIiwidmFyIG1hdHJpeERlY29yYXRvciA9IHJlcXVpcmUoJy4vbWF0cml4LWRlY29yYXRvci5qcycpLFxuXHRjZWxsRGVjb3JhdG9yID0gcmVxdWlyZSgnLi9jZWxsLWRlY29yYXRvci5qcycpLFxuXHR0dXJyZXREZWNvcmF0b3IgPSByZXF1aXJlKCcuL3R1cnJldC1kZWNvcmF0b3IuanMnKSxcblx0Y3Vyc29yID0gcmVxdWlyZSgnLi9jdXJzb3IuanMnKTtcblxudmFyIGNoYW1iZXIgPSBPYmplY3QuY3JlYXRlKG1hdHJpeERlY29yYXRvcik7XG5cbmNoYW1iZXIuZnJvbUpTT04gPSBmdW5jdGlvbihqc29uKSB7XG5cdHRoaXMuZnJvbUFycmF5T2ZTdHJpbmdzKGpzb24uc2NlbmUpO1xuXHRPYmplY3Qua2V5cyhqc29uKS5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7XG5cdFx0cmV0dXJuIGtleSAhPT0gJ3NjZW5lJztcblx0fSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcblx0XHR0aGlzW2tleV0gPSBqc29uW2tleV07XG5cdH0uYmluZCh0aGlzKSk7XG4gICAgdGhpcy5jb25maWd1cmF0aW9uID0ganNvbi5jb25maWd1cmF0aW9uIHx8IHt9O1xufTtcblxuY2hhbWJlci5pbml0aWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMucmVwbGFjZUNoYXJhY3RlcnNXaXRoQ2VsbHMoKTtcblx0dGhpcy5tYXJrVGV4dCgpO1xuXHR0aGlzLm1hcmtMYXplcnMoKTtcblx0dGhpcy5tYXJrQ3Vyc29yKCk7XG5cdHRoaXMubWFya1R1cnJldHMoKTtcbn07XG5cbmNoYW1iZXIucmVwbGFjZUNoYXJhY3RlcnNXaXRoQ2VsbHMgPSBmdW5jdGlvbigpIHtcblx0dmFyIGNoYW1iZXIgPSB0aGlzO1xuXHRjaGFtYmVyLm1hdHJpeCA9IGNoYW1iZXIubWFwKGZ1bmN0aW9uKGNoYXJhY3Rlciwgcm93LCBjb2x1bW4pIHtcblx0XHRpZiAoY2hhcmFjdGVyID09PSAnQCcpIHtcblx0XHRcdGNoYW1iZXIuc3Bhd25Qb3NpdGlvbiA9IHtcblx0XHRcdFx0cm93OiByb3csXG5cdFx0XHRcdGNvbHVtbjogY29sdW1uXG5cdFx0XHR9O1xuXHRcdH1cblx0XHR2YXIgY2VsbCA9IE9iamVjdC5jcmVhdGUoY2VsbERlY29yYXRvcik7XG5cdFx0Y2VsbC5yb3cgPSByb3c7XG5cdFx0Y2VsbC5jb2x1bW4gPSBjb2x1bW47XG5cdFx0Y2VsbC5jaGFyYWN0ZXIgPSBjaGFyYWN0ZXI7XG5cdFx0cmV0dXJuIGNlbGw7XG5cdH0pO1xufTtcblxuY2hhbWJlci5tYXJrQ3Vyc29yID0gZnVuY3Rpb24oKSB7XG5cdGN1cnNvci5yZXNldCgpO1xuXHRjdXJzb3Iuc2V0UG9zaXRpb25Gcm9tKHRoaXMuc3Bhd25Qb3NpdGlvbik7XG59O1xuXG5jaGFtYmVyLm1hcmtUZXh0ID0gZnVuY3Rpb24oKSB7XG5cdHZhciBpc1NlcXVlbmNlT2ZUZXh0SW5Qcm9ncmVzcyA9IGZhbHNlLFxuXHRcdGxhc3RDZWxsSW5TZXF1ZW5jZSxcbiAgICAgICAgcHJldmlvdXNCZWdpbm5pbmdPZkxpbmU7XG5cdHRoaXMubWF0cml4ID0gdGhpcy5tYXAoZnVuY3Rpb24oY2VsbCwgcm93LCBjb2x1bW4pIHtcblx0XHRpZiAoaXNTZXF1ZW5jZU9mVGV4dEluUHJvZ3Jlc3MpIHtcblx0XHRcdGlmIChjZWxsLmNoYXJhY3RlciA9PT0gJ2AnKSB7XG5cdFx0XHRcdGlzU2VxdWVuY2VPZlRleHRJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHRcdGxhc3RDZWxsSW5TZXF1ZW5jZSA9IGNoYW1iZXIubWF0cml4W3Jvd11bY29sdW1uIC0gMV07XG5cdFx0XHRcdGNlbGwuY2hhcmFjdGVyID0gJyAnO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y2VsbC5pc1RleHQgPSB0cnVlO1xuXHRcdFx0XHRpZiAobGFzdENlbGxJblNlcXVlbmNlKSB7XG5cdFx0XHRcdFx0aWYgKE1hdGguYWJzKGxhc3RDZWxsSW5TZXF1ZW5jZS5yb3cgLSBjZWxsLnJvdykgPT09IDEpIHtcblx0XHRcdFx0XHRcdGNlbGwucHJldmlvdXNUZXh0Q2VsbCA9IGxhc3RDZWxsSW5TZXF1ZW5jZTtcblx0XHRcdFx0XHRcdGxhc3RDZWxsSW5TZXF1ZW5jZS5uZXh0VGV4dENlbGwgPSBjZWxsO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRsYXN0Q2VsbEluU2VxdWVuY2UgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2UgaWYgKGNlbGwuY2hhcmFjdGVyID09PSAnYCcpIHtcblx0XHRcdGlzU2VxdWVuY2VPZlRleHRJblByb2dyZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgIHByZXZpb3VzQmVnaW5uaW5nT2ZMaW5lID0gY2hhbWJlci5tYXRyaXhbcm93IC0gMV1bY29sdW1uXTtcbiAgICAgICAgICAgIGlmIChwcmV2aW91c0JlZ2lubmluZ09mTGluZS5saW5lTnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgY2VsbC5saW5lTnVtYmVyID0gcHJldmlvdXNCZWdpbm5pbmdPZkxpbmUubGluZU51bWJlciArIDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxhc3RDZWxsSW5TZXF1ZW5jZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBjZWxsLmxpbmVOdW1iZXIgPSAxO1xuICAgICAgICAgICAgfVxuXHRcdH1cblxuXHRcdHJldHVybiBjZWxsO1xuXHR9KTtcbn07XG5cbmNoYW1iZXIubWFya0xhemVycyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgbWF0cml4ID0gdGhpcy5tYXRyaXg7XG5cdHRoaXMubWF0cml4ID0gdGhpcy5tYXAoZnVuY3Rpb24oY2VsbCwgcm93LCBjb2x1bW4pIHtcblx0XHR2YXIgY2hhcmFjdGVyID0gY2VsbC5jaGFyYWN0ZXIsXG5cdFx0XHRpc1ZlcnRpY2FsTGF6ZXJCZWFtID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBbJzwnLCc+J10uaW5kZXhPZihjaGFyYWN0ZXIpID09PSAtMTtcblx0XHRcdH0sXG5cdFx0XHRiZWFtUHJvcGVydHkgPSBpc1ZlcnRpY2FsTGF6ZXJCZWFtKCkgPyAnaXNWZXJ0aWNhbExhemVyQmVhbScgOiAnaXNIb3Jpem9udGFsTGF6ZXJCZWFtJyxcblx0XHRcdGlzQmVhbUNvbnRpbnVpbmcgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIG1hdHJpeFtyb3ddW2NvbHVtbl0uaXNMYXplckJlYW0oKSB8fCAhbWF0cml4W3Jvd11bY29sdW1uXS5pc0Jsb2NraW5nKCk7XG5cdFx0XHR9LFxuXHRcdFx0bmV4dCA9IHtcblx0XHRcdFx0J1YnOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gbWF0cml4W3JvdysrXVtjb2x1bW5dO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQnXic6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBtYXRyaXhbcm93LS1dW2NvbHVtbl07XG5cdFx0XHRcdH0sXG5cdFx0XHRcdCc+JzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG1hdHJpeFtyb3ddW2NvbHVtbisrXTtcblx0XHRcdFx0fSxcblx0XHRcdFx0JzwnOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gbWF0cml4W3Jvd11bY29sdW1uLS1dO1xuXHRcdFx0XHR9XG5cdFx0XHR9W2NoYXJhY3Rlcl07XG5cdFx0aWYgKG5leHQpIHtcblx0XHRcdG5leHQoKTtcblx0XHRcdHdoaWxlIChpc0JlYW1Db250aW51aW5nKCkpIHtcblx0XHRcdFx0bmV4dCgpW2JlYW1Qcm9wZXJ0eV0gPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gY2VsbDtcblx0fSk7XG59O1xuXG5jaGFtYmVyLm1hcmtUdXJyZXRzID0gZnVuY3Rpb24oKSB7XG5cdHZhciBjaGFtYmVyID0gdGhpcztcblx0dGhpcy50dXJyZXRzID0gW107XG5cdHRoaXMubWF0cml4ID0gdGhpcy5tYXAoZnVuY3Rpb24oY2VsbCwgcm93LCBjb2x1bW4pIHtcblx0XHRpZiAoY2VsbC5jaGFyYWN0ZXIgPT09ICcmJykge1xuXHRcdFx0dmFyIHR1cnJldCA9IE9iamVjdC5jcmVhdGUodHVycmV0RGVjb3JhdG9yKTtcblx0XHRcdHR1cnJldC5yb3cgPSByb3c7XG5cdFx0XHR0dXJyZXQuY29sdW1uID0gY29sdW1uO1xuXHRcdFx0dHVycmV0LmNlbGwgPSBjZWxsO1xuXHRcdFx0Y2hhbWJlci50dXJyZXRzLnB1c2godHVycmV0KTtcblx0XHR9XG5cdFx0cmV0dXJuIGNlbGw7XG5cdH0pO1xufTtcblxuY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMubWF0cml4W2N1cnNvci5yb3ddW2N1cnNvci5jb2x1bW5dO1xufTtcblxuY2hhbWJlci5yZW5kZXIgPSBmdW5jdGlvbigpIHtcblx0dmFyIGVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2NlbmUnKTtcblx0ZWxlbWVudC5pbm5lckhUTUwgPSBjaGFtYmVyLm1hdHJpeC5tYXAoZnVuY3Rpb24oYXJyYXkpIHtcblx0XHRhcnJheSA9IGFycmF5Lm1hcChmdW5jdGlvbihjZWxsKSB7XG5cdFx0XHRjZWxsLmlzVW5kZXJDdXJzb3IgPSBjZWxsLnJvdyA9PT0gY3Vyc29yLnJvdyAmJiBjZWxsLmNvbHVtbiA9PT0gY3Vyc29yLmNvbHVtbjtcbiAgICAgICAgICAgIGNlbGwgPSBjZWxsLnRvU3RyaW5nKGNoYW1iZXIuY29uZmlndXJhdGlvbik7XG4gICAgICAgICAgICByZXR1cm4gY2VsbDtcblx0XHR9KTtcblx0XHRyZXR1cm4gYXJyYXkuam9pbignJyk7XG5cdH0pLmpvaW4oJzxicj4nKTtcbn07XG5cbmNoYW1iZXIuYWN0T25DdXJzb3IgPSBmdW5jdGlvbigpIHtcblx0dGhpcy50dXJyZXRzLmZvckVhY2goZnVuY3Rpb24odHVycmV0KSB7XG5cdFx0dHVycmV0LmZpbmRBbmRUcnlUb0tpbGwoY3Vyc29yLCBjaGFtYmVyKTtcblx0fSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNoYW1iZXI7XG4iLCJ2YXIgY29tbWFuZHMgPSByZXF1aXJlKCcuL2NvbW1hbmRzLmpzJyk7XG5cbnZhciBjb21tYW5kTGluZSA9IHtcblx0ZXhlY3V0ZTogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGdpdmVuQ29tbWFuZCA9IHRoaXMuZWxlbWVudC52YWx1ZS5zbGljZSgxKTsgLy8gc3RyaXAgY29sb25cblx0XHRPYmplY3Qua2V5cyhjb21tYW5kcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcblx0XHRcdHZhciBtYXRjaGVzID0gZ2l2ZW5Db21tYW5kLm1hdGNoKG5ldyBSZWdFeHAoa2V5KSk7XG5cdFx0XHRpZiAobWF0Y2hlcykge1xuXHRcdFx0XHRjb21tYW5kc1trZXldLmFwcGx5KHRoaXMsIG1hdGNoZXMuc2xpY2UoMSkpOyAvLyBzdHJpcCBtYXRjaGluZyBsaW5lXG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn07XG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuXHRjb21tYW5kTGluZS5lbGVtZW50ID0gd2luZG93LmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNjb21tYW5kLWxpbmUnKTtcblx0Y29tbWFuZExpbmUuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgZnVuY3Rpb24oKSB7XG5cdFx0aWYgKGNvbW1hbmRMaW5lLmVsZW1lbnQudmFsdWUpIHtcblx0XHRcdGNvbW1hbmRMaW5lLmVsZW1lbnQuZm9jdXMoKTtcblx0XHR9XG5cdH0pO1xuXHRjb21tYW5kTGluZS5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXByZXNzJywgZnVuY3Rpb24oZSkge1xuXHRcdGlmIChlLndoaWNoID09PSAxMykge1xuXHRcdFx0Y29tbWFuZExpbmUuZXhlY3V0ZSgpO1xuXHRcdFx0Y29tbWFuZExpbmUuZGVhY3RpdmF0ZSgpO1xuXHRcdH1cblx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHR9KTtcblx0Y29tbWFuZExpbmUuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0aW9uKCkge1xuXHRcdGlmIChjb21tYW5kTGluZS5lbGVtZW50LnZhbHVlID09PSAnJykge1xuXHRcdFx0Y29tbWFuZExpbmUuZGVhY3RpdmF0ZSgpO1xuXHRcdH1cblx0fSk7XG5cdGNvbW1hbmRMaW5lLmFjdGl2YXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5lbGVtZW50LmZvY3VzKCk7XG5cdH07XG5cdGNvbW1hbmRMaW5lLmRlYWN0aXZhdGUgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmVsZW1lbnQudmFsdWUgPSAnJztcblx0XHR0aGlzLmVsZW1lbnQuYmx1cigpO1xuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbW1hbmRMaW5lOyIsInZhciBjb21tYW5kcyA9IHt9LFxuICAgIG1haW5GdW5jdGlvbixcbiAgICBwcmludFRleHQgPSByZXF1aXJlKCcuL3ByaW50LmpzJyk7XG5tb2R1bGUuZXhwb3J0cyA9IGNvbW1hbmRzO1xuXG5jb21tYW5kc1snY2hhbWJlciAoXFxcXGQrKSddID0gZnVuY3Rpb24oY2hhbWJlck51bWJlcikge1xuICAgIHZhciB4bWxodHRwID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgeG1saHR0cC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHhtbGh0dHAucmVhZHlTdGF0ZSAhPT0gNCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBkZWZhdWx0QWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmFsZXJ0KHhtbGh0dHAuc3RhdHVzKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhY3Rpb24gPSB7XG4gICAgICAgICAgICAgICAgJzIwMCc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UuY2hhbWJlciA9IGNoYW1iZXJOdW1iZXI7XG4gICAgICAgICAgICAgICAgICAgIG1haW5GdW5jdGlvbihKU09OLnBhcnNlKHhtbGh0dHAucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAnNDA0JzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5hbGVydCgnT3V0IG9mIHN1Y2ggY2hhbWJlcnMnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9W3htbGh0dHAuc3RhdHVzXSB8fCBkZWZhdWx0QWN0aW9uO1xuICAgICAgICBhY3Rpb24oKTtcblxuICAgIH07XG4gICAgY2hhbWJlck51bWJlciA9IGNoYW1iZXJOdW1iZXIgfHwgbG9jYWxTdG9yYWdlLmNoYW1iZXIgfHwgMDtcbiAgICB4bWxodHRwLm9wZW4oJ0dFVCcsICcuL2NoYW1iZXJzLycgKyBjaGFtYmVyTnVtYmVyICsgJy5qc29uJywgdHJ1ZSk7XG4gICAgeG1saHR0cC5zZW5kKCk7XG59O1xuXG5jb21tYW5kc1snc2V0IG51bWJlciddID0gZnVuY3Rpb24oKSB7XG4gICAgcmVxdWlyZSgnLi9jaGFtYmVyLmpzJykuY29uZmlndXJhdGlvblsnZGlzcGxheSBsaW5lIG51bWJlcnMnXSA9IHRydWU7XG4gICAgcmVxdWlyZSgnLi9jaGFtYmVyLmpzJykucmVuZGVyKCk7XG59O1xuY29tbWFuZHNbJ3NldCBudSddID0gY29tbWFuZHNbJ3NldCBudW1iZXInXTtcblxuY29tbWFuZHNbJ3NldCBub251bWJlciddID0gZnVuY3Rpb24oKSB7XG4gICAgcmVxdWlyZSgnLi9jaGFtYmVyLmpzJykuY29uZmlndXJhdGlvblsnZGlzcGxheSBsaW5lIG51bWJlcnMnXSA9IGZhbHNlO1xuICAgIHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLnJlbmRlcigpO1xufTtcbmNvbW1hbmRzWydzZXQgbm9udSddID0gY29tbWFuZHNbJ3NldCBub251bWJlciddO1xuXG5jb21tYW5kc1snY2FrZSBpcyBhIGxpZSddID0gZnVuY3Rpb24oKSB7XG4gICAgcmVxdWlyZSgnLi9jaGFtYmVyLmpzJykuY29uZmlndXJhdGlvblsna2lsbGluZyBtb2RlIG9uJ10gPSB0cnVlO1xuICAgIHByaW50VGV4dChbJycsJ05vdyB5b3UgYXJlIGdvaW5nIHRvIGRpZS4gRXZlcnkgdGltZS4nLCcnXSk7XG59O1xuXG5jb21tYW5kcy5sb2FkTmV4dENoYW1iZXIgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbmV4dENoYW1iZXJOdW1iZXIgPSBOdW1iZXIobG9jYWxTdG9yYWdlLmNoYW1iZXIpICsgMTtcbiAgICBjb21tYW5kc1snY2hhbWJlciAoXFxcXGQrKSddKG5leHRDaGFtYmVyTnVtYmVyKTtcbn07XG5cbmNvbW1hbmRzWydpbml0aWFsaXplIGNoYW1iZXInXSA9IGZ1bmN0aW9uKG1haW4pIHtcbiAgICBtYWluRnVuY3Rpb24gPSBtYWluO1xuICAgIGNvbW1hbmRzWydjaGFtYmVyIChcXFxcZCspJ10oKTtcbn07XG4iLCJ2YXIgY29tbWFuZHMgPSByZXF1aXJlKCcuL2NvbW1hbmRzLmpzJyksXG4gICAgcHJpbnRUZXh0ID0gcmVxdWlyZSgnLi9wcmludC5qcycpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgc2NvcmU6IDAsXG4gICAgYWN0T25DdXJyZW50Q2VsbDogZnVuY3Rpb24oY2hhbWJlcikge1xuICAgICAgICB2YXIgY3Vyc29yID0gdGhpcyxcbiAgICAgICAgICAgIGNlbGwgPSBjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLFxuICAgICAgICAgICAgYWN0aW9uID0ge1xuICAgICAgICAgICAgICAgICcqJzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNlbGwuY2hhcmFjdGVyID0gJyAnO1xuICAgICAgICAgICAgICAgICAgICBjdXJzb3Iuc2NvcmUrKztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICdPJzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5oYXNDb21wbGV0ZWRMZXZlbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb25ncmF0dWxhdGlvbk1lc3NhZ2UgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnMCc6ICdZb3UgZGlkIGl0LCBJIGFtIGJvcmVkIHdhdGNoaW5nIHlvdS4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgJzEnOiAnT25seSBvbmUgcGF0aGV0aWMgc3Rhcj8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgJzInOiAnRGlkIHlvdSBldmVuIHRyeT8nXG4gICAgICAgICAgICAgICAgICAgIH1bY3Vyc29yLnNjb3JlXSB8fCAnU2F0aXNmeWluZyBwZXJmb3JtYWNlLic7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRUZXh0KFsnJywgY29uZ3JhdHVsYXRpb25NZXNzYWdlLCAnJ10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tbWFuZHMubG9hZE5leHRDaGFtYmVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICcmJzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNlbGwuaXNEZWFjdGl2YXRlZFR1cnJldCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGNlbGwuY2hhcmFjdGVyID0gJyA8ZGl2IGNsYXNzPVwiZGVhY3RpdmF0ZWQtdHVycmV0XCI+JjwvZGl2Pic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVtjZWxsLmNoYXJhY3Rlcl07XG4gICAgICAgIGlmICghY2VsbC5pc1RleHQgJiYgYWN0aW9uKSB7XG4gICAgICAgICAgICBhY3Rpb24oKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmhhc0NvbXBsZXRlZExldmVsID0gZmFsc2U7XG4gICAgICAgIHRoaXMuc2NvcmUgPSAwO1xuICAgICAgICB0aGlzLmZvcmdldENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQoKTtcbiAgICB9LFxuICAgIHNldFBvc2l0aW9uRnJvbTogZnVuY3Rpb24oYW5vdGhlck9iamVjdCkge1xuICAgICAgICB0aGlzLmNvbHVtbiA9IGFub3RoZXJPYmplY3QuY29sdW1uO1xuICAgICAgICB0aGlzLnJvdyA9IGFub3RoZXJPYmplY3Qucm93O1xuICAgIH0sXG4gICAgcmVtZW1iZXJDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKCF0aGlzLnJlbWVtYmVyZWRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50KSB7XG4gICAgICAgICAgICB0aGlzLnJlbWVtYmVyZWRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50ID0gdGhpcy5jb2x1bW47XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGZvcmdldENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBkZWxldGUgdGhpcy5yZW1lbWJlcmVkQ29sdW1uRm9yVmVydGljYWxNb3ZlbWVudDtcbiAgICB9LFxuICAgIHNhdmVDdXJyZW50UG9zaXRpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnNhdmVkQ29sdW1uID0gdGhpcy5jb2x1bW47XG4gICAgICAgIHRoaXMuc2F2ZWRSb3cgPSB0aGlzLnJvdztcbiAgICB9LFxuICAgIHJlc3RvcmVUb1NhdmVkUG9zaXRpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmNvbHVtbiA9IHRoaXMuc2F2ZWRDb2x1bW47XG4gICAgICAgIHRoaXMucm93ID0gdGhpcy5zYXZlZFJvdztcbiAgICB9XG59O1xuIiwidmFyIGxpYiA9IHJlcXVpcmUoJy4vbW92ZW1lbnRzLmpzJyksXG4gICAgY29tbWFuZExpbmUgPSByZXF1aXJlKCcuL2NvbW1hbmQtbGluZS5qcycpLFxuICAgIGN1cnNvciA9IHJlcXVpcmUoJy4vY3Vyc29yLmpzJyksXG4gICAgY2hhbWJlciA9IHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLFxuICAgIGtleWxvZyA9IFtdO1xuXG52YXIgcmVwZWF0YWJsZSA9IHtcbiAgICAnaCc6IGZ1bmN0aW9uKCkge1xuICAgICAgICBsaWJbJ21vdmUgaG9yaXpvbnRhbGx5J10oe1xuICAgICAgICAgICAgZGlyZWN0aW9uOiAnbGVmdCdcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICAnbCc6IGZ1bmN0aW9uKCkge1xuICAgICAgICBsaWJbJ21vdmUgaG9yaXpvbnRhbGx5J10oe1xuICAgICAgICAgICAgZGlyZWN0aW9uOiAncmlnaHQnXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgJ2snOiBmdW5jdGlvbigpIHtcbiAgICAgICAgbGliWydtb3ZlIHZlcnRpY2FsbHknXSh7XG4gICAgICAgICAgICBkaXJlY3Rpb246ICd1cCdcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICAnaic6IGZ1bmN0aW9uKCkge1xuICAgICAgICBsaWJbJ21vdmUgdmVydGljYWxseSddKHtcbiAgICAgICAgICAgIGRpcmVjdGlvbjogJ2Rvd24nXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgJ3cnOiBmdW5jdGlvbigpIHtcbiAgICAgICAgbGliWydtb3ZlIGJ5IHdvcmQnXSh7XG4gICAgICAgICAgICBkaXJlY3Rpb246ICdmb3J3YXJkJyxcbiAgICAgICAgICAgIHRvOiAnYmVnaW5uaW5nJ1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgICdlJzogZnVuY3Rpb24oKSB7XG4gICAgICAgIGxpYlsnbW92ZSBieSB3b3JkJ10oe1xuICAgICAgICAgICAgZGlyZWN0aW9uOiAnZm9yd2FyZCcsXG4gICAgICAgICAgICB0bzogJ2VuZGluZydcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICAnYic6IGZ1bmN0aW9uKCkge1xuICAgICAgICBsaWJbJ21vdmUgYnkgd29yZCddKHtcbiAgICAgICAgICAgIGRpcmVjdGlvbjogJ2JhY2t3YXJkJyxcbiAgICAgICAgICAgIHRvOiAnYmVnaW5uaW5nJ1xuICAgICAgICB9KTtcbiAgICB9XG59LFxuXG5vdGhlciA9IHtcbiAgICAnOic6IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb21tYW5kTGluZS5hY3RpdmF0ZSgpO1xuICAgIH0sXG4gICAgJ0cnOiBmdW5jdGlvbihwcm9jZWVkaW5nTnVtYmVyKSB7XG4gICAgICAgIGlmIChwcm9jZWVkaW5nTnVtYmVyKSB7XG4gICAgICAgICAgICBsaWJbJ21vdmUgdG8gYmVnaW5uaW5nIG9mIGxpbmUgbnVtYmVyJ10oe1xuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IHByb2NlZWRpbmdOdW1iZXJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGliWydtb3ZlIHRvIGVuZCBvZiB0ZXh0J10oe1xuICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogJ2ZvcndhcmQnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2cnOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGtleWxvZ1trZXlsb2cubGVuZ3RoIC0gMV0gPT09ICdnJykge1xuICAgICAgICAgICAgbGliWydtb3ZlIHRvIGVuZCBvZiB0ZXh0J10oe1xuICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogJ2JhY2t3YXJkJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgIH0sXG4gICAgJyQnOiBmdW5jdGlvbigpIHtcbiAgICAgICAgbGliWydtb3ZlIHRvIGVuZCBvZiBsaW5lJ10oe1xuICAgICAgICAgICAgZGlyZWN0aW9uOiAnZm9yd2FyZCdcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICAnMCc6IGZ1bmN0aW9uKCkge1xuICAgICAgICBsaWJbJ21vdmUgdG8gZW5kIG9mIGxpbmUnXSh7XG4gICAgICAgICAgICBkaXJlY3Rpb246ICdiYWNrd2FyZCdcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gZ2V0TnVtYmVyRnJvbUxvZygpIHtcbiAgICB2YXIgZGlnaXRzID0gW10sXG4gICAgICAgIGxhc3RMb2dFbnRyeSA9IGtleWxvZy5wb3AoKTtcbiAgICB3aGlsZSAoL1xcZC8udGVzdChsYXN0TG9nRW50cnkpKSB7XG4gICAgICAgIGRpZ2l0cy5wdXNoKGxhc3RMb2dFbnRyeSk7XG4gICAgICAgIGxhc3RMb2dFbnRyeSA9IGtleWxvZy5wb3AoKTtcbiAgICB9XG4gICAga2V5bG9nLnB1c2gobGFzdExvZ0VudHJ5KTtcbiAgICByZXR1cm4gcGFyc2VJbnQoZGlnaXRzLnJldmVyc2UoKS5qb2luKCcnKSk7XG59XG5cbmZ1bmN0aW9uIGdldE5pY2VBcnJheU9mQ2hhcmFjdGVycyAoYXJncykge1xuICAgIHJldHVybiBbXS5zbGljZS5jYWxsKGFyZ3MsIDApLmpvaW4oJycpLnNwbGl0KCcnKTtcbn1cblxuZnVuY3Rpb24gbG9nS2V5KC8qY2hhcmFjdGVycyovKSB7XG4gICAgdmFyIGNoYXJhY3RlcnMgPSBnZXROaWNlQXJyYXlPZkNoYXJhY3RlcnMoYXJndW1lbnRzKTtcbiAgICBjaGFyYWN0ZXJzLmZvckVhY2goZnVuY3Rpb24oY2hhcmFjdGVyKSB7XG4gICAgICAgIHZhciBwcm9jZWVkaW5nTnVtYmVyLCBudW1iZXJPZlRpbWVzUmVtYWluaW5nO1xuICAgICAgICBpZiAoL1teXFxkXS8udGVzdChjaGFyYWN0ZXIpKSB7XG4gICAgICAgICAgICBwcm9jZWVkaW5nTnVtYmVyID0gbnVtYmVyT2ZUaW1lc1JlbWFpbmluZyA9IGdldE51bWJlckZyb21Mb2coKTtcbiAgICAgICAgICAgIG51bWJlck9mVGltZXNSZW1haW5pbmcgPSBudW1iZXJPZlRpbWVzUmVtYWluaW5nIHx8IDE7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVwZWF0YWJsZVtjaGFyYWN0ZXJdKSB7XG4gICAgICAgICAgICB3aGlsZSAobnVtYmVyT2ZUaW1lc1JlbWFpbmluZy0tID4gMCkge1xuICAgICAgICAgICAgICAgIHJlcGVhdGFibGVbY2hhcmFjdGVyXSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChvdGhlcltjaGFyYWN0ZXJdKSB7XG4gICAgICAgICAgICBvdGhlcltjaGFyYWN0ZXJdKHByb2NlZWRpbmdOdW1iZXIpO1xuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5hY3RPbkN1cnJlbnRDZWxsKGNoYW1iZXIpO1xuICAgICAgICBjaGFtYmVyLmFjdE9uQ3Vyc29yKCk7XG4gICAgICAgIGtleWxvZy5wdXNoKGNoYXJhY3Rlcik7XG4gICAgfSk7XG4gICAgcmV0dXJuIGxvZ0tleTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBsb2dLZXk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0ZnJvbUFycmF5T2ZTdHJpbmdzOiBmdW5jdGlvbiAoYXJyYXlPZlN0cmluZ3MpIHtcblx0XHR0aGlzLm1hdHJpeCA9IGFycmF5T2ZTdHJpbmdzLm1hcChmdW5jdGlvbihzdHJpbmcpIHtcblx0XHRcdHJldHVybiBzdHJpbmcuc3BsaXQoJycpO1xuXHRcdH0pO1xuXHR9LFxuXHRtYXA6IGZ1bmN0aW9uKGZuKSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0cml4Lm1hcChmdW5jdGlvbihhcnJheSwgcm93KSB7XG5cdFx0XHRyZXR1cm4gYXJyYXkubWFwKGZ1bmN0aW9uKGl0ZW0sIGNvbHVtbikge1xuXHRcdFx0XHRyZXR1cm4gZm4oaXRlbSwgcm93LCBjb2x1bW4pO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0sXG5cdGdldENvb3JkaW5hdGVzT2Y6IGZ1bmN0aW9uICh0aGluZ1RvRmluZCkge1xuXHRcdHZhciBwcmVkaWNhdGU7XG5cdFx0aWYgKHR5cGVvZiB0aGluZ1RvRmluZCA9PT0gJ3N0cmluZycpIHtcblx0XHRcdHByZWRpY2F0ZSA9IGZ1bmN0aW9uKHN0cmluZywgYW5vdGhlclN0cmluZykge1xuXHRcdFx0XHRyZXR1cm4gc3RyaW5nID09PSBhbm90aGVyU3RyaW5nO1xuXHRcdFx0fTtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiB0aGluZ1RvRmluZCA9PT0gJ29iamVjdCcpIHtcblx0XHRcdHByZWRpY2F0ZSA9IGZ1bmN0aW9uKHRoaW5nVG9GaW5kLCBhbm90aGVyT2JqZWN0KSB7XG5cdFx0XHRcdHJldHVybiBPYmplY3Qua2V5cyh0aGluZ1RvRmluZCkuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRcdHJldHVybiB0aGluZ1RvRmluZFtrZXldICE9PSBhbm90aGVyT2JqZWN0W2tleV07XG5cdFx0XHRcdH0pLmxlbmd0aCA9PT0gMDtcblxuXHRcdFx0fTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMubWF0cml4LnJlZHVjZShmdW5jdGlvbihmb3VuZCwgYXJyYXksIHJvdykge1xuXHRcdFx0YXJyYXkuZm9yRWFjaChmdW5jdGlvbihjZWxsLCBjb2x1bW4pIHtcblx0XHRcdFx0aWYgKHByZWRpY2F0ZSh0aGluZ1RvRmluZCwgY2VsbCkpIHtcblx0XHRcdFx0XHRmb3VuZC5wdXNoKHtcblx0XHRcdFx0XHRcdHJvdzogcm93LFxuXHRcdFx0XHRcdFx0Y29sdW1uOiBjb2x1bW5cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gZm91bmQ7XG5cdFx0fSwgW10pO1xuXHR9XG59OyIsInZhciBjaGFtYmVyID0gcmVxdWlyZSgnLi9jaGFtYmVyLmpzJyksXG4gICAgY3Vyc29yID0gcmVxdWlyZSgnLi9jdXJzb3IuanMnKTtcblxuZnVuY3Rpb24gZ2V0Q3VycmVudENoYXJhY3RlcigpIHtcbiAgICByZXR1cm4gY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5jaGFyYWN0ZXI7XG59XG5cbmZ1bmN0aW9uIGlzV29yZENoYXJhY3RlcihjaGFyYWN0ZXIpIHtcbiAgICByZXR1cm4gL1tBLVphLXpfMC05XS8udGVzdChjaGFyYWN0ZXIgfHwgZ2V0Q3VycmVudENoYXJhY3RlcigpKTtcbn1cblxuZnVuY3Rpb24gaXNXaGl0ZVNwYWNlQ2hhcmFjdGVyKGNoYXJhY3Rlcikge1xuICAgIHJldHVybiAvXFxzLy50ZXN0KGNoYXJhY3RlciB8fCBnZXRDdXJyZW50Q2hhcmFjdGVyKCkpO1xufVxuXG5mdW5jdGlvbiBpc090aGVyQ2hhcmFjdGVyKGNoYXJhY3Rlcikge1xuICAgIHJldHVybiAvW15BLVphLXpfMC05XFxzXS8udGVzdChjaGFyYWN0ZXIgfHwgZ2V0Q3VycmVudENoYXJhY3RlcigpKTtcbn1cblxuZnVuY3Rpb24gZ2V0QWRqYWNlbnRUZXh0Q2VsbEluU2FtZUxpbmUoZm9yd2FyZE9yQmFja3dhcmQpIHtcbiAgICB2YXIgYWRqYWNlbnRDb2x1bW4sIGNlbGw7XG4gICAgaWYgKGZvcndhcmRPckJhY2t3YXJkID09PSAnZm9yd2FyZCcpIHtcbiAgICAgICAgYWRqYWNlbnRDb2x1bW4gPSBjdXJzb3IuY29sdW1uICsgMTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBhZGphY2VudENvbHVtbiA9IGN1cnNvci5jb2x1bW4gLSAxO1xuICAgIH1cbiAgICBjZWxsID0gY2hhbWJlci5tYXRyaXhbY3Vyc29yLnJvd11bYWRqYWNlbnRDb2x1bW5dO1xuICAgIGlmIChjZWxsLmlzVGV4dCkge1xuICAgICAgICByZXR1cm4gY2VsbDtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldEFkamFjZW50VGV4dENlbGxJbkFub3RoZXJMaW5lKGZvcndhcmRPckJhY2t3YXJkKSB7XG4gICAgdmFyIGxpbmtUb0FkamFjZW50Q2VsbCA9IGZvcndhcmRPckJhY2t3YXJkID09PSAnZm9yd2FyZCcgPyAnbmV4dFRleHRDZWxsJyA6ICdwcmV2aW91c1RleHRDZWxsJztcbiAgICByZXR1cm4gY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKVtsaW5rVG9BZGphY2VudENlbGxdO1xufVxuXG5mdW5jdGlvbiBnZXRBZGphY2VudFRleHRDZWxsKGZvcndhcmRPckJhY2t3YXJkKSB7XG4gICAgcmV0dXJuIGdldEFkamFjZW50VGV4dENlbGxJblNhbWVMaW5lKGZvcndhcmRPckJhY2t3YXJkKSB8fCBnZXRBZGphY2VudFRleHRDZWxsSW5Bbm90aGVyTGluZShmb3J3YXJkT3JCYWNrd2FyZCk7XG59XG5cbmZ1bmN0aW9uIG1ha2VGdW5jdGlvbldoaWNoTGltaXRzTW92ZW1lbnQoZm9yd2FyZE9yQmFja3dhcmQpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAhZ2V0QWRqYWNlbnRUZXh0Q2VsbChmb3J3YXJkT3JCYWNrd2FyZCk7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gdG9FbmRPZk5vbldoaXRlU3BhY2VTZXF1ZW5jZShtb3ZlVG9OZXh0Q2hhcmFjdGVyLCBpc0xpbWl0aW5nQ2hhcmFjdGVyKSB7XG4gICAgdmFyIHByZWRpY2F0ZSA9IGlzV29yZENoYXJhY3RlcigpID8gaXNXb3JkQ2hhcmFjdGVyIDogaXNPdGhlckNoYXJhY3RlcjtcbiAgICB3aGlsZSAocHJlZGljYXRlKCkgJiYgIWlzTGltaXRpbmdDaGFyYWN0ZXIoKSkge1xuICAgICAgICBtb3ZlVG9OZXh0Q2hhcmFjdGVyKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiB0b0VuZE9mV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyYWN0ZXIsIGlzTGltaXRpbmdDaGFyYWN0ZXIpIHtcbiAgICB3aGlsZSAoaXNXaGl0ZVNwYWNlQ2hhcmFjdGVyKCkgJiYgIWlzTGltaXRpbmdDaGFyYWN0ZXIoKSkge1xuICAgICAgICBtb3ZlVG9OZXh0Q2hhcmFjdGVyKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBtYWtlRnVuY3Rpb25Ub01vdmVPbmVDaGFyYWN0ZXJJblRleHQoZm9yd2FyZE9yQmFja3dhcmQpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhZGphY2VudENlbGwgPSBnZXRBZGphY2VudFRleHRDZWxsKGZvcndhcmRPckJhY2t3YXJkKTtcbiAgICAgICAgaWYgKGFkamFjZW50Q2VsbCkge1xuICAgICAgICAgICAgY3Vyc29yLnNldFBvc2l0aW9uRnJvbShhZGphY2VudENlbGwpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gbWFrZUZ1bmN0aW9uV2hpY2hEZWNpZGVzSWZJc01vdmluZ09uZUNoYXJhY3RlckZpcnN0KGZvcndhcmRPckJhY2t3YXJkKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoaXNXaGl0ZVNwYWNlQ2hhcmFjdGVyKCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcHJlZGljYXRlID0gaXNXb3JkQ2hhcmFjdGVyKCkgPyBpc1dvcmRDaGFyYWN0ZXIgOiBpc090aGVyQ2hhcmFjdGVyO1xuICAgICAgICB2YXIgY2VsbCA9IGdldEFkamFjZW50VGV4dENlbGwoZm9yd2FyZE9yQmFja3dhcmQpO1xuICAgICAgICBpZiAoY2VsbCkge1xuICAgICAgICAgICAgcmV0dXJuICFwcmVkaWNhdGUoY2VsbC5jaGFyYWN0ZXIpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgJ21vdmUgaG9yaXpvbnRhbGx5JzogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICBjdXJzb3Iuc2F2ZUN1cnJlbnRQb3NpdGlvbigpO1xuXG4gICAgICAgIGN1cnNvci5jb2x1bW4gKz0gb3B0aW9ucy5kaXJlY3Rpb24gPT09ICdsZWZ0JyA/IC0xIDogMTtcbiAgICAgICAgaWYgKCFjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmlzQmxvY2tpbmcoKSkge1xuICAgICAgICAgICAgY3Vyc29yLmZvcmdldENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaGFtYmVyLmNvbmZpZ3VyYXRpb25bJ2tpbGxpbmcgbW9kZSBvbiddICYmIGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNMYXplckJlYW0oKSkge1xuICAgICAgICAgICAgY3Vyc29yLnNldFBvc2l0aW9uRnJvbShjaGFtYmVyLnNwYXduUG9zaXRpb24pO1xuICAgICAgICB9IGVsc2UgaWYgKGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNCbG9ja2luZygpKSB7XG4gICAgICAgICAgICBjdXJzb3IucmVzdG9yZVRvU2F2ZWRQb3NpdGlvbigpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnbW92ZSB2ZXJ0aWNhbGx5JzogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICBjdXJzb3Iuc2F2ZUN1cnJlbnRQb3NpdGlvbigpO1xuXG4gICAgICAgIHZhciBtYXRyaXggPSBjaGFtYmVyLm1hdHJpeDtcbiAgICAgICAgY3Vyc29yLnJlbWVtYmVyQ29sdW1uRm9yVmVydGljYWxNb3ZlbWVudCgpO1xuICAgICAgICB2YXIgc3RlcHNBc2lkZSA9IDAsXG4gICAgICAgICAgICBzaWduID0gb3B0aW9ucy5kaXJlY3Rpb24gPT09ICd1cCcgPyAtMSA6IDE7XG4gICAgICAgIGlmICghbWF0cml4W2N1cnNvci5yb3cgKyAxICogc2lnbl1bY3Vyc29yLmNvbHVtbl0uaXNXYWxsKCkpIHtcbiAgICAgICAgICAgIHdoaWxlICghbWF0cml4W2N1cnNvci5yb3cgKyAxICogc2lnbl1bY3Vyc29yLmNvbHVtbiArIHN0ZXBzQXNpZGUgKyAxXS5pc1dhbGwoKSAmJlxuICAgICAgICAgICAgICAgIGN1cnNvci5jb2x1bW4gKyBzdGVwc0FzaWRlIDwgY3Vyc29yLnJlbWVtYmVyZWRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50KSB7XG4gICAgICAgICAgICAgICAgc3RlcHNBc2lkZSsrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY3Vyc29yLmNvbHVtbiArPSBzdGVwc0FzaWRlO1xuICAgICAgICAgICAgY3Vyc29yLnJvdyArPSAxICogc2lnbjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdoaWxlICghbWF0cml4W2N1cnNvci5yb3ddW2N1cnNvci5jb2x1bW4gKyBzdGVwc0FzaWRlXS5pc0Jsb2NraW5nKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1hdHJpeFtjdXJzb3Iucm93ICsgMSAqIHNpZ25dW2N1cnNvci5jb2x1bW4gKyBzdGVwc0FzaWRlXS5pc0Jsb2NraW5nKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yLnJvdyArPSAxICogc2lnbjtcbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yLmNvbHVtbiArPSBzdGVwc0FzaWRlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzdGVwc0FzaWRlLS07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoYW1iZXIuY29uZmlndXJhdGlvblsna2lsbGluZyBtb2RlIG9uJ10gJiYgY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0xhemVyQmVhbSgpKSB7XG4gICAgICAgICAgICBjdXJzb3Iuc2V0UG9zaXRpb25Gcm9tKGNoYW1iZXIuc3Bhd25Qb3NpdGlvbik7XG4gICAgICAgIH0gZWxzZSBpZiAoY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0Jsb2NraW5nKCkpIHtcbiAgICAgICAgICAgIGN1cnNvci5yZXN0b3JlVG9TYXZlZFBvc2l0aW9uKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdtb3ZlIGJ5IHdvcmQnOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIGN1cnNvci5zYXZlQ3VycmVudFBvc2l0aW9uKCk7XG5cbiAgICAgICAgaWYgKCFjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmlzVGV4dCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBkaXJlY3Rpb24gPSBvcHRpb25zLmRpcmVjdGlvbixcbiAgICAgICAgICAgIG9wcG9zaXRlRGlyZWN0aW9uID0gZGlyZWN0aW9uID09PSAnZm9yd2FyZCcgPyAnYmFja3dhcmQnIDogJ2ZvcndhcmQnLFxuICAgICAgICAgICAgbW92ZVRvTmV4dENoYXIgPSBtYWtlRnVuY3Rpb25Ub01vdmVPbmVDaGFyYWN0ZXJJblRleHQoZGlyZWN0aW9uKSxcbiAgICAgICAgICAgIG1vdmVUb1ByZXZpb3VzQ2hhciA9IG1ha2VGdW5jdGlvblRvTW92ZU9uZUNoYXJhY3RlckluVGV4dChvcHBvc2l0ZURpcmVjdGlvbiksXG4gICAgICAgICAgICBpc0xpbWl0aW5nQ2hhcmFjdGVyID0gbWFrZUZ1bmN0aW9uV2hpY2hMaW1pdHNNb3ZlbWVudChkaXJlY3Rpb24pLFxuICAgICAgICAgICAgaXNNb3ZpbmdPbmVDaGFyYWN0ZXJGaXJzdCA9IG1ha2VGdW5jdGlvbldoaWNoRGVjaWRlc0lmSXNNb3ZpbmdPbmVDaGFyYWN0ZXJGaXJzdChkaXJlY3Rpb24pO1xuXG4gICAgICAgIGlmIChpc01vdmluZ09uZUNoYXJhY3RlckZpcnN0KCkpIHtcbiAgICAgICAgICAgIG1vdmVUb05leHRDaGFyKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gJ2ZvcndhcmQnICYmIG9wdGlvbnMudG8gPT09ICdiZWdpbm5pbmcnKSB7XG4gICAgICAgICAgICB0b0VuZE9mTm9uV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyLCBpc0xpbWl0aW5nQ2hhcmFjdGVyKTtcbiAgICAgICAgfVxuICAgICAgICB0b0VuZE9mV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyLCBpc0xpbWl0aW5nQ2hhcmFjdGVyKTtcbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gJ2ZvcndhcmQnICYmIG9wdGlvbnMudG8gPT09ICdlbmRpbmcnIHx8XG4gICAgICAgICAgICBkaXJlY3Rpb24gPT09ICdiYWNrd2FyZCcgJiYgb3B0aW9ucy50byA9PT0gJ2JlZ2lubmluZycpIHtcbiAgICAgICAgICAgIHRvRW5kT2ZOb25XaGl0ZVNwYWNlU2VxdWVuY2UobW92ZVRvTmV4dENoYXIsIGlzTGltaXRpbmdDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgaWYgKCFpc0xpbWl0aW5nQ2hhcmFjdGVyKCkpIHtcbiAgICAgICAgICAgICAgICBtb3ZlVG9QcmV2aW91c0NoYXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaGFtYmVyLmNvbmZpZ3VyYXRpb25bJ2tpbGxpbmcgbW9kZSBvbiddICYmIGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNMYXplckJlYW0oKSkge1xuICAgICAgICAgICAgY3Vyc29yLnNldFBvc2l0aW9uRnJvbShjaGFtYmVyLnNwYXduUG9zaXRpb24pO1xuICAgICAgICB9IGVsc2UgaWYgKGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNCbG9ja2luZygpKSB7XG4gICAgICAgICAgICBjdXJzb3IucmVzdG9yZVRvU2F2ZWRQb3NpdGlvbigpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnbW92ZSB0byBlbmQgb2YgdGV4dCc6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgY3Vyc29yLnNhdmVDdXJyZW50UG9zaXRpb24oKTtcblxuICAgICAgICB2YXIgYWRqYWNlbnRDZWxsID0gZ2V0QWRqYWNlbnRUZXh0Q2VsbChvcHRpb25zLmRpcmVjdGlvbik7XG4gICAgICAgIHdoaWxlIChhZGphY2VudENlbGwpIHtcbiAgICAgICAgICAgIGN1cnNvci5zZXRQb3NpdGlvbkZyb20oYWRqYWNlbnRDZWxsKTtcbiAgICAgICAgICAgIGFkamFjZW50Q2VsbCA9IGdldEFkamFjZW50VGV4dENlbGwob3B0aW9ucy5kaXJlY3Rpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoYW1iZXIuY29uZmlndXJhdGlvblsna2lsbGluZyBtb2RlIG9uJ10gJiYgY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0xhemVyQmVhbSgpKSB7XG4gICAgICAgICAgICBjdXJzb3Iuc2V0UG9zaXRpb25Gcm9tKGNoYW1iZXIuc3Bhd25Qb3NpdGlvbik7XG4gICAgICAgIH0gZWxzZSBpZiAoY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0Jsb2NraW5nKCkpIHtcbiAgICAgICAgICAgIGN1cnNvci5yZXN0b3JlVG9TYXZlZFBvc2l0aW9uKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdtb3ZlIHRvIGVuZCBvZiBsaW5lJzogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICBjdXJzb3Iuc2F2ZUN1cnJlbnRQb3NpdGlvbigpO1xuXG4gICAgICAgIHZhciBhZGphY2VudENlbGwgPSBnZXRBZGphY2VudFRleHRDZWxsSW5TYW1lTGluZShvcHRpb25zLmRpcmVjdGlvbik7XG4gICAgICAgIHdoaWxlIChhZGphY2VudENlbGwpIHtcbiAgICAgICAgICAgIGN1cnNvci5zZXRQb3NpdGlvbkZyb20oYWRqYWNlbnRDZWxsKTtcbiAgICAgICAgICAgIGFkamFjZW50Q2VsbCA9IGdldEFkamFjZW50VGV4dENlbGxJblNhbWVMaW5lKG9wdGlvbnMuZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaGFtYmVyLmNvbmZpZ3VyYXRpb25bJ2tpbGxpbmcgbW9kZSBvbiddICYmIGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNMYXplckJlYW0oKSkge1xuICAgICAgICAgICAgY3Vyc29yLnNldFBvc2l0aW9uRnJvbShjaGFtYmVyLnNwYXduUG9zaXRpb24pO1xuICAgICAgICB9IGVsc2UgaWYgKGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNCbG9ja2luZygpKSB7XG4gICAgICAgICAgICBjdXJzb3IucmVzdG9yZVRvU2F2ZWRQb3NpdGlvbigpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnbW92ZSB0byBiZWdpbm5pbmcgb2YgbGluZSBudW1iZXInOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIGN1cnNvci5zYXZlQ3VycmVudFBvc2l0aW9uKCk7XG5cbiAgICAgICAgdGhpc1snbW92ZSB0byBlbmQgb2YgbGluZSddKHtcbiAgICAgICAgICAgIGRpcmVjdGlvbjogJ2JhY2t3YXJkJ1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIHRhcmdldExpbmVOdW1iZXIgPSBvcHRpb25zLmxpbmVOdW1iZXIsXG4gICAgICAgICAgICBsaW5lTnVtYmVyQ2VsbCA9IGNoYW1iZXIubWF0cml4W2N1cnNvci5yb3ddW2N1cnNvci5jb2x1bW4gLSAxXSxcbiAgICAgICAgICAgIGN1cnJlbnRMaW5lTnVtYmVyID0gbGluZU51bWJlckNlbGwubGluZU51bWJlcixcbiAgICAgICAgICAgIHN0ZXAgPSB0YXJnZXRMaW5lTnVtYmVyID4gY3VycmVudExpbmVOdW1iZXIgPyAxIDogLTE7XG4gICAgICAgIHdoaWxlIChjdXJyZW50TGluZU51bWJlciAmJiBjdXJyZW50TGluZU51bWJlciAhPT0gdGFyZ2V0TGluZU51bWJlcikge1xuICAgICAgICAgICAgY3Vyc29yLnJvdyArPSBzdGVwO1xuICAgICAgICAgICAgbGluZU51bWJlckNlbGwgPSBjaGFtYmVyLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uIC0gMV07XG4gICAgICAgICAgICBjdXJyZW50TGluZU51bWJlciA9IGxpbmVOdW1iZXJDZWxsLmxpbmVOdW1iZXI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFjdXJyZW50TGluZU51bWJlcikge1xuICAgICAgICAgICAgY3Vyc29yLnJvdyAtPSBzdGVwO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoYW1iZXIuY29uZmlndXJhdGlvblsna2lsbGluZyBtb2RlIG9uJ10gJiYgY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0xhemVyQmVhbSgpKSB7XG4gICAgICAgICAgICBjdXJzb3Iuc2V0UG9zaXRpb25Gcm9tKGNoYW1iZXIuc3Bhd25Qb3NpdGlvbik7XG4gICAgICAgIH0gZWxzZSBpZiAoY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0Jsb2NraW5nKCkpIHtcbiAgICAgICAgICAgIGN1cnNvci5yZXN0b3JlVG9TYXZlZFBvc2l0aW9uKCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuIiwidmFyIGNvbnNvbGU7XG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBjb25zb2xlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2NvbnNvbGUnKTtcbn1cblxudmFyIHByaW50VGV4dCA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgICB2YXIgbGluZSA9IHRleHQuc2hpZnQoKTtcbiAgICBpZiAobGluZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0IChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuaW5uZXJIVE1MICs9IHRleHQuYnkgKyBsaW5lICsgJzxicj4nO1xuICAgICAgICAgICAgY29uc29sZS5zY3JvbGxUb3AgKz0xMDA7XG4gICAgICAgICAgICBwcmludFRleHQodGV4dCk7XG4gICAgICAgIH0sIGxpbmUubGVuZ3RoICogNDApO1xuICAgIH1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHRleHQpKSB7XG4gICAgICAgIHRleHQgPSBbdGV4dF07XG4gICAgfVxuICAgIHRleHQuYnkgPSB0ZXh0LmJ5ID8gdGV4dC5ieSArICc+ICcgOiAnJztcbiAgICBwcmludFRleHQodGV4dCk7XG59O1xuIiwidmFyIHByaW50VGV4dCA9IHJlcXVpcmUoJy4vcHJpbnQuanMnKTtcbm1vZHVsZS5leHBvcnRzID0ge1xuXHRmaW5kQW5kVHJ5VG9LaWxsOiBmdW5jdGlvbihjdXJzb3IsIGNoYW1iZXIpIHtcblx0Ly8gYWRkIHNvbWUgZnVubnkgZXhjdXNlIGZvciB0aGUga2lsbCBmcm9tIHR1cnJldFxuXHRcdGlmICh0aGlzLmlzU2hvb3RpbmcgfHwgdGhpcy5jZWxsLmlzRGVhY3RpdmF0ZWRUdXJyZXQpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dmFyIHR1cnJldCA9IHRoaXMsXG5cdFx0cmlzZSA9IGN1cnNvci5yb3cgLSB0dXJyZXQucm93LFxuXHRcdHJ1biA9IGN1cnNvci5jb2x1bW4gLSB0dXJyZXQuY29sdW1uLFxuXHRcdGNvdW50ID0gTWF0aC5tYXgoTWF0aC5hYnMocmlzZSksIE1hdGguYWJzKHJ1bikpLFxuXHRcdHRvdGFsID0gY291bnQsXG5cdFx0cGF0aCA9IFtdLFxuXHRcdGNlbGw7XG5cdFx0aWYgKCFyaXNlICYmICFydW4pIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPD0gY291bnQ7IGkrKykge1xuXHRcdFx0Y2VsbCA9IGNoYW1iZXIubWF0cml4W01hdGgucm91bmQodHVycmV0LnJvdyArIHJpc2UqKGkvdG90YWwpKV1bTWF0aC5yb3VuZCh0dXJyZXQuY29sdW1uICsgcnVuKihpL3RvdGFsKSldO1xuXHRcdFx0aWYgKCFjZWxsLmlzTGF6ZXJCZWFtKCkgJiYgY2VsbC5pc0Jsb2NraW5nKCkpIHtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY2VsbCAhPT0gdHVycmV0LmNlbGwgJiYgcGF0aC5pbmRleE9mKGNlbGwpID09PSAtMSkge1xuXHRcdFx0XHRwYXRoLnB1c2goY2VsbCk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY2VsbC5yb3cgPT09IGN1cnNvci5yb3cgJiYgY2VsbC5jb2x1bW4gPT09IGN1cnNvci5jb2x1bW4pIHtcblx0XHRcdFx0dHVycmV0LnRyeVRvS2lsbChjdXJzb3IsIGNoYW1iZXIsIHBhdGgpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cdHRyeVRvS2lsbDogZnVuY3Rpb24oY3Vyc29yLCBjaGFtYmVyLCBwYXRoKSB7XG5cdFx0dmFyIHR1cnJldCA9IHRoaXM7XG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdHZhciBpc0N1cnNvclVuZGVyTGF6ZXIgPSAhcGF0aC5ldmVyeShmdW5jdGlvbihjZWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICFjZWxsLmlzVW5kZXJDdXJzb3I7XG4gICAgICAgICAgICB9KTtcblx0XHRcdGlmIChpc0N1cnNvclVuZGVyTGF6ZXIpIHtcblx0XHRcdFx0dHVycmV0LmlzU2hvb3RpbmcgPSB0cnVlO1xuXHRcdFx0XHRwYXRoLmZvckVhY2goZnVuY3Rpb24oY2VsbCkge1xuXHRcdFx0XHRcdGNlbGwuaXNVbmRlclR1cnJldEZpcmUgPSB0cnVlO1xuXHRcdFx0XHR9KTtcbiAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZSA9ICd0dXJyZXQ+ICcgKyBbXG4gICAgICAgICAgICAgICAgICAgICdJIGRpZCBub3QgbWVhbiB0by4nLFxuICAgICAgICAgICAgICAgICAgICAnVGhleSBtYWRlIG1lIGRvIHRoaXMuJyxcbiAgICAgICAgICAgICAgICAgICAgJ0kgYW0gdHJ1bGx5IHNvcnJ5LicsXG4gICAgICAgICAgICAgICAgICAgICdTb21ldGltZXMgSSBjYW4gbm90IGhlbHAgbXlzZWxmLicsXG4gICAgICAgICAgICAgICAgICAgICdXYXRjaCBvdXQuJyxcbiAgICAgICAgICAgICAgICAgICAgJ1BsZWFzZSBkbyBub3QgdGhpbmsgbGVzcyBvZiBtZS4nXG4gICAgICAgICAgICAgICAgXVtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAzKV07XG4gICAgICAgICAgICAgICAgcHJpbnRUZXh0KG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIGlmIChyZXF1aXJlKCcuL2NoYW1iZXIuanMnKS5jb25maWd1cmF0aW9uWydraWxsaW5nIG1vZGUgb24nXSkge1xuICAgICAgICAgICAgICAgICAgICBjdXJzb3Iuc2V0UG9zaXRpb25Gcm9tKHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLnNwYXduUG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIH1cblx0XHRcdFx0Y2hhbWJlci5yZW5kZXIoKTtcblx0XHRcdFx0d2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dHVycmV0LmlzU2hvb3RpbmcgPSBmYWxzZTtcblx0XHRcdFx0XHRwYXRoLmZvckVhY2goZnVuY3Rpb24oY2VsbCkge1xuXHRcdFx0XHRcdFx0Y2VsbC5pc1VuZGVyVHVycmV0RmlyZSA9IGZhbHNlO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdGNoYW1iZXIucmVuZGVyKCk7XG5cdFx0XHRcdH0sIDEwMDApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dHVycmV0LmZpbmRBbmRUcnlUb0tpbGwoY3Vyc29yLCBjaGFtYmVyKTtcblx0XHRcdH1cblx0XHR9LCAxMDAwKTtcblx0fVxufTtcbiJdfQ==
