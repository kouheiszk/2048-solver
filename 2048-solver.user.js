// ==UserScript==
// @name        2048-solver
// @namespace   com.gmail.kouheiszk.userscript
// @description 2048 solver
// @include     http://gabrielecirulli.github.io/2048/
// @version     1
// @grant       none
// @require http://ajax.googleapis.com/ajax/libs/jquery/2.1.0/jquery.min.js
// @require https://raw.githubusercontent.com/jashkenas/underscore/master/underscore-min.js
// @require https://raw.githubusercontent.com/hirokidaichi/namespace-js/master/src/namespace.js
// ==/UserScript==

Namespace('com.gmail.kouheiszk.userscript.2048.tile')
.define(function (ns) {
    'use strict';

    const EMPTY_TILE_NUMBER = 0;

    var Tile = function(x, y, number) {
        this.position = {x : x, y : y};
        this.number = number;
    };

    Tile.prototype.isEmpty = function() {
        return this.number === EMPTY_TILE_NUMBER;
    };

    var tileCreater = function(x, y, number) {
        return new Tile(x, y, number);
    };

    ns.provide({
        tile: tileCreater,
        EMPTY_TILE_NUMBER: EMPTY_TILE_NUMBER
    });
});

Namespace('com.gmail.kouheiszk.userscript.2048.direction')
.define(function (ns) {
    'use strict';

    // Move direction types
    const UP    = 0;
    const RIGHT = 1;
    const DOWN  = 2;
    const LEFT  = 3;
    const NONE  = -1;

    ns.provide({
        UP    : UP,
        RIGHT : RIGHT,
        DOWN  : DOWN,
        LEFT  : LEFT,
        NONE  : NONE
    });
});

