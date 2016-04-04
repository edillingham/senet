Crafty.c('Board', {
	_player: 1,
	_board: [],
	init: function () {
		this._setupBoard();
	},
	getBoard: function () {
		return this._board;
	},
	deserialize: function (s) {
		var i, j,
			board = [],
			lines = s.replace(' ', '').split('\n');

		for(i = 0; i < lines.length; i++) {
			var cells = lines[i].split(' ');

			for(j = 0; j < cells.length; j++) {
				var val = parseInt(cells[j]);
				if(val >= 0) { board[board.length] = val === 0 ? null : val; }
			}
		}

		$.each(Crafty('PlayerPiece'), function (i, e) {
			var piece = Crafty(e);
			piece.destroy();
		});

		this._setupBoard(board);
	},
	serialize: function () {
		var toStr = function (s) {
			if(s === null) return ' 0';

			return ' ' + s.toString();
		};

		var i, str = '';

		// first row
		for(i = 0; i < 10; i++)
			str += toStr(this._board[i].player);
		str += '\n';

		// 2nd row
		for(i = 19; i >= 10; i--)
			str += toStr(this._board[i].player);
		str += '\n';

		// 3rd row
		for(i = 20; i < 30; i++)
			str += toStr(this._board[i].player);

		return str;
	},
	setCurrentPlayer: function (player) {
		var pl = player || this._player;
		var pieces = Crafty('PlayerPiece');
		var who = 'player' + player;

		for(i = 0; i < pieces.length; i++) {
			var piece = Crafty(pieces[i]);
			if(piece.has(who)) { piece.activate(); } else { piece.deactivate(); }
		}
	},
	hasPieces: function (player) {
		var has = 0;
		$.each(Crafty('PlayerPiece'), function (i, e) {
			var piece = Crafty(e);
			if(piece._player === player) { has++; }
		});
		return has === 0 ? false : has;
	},
	isBlocked: function (player) {
		var blocked = true;
		$.each(Crafty('PlayerPiece'), function (i, e) {
			var piece = Crafty(e);
			if(piece._player === player) {
				blocked = blocked && !piece._canMove($game.sticks.value());
			}
		});
		return blocked;
	},
	indexOf: function (piece) {
		var pos = piece.pos();
		var out = null;

		$.each(this._board, function (i) {
			if(this.x === pos._x && this.y === pos._y) { out = i; }
		});

		//console.log('indexof: ', out);

		return out;
	},
	swap: function (a, b) {
		var p = this._board[a].player;
		this._board[a].player = this._board[b].player;
		this._board[b].player = p;
	},
	_playerScored: function (piece) {
		this._board[piece._index].player = null;
		this.trigger('PlayerScored', piece);

		this._turnComplete(piece);
	},
	_turnComplete: function (piece) {
		// check for special square
		var landedOn = this.indexOf(piece);
		if(landedOn === 25) {
			var idx = 15;

			//debugger;

			if(this._board[idx].player !== null) {
				idx = 0;
				while(this._board[idx].player !== null) { idx++; }
			}

			this.swap(landedOn, idx);
			piece.attr({
				x: this._board[idx].x,
				y: this._board[idx].y,
				z: 1,
				h: SQUARE_SIZE,
				w: SQUARE_SIZE
			});
			piece._index = this._board[idx].index;
		}

		var pieces = Crafty('PlayerPiece');
		for(i = 0; i < pieces.length; i++) { Crafty(pieces[i]).deactivate(); }

		//console.log('player ' + $game.whoseTurn + 's turn is complete.');
		if(!this.hasPieces(this._player)) {
			this.trigger('PlayerWon');
		} else {
			this.trigger('TurnComplete', piece);
		}
	},
	_setupBoard: function (src) {
		var r, c, index;

		// create game
		for(r = 0; r < BOARD_ROWS; r++) {
			for(c = 0; c < BOARD_COLS; c++) {
				var player = null,
					isSafe = false,
					image = '',
					index = r * BOARD_COLS + c,
					it = {};

				// second row starts at the last index rather than the first
				if(r === 1) { index = BOARD_COLS - c + (r * BOARD_COLS) - 1; }

				// place special icons
				if(index >= 24 && index <= 27) {
					image = ', space' + index;

					if(index !== 25) { isSafe = true; }
				}

				if(src) {
					player = src[index];
				} else {
					// fill first row with player markers
					if(r === 0) { player = (c % 2 + 1); }
				}

				it = {
					index: index,
					x: BOARD_PADDING + (c * SQUARE_SIZE) + (SQUARE_BORDER * c),
					y: BOARD_PADDING + (r * SQUARE_SIZE) + (SQUARE_BORDER * r),
					safe: isSafe,
					player: player
				};

				this._board[index] = it;

				//console.log('drawing tile at ', [x, y]);
				Crafty.e('2D, DOM, Canvas, Color' + image)
						.attr({
							x: it.x, y: it.y,
							z: 0,
							h: SQUARE_SIZE, w: SQUARE_SIZE
						})
						.color(BACKGROUND_COLOR);

				if(player !== null) {
					//console.log(' drawing ', current.piece);
					this._createPiece(it.x, it.y, it.player, index);
				}
			}
		}
	},
	_createPiece: function (x, y, player, index) {
		var that = this;

		return Crafty.e('PlayerPiece, player' + player)
			.attr({
				x: x, y: y,
				z: 1,
				h: SQUARE_SIZE, w: SQUARE_SIZE
			})
			.piece(player, index)
			.bind('PieceMoved', function () { that._turnComplete(this); })
			.bind('PieceRemoved', function () { that._playerScored(this); });
	}
});

