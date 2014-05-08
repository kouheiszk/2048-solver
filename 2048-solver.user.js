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

Namespace('com.gmail.kouheiszk.userscript.2048-ai')
.define(function (ns) {
    'use strict';

    // CONST
    const SIZE = 4;
    const CALCULATE_DEPTH = 0;
    const EMPTY_TILE = 0;

    // Move direction types
    const UP    = 0;
    const RIGHT = 1;
    const DOWN  = 2;
    const LEFT  = 3;

    var $tileContainer = $(".tile-container");

    // 配列のDeepコピー
    Array.prototype.clone = function() {
        if (this[0].constructor == Array) {
            var ar = new Array( this.length );
            for (var i = 0, len = ar.length; i < len; i++) {
                ar[i] = this[i].clone();
            }
            return ar;
        }
        return Array.apply(null, this);
    };

    // Get tiles dom
    var getBoard = function () {
        var board = new Array(SIZE);
        for (var x = 0; x < SIZE; x++) {
            if (!board[x]) board[x] = new Array(SIZE);
            for (var y = 0; y < SIZE; y++) {
                var $tile = $tileContainer.find(".tile-position-" + (y + 1) + "-" + (x + 1));
                if ($tile.length) {
                    $tile.children().each(function() {
                        var tile = parseInt($(this).text(), 10);
                        if (!board[x][y] || tile > board[x][y]) {
                            board[x][y] = tile;
                        }
                    });
                } else {
                    board[x][y] = EMPTY_TILE;
                }
            }
        }
        return board;
    };

    // Move tiles
    var move = function (direction) {
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
            keyCode    : keyCodes[direction],
            charCode   : 0
        };

        var event = document.createEvent("KeyboardEvent");
        event.initKeyEvent("keydown", e.canBubble, e.cancelable, e.view,
            e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.keyCode, e.charCode);
        document.body.dispatchEvent(event);
    };

    var canMove = function(board) {
        if (!filledBoard()) return true;
        for (var x = 0; x < SIZE - 1; x++) {
            for (var y = 0; y < SIZE - 1; y++) {
                var number = getNumber(board, x, y);
                var rightNumber = getNumber(board, x + 1, y);
                var bottomNumber = getNumber(board, x, y + 1);
                if (number === rightNumber || number === bottomNumber) {
                    return true;
                }
            }
        }
        return false;
    };

    // Valid move direction
    var validMove = function(board, direction) {
        if (direction === UP || direction === DOWN) {
            for (var y = 0; y < SIZE; y++) {
                var row = getRow(board, y);
                for (var x = 0; x < SIZE; x++) {
                    if (x < SIZE - 1 && row[x] === row[x + 1] && row[x] !== EMPTY_TILE) return true;
                    if (direction === DOWN && x > 0 && row[x] === EMPTY_TILE && row[x - 1] !== EMPTY_TILE) return true;
                    if (direction === UP && x < SIZE - 1 && row[x] === EMPTY_TILE && row[x + 1] !== EMPTY_TILE) return true;
                }
            }
        }
        if (direction === LEFT || direction === RIGHT) {
            for (var x = 0; x < SIZE; x++) {
                var colmun = getColumn(board, x);
                for (var y = 0; y < SIZE; y++) {
                    if (y < SIZE - 1 && colmun[y] === colmun[y + 1] && colmun[y] !== EMPTY_TILE) return true;
                    if (direction === RIGHT && y > 0 && colmun[y] === EMPTY_TILE && colmun[y - 1] !== EMPTY_TILE) return true;
                    if (direction === LEFT && y < SIZE - 1 && colmun[y] === EMPTY_TILE && colmun[y + 1] !== EMPTY_TILE) return true;
                }
            }
        }

        return false;
    };

    var filledBoard = function(board) {
        return getEmptyTiles(board).length === 0;
    };

    var collapseLine = function(line, direction) {
        var score = 0;
        if (direction === UP || direction === LEFT) {
            for (var i = 0; i < SIZE - 1; i++) {
                if (line[i] === EMPTY_TILE) continue;
                if (line[i] === line[i + 1]) {
                    var newNumber = line[i] * 2;
                    line[i] = newNumber;
                    line[i + 1] = EMPTY_TILE;
                    score += newNumber;
                }
            }
        }
        else {
            for (var i = SIZE - 1; i >= 0; i--) {
                if (line[i] === EMPTY_TILE) continue;
                if (line[i] === line[i - 1]) {
                    var newNumber = line[i] * 2;
                    line[i] = newNumber;
                    line[i - 1] = EMPTY_TILE;
                    score += newNumber;
                }
            }
        }
        return score;
    };

    var moveLine = function(line, direction) {
        var newLine = new Array(SIZE);
        for (var i = 0; i < SIZE; i++) {
            newLine[i] = EMPTY_TILE;
        }
        var existsTileCount = 0;
        if (direction === UP || direction === LEFT) {
            for (var i = 0; i < SIZE; i++) {
                if (line[i] === EMPTY_TILE) continue;
                newLine[existsTileCount] = line[i];
                existsTileCount++;
            }
        }
        else {
            for (var i = SIZE - 1; i >= 0; i--) {
                if (line[i] === EMPTY_TILE) continue;
                newLine[existsTileCount] = line[i];
                existsTileCount++;
            }
        }
        return newLine;
    };

    // Add tile
    var addTile = function(board) {
        var newTileNumber = Math.random() < 0.9 ? 2 : 4;
        var emptyTiles = getEmptyTiles(board);
        var position = _.sample(emptyTiles);
        setNumber(board, position[0], position[1], newTileNumber);
    };

    var checkMoved = function(line1, line2) {
        for (var i = 0; i < SIZE; i++) {
            if (line1[i] !== line2[i]) return true;
        }
        return false;
    };

    // Move tile
    var testMove = function(board, direction, willAddTile) {
        willAddTile = willAddTile || false;
        var moved = false;
        var score = 0;
        if (direction === UP || direction === DOWN) {
            for (var i = 0; i < SIZE; i++) {
                var row = getRow(board, i);
                var newRow = moveLine(row, direction);
                var lineScore = collapseLine(newRow, direction);
                newRow = moveLine(newRow, direction);
                setRow(board, i, newRow);
                if (checkMoved(row, newRow)) {
                    moved = true;
                }
                score += lineScore;
            }
        }
        else {
            for (var i = 0; i < SIZE; i++) {
                var column = getColumn(board, i);
                var newColumn = moveLine(column, direction);
                var lineScore = collapseLine(newColumn, direction);
                newColumn = moveLine(newColumn, direction);
                setColumn(board, i, newColumn);
                if (checkMoved(column, newColumn)) {
                    moved = true;
                }
                score += lineScore;
            }
        }

        if (moved && willAddTile) addTile(board);

        return score;
    };

    // Boards
    var maxNumber = function(board) {
        var maxNumber = 0;
        for (var x = 0; x < SIZE; x++) {
            for (var y = 0; y < SIZE; y++) {
                var number = getNumber(board, x, y);
                if (number > maxNumber) maxNumber = number;
            }
        }
        return maxNumber;
    };

    var getNumber = function(board, x, y) {
        return board[x][y];
    };

    var setNumber = function(board, x, y, number) {
        board[x][y] = number;
    };

    var getColumn = function(board, x) {
        return board[x];
    };

    var getRow = function(board, y) {
        var row = new Array(SIZE);
        for (var i = 0; i < SIZE; i++) {
            row[i] = board[i][y];
        }
        return row;
    };

    var setColumn = function(board, x, column) {
        board[x] = column;
    };

    var setRow = function(board, y, row) {
        for (var i = 0; i < SIZE; i++) {
            board[i][y] = row[i];
        }
    };

    var getEmptyTiles = function(board) {
        var tiles = new Array();
        for (var x = 0; x < SIZE; x++) {
            for (var y = 0; y < SIZE; y++) {
                if (board[x][y] === EMPTY_TILE) {
                    tiles.push([x, y]);
                }
            }
        }
        return tiles;
    };

    // Evaluate
    var evaluateBoard = function(board, commonRatio) {
        return 1.0;
    };

    // Calculate Score
    var nextMoveCalculator = function(board, depth, maxDepth, base) {
        base = base || 0.9;

        var bestScore = -1;
        var bestMove = -1;
        var foundMove = false;
        var directionMap = {
            0 : 'Up',
            1 : 'Right',
            2 : 'Down',
            3 : 'Left'
        };

        _.each([UP, RIGHT, DOWN, LEFT], function(direction) {
            if (validMove(board, direction)) {
                foundMove = true;
                if (depth === maxDepth) {
                    console.log("Enable to move " + directionMap[direction]);
                }
                var newBoard = board.clone();
                testMove(newBoard, direction, true);
                var score = evaluateBoard(newBoard);

                if (depth !== 0) {
                    var nextStepScore = nextMoveCalculator(newBoard, depth - 1, maxDepth, base);
                    score += nextStepScore * Math.pow(base, maxDepth - depth + 1);
                }

                if (score > bestScore) {
                    bestMove = direction;
                    bestScore = score;
                }
            }
        });

        if (depth === maxDepth) {
            if (foundMove) {
                console.log("Select to move " + directionMap[bestMove]);
            } else {
                console.log("Couldn't to move to any directions");
                console.log(board);
            }
        }

        return bestMove;
    };

    var nextMoveDirection = function(board, depth) {
        depth = depth || CALCULATE_DEPTH;
        var direction = nextMoveCalculator(board, depth, depth);
        if (direction === -1) console.log("Couldn't find enable to move direction");
        return direction;
    };

    var runloop = function () {
        var timer = 0;
        document.addEventListener('DOMNodeInserted', function () {
            if(timer) return;
            timer = setTimeout(function () {
                // START LOOP

                var board = getBoard();
                var direction = nextMoveDirection(board);
                move(direction);

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
.use('com.gmail.kouheiszk.userscript.2048-ai run')
.apply(function (ns) {
    'use strict';

    ns.run();
});
