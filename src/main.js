var cursor = require('./cursor.js'),
	scene = require('./scene.js'),
	keys = require('./keys.js'),
	commandLine = require('./command-line.js');

function main(chamber) {
	scene.fromArrayOfStrings(chamber.scene);
	scene.initialize();
	scene.render();
	window.removeEventListener('keypress', keypressHandler);
	window.addEventListener('keypress', keypressHandler);
	window.removeEventListener('click', clickHandler);
	window.addEventListener('click', clickHandler);
}

function keypressHandler(e) {
	var character = String.fromCharCode(e.charCode);
	if (commandLine.isActive) {
		commandLine.input(character);
	} else {
		if (keys[character]) {
			scene.toggleCursor();
			keys[character]();
			scene.toggleCursor();
			cursor.reactOnCurrentCellOnScene(scene);
			scene.render();
		}
	}
}

var themes = ['amber', 'green'],
currentThemeIndex = 0;
function clickHandler () {
	var body = document.querySelector('body');
	body.classList.remove(themes[currentThemeIndex]);
	currentThemeIndex = (currentThemeIndex + 1) % themes.length;
	body.classList.add(themes[currentThemeIndex]);
}



commandLine.commands['initialize chamber'](main);