Crafty.c('Scorecard', {
	_player: null,
	_count: 0,
	init: function () {
		//this.requires('2D, DOM, Canvas, Tint');
	},
	scorecard: function (player) {
		this._player = player;

		return this;
	},
	incrementScore: function () {
		var next = this.nextLocation();

		Crafty.e('2D, DOM, Canvas, ScoreMarker, player' + this._player)
			.attr({ x: next.x, y: next.y, z: 3, h: SQUARE_SIZE, w: SQUARE_SIZE });

		this._count++;
	},
	nextLocation: function () {
		var pos = this.pos();
		var x = pos._x + BOARD_PADDING + (SQUARE_SIZE * this._count);
		var y = pos._y + Math.floor(BOARD_PADDING / 2);
		return { x: x, y: y };
	}
});

Crafty.c('PlayerPiece', {
	_player: null,
	_index: null,
	_tint: null,
	_swapped: false,
	init: function () {
		this.requires('2D, DOM, Canvas, Mouse, Collision');

		this.bind('PieceMoved', this._onPieceMoved)
			.bind('MouseOut', function () { $(document.body).css({ cursor: 'default' }); });
	},
	piece: function (player, index) { this._player = player; this._index = index; return this; },
	getIndex: function () { return this._index; },
	activate: function () { this.bind('MouseOver', this._showMoves); },
	deactivate: function () { this.unbind('MouseOver', this._showMoves); },
	_showMoves: function () {
		$(document.body).css({ cursor: 'pointer' });

		var spaces = $game.sticks.value(),
			player = this._player;
		//console.log(spaces);

		var next = $game.board[this._index + spaces];
		var canMove = this._canMove(spaces);
		var color = canMove ? '#00FF00' : '#FF0000'; // green or red

		if(canMove) {
			this.bind('Click', this._movePiece);
		}

		if(!next) {
			var cards = Crafty('Scorecard');
			$.each(cards, function (i, e) {
				var card = Crafty(e);
				//console.log('found card', [card._player, player]);
				if(card._player === player) { next = card.nextLocation(); }
			});
		}

		this._applyTint(next.x, next.y, color);

		/*
		console.log('current player: ', (next.player === this._player));
		console.log('next is occupied: ', occupied);
		console.log('isAlone:', alone);
		*/
	},
	_hideMoves: function () {
		this._tint = null;
		$(document.body).css({ cursor: 'default' });
	},
	_getState: function (index) {
		var origin = $game.board[this._index];
		var target = $game.board[index];
		//console.log('origin/target: ', [origin, target]);

		var occupied = $game.board[index].player !== null,
			isProtected = target.safe,
			otherPlayer = occupied && target.player !== null && target.player !== origin.player,
			alone = this._isAlone(index);

		//console.log('target is occupied/other player/alone: ', [state.occupied, state.otherPlayer, state.alone]);

		return {
			occupied: occupied,
			isProtected: isProtected,
			otherPlayer: otherPlayer,
			isAlone: alone
		};
	},
	_canMove: function (spaces) {
		var index = this._index + spaces;
		if(index >= $game.board.length) { return true; }

		var state = this._getState(index);
		//console.log('target state:', state);

		if(state.occupied && state.isProtected) { return false; }

		return (!state.occupied || this._willSwap(index));
	},
	_willSwap: function (index) {
		var state = this._getState(index);

		return state.otherPlayer && state.isAlone;
	},
	_isAlone: function (index) {
		var target = $game.board[index],
			prev = $game.board[index - 1],
			next = $game.board[index + 1],
			prevIsCurrent = (index - 1 === this._index);

		//console.log('prev/target/next: ', [prev.player, target.player, next.player]);

		if(!next) { return true; }

		if(prevIsCurrent || prev.player === null) {
			//console.log('prevIsCurrent || prev.player === null', [prevIsCurrent, prev.player === null]);
			if(next)
				return next.player !== target.player;

			return true;
		}

		if(next.player === null) {
			//console.log('next.player === null', [next.player]);
			return prev.player !== target.player;
		}

		return !(prev.player === target.player || next.player === target.player);
	},
	_movePiece: function (args) {
		this._removeTint();

		//this.bind('Move', this._moveHandler);

		var src = this._index;
		var dst = this._index + $game.sticks.value();

		var orig = $game.board[src];
		var next = $game.board[dst];

		var pos = this.pos();
		//console.log(pos);

		if(dst < $game.board.length) {
			this.attr({
				x: next.x, y: next.y,
				z: 1,
				h: pos._h, w: pos._w
			});

			this.trigger('PieceMoved', [orig, next]);
		} else {
			this.trigger('PieceRemoved', this);
		}
	},
	_onPieceMoved: function (args) {
		var collide = this.hit('PlayerPiece');
		//console.log('collided: ', collide);

		var board = Crafty(Crafty('Board')[0]);
		var a = args[0].index,
			b = args[1].index;

		//console.log('swapping: ', [a, b]);
		board.swap(a, b);

		this._index = b;

		if(collide !== false) {
			collide[0].obj._index = a;
			this._changePlaces(args[0], collide[0]);
		}
	},
	_changePlaces: function (place, piece) {
		var board = Crafty(Crafty('Board')[0]);
		var idx = board.indexOf(piece.obj);

		//console.log('hit object at index ', idx, ' (this index: ', this._index, ')');

		piece.obj.attr({
			x: place.x, y: place.y,
			z: 1,
			h: SQUARE_SIZE, w: SQUARE_SIZE
		});
	},
	_applyTint: function (x, y, color) {
		this._tint = Crafty.e('2D, DOM, Canvas, Color, Tint')
			.attr({ x: x, y: y, z: 5, h: SQUARE_SIZE, w: SQUARE_SIZE })
			.color('#FFF')
			.tint(color, 0.5);

		this.bind('MouseOut', this._removeTint);
	},
	_removeTint: function () {
		this.unbind('Click', this._movePiece);
		if(this._tint !== null) { this._tint.destroy(); }
	}
});

