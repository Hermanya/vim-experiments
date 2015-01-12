var chamber = require('./chamber.js'),
    logKey = require('./log-key.js'),
    commands = require('./commands.js'),
    printText = require('./print.js');

function keypressHandler(e) {
    var character = String.fromCharCode(e.charCode);
    logKey(character);
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
    printText(chamber.narrative || []);
    window.removeEventListener('keypress', keypressHandler);
    window.addEventListener('keypress', keypressHandler);
    window.removeEventListener('click', changeTheme);
    window.addEventListener('click', changeTheme);
}

commands['initialize chamber'](main);
