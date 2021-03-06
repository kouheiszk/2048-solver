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
        this.number = number || EMPTY_TILE_NUMBER;
    };

    Tile.prototype.isEmpty = function() {
        return this.number === EMPTY_TILE_NUMBER;
    };

    Tile.prototype.clone = function() {
        var newTile = new Tile(this.position.x, this.position.y, this.number);
        return newTile;
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

    // Deep copy tiles
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
                if (line[i].isEmpty()) break;
                if (line[i].number === line[i + 1].number) {
                    line[i].number = line[i].number * 2;
                    line[i + 1].number = ns.EMPTY_TILE_NUMBER;
                    score += line[i].number;
                }
            }
        }
        if (d === ns.DOWN || d === ns.RIGHT) {
            for (var i = size - 1; i >= 1; i--) {
                if (line[i].isEmpty()) break;
                if (line[i].number === line[i - 1].number) {
                    line[i].number = line[i].number * 2;
                    line[i - 1].number = ns.EMPTY_TILE_NUMBER;
                    score += line[i].number;
                }
            }
        }
        return score;
    };

    var moveLine = function(line, d) {
        var size = line.length;
        var newLine = new Array(size);
        for (var i = size - 1; i >= 0; i--) {
            newLine[i] = line[i].clone();
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
                newLine[size - 1 - existsTileCount].number = line[i].number;
                existsTileCount++;
            }
        }
        return newLine;
    };

    var move = function(board, d) {
        var newBoard = board.clone();
        newBoard.lastMoveScore = 0;
        if (d === ns.UP || d === ns.DOWN) {
            for (var i = 0; i < newBoard.size; i++) {
                var row = newBoard.getRow(i);
                var newRow = moveLine(row, d);
                var score = collapseLine(newRow, d);
                newRow = moveLine(newRow, d);
                newBoard.setRow(i, newRow);
                newBoard.lastMoveScore += score;
            }
        }
        if (d === ns.LEFT || d === ns.RIGHT) {
            for (var i = 0; i < newBoard.size; i++) {
                var column = newBoard.getColumn(i);
                var newColumn = moveLine(column, d);
                var score = collapseLine(newColumn, d);
                newColumn = moveLine(newColumn, d);
                newBoard.setColumn(i, newColumn);
                newBoard.lastMoveScore += score;
            }
        }
        return newBoard;
    };

    var checkLineMoved = function(line1, line2) {
        for (var i = 0; i < ns.SIZE; i++) {
            if (line1[i].number !== line2[i].number) return true;
        }
        return false;
    };

    var Board = function(size) {
        this.size = size;
        this.tiles = (size) ? currentTiles(size) : null;
        this.lastMoveScore = 0;
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
            row[i] = this.tiles[i][y].clone();
        }
        return row;
    };

    Board.prototype.setColumn = function(x, column) {
        this.tiles[x] = column;
    };

    Board.prototype.setRow = function(y, row) {
        for (var i = 0; i < this.size; i++) {
            this.tiles[i][y] = row[i].clone();
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

    Board.prototype.isSame = function (board) {
        for (var y = 0; y < this.size; y++) {
            for (var x = 0; x < this.size; x++) {
                if(this.tiles[y][x].number !== board.tiles[y][x].number) return false;
            }
        }
        return true;
    };

    Board.prototype.sumTilesNumber = function() {
        var tiles = _.flatten(this.tiles);
        var sum = 0;
        _.each(tiles, function(tile) {
            sum += tile.number;
        });
        return sum;
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
    Board.prototype.addTile = function(requestPosition) {
        requestPosition = requestPosition || false;
        var newTileNumber = Math.random() < 0.9 ? 2 : 4;

        if (requestPosition !== false) {
            if (this.getNumber(requestPosition.x, requestPosition.y) !== ns.EMPTY_TILE_NUMBER) return false;
            this.setNumber(requestPosition.x, requestPosition.y, newTileNumber);
            return true;
        }

        var emptyTiles = this.getEmptyTiles();
        if (emptyTiles.length === 0) return false;
        var tile = _.sample(emptyTiles);
        this.setNumber(tile.position.x, tile.position.y, newTileNumber);
        return true;
    };

    // Move tile
    Board.prototype.move = function(d, willAddTile) {
        willAddTile = willAddTile || false;
        var movedBoard = move(this, d);
        if (willAddTile) movedBoard.addTile();
        return movedBoard;
    };

    Board.prototype.rotate = function() {
        var board = this.clone();
        board.tiles = [
            [this.tiles[3][0], this.tiles[2][0], this.tiles[1][0], this.tiles[0][0]],
            [this.tiles[3][1], this.tiles[2][1], this.tiles[1][1], this.tiles[0][1]],
            [this.tiles[3][2], this.tiles[2][2], this.tiles[1][2], this.tiles[0][2]],
            [this.tiles[3][3], this.tiles[2][3], this.tiles[1][3], this.tiles[0][3]]];
        return board;
    };

    Board.prototype.clone = function() {
        var board = new Board();
        board.size = this.size;
        board.tiles = this.tiles.clone();
        board.lastMoveScore = this.lastMoveScore;
        return board;
    };

    Board.prototype.serialize = function() {
        return {
            size : this.size,
            tiles : _.map(this.tiles, function(line) { return _.map(line, function(tile) { return tile.number; }); })
        };
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
    const MAX_DEPTH = 3;

    var AI = function() {
    };

    var evaluater = function(board) {
        var sum = board.sumTilesNumber();
        var score = sum / board.maxNumber();
        var moveScore = board.lastMoveScore;

        return {
            score : score + moveScore,
            criticalPosition : false
        };
    };

    // Calculate Score
    AI.prototype.nextMoveCalculator = function(board, depth, maxDepth, base) {
        base = base || 0.95;

        var that = this;

        var bestScore = 0;
        var bestMove = ns.NONE;

        _.each([ns.UP, ns.RIGHT, ns.DOWN, ns.LEFT], function(d) {
            if (board.validMoveDirection(d)) {
                var newBoard = board.clone().move(d);
                var result = evaluater(newBoard);
                var score = result.score;
                newBoard.addTile(result.criticalPosition);

                if (depth !== 0) {
                    var nextMove = that.nextMoveCalculator(newBoard, depth - 1, maxDepth, base);
                    score += nextMove.score * Math.pow(base, maxDepth - depth + 1);
                }

                if (score > bestScore) {
                    bestMove = d;
                    bestScore = score;
                }
            }
        });

        return {
            score : bestScore,
            direction : bestMove
        };
    };

    AI.prototype.nextMoveDirection = function(board, depth) {
        depth = depth || MAX_DEPTH;
        var nextMove = this.nextMoveCalculator(board, depth, depth);

        if (nextMove.direction === ns.NONE) {
            console.log(board.serialize().tiles);
            return false;
        }

        return nextMove.direction;
    };

    ns.provide({
        nextMoveDirection : function(board) {
            var ai = new AI();
            return ai.nextMoveDirection(board);
        }
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
        var target = document.querySelector(".tile-container");
        var observer = new MutationObserver(function(mutations) {
            if (timer) return;
            timer = setTimeout(function () {
                ////////////////////////////////////////////////////
                // START LOOP

                var board = ns.board();
                var d = ns.nextMoveDirection(board);
                if (d === false) observer.disconnect();
                else move(d);

                // END LOOP
                ////////////////////////////////////////////////////
                timer = 0;
            }, 30);
        });
        observer.observe(target, {
            attributes    : true,
            childList     : true,
            characterData : true
        });

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
