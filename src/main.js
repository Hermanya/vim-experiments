var cursor = require('./cursor.js'),
	scene = require('./chamber.js'),
	keys = require('./keys.js'),
	commands = require('./commands.js');

function main(json) {
	scene.fromJSON(json);
	scene.initialize();
	scene.render();
	window.removeEventListener('keypress', keypressHandler);
	window.addEventListener('keypress', keypressHandler);
	window.removeEventListener('click', changeTheme);
	window.addEventListener('click', changeTheme);
}

function keypressHandler(e) {
	var character = String.fromCharCode(e.charCode);
	if (keys[character]) {
		keys[character]();
	}
	scene.render();
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

commands['initialize chamber'](main);