var getMessageAttrs = function () {
	var pos = $game.sticks.pos(),
				attrs = {
					x: pos._w + (BOARD_PADDING * 2),
					y: BOARD_HEIGHT,
					z: 1,
					h: MESSAGE_HEIGHT,
					w: WIDTH - pos._w - (BOARD_PADDING * 3) - 2
				};

	return attrs;
};

var getMessageCss = function (attrs) {
	var atts = attrs;
	if(typeof attrs == 'undefined') { atts = getMessageAttrs(); }

	var l = $(Crafty.stage.elem).position().left;
	var t = $(Crafty.stage.elem).position().top;
	var css = {
		'height': atts.h + 'px',
		'width': atts.w + 'px',
		'top': t + 'px',
		'left': l + 'px'
		//'left': $('#cr-stage').position().left + 'px'
	};

	if(!$.browser.webkit) {
		css.top = t + atts.y + 'px';
		css.left = l + atts.x + 'px';
	}

	return css;
};

var getScorecardAttrs = function (pos, player) {
	var imgwidth = 20;

	var width = pos._w + (player === 2 ? 0 : 2);
	var top = pos._y + pos._h + BOARD_PADDING;

	var css = {
		x: pos._x,
		y: top,
		z: 2,
		h: SQUARE_SIZE + BOARD_PADDING,
		w: width
	};

	return css;
};

var getScorecardCss = function (player, active, attrs) {
	var atts = attrs;
	if(typeof attrs == 'undefined') { atts = getMessageAttrs(); }

	var l = $(Crafty.stage.elem).position().left;
	var t = $(Crafty.stage.elem).position().top;

	var f = 'player' + player;
	if(active === true) { f += '_active'; }

	var css = {
		//'background-color': BACKGROUND_COLOR,
		'background-image': 'img/' + f + '.png',
		'background-position': 'left center',
		'background-repeat': 'no-repeat'
	};

	//console.log('scorecard css for player', player, css);
	return css;
};

var createScorecard = function (pos, player) {
	var atts = getScorecardAttrs(pos, player);
	var card = Crafty.e('2D, DOM, Canvas, Scorecard, Color')
						.attr(atts)
						.color(BACKGROUND_COLOR)
						.scorecard(player);

	var f = 'player' + player;
	if(player === 1) { f += '_active'; }

	var imgatts = {
		x: atts.x + atts.w - 18,
		y: atts.y,
		z: 3
	};

	card.txtImg = Crafty.e('2D, DOM, Image')
	//.css(getScorecardCss(player, false))
					.image('img/' + f + '.png')
					.attr(imgatts); //.css({ 'position': 'absolute' });

	if(!$.browser.webkit) {
		var l = $(Crafty.stage.elem).position().left;
		var t = $(Crafty.stage.elem).position().top;

		var css = {
			top: imgatts.y,
			left: imgatts.x
		};
		//					imgatts.y += t;
		//					imgatts.x += l;

		card.txtImg.css(css);
	}

	/*
	card.txtImg.css({
	position: 'absolute',
	top: t,
	left: l
	});
	*/
	//console.log('card', player, card);

	return card;
};

var startNextTurn = function (first) {
	if(first) { $game.whoseTurn += 1; }
	if($game.whoseTurn > NUM_PLAYERS) { $game.whoseTurn = 1; }

	var getReady = function () {
		// change the hilited player card
		$game.scores[$game.whoseTurn - 1].txtImg.image('img/player' + $game.whoseTurn + '_active.png');

		$game.message.text('Waiting for Player ' + $game.whoseTurn);
		$game.sticks.enabled = true;

		if($game.whoseTurn !== 1) {
			$game.cpu.takeTurn();
		}
	};

	if(!first) { getReady(); }
	else {
		var pturn = $('div#player' + $game.whoseTurn);
		pturn.fadeIn(1000, function () {
			setTimeout(function () {
				pturn.fadeOut(500, getReady);
			}, 500);
		});
	}
};

var playerTurnComplete = function () {
	// necessary evil
	$game.board = this.getBoard();

	//$game.scores[$game.whoseTurn - 1].css(getScorecardCss($game.whoseTurn, false));
	$game.scores[$game.whoseTurn - 1].txtImg.image('img/player' + $game.whoseTurn + '.png');

	var roll = $game.sticks.value();
	if(this.isBlocked($game.whoseTurn)) {
		$game.message.text('Player ' + $game.whoseTurn + ' is blocked!');

		setTimeout(function () { startNextTurn(true); }, 500);

	} else {
		if(roll === 1 || roll === 3 || roll == 6) {
			// do nothing, player gets another turn
			startNextTurn(false);
		} else {
			startNextTurn(true);
		}
	}
	if($game.debug) { $game.debug.html(this.serialize()); }
};

Crafty.scene("loading", function () {
	//black background with some loading text
	Crafty.background("#CCC");

	var loadingText = Crafty.e("2D, DOM, Text")
		.attr({ w: WIDTH, h: HEIGHT })
		.text("Loading...")
		.css({
			"text-align": "center",
			'color': 'white',
			'font-size': '18pt',
			'font-weight': 'bold',
			'padding-top': ($(document).height() / 2) - 50 + 'px'
		});

	var _completeHandler = function () {
		Crafty.sprite(SQUARE_SIZE, TILEPATH, {
			player1: [0, 0],
			player2: [1, 0],
			space24: [2, 0],
			space25: [3, 0],
			space26: [4, 0],
			space27: [0, 1]
		});

		loadingText
			.text('Ready!')
			.delay(function () { Crafty.scene("main"); }, 500);

	};
	var _progressHandler = function (e) { loadingText.text('Loading (' + e.percent.toFixed(2) + '% complete)...'); };
	var _errorHandler = function (e) { loadingText.text('Error loading asset "' + e + '"!  Cannot continue.  :('); };

	//load takes an array of assets and a callback when complete
	Crafty.load([TILEPATH], _completeHandler, _progressHandler, _errorHandler);

});

// the crafty canvas does weird things to the positioning of the status bar. this works around that.
var fixStatusBar = function() {
	OFFSET = 60;

	var sb = $('div#message').css('display', 'inline');
	var ml = (($(window).width() - sb.width()) / 2 - OFFSET);

	sb.css('margin-left', ml + 'px');
};

$(function() {
	$(window).resize(fixStatusBar);
	setTimeout(fixStatusBar, 1000);
});
