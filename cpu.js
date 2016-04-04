Cpu = function (playerNum) {
	var cpu = {
		takeTurn: function () {
			var delay = 1200;
			setTimeout(this._go, delay);
		},
		_go: function () {
			$game.sticks._toss();

			var spaces = $game.sticks.value();
			$game.message.text('Player ' + playerNum + ' threw a ' + spaces);

			var pieces = Crafty('PlayerPiece player' + playerNum);
			var offset = -1;
			var piece = Crafty(pieces[pieces.length + offset]);

			while(!piece._canMove(spaces)) {
				if(offset <= 0) {
					piece = Crafty(pieces[pieces.length + --offset]);
				} else {
					piece = null;
				}
			}

			if(piece !== null) {
				//console.log('clicking first movable piece: ', piece);
				piece._movePiece();
			}
		}
	};

	//console.log('cpu player: ', playerNum);

	return cpu;
}