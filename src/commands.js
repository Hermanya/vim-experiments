var commands = {}, mainFunction;
module.exports = commands;

commands['chamber (\\d+)'] = function(chamberNumber) {
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState === 4) {
			if (xmlhttp.status === 200) {
				if (window) {
					window.localStorage.chamber = chamberNumber;
				}
				mainFunction(JSON.parse(xmlhttp.responseText));
			} else if (xmlhttp.status === 404) {
				window.alert('Out of chambers');
			} else {
				window.alert(xmlhttp.status);
			}
		}
	};

	chamberNumber = chamberNumber || 0;

	if (typeof window !== 'undefined') {
		chamberNumber = chamberNumber || window.localStorage.chamber || 0;
	}
	xmlhttp.open('GET', './chambers/' + chamberNumber + '.json', true);
	xmlhttp.send();
};

commands['load chamber'] = commands['chamber (\\d+)'];

commands['initialize chamber'] = function(main) {
	mainFunction = main;
	commands['chamber (\\d+)']();
} 