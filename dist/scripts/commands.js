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
            actions = {
                '200': function() {
                    localStorage.chamber = chamberNumber;
                    try {
                        mainFunction(JSON.parse(xmlhttp.responseText));
                    } catch (_) {
                        actions['404']();
                    }
                },
                '404': function() {
                    window.alert('This is the last chamber at this moment. ' +
                        'Next you are going to be redirected to the repo of this game. ' +
                        'Let me know your favorite VIM features which are missing.');
                    window.location.href = 'https://github.com/hermanya/vim-experiments';
                }
            },
            action = actions[xmlhttp.status] || defaultAction;
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
module.exports=require(3)
},{"./chamber.js":2,"./print.js":7}],6:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NlbGwtZGVjb3JhdG9yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jaGFtYmVyLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jb21tYW5kcy5qcyIsIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9zcmMvY3Vyc29yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9tYXRyaXgtZGVjb3JhdG9yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9wcmludC5qcyIsIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9zcmMvdHVycmV0LWRlY29yYXRvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdGlzV2FsbDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIFsnKycsICctJywgJ3wnXS5pbmRleE9mKHRoaXMuY2hhcmFjdGVyKSAhPT0gLTEgJiYgIXRoaXMuaXNUZXh0O1xuXHR9LFxuXHRpc0xhemVyOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gWydWJywgJ14nLCAnPicsICc8J10uaW5kZXhPZih0aGlzLmNoYXJhY3RlcikgIT09IC0xICYmICF0aGlzLmlzVGV4dDtcblx0fSxcblx0aXNMYXplckJlYW06IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLmlzVmVydGljYWxMYXplckJlYW0gfHwgdGhpcy5pc0hvcml6b250YWxMYXplckJlYW07XG5cdH0sXG5cdGlzQmxvY2tpbmc6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLmlzV2FsbCgpIHx8IHRoaXMuaXNMYXplcigpIHx8IHRoaXMuaXNMYXplckJlYW0oKTtcblx0fSxcblx0dG9TdHJpbmc6IGZ1bmN0aW9uKGNvbmZpZ3VyYXRpb24pIHtcblx0XHR2YXIgcHJvcGVydHlUb0NsYXNzTmFtZSA9IHtcblx0XHRcdFx0J2lzVGV4dCc6ICd0ZXh0Jyxcblx0XHRcdFx0J2lzVW5kZXJDdXJzb3InOiAnY3Vyc29yJyxcblx0XHRcdFx0J2lzVmVydGljYWxMYXplckJlYW0nOiAndmVydGljYWwtbGF6ZXItYmVhbScsXG5cdFx0XHRcdCdpc0hvcml6b250YWxMYXplckJlYW0nOiAnaG9yaXpvbnRhbC1sYXplci1iZWFtJyxcblx0XHRcdFx0J2lzVW5kZXJUdXJyZXRGaXJlJzogJ3R1cnJldC1maXJlJ1xuXHRcdFx0fSxcblx0XHRcdGNsYXNzTmFtZXMgPSBPYmplY3Qua2V5cyhwcm9wZXJ0eVRvQ2xhc3NOYW1lKS5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdHJldHVybiB0aGlzW2tleV07XG5cdFx0XHR9LmJpbmQodGhpcykpLm1hcChmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0cmV0dXJuIHByb3BlcnR5VG9DbGFzc05hbWVba2V5XTtcblx0XHRcdH0pLmpvaW4oJyAnKTtcbiAgICAgICAgaWYgKHRoaXMubGluZU51bWJlcikge1xuICAgICAgICAgICAgdGhpcy5jaGFyYWN0ZXIgPSBjb25maWd1cmF0aW9uWydkaXNwbGF5IGxpbmUgbnVtYmVycyddID8gdGhpcy5saW5lTnVtYmVyIDogJyAnO1xuICAgICAgICB9XG5cblx0XHRyZXR1cm4gJzxzcGFuICBjbGFzcz1cIicgKyBjbGFzc05hbWVzICsgJ1wiPicgKyB0aGlzLmNoYXJhY3RlciArICc8L3NwYW4+Jztcblx0fVxufTtcbiIsInZhciBtYXRyaXhEZWNvcmF0b3IgPSByZXF1aXJlKCcuL21hdHJpeC1kZWNvcmF0b3IuanMnKSxcblx0Y2VsbERlY29yYXRvciA9IHJlcXVpcmUoJy4vY2VsbC1kZWNvcmF0b3IuanMnKSxcblx0dHVycmV0RGVjb3JhdG9yID0gcmVxdWlyZSgnLi90dXJyZXQtZGVjb3JhdG9yLmpzJyksXG5cdGN1cnNvciA9IHJlcXVpcmUoJy4vY3Vyc29yLmpzJyk7XG5cbnZhciBjaGFtYmVyID0gT2JqZWN0LmNyZWF0ZShtYXRyaXhEZWNvcmF0b3IpO1xuXG5jaGFtYmVyLmZyb21KU09OID0gZnVuY3Rpb24oanNvbikge1xuXHR0aGlzLmZyb21BcnJheU9mU3RyaW5ncyhqc29uLnNjZW5lKTtcblx0T2JqZWN0LmtleXMoanNvbikuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuXHRcdHJldHVybiBrZXkgIT09ICdzY2VuZSc7XG5cdH0pLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG5cdFx0dGhpc1trZXldID0ganNvbltrZXldO1xuXHR9LmJpbmQodGhpcykpO1xuICAgIHRoaXMuY29uZmlndXJhdGlvbiA9IGpzb24uY29uZmlndXJhdGlvbiB8fCB7fTtcbn07XG5cbmNoYW1iZXIuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnJlcGxhY2VDaGFyYWN0ZXJzV2l0aENlbGxzKCk7XG5cdHRoaXMubWFya1RleHQoKTtcblx0dGhpcy5tYXJrTGF6ZXJzKCk7XG5cdHRoaXMubWFya0N1cnNvcigpO1xuXHR0aGlzLm1hcmtUdXJyZXRzKCk7XG59O1xuXG5jaGFtYmVyLnJlcGxhY2VDaGFyYWN0ZXJzV2l0aENlbGxzID0gZnVuY3Rpb24oKSB7XG5cdHZhciBjaGFtYmVyID0gdGhpcztcblx0Y2hhbWJlci5tYXRyaXggPSBjaGFtYmVyLm1hcChmdW5jdGlvbihjaGFyYWN0ZXIsIHJvdywgY29sdW1uKSB7XG5cdFx0aWYgKGNoYXJhY3RlciA9PT0gJ0AnKSB7XG5cdFx0XHRjaGFtYmVyLnNwYXduUG9zaXRpb24gPSB7XG5cdFx0XHRcdHJvdzogcm93LFxuXHRcdFx0XHRjb2x1bW46IGNvbHVtblxuXHRcdFx0fTtcblx0XHR9XG5cdFx0dmFyIGNlbGwgPSBPYmplY3QuY3JlYXRlKGNlbGxEZWNvcmF0b3IpO1xuXHRcdGNlbGwucm93ID0gcm93O1xuXHRcdGNlbGwuY29sdW1uID0gY29sdW1uO1xuXHRcdGNlbGwuY2hhcmFjdGVyID0gY2hhcmFjdGVyO1xuXHRcdHJldHVybiBjZWxsO1xuXHR9KTtcbn07XG5cbmNoYW1iZXIubWFya0N1cnNvciA9IGZ1bmN0aW9uKCkge1xuXHRjdXJzb3IucmVzZXQoKTtcblx0Y3Vyc29yLnNldFBvc2l0aW9uRnJvbSh0aGlzLnNwYXduUG9zaXRpb24pO1xufTtcblxuY2hhbWJlci5tYXJrVGV4dCA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgaXNTZXF1ZW5jZU9mVGV4dEluUHJvZ3Jlc3MgPSBmYWxzZSxcblx0XHRsYXN0Q2VsbEluU2VxdWVuY2UsXG4gICAgICAgIHByZXZpb3VzQmVnaW5uaW5nT2ZMaW5lO1xuXHR0aGlzLm1hdHJpeCA9IHRoaXMubWFwKGZ1bmN0aW9uKGNlbGwsIHJvdywgY29sdW1uKSB7XG5cdFx0aWYgKGlzU2VxdWVuY2VPZlRleHRJblByb2dyZXNzKSB7XG5cdFx0XHRpZiAoY2VsbC5jaGFyYWN0ZXIgPT09ICdgJykge1xuXHRcdFx0XHRpc1NlcXVlbmNlT2ZUZXh0SW5Qcm9ncmVzcyA9IGZhbHNlO1xuXHRcdFx0XHRsYXN0Q2VsbEluU2VxdWVuY2UgPSBjaGFtYmVyLm1hdHJpeFtyb3ddW2NvbHVtbiAtIDFdO1xuXHRcdFx0XHRjZWxsLmNoYXJhY3RlciA9ICcgJztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNlbGwuaXNUZXh0ID0gdHJ1ZTtcblx0XHRcdFx0aWYgKGxhc3RDZWxsSW5TZXF1ZW5jZSkge1xuXHRcdFx0XHRcdGlmIChNYXRoLmFicyhsYXN0Q2VsbEluU2VxdWVuY2Uucm93IC0gY2VsbC5yb3cpID09PSAxKSB7XG5cdFx0XHRcdFx0XHRjZWxsLnByZXZpb3VzVGV4dENlbGwgPSBsYXN0Q2VsbEluU2VxdWVuY2U7XG5cdFx0XHRcdFx0XHRsYXN0Q2VsbEluU2VxdWVuY2UubmV4dFRleHRDZWxsID0gY2VsbDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bGFzdENlbGxJblNlcXVlbmNlID0gdW5kZWZpbmVkO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmIChjZWxsLmNoYXJhY3RlciA9PT0gJ2AnKSB7XG5cdFx0XHRpc1NlcXVlbmNlT2ZUZXh0SW5Qcm9ncmVzcyA9IHRydWU7XG4gICAgICAgICAgICBwcmV2aW91c0JlZ2lubmluZ09mTGluZSA9IGNoYW1iZXIubWF0cml4W3JvdyAtIDFdW2NvbHVtbl07XG4gICAgICAgICAgICBpZiAocHJldmlvdXNCZWdpbm5pbmdPZkxpbmUubGluZU51bWJlcikge1xuICAgICAgICAgICAgICAgIGNlbGwubGluZU51bWJlciA9IHByZXZpb3VzQmVnaW5uaW5nT2ZMaW5lLmxpbmVOdW1iZXIgKyAxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsYXN0Q2VsbEluU2VxdWVuY2UgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgY2VsbC5saW5lTnVtYmVyID0gMTtcbiAgICAgICAgICAgIH1cblx0XHR9XG5cblx0XHRyZXR1cm4gY2VsbDtcblx0fSk7XG59O1xuXG5jaGFtYmVyLm1hcmtMYXplcnMgPSBmdW5jdGlvbigpIHtcblx0dmFyIG1hdHJpeCA9IHRoaXMubWF0cml4O1xuXHR0aGlzLm1hdHJpeCA9IHRoaXMubWFwKGZ1bmN0aW9uKGNlbGwsIHJvdywgY29sdW1uKSB7XG5cdFx0dmFyIGNoYXJhY3RlciA9IGNlbGwuY2hhcmFjdGVyLFxuXHRcdFx0aXNWZXJ0aWNhbExhemVyQmVhbSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gWyc8JywnPiddLmluZGV4T2YoY2hhcmFjdGVyKSA9PT0gLTE7XG5cdFx0XHR9LFxuXHRcdFx0YmVhbVByb3BlcnR5ID0gaXNWZXJ0aWNhbExhemVyQmVhbSgpID8gJ2lzVmVydGljYWxMYXplckJlYW0nIDogJ2lzSG9yaXpvbnRhbExhemVyQmVhbScsXG5cdFx0XHRpc0JlYW1Db250aW51aW5nID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBtYXRyaXhbcm93XVtjb2x1bW5dLmlzTGF6ZXJCZWFtKCkgfHwgIW1hdHJpeFtyb3ddW2NvbHVtbl0uaXNCbG9ja2luZygpO1xuXHRcdFx0fSxcblx0XHRcdG5leHQgPSB7XG5cdFx0XHRcdCdWJzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG1hdHJpeFtyb3crK11bY29sdW1uXTtcblx0XHRcdFx0fSxcblx0XHRcdFx0J14nOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gbWF0cml4W3Jvdy0tXVtjb2x1bW5dO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQnPic6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBtYXRyaXhbcm93XVtjb2x1bW4rK107XG5cdFx0XHRcdH0sXG5cdFx0XHRcdCc8JzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG1hdHJpeFtyb3ddW2NvbHVtbi0tXTtcblx0XHRcdFx0fVxuXHRcdFx0fVtjaGFyYWN0ZXJdO1xuXHRcdGlmIChuZXh0KSB7XG5cdFx0XHRuZXh0KCk7XG5cdFx0XHR3aGlsZSAoaXNCZWFtQ29udGludWluZygpKSB7XG5cdFx0XHRcdG5leHQoKVtiZWFtUHJvcGVydHldID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGNlbGw7XG5cdH0pO1xufTtcblxuY2hhbWJlci5tYXJrVHVycmV0cyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgY2hhbWJlciA9IHRoaXM7XG5cdHRoaXMudHVycmV0cyA9IFtdO1xuXHR0aGlzLm1hdHJpeCA9IHRoaXMubWFwKGZ1bmN0aW9uKGNlbGwsIHJvdywgY29sdW1uKSB7XG5cdFx0aWYgKGNlbGwuY2hhcmFjdGVyID09PSAnJicpIHtcblx0XHRcdHZhciB0dXJyZXQgPSBPYmplY3QuY3JlYXRlKHR1cnJldERlY29yYXRvcik7XG5cdFx0XHR0dXJyZXQucm93ID0gcm93O1xuXHRcdFx0dHVycmV0LmNvbHVtbiA9IGNvbHVtbjtcblx0XHRcdHR1cnJldC5jZWxsID0gY2VsbDtcblx0XHRcdGNoYW1iZXIudHVycmV0cy5wdXNoKHR1cnJldCk7XG5cdFx0fVxuXHRcdHJldHVybiBjZWxsO1xuXHR9KTtcbn07XG5cbmNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uXTtcbn07XG5cbmNoYW1iZXIucmVuZGVyID0gZnVuY3Rpb24oKSB7XG5cdHZhciBlbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NjZW5lJyk7XG5cdGVsZW1lbnQuaW5uZXJIVE1MID0gY2hhbWJlci5tYXRyaXgubWFwKGZ1bmN0aW9uKGFycmF5KSB7XG5cdFx0YXJyYXkgPSBhcnJheS5tYXAoZnVuY3Rpb24oY2VsbCkge1xuXHRcdFx0Y2VsbC5pc1VuZGVyQ3Vyc29yID0gY2VsbC5yb3cgPT09IGN1cnNvci5yb3cgJiYgY2VsbC5jb2x1bW4gPT09IGN1cnNvci5jb2x1bW47XG4gICAgICAgICAgICBjZWxsID0gY2VsbC50b1N0cmluZyhjaGFtYmVyLmNvbmZpZ3VyYXRpb24pO1xuICAgICAgICAgICAgcmV0dXJuIGNlbGw7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGFycmF5LmpvaW4oJycpO1xuXHR9KS5qb2luKCc8YnI+Jyk7XG59O1xuXG5jaGFtYmVyLmFjdE9uQ3Vyc29yID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMudHVycmV0cy5mb3JFYWNoKGZ1bmN0aW9uKHR1cnJldCkge1xuXHRcdHR1cnJldC5maW5kQW5kVHJ5VG9LaWxsKGN1cnNvciwgY2hhbWJlcik7XG5cdH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBjaGFtYmVyO1xuIiwidmFyIGNvbW1hbmRzID0ge30sXG4gICAgbWFpbkZ1bmN0aW9uLFxuICAgIHByaW50VGV4dCA9IHJlcXVpcmUoJy4vcHJpbnQuanMnKTtcbm1vZHVsZS5leHBvcnRzID0gY29tbWFuZHM7XG5cbmNvbW1hbmRzWydjaGFtYmVyIChcXFxcZCspJ10gPSBmdW5jdGlvbihjaGFtYmVyTnVtYmVyKSB7XG4gICAgdmFyIHhtbGh0dHAgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICB4bWxodHRwLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoeG1saHR0cC5yZWFkeVN0YXRlICE9PSA0KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGRlZmF1bHRBY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cuYWxlcnQoeG1saHR0cC5zdGF0dXMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFjdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgJzIwMCc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UuY2hhbWJlciA9IGNoYW1iZXJOdW1iZXI7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYWluRnVuY3Rpb24oSlNPTi5wYXJzZSh4bWxodHRwLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25zWyc0MDQnXSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAnNDA0JzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5hbGVydCgnVGhpcyBpcyB0aGUgbGFzdCBjaGFtYmVyIGF0IHRoaXMgbW9tZW50LiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICdOZXh0IHlvdSBhcmUgZ29pbmcgdG8gYmUgcmVkaXJlY3RlZCB0byB0aGUgcmVwbyBvZiB0aGlzIGdhbWUuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ0xldCBtZSBrbm93IHlvdXIgZmF2b3JpdGUgVklNIGZlYXR1cmVzIHdoaWNoIGFyZSBtaXNzaW5nLicpO1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9ICdodHRwczovL2dpdGh1Yi5jb20vaGVybWFueWEvdmltLWV4cGVyaW1lbnRzJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWN0aW9uID0gYWN0aW9uc1t4bWxodHRwLnN0YXR1c10gfHwgZGVmYXVsdEFjdGlvbjtcbiAgICAgICAgYWN0aW9uKCk7XG5cbiAgICB9O1xuICAgIGNoYW1iZXJOdW1iZXIgPSBjaGFtYmVyTnVtYmVyIHx8IGxvY2FsU3RvcmFnZS5jaGFtYmVyIHx8IDA7XG4gICAgeG1saHR0cC5vcGVuKCdHRVQnLCAnLi9jaGFtYmVycy8nICsgY2hhbWJlck51bWJlciArICcuanNvbicsIHRydWUpO1xuICAgIHhtbGh0dHAuc2VuZCgpO1xufTtcblxuY29tbWFuZHNbJ3NldCBudW1iZXInXSA9IGZ1bmN0aW9uKCkge1xuICAgIHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLmNvbmZpZ3VyYXRpb25bJ2Rpc3BsYXkgbGluZSBudW1iZXJzJ10gPSB0cnVlO1xuICAgIHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLnJlbmRlcigpO1xufTtcbmNvbW1hbmRzWydzZXQgbnUnXSA9IGNvbW1hbmRzWydzZXQgbnVtYmVyJ107XG5cbmNvbW1hbmRzWydzZXQgbm9udW1iZXInXSA9IGZ1bmN0aW9uKCkge1xuICAgIHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLmNvbmZpZ3VyYXRpb25bJ2Rpc3BsYXkgbGluZSBudW1iZXJzJ10gPSBmYWxzZTtcbiAgICByZXF1aXJlKCcuL2NoYW1iZXIuanMnKS5yZW5kZXIoKTtcbn07XG5jb21tYW5kc1snc2V0IG5vbnUnXSA9IGNvbW1hbmRzWydzZXQgbm9udW1iZXInXTtcblxuY29tbWFuZHNbJ2Nha2UgaXMgYSBsaWUnXSA9IGZ1bmN0aW9uKCkge1xuICAgIHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLmNvbmZpZ3VyYXRpb25bJ2tpbGxpbmcgbW9kZSBvbiddID0gdHJ1ZTtcbiAgICBwcmludFRleHQoWycnLCdOb3cgeW91IGFyZSBnb2luZyB0byBkaWUuIEV2ZXJ5IHRpbWUuJywnJ10pO1xufTtcblxuY29tbWFuZHMubG9hZE5leHRDaGFtYmVyID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5leHRDaGFtYmVyTnVtYmVyID0gTnVtYmVyKGxvY2FsU3RvcmFnZS5jaGFtYmVyKSArIDE7XG4gICAgY29tbWFuZHNbJ2NoYW1iZXIgKFxcXFxkKyknXShuZXh0Q2hhbWJlck51bWJlcik7XG59O1xuXG5jb21tYW5kc1snaW5pdGlhbGl6ZSBjaGFtYmVyJ10gPSBmdW5jdGlvbihtYWluKSB7XG4gICAgbWFpbkZ1bmN0aW9uID0gbWFpbjtcbiAgICBjb21tYW5kc1snY2hhbWJlciAoXFxcXGQrKSddKCk7XG59O1xuIiwidmFyIGNvbW1hbmRzID0gcmVxdWlyZSgnLi9jb21tYW5kcy5qcycpLFxuICAgIHByaW50VGV4dCA9IHJlcXVpcmUoJy4vcHJpbnQuanMnKTtcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHNjb3JlOiAwLFxuICAgIGFjdE9uQ3VycmVudENlbGw6IGZ1bmN0aW9uKGNoYW1iZXIpIHtcbiAgICAgICAgdmFyIGN1cnNvciA9IHRoaXMsXG4gICAgICAgICAgICBjZWxsID0gY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKSxcbiAgICAgICAgICAgIGFjdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAnKic6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBjZWxsLmNoYXJhY3RlciA9ICcgJztcbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yLnNjb3JlKys7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAnTyc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBjdXJzb3IuaGFzQ29tcGxldGVkTGV2ZWwgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29uZ3JhdHVsYXRpb25NZXNzYWdlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgJzAnOiAnWW91IGRpZCBpdCwgSSBhbSBib3JlZCB3YXRjaGluZyB5b3UuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcxJzogJ09ubHkgb25lIHBhdGhldGljIHN0YXI/JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcyJzogJ0RpZCB5b3UgZXZlbiB0cnk/J1xuICAgICAgICAgICAgICAgICAgICB9W2N1cnNvci5zY29yZV0gfHwgJ1NhdGlzZnlpbmcgcGVyZm9ybWFjZS4nO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50VGV4dChbJycsIGNvbmdyYXR1bGF0aW9uTWVzc2FnZSwgJyddKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzLmxvYWROZXh0Q2hhbWJlcigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAnJic6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBjZWxsLmlzRGVhY3RpdmF0ZWRUdXJyZXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBjZWxsLmNoYXJhY3RlciA9ICcgPGRpdiBjbGFzcz1cImRlYWN0aXZhdGVkLXR1cnJldFwiPiY8L2Rpdj4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1bY2VsbC5jaGFyYWN0ZXJdO1xuICAgICAgICBpZiAoIWNlbGwuaXNUZXh0ICYmIGFjdGlvbikge1xuICAgICAgICAgICAgYWN0aW9uKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlc2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5oYXNDb21wbGV0ZWRMZXZlbCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnNjb3JlID0gMDtcbiAgICAgICAgdGhpcy5mb3JnZXRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50KCk7XG4gICAgfSxcbiAgICBzZXRQb3NpdGlvbkZyb206IGZ1bmN0aW9uKGFub3RoZXJPYmplY3QpIHtcbiAgICAgICAgdGhpcy5jb2x1bW4gPSBhbm90aGVyT2JqZWN0LmNvbHVtbjtcbiAgICAgICAgdGhpcy5yb3cgPSBhbm90aGVyT2JqZWN0LnJvdztcbiAgICB9LFxuICAgIHJlbWVtYmVyQ29sdW1uRm9yVmVydGljYWxNb3ZlbWVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghdGhpcy5yZW1lbWJlcmVkQ29sdW1uRm9yVmVydGljYWxNb3ZlbWVudCkge1xuICAgICAgICAgICAgdGhpcy5yZW1lbWJlcmVkQ29sdW1uRm9yVmVydGljYWxNb3ZlbWVudCA9IHRoaXMuY29sdW1uO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBmb3JnZXRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMucmVtZW1iZXJlZENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQ7XG4gICAgfSxcbiAgICBzYXZlQ3VycmVudFBvc2l0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5zYXZlZENvbHVtbiA9IHRoaXMuY29sdW1uO1xuICAgICAgICB0aGlzLnNhdmVkUm93ID0gdGhpcy5yb3c7XG4gICAgfSxcbiAgICByZXN0b3JlVG9TYXZlZFBvc2l0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5jb2x1bW4gPSB0aGlzLnNhdmVkQ29sdW1uO1xuICAgICAgICB0aGlzLnJvdyA9IHRoaXMuc2F2ZWRSb3c7XG4gICAgfVxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRmcm9tQXJyYXlPZlN0cmluZ3M6IGZ1bmN0aW9uIChhcnJheU9mU3RyaW5ncykge1xuXHRcdHRoaXMubWF0cml4ID0gYXJyYXlPZlN0cmluZ3MubWFwKGZ1bmN0aW9uKHN0cmluZykge1xuXHRcdFx0cmV0dXJuIHN0cmluZy5zcGxpdCgnJyk7XG5cdFx0fSk7XG5cdH0sXG5cdG1hcDogZnVuY3Rpb24oZm4pIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRyaXgubWFwKGZ1bmN0aW9uKGFycmF5LCByb3cpIHtcblx0XHRcdHJldHVybiBhcnJheS5tYXAoZnVuY3Rpb24oaXRlbSwgY29sdW1uKSB7XG5cdFx0XHRcdHJldHVybiBmbihpdGVtLCByb3csIGNvbHVtbik7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fSxcblx0Z2V0Q29vcmRpbmF0ZXNPZjogZnVuY3Rpb24gKHRoaW5nVG9GaW5kKSB7XG5cdFx0dmFyIHByZWRpY2F0ZTtcblx0XHRpZiAodHlwZW9mIHRoaW5nVG9GaW5kID09PSAnc3RyaW5nJykge1xuXHRcdFx0cHJlZGljYXRlID0gZnVuY3Rpb24oc3RyaW5nLCBhbm90aGVyU3RyaW5nKSB7XG5cdFx0XHRcdHJldHVybiBzdHJpbmcgPT09IGFub3RoZXJTdHJpbmc7XG5cdFx0XHR9O1xuXHRcdH1cblx0XHRpZiAodHlwZW9mIHRoaW5nVG9GaW5kID09PSAnb2JqZWN0Jykge1xuXHRcdFx0cHJlZGljYXRlID0gZnVuY3Rpb24odGhpbmdUb0ZpbmQsIGFub3RoZXJPYmplY3QpIHtcblx0XHRcdFx0cmV0dXJuIE9iamVjdC5rZXlzKHRoaW5nVG9GaW5kKS5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaW5nVG9GaW5kW2tleV0gIT09IGFub3RoZXJPYmplY3Rba2V5XTtcblx0XHRcdFx0fSkubGVuZ3RoID09PSAwO1xuXG5cdFx0XHR9O1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5tYXRyaXgucmVkdWNlKGZ1bmN0aW9uKGZvdW5kLCBhcnJheSwgcm93KSB7XG5cdFx0XHRhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKGNlbGwsIGNvbHVtbikge1xuXHRcdFx0XHRpZiAocHJlZGljYXRlKHRoaW5nVG9GaW5kLCBjZWxsKSkge1xuXHRcdFx0XHRcdGZvdW5kLnB1c2goe1xuXHRcdFx0XHRcdFx0cm93OiByb3csXG5cdFx0XHRcdFx0XHRjb2x1bW46IGNvbHVtblxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmb3VuZDtcblx0XHR9LCBbXSk7XG5cdH1cbn07IiwidmFyIGNvbnNvbGU7XG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBjb25zb2xlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2NvbnNvbGUnKTtcbn1cblxudmFyIHByaW50VGV4dCA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgICB2YXIgbGluZSA9IHRleHQuc2hpZnQoKTtcbiAgICBpZiAobGluZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0IChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuaW5uZXJIVE1MICs9IHRleHQuYnkgKyBsaW5lICsgJzxicj4nO1xuICAgICAgICAgICAgY29uc29sZS5zY3JvbGxUb3AgKz0xMDA7XG4gICAgICAgICAgICBwcmludFRleHQodGV4dCk7XG4gICAgICAgIH0sIGxpbmUubGVuZ3RoICogNDApO1xuICAgIH1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHRleHQpKSB7XG4gICAgICAgIHRleHQgPSBbdGV4dF07XG4gICAgfVxuICAgIHRleHQuYnkgPSB0ZXh0LmJ5ID8gdGV4dC5ieSArICc+ICcgOiAnJztcbiAgICBwcmludFRleHQodGV4dCk7XG59O1xuIiwidmFyIHByaW50VGV4dCA9IHJlcXVpcmUoJy4vcHJpbnQuanMnKTtcbm1vZHVsZS5leHBvcnRzID0ge1xuXHRmaW5kQW5kVHJ5VG9LaWxsOiBmdW5jdGlvbihjdXJzb3IsIGNoYW1iZXIpIHtcblx0Ly8gYWRkIHNvbWUgZnVubnkgZXhjdXNlIGZvciB0aGUga2lsbCBmcm9tIHR1cnJldFxuXHRcdGlmICh0aGlzLmlzU2hvb3RpbmcgfHwgdGhpcy5jZWxsLmlzRGVhY3RpdmF0ZWRUdXJyZXQpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dmFyIHR1cnJldCA9IHRoaXMsXG5cdFx0cmlzZSA9IGN1cnNvci5yb3cgLSB0dXJyZXQucm93LFxuXHRcdHJ1biA9IGN1cnNvci5jb2x1bW4gLSB0dXJyZXQuY29sdW1uLFxuXHRcdGNvdW50ID0gTWF0aC5tYXgoTWF0aC5hYnMocmlzZSksIE1hdGguYWJzKHJ1bikpLFxuXHRcdHRvdGFsID0gY291bnQsXG5cdFx0cGF0aCA9IFtdLFxuXHRcdGNlbGw7XG5cdFx0aWYgKCFyaXNlICYmICFydW4pIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPD0gY291bnQ7IGkrKykge1xuXHRcdFx0Y2VsbCA9IGNoYW1iZXIubWF0cml4W01hdGgucm91bmQodHVycmV0LnJvdyArIHJpc2UqKGkvdG90YWwpKV1bTWF0aC5yb3VuZCh0dXJyZXQuY29sdW1uICsgcnVuKihpL3RvdGFsKSldO1xuXHRcdFx0aWYgKCFjZWxsLmlzTGF6ZXJCZWFtKCkgJiYgY2VsbC5pc0Jsb2NraW5nKCkpIHtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY2VsbCAhPT0gdHVycmV0LmNlbGwgJiYgcGF0aC5pbmRleE9mKGNlbGwpID09PSAtMSkge1xuXHRcdFx0XHRwYXRoLnB1c2goY2VsbCk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY2VsbC5yb3cgPT09IGN1cnNvci5yb3cgJiYgY2VsbC5jb2x1bW4gPT09IGN1cnNvci5jb2x1bW4pIHtcblx0XHRcdFx0dHVycmV0LnRyeVRvS2lsbChjdXJzb3IsIGNoYW1iZXIsIHBhdGgpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cdHRyeVRvS2lsbDogZnVuY3Rpb24oY3Vyc29yLCBjaGFtYmVyLCBwYXRoKSB7XG5cdFx0dmFyIHR1cnJldCA9IHRoaXM7XG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdHZhciBpc0N1cnNvclVuZGVyTGF6ZXIgPSAhcGF0aC5ldmVyeShmdW5jdGlvbihjZWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICFjZWxsLmlzVW5kZXJDdXJzb3I7XG4gICAgICAgICAgICB9KTtcblx0XHRcdGlmIChpc0N1cnNvclVuZGVyTGF6ZXIpIHtcblx0XHRcdFx0dHVycmV0LmlzU2hvb3RpbmcgPSB0cnVlO1xuXHRcdFx0XHRwYXRoLmZvckVhY2goZnVuY3Rpb24oY2VsbCkge1xuXHRcdFx0XHRcdGNlbGwuaXNVbmRlclR1cnJldEZpcmUgPSB0cnVlO1xuXHRcdFx0XHR9KTtcbiAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZSA9ICd0dXJyZXQ+ICcgKyBbXG4gICAgICAgICAgICAgICAgICAgICdJIGRpZCBub3QgbWVhbiB0by4nLFxuICAgICAgICAgICAgICAgICAgICAnVGhleSBtYWRlIG1lIGRvIHRoaXMuJyxcbiAgICAgICAgICAgICAgICAgICAgJ0kgYW0gdHJ1bGx5IHNvcnJ5LicsXG4gICAgICAgICAgICAgICAgICAgICdTb21ldGltZXMgSSBjYW4gbm90IGhlbHAgbXlzZWxmLicsXG4gICAgICAgICAgICAgICAgICAgICdXYXRjaCBvdXQuJyxcbiAgICAgICAgICAgICAgICAgICAgJ1BsZWFzZSBkbyBub3QgdGhpbmsgbGVzcyBvZiBtZS4nXG4gICAgICAgICAgICAgICAgXVtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAzKV07XG4gICAgICAgICAgICAgICAgcHJpbnRUZXh0KG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIGlmIChyZXF1aXJlKCcuL2NoYW1iZXIuanMnKS5jb25maWd1cmF0aW9uWydraWxsaW5nIG1vZGUgb24nXSkge1xuICAgICAgICAgICAgICAgICAgICBjdXJzb3Iuc2V0UG9zaXRpb25Gcm9tKHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLnNwYXduUG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIH1cblx0XHRcdFx0Y2hhbWJlci5yZW5kZXIoKTtcblx0XHRcdFx0d2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dHVycmV0LmlzU2hvb3RpbmcgPSBmYWxzZTtcblx0XHRcdFx0XHRwYXRoLmZvckVhY2goZnVuY3Rpb24oY2VsbCkge1xuXHRcdFx0XHRcdFx0Y2VsbC5pc1VuZGVyVHVycmV0RmlyZSA9IGZhbHNlO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdGNoYW1iZXIucmVuZGVyKCk7XG5cdFx0XHRcdH0sIDEwMDApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dHVycmV0LmZpbmRBbmRUcnlUb0tpbGwoY3Vyc29yLCBjaGFtYmVyKTtcblx0XHRcdH1cblx0XHR9LCAxMDAwKTtcblx0fVxufTtcbiJdfQ==
