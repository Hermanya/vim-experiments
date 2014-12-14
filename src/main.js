var scene, cursor, chamber;

var matrix = {
	mapmap: function(fn, arrayOfArrays) {
		return arrayOfArrays.map(function(array, row) {
			return array.map(function(item, column) {
				return fn(item, row, column);
			});
		});
	},
	getCoordinatesOf: function(target, arrayOfArrays) {
		return arrayOfArrays.reduce(function(found, array, row) {
			array.forEach(function(item, column) {
				if (item.character === target) {
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

function renderScene() {
	$('main')
		.html(scene.map(function(array) {
			return array.join('');
		}).join('<br>'));
}

function isWall(character) {
	return ['+', '-', '|'].indexOf(character) !== -1;
}

function isRightBlocking(character, row, column) {
	return character === '>' &&
		cursor.row === row &&
		cursor.column === column + 1;
}

function isLeftBlocking(character, row, column) {
	return character === '<' &&
		cursor.row === row &&
		cursor.column === column - 1;
}

function isOneWayOnly(character, row, column) {
	return isRightBlocking(character, row, column) || isLeftBlocking(character, row, column);
}

$.get('chambers/1.json')
	.done(function(data) {
		chamber = data;
		scene = chamber.scene.map(function(row) {
			return row.split('');
		});
		scene = matrix.mapmap(function(character, row, column) {
			return {
				character: [' '].indexOf(character) !== -1 ? '&nbsp;' : character,
				isBlocking: function() {
					return isWall(character) || isOneWayOnly(character, row, column);
				},
				isUnderCursor: character === '@' && (character = ' '),
				toString: function() {
					return '<span  class="' + (this.isUnderCursor ? 'cursor' : '') + '">' + this.character + '</span>';
				}
			};
		}, scene);

		cursor = matrix.getCoordinatesOf('@', scene)[0];
		cursor.score = 0;

		scene[cursor.row][cursor.column].isUnderCursor = true;

		renderScene();
	});

function toggleCursor() {
	scene[cursor.row][cursor.column].isUnderCursor = !scene[cursor.row][cursor.column].isUnderCursor;
}

function rememberColumn() {
	if (!cursor._column) {
		cursor._column = cursor.column;
	}
}

function forgetColumn() {
	delete cursor._column;
}


var lib = {
	'move horizontally': function(fn) {
		var _column = fn(cursor.column);
		if (!scene[cursor.row][_column].isBlocking()) {
			cursor.column = _column;
			forgetColumn();
		}
	},
	'h': function() {
		this['move horizontally'](function(x) {
			return x - 1;
		});
	},
	'l': function() {
		this['move horizontally'](function(x) {
			return x + 1;
		});
	},
	'move vertically': function(fn) {
		rememberColumn();
		var stepsAside = 0;
		if (!scene[fn(cursor.row)][cursor.column].isBlocking()) {

			while (!scene[fn(cursor.row)][cursor.column + stepsAside + 1].isBlocking() && cursor.column + stepsAside < cursor._column) {
				stepsAside++;
			}
			cursor.column += stepsAside;
			cursor.row = fn(cursor.row);
		} else {

			while (!scene[cursor.row][cursor.column + stepsAside].isBlocking()) {
				if (!scene[fn(cursor.row)][cursor.column + stepsAside].isBlocking()) {
					cursor.row = fn(cursor.row);
					cursor.column += stepsAside;
					break;
				} else {
					stepsAside--;
				}
			}
		}
	},
	'k': function() {
		this['move vertically'](function(x) {
			return x - 1;
		});
	},
	'j': function() {
		this['move vertically'](function(x) {
			return x + 1;
		});
	}
};

function getCurrentCell() {
	return scene[cursor.row][cursor.column];
}

function reactOnCurrentCell() {
	var cell = getCurrentCell();
	switch (cell.character) {
		case '*':
			cell.character = '&nbsp;';
			cursor.score++;
			break;
		case 'O':
			window.alert(cursor.score + ' get a piece of cake');
			break;

	}
}

window.addEventListener('keypress', function(e) {
	e.preventDefault();
	var character = String.fromCharCode(e.charCode);
	if (lib[character]) {
		toggleCursor();
		lib[character]();
		reactOnCurrentCell();
		toggleCursor();
	}
	renderScene();
	return false;
});

var module = require('./module.js');
alert(module);