Namespace('com.gmail.kouheiszk.userscript.2048.board')
.use('com.gmail.kouheiszk.userscript.2048.tile tile,EMPTY_TILE_NUMBER')
.use('com.gmail.kouheiszk.userscript.2048.direction UP,DOWN,LEFT,RIGHT')
.define(function (ns) {
    'use strict';

    const SIZE = 4;

    // Deep copy
    Array.prototype.clone = function() {
        if (this[0].constructor == Array) {
            var ar = new Array(this.length);
            for (var i = 0, len = ar.length; i < len; i++) {
                ar[i] = this[i].clone();
            }
            return ar;
        }
        return Array.apply(null, this);
    };

    //
    var $tileContainer = $(".tile-container");

    // Get tiles from dom
    var currentTiles = function (size) {
        var tiles = new Array(size);
        for (var x = 0; x < size; x++) {
            if (!tiles[x]) tiles[x] = new Array(ns.SIZE);
            for (var y = 0; y < size; y++) {
                var $tile = $tileContainer.find(".tile-position-" + (y + 1) + "-" + (x + 1));
                var number = ns.EMPTY_TILE_NUMBER;
                if ($tile.length) {
                    $tile.children().each(function() {
                        var newNumber = parseInt($(this).text(), 10);
                        if (number === ns.EMPTY_TILE_NUMBER || newNumber > number) {
                            number = newNumber;
                        }
                    });
                }
                tiles[x][y] = ns.tile(x, y, number);
            }
        }
        return tiles;
    };

    var collapseLine = function(line, d) {
        var size = line.length;
        var score = 0;
        if (d === ns.UP || d === ns.LEFT) {
            for (var i = 0; i < size - 1; i++) {
                if (line[i].isEmpty()) continue;
                if (line[i].number === line[i + 1].number) {
                    var newNumber = line[i] * 2;
                    line[i].number = newNumber;
                    line[i + 1].number = ns.EMPTY_TILE_NUMBER;
                    score += newNumber;
                }
            }
        }
        else {
            for (var i = size - 1; i >= 0; i--) {
                if (line[i].isEmpty()) continue;
                if (line[i].number === line[i - 1].number) {
                    var newNumber = line[i] * 2;
                    line[i].number = newNumber;
                    line[i - 1].number = ns.EMPTY_TILE_NUMBER;
                    score += newNumber;
                }
            }
        }
        return score;
    };

    var moveLine = function(line, d) {
        var size = line.length;
        var newLine = line.clone();
        for (var i = 0; i < size; i++) {
            newLine[i].number = ns.EMPTY_TILE_NUMBER;
        }
        var existsTileCount = 0;
        if (d === ns.UP || d === ns.LEFT) {
            for (var i = 0; i < size; i++) {
                if (line[i].isEmpty()) continue;
                newLine[existsTileCount].number = line[i].number;
                existsTileCount++;
            }
        }
        if (d === ns.DOWN || d === ns.RIGHT) {
            for (var i = size - 1; i >= 0; i--) {
                if (line[i].isEmpty()) continue;
                newLine[existsTileCount].number = line[i].number;
                existsTileCount++;
            }
        }
        return newLine;
    };

    var checkMoved = function(line1, line2) {
        for (var i = 0; i < ns.SIZE; i++) {
            if (line1[i].number !== line2[i].number) return true;
        }
        return false;
    };

    var Board = function(size) {
        this.size = size;
        if (size) this.tiles = currentTiles(size);
    };

    Board.prototype.maxNumber = function() {
        var maxNumber = 0;
        for (var x = 0; x < this.size; x++) {
            for (var y = 0; y < this.size; y++) {
                var number = this.getNumber(x, y);
                if (number > maxNumber) maxNumber = number;
            }
        }
        return maxNumber;
    };

    Board.prototype.getNumber = function(x, y) {
        return this.tiles[x][y].number;
    };

    Board.prototype.setNumber = function(x, y, number) {
        this.tiles[x][y].number = number;
    };

    Board.prototype.getColumn = function(x) {
        return this.tiles[x];
    };

    Board.prototype.getRow = function(y) {
        var row = new Array(this.size);
        for (var i = 0; i < this.size; i++) {
            row[i] = this.tiles[i][y];
        }
        return row;
    };

    Board.prototype.setColumn = function(x, column) {
        this.tiles[x] = column;
    };

    Board.prototype.setRow = function(y, row) {
        for (var i = 0; i < this.size; i++) {
            this.tiles[i][y] = row[i];
        }
    };

    Board.prototype.getEmptyTiles = function() {
        var tiles = new Array();
        for (var x = 0; x < this.size; x++) {
            for (var y = 0; y < this.size; y++) {
                var tile = this.tiles[x][y];
                if (tile.isEmpty()) tiles.push(tile);
            }
        }
        return tiles;
    };

    Board.prototype.isFilled = function() {
        return this.getEmptyTiles().length === 0;
    };

    Board.prototype.canMove = function() {
        if (!this.isFilled()) return true;
        for (var x = 0; x < this.size - 1; x++) {
            for (var y = 0; y < this.size - 1; y++) {
                var number = this.getNumber(x, y);
                var rightNumber = this.getNumber(x + 1, y);
                var bottomNumber = this.getNumber(x, y + 1);
                if (number === rightNumber || number === bottomNumber) return true;
            }
        }
        return false;
    };

    Board.prototype.validMoveDirection = function(d) {
        if (d === ns.UP || d === ns.DOWN) {
            for (var y = 0; y < this.size; y++) {
                var row = this.getRow(y);
                for (var x = 0; x < this.size; x++) {
                    if (x < this.size - 1 && row[x].number === row[x + 1].number && !row[x].isEmpty()) return true;
                    if (d === ns.DOWN && x > 0             && row[x].isEmpty() && !row[x - 1].isEmpty()) return true;
                    if (d === ns.UP   && x < this.size - 1 && row[x].isEmpty() && !row[x + 1].isEmpty()) return true;
                }
            }
        }
        if (d === ns.LEFT || d === ns.RIGHT) {
            for (var x = 0; x < this.size; x++) {
                var col = this.getColumn(x);
                for (var y = 0; y < this.size; y++) {
                    if (y < this.size - 1 && col[y].number === col[y + 1].number && !col[y].isEmpty()) return true;
                    if (d === ns.RIGHT && y > 0             && col[y].isEmpty() && !col[y - 1].isEmpty()) return true;
                    if (d === ns.LEFT  && y < this.size - 1 && col[y].isEmpty() && !col[y + 1].isEmpty()) return true;
                }
            }
        }

        return false;
    };

    // Add tile
    Board.prototype.addTile = function() {
        var newTileNumber = Math.random() < 0.9 ? 2 : 4;
        var emptyTiles = this.getEmptyTiles();
        var tile = _.sample(emptyTiles);
        this.setNumber(tils.position.x, tils.position.y, newTileNumber);
    };

    // Move tile
    Board.prototype.testMove = function(d, willAddTile) {
        willAddTile = willAddTile || false;
        var moved = false;
        var score = 0;
        if (d === ns.UP || d === ns.DOWN) {
            for (var i = 0; i < ns.SIZE; i++) {
                var row = this.getRow(i);
                var newRow = moveLine(row, d);
                var lineScore = collapseLine(newRow, d);
                newRow = moveLine(newRow, d);
                this.setRow(i, newRow);
                if (checkMoved(row, newRow)) moved = true;
                score += lineScore;
            }
        }
        if (d === ns.LEFT || d === ns.RIGHT) {
            for (var i = 0; i < ns.SIZE; i++) {
                var column = this.getColumn(i);
                var newColumn = moveLine(column, d);
                var lineScore = collapseLine(newColumn, d);
                newColumn = moveLine(newColumn, d);
                this.setColumn(i, newColumn);
                if (checkMoved(column, newColumn)) moved = true;
                score += lineScore;
            }
        }

        if (moved && willAddTile) this.addTile();

        return score;
    };

    Board.prototype.clone = function() {
        var board = new Board();
        board.size = this.size;
        board.tiles = this.tiles.clone();
        return board;
    };

    var boardCreater = function(size) {
        size = size || SIZE;
        return new Board(size);
    };

    ns.provide({
        board: boardCreater
    });
});