Crafty.c('Sticks', {
	_sticks: [],
	_values: [],
	init: function () {
		this.requires('2D, DOM, Canvas, Color, Mouse, Keyboard');

		// draw throwing area
		var throwPos = {
			x: BOARD_PADDING, // + (STICK_PADDING * i),
			y: BOARD_HEIGHT,
			h: TURN_HEIGHT,
			w: TURN_WIDTH
		};

		var mouseFinger = function () { $(document.body).css({ cursor: 'pointer' }); };
		var mouseNormal = function () { $(document.body).css({ cursor: 'default' }); };

		this.attr(throwPos)
			.color(BACKGROUND_COLOR)
			.bind('MouseOver', mouseFinger)
			.bind('MouseOut', mouseNormal)
			.bind('Click', this._clickHandler)
			.bind('KeyUp', this._keyboardHandler);

		for(i = 0; i < NUM_STICKS; i++) {
			var j = i + 1;
			var pos = {
				x: (throwPos.x + STICK_PADDING) + (STICK_WIDTH * i) + (STICK_PADDING * i),
				y: throwPos.y + STICK_PADDING,
				h: STICK_HEIGHT,
				w: STICK_WIDTH
			};

			this._sticks[this._sticks.length] = Crafty.e('2D, DOM, Canvas')
							.attr(pos)
							.css({
								'border': '1px solid black',
								'margin': '0px',
								'padding': '0px',
								'background-color': 'white',
								'height': STICK_HEIGHT + 'px',
								'width': STICK_WIDTH + 'px',
								'top': pos.y + 'px',
								'left': pos.x + 'px'
							});
		}
	},
	enabled: true,
	_keyboardHandler: function (args) {
		if(this.enabled && args.keyCode === Crafty.keys.SPACE) {
			this._toss();
			return true;
		}

		return args;
	},
	_clickHandler: function (args) {
		if(this.enabled) { this._toss(); }
	},
	_toss: function () {
		for(i = 0; i < this._sticks.length; i++) {
			var val = Crafty.randRange(0, 1),
							bg = (val === 0 ? '#000' : '#FFF');

			this._values[i] = val;
			this._sticks[i].css({ 'background-color': bg });
		}

		this.trigger('Tossed', [this.value()]);
	},
	value: function () {
		var v = 0;
		for(i = 0; i < this._values.length; i++) {
			v += this._values[i];
		}

		return (v === 0 ? 6 : v);
	}
});