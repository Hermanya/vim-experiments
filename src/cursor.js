var commands = require('./commands.js');
module.exports = {
	score: 0,
	reactOnCurrentCellOnScene: function(scene) {
		var cell = scene.getCurrentCell(this);
		if (cell.isText) {
			return;
		}
		switch (cell.character) {
			case '*':
				cell.character = '&nbsp;';
				this.score++;
				break;
			case 'O':
				var numberOfPieces;
				switch (this.score) {
					case 0:
						numberOfPieces = 'no';
						break;
					case 1:
						numberOfPieces = 'a piece of';
						break;
					default:
						numberOfPieces = this.score + ' pieces of';
				}
				this.isDone = true;
				this.forgetColumn();
				if (typeof window !== 'undefined'){
					window.setTimeout(function() {
						window.alert('get ' + numberOfPieces + ' cake');
						commands['load chamber'](Number(window.localStorage.chamber) + 1);
					}, 0); 
				}
				break;

		}
	},

	rememberColumn: function() {
		if (!this.rememberedColumn) {
			this.rememberedColumn = this.column;
		}
	},

	forgetColumn: function() {
		delete this.rememberedColumn;
	},

	save: function() {
		this.savedColumn = this.column;
		this.savedRow = this.row;
	},
	restore: function() {
		this.column = this.savedColumn;
		this.row = this.savedRow;
	}
};