Namespace('com.gmail.kouheiszk.userscript.2048.ai')
.use('com.gmail.kouheiszk.userscript.2048.direction UP,DOWN,LEFT,RIGHT,NONE')
.define(function (ns) {
    'use strict';

    // CONST
    const CALCULATE_DEPTH = 3;

    // Evaluate
    var evaluateBoard = function(board, commonRatio) {
        return 1.0;
    };

    // Calculate Score
    var nextMoveCalculator = function(board, depth, maxDepth, base) {
        base = base || 0.9;

        var bestScore = -1;
        var bestMove = ns.NONE;
        var foundMove = false;
        var directionMap = {
            0 : 'Up',
            1 : 'Right',
            2 : 'Down',
            3 : 'Left'
        };

        _.each([ns.UP, ns.RIGHT, ns.DOWN, ns.LEFT], function(d) {
            if (board.validMoveDirection(d)) {
                foundMove = true;
                if (depth === maxDepth) console.log("Enable to move " + directionMap[d]);
                var newBoard = board.clone();
                var score = 0;
                var getScore = newBoard.testMove(d, true);
                var evaluateScore = evaluateBoard(newBoard);

                score += getScore + evaluateScore;

                if (depth !== 0) {
                    var nextStepScore = nextMoveCalculator(newBoard, depth - 1, maxDepth, base);
                    score += nextStepScore * Math.pow(base, maxDepth - depth + 1);
                }

                if (score > bestScore) {
                    bestMove = d;
                    bestScore = score;
                }
            }
        });

        if (depth === maxDepth && foundMove) console.log("Select to move " + directionMap[bestMove]);
        return bestMove;
    };

    var nextMoveDirection = function(board, depth) {
        depth = depth || CALCULATE_DEPTH;
        var d = nextMoveCalculator(board, depth, depth);
        if (d === ns.NONE) console.log(board);
        return d;
    };

    ns.provide({
        nextMoveDirection : nextMoveDirection
    });
});

Namespace('com.gmail.kouheiszk.userscript.2048.solver')
.use('com.gmail.kouheiszk.userscript.2048.board board')
.use('com.gmail.kouheiszk.userscript.2048.ai nextMoveDirection')
.define(function (ns) {
    'use strict';

    // Move tiles
    var move = function (d) {
        var keyCodes = {
            0 : 38, // Up
            1 : 39, // Right
            2 : 40, // Down
            3 : 37  // Left
        };

        var e = {
            canBubble  : true,
            cancelable : false,
            view       : window,
            ctrlKey    : false,
            altKey     : false,
            shiftKey   : false,
            metaKey    : false,
            keyCode    : keyCodes[d],
            charCode   : 0
        };

        var event = document.createEvent("KeyboardEvent");
        event.initKeyEvent("keydown", e.canBubble, e.cancelable, e.view,
            e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.keyCode, e.charCode);
        document.body.dispatchEvent(event);
    };

    var runloop = function () {
        var timer = 0;
        document.addEventListener('DOMNodeInserted', function () {
            if(timer) return;
            timer = setTimeout(function () {
                // START LOOP

                var board = ns.board();
                var d = ns.nextMoveDirection(board);
                move(d);

                // END LOOP
                timer = 0;
            }, 30);
        }, false);
    };

    ns.provide({
        run: runloop
    });
});

Namespace
.use('com.gmail.kouheiszk.userscript.2048.solver run')
.apply(function (ns) {
    'use strict';

    ns.run();
});
