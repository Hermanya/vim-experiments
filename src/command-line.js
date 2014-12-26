var commands = require('./commands.js'),
	newLineCharacter = String.fromCharCode(13);

var commandLine = {
	isActive: false,
	commands: commands,
	activate: function() {
		this.isActive = true;
		this.element.focus();
		this.value = ':';
	},
	input: function(character) {
		if (character === newLineCharacter) {
			this.execute();
			this.clear();
		}
	},
	execute: function() {
		var givenCommand = this.element.value.slice(1);
		Object.keys(this.commands).every(function(key) {
			var matches = givenCommand.match(new RegExp(key));
			if (!matches) {
				return true;
			}
			commands[key].apply(this, matches.slice(1));
		});
	},
	clear: function() {
		this.isActive = false;
		this.element.blur();
		this.element.value = '';
	}
};

if (typeof window !== 'undefined') {
	commandLine.element = window.document.querySelector('#command-line');

	commandLine.element.addEventListener('blur', function(e) {
		if (commandLine.isActive) {
			commandLine.element.focus();
		}
	});
}



module.exports = commandLine;