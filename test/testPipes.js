import { Canvas } from '../src/common/Canvas.js';
import { Grid } from '../src/common/Grid.js';

const COLS = 10, ROWS = 7;

const PlaceablePipes = [
  0b0011,
  0b0110,
  0b1100,
  0b1001,
  0b0101,
  0b1010,
  0b1111,
];

function randomPipe() {
  return PlaceablePipes[ Math.floor( Math.random() * PlaceablePipes.length ) ];
}

const GameStateKey = 'pipeDreamState-testPipes';

class Board {

  #nextPipesOffset = 0;

  static fromLocalStore() {
    const gameState = JSON.parse( localStorage.getItem( GameStateKey ) );

    if ( gameState ) {
      return new Board( gameState );
    }
  }

  toLocalStore() {
    localStorage.setItem( GameStateKey, JSON.stringify( this ) );
  }

  static newGame() {
    const map = Array( COLS * ROWS ).fill( 0 );
    map[ 1 + 1 * COLS ] = 0b1000;

    return new Board( {
      map: map,
      nextPipes: Array.from( Array( 5 ), _ => randomPipe() ),
    } );
  }

  constructor( json ) {
    Object.assign( this, json );
  }

  update( dt ) {
    this.#nextPipesOffset = Math.min( 0, this.#nextPipesOffset + 0.002 * dt );
  }

  draw( ctx ) {
    // Grid
    ctx.lineWidth = 0.05;
    grid.draw( ctx );

    // Pipes
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'black';

    for ( let row = 0; row < ROWS; row ++ ) {
      for ( let col = 0; col < COLS; col ++ ) {
        drawPipe( ctx, this.map[ col + row * COLS ], col, row );
      }
    }

    this.nextPipes.forEach( ( pipe, index ) => {
      drawPipe( ctx, pipe, -1, index + this.#nextPipesOffset );
    } );
  }

  playerInput( col, row ) {
    // next pipes are drawn from top to bottom, and we are pulling from bottom
    this.map[ mouseCol + mouseRow * COLS ] = this.nextPipes.pop();
    this.nextPipes.unshift( randomPipe() );

    this.#nextPipesOffset = -1;
  }
}

let mouseCol, mouseRow;

const board = Board.fromLocalStore() ?? Board.newGame();


const canvas = new Canvas();
canvas.backgroundColor = '#321';
// canvas.lineWidth = 1;
canvas.zoom = 1 / 8;
canvas.scrollX = 0.5;
canvas.scrollY = -1;

const grid = new Grid( 0, 0, COLS - 1, ROWS - 1 );

canvas.update = ( dt ) => {
  board.update( dt );
}

canvas.draw = ( ctx ) => {

  board.draw( ctx );

  // Mouse
  if ( mouseCol != undefined && mouseRow != undefined ) {

    ctx.globalAlpha = 0.5;
    drawPipe( ctx, board.nextPipes[ board.nextPipes.length - 1 ], mouseCol, mouseRow );
    ctx.globalAlpha = 1;

    ctx.lineWidth = 0.05;
    ctx.strokeStyle = 'white';
    ctx.strokeRect( mouseCol - 0.5, mouseRow - 0.5, 1, 1 );
  }
}

canvas.start();

function redraw() {
  // canvas.redraw();
}

function addCurve( path, x1, y1, cx, cy, x2, y2, t = 1 ) {
  if ( t < 1 ) {
    // https://en.wikipedia.org/wiki/De_Casteljau%27s_algorithm
    const x01 = ( 1 - t ) * x1 + t * cx;
    const y01 = ( 1 - t ) * y1 + t * cy;

    const x12 = ( 1 - t ) * cx + t * x2;
    const y12 = ( 1 - t ) * cy + t * y2;

    const x012 = ( 1 - t ) * x01 + t * x12;
    const y012 = ( 1 - t ) * y01 + t * y12;

    path.quadraticCurveTo( x01, y01, x012, y012 );
  }
  else {
    path.quadraticCurveTo( cx, cy, x2, y2 );
  }
}

const offset = [
  [  0, -1 ], // top
  [ -1,  0 ], // left
  [  0,  1 ], // bottom
  [  1,  0 ], // right
];


function addPath( path, start, end, x, y, t, newPath = false ) {
  const startX = x + ( start < 0 ? 0 : 0.5 * offset[ start ][ 0 ] );
  const startY = y + ( start < 0 ? 0 : 0.5 * offset[ start ][ 1 ] );
  const endX = x + 0.5 * offset[ end ][ 0 ];
  const endY = y + 0.5 * offset[ end ][ 1 ];

  if ( newPath ) {
    path.moveTo( startX, startY );
  }

  addCurve( path, startX, startY, x, y, endX, endY, t );
}

function drawPipe( ctx, pipe, x, y ) {
  if ( pipe == 0 ) {
    return;
  }

  ctx.beginPath();
  
  if ( pipe == 0b1111 ) {
    addPath( ctx, 0, 2, x, y, 1, true );
    addPath( ctx, 1, 3, x, y, 1, true );
  }
  else {
    let whichIndex = 1;     // fill in end first, in case there's no start
    const sideIndices = [ -1, -1 ];
      
    // Assumes exactly two active bits
    for ( let side = 0; side < 4; side ++ ) {
      if ( pipe & ( 1 << side ) ) {
        sideIndices[ whichIndex ] = side;
        whichIndex --;
      }
    }

    addPath( ctx, sideIndices[ 0 ], sideIndices[ 1 ], x, y, 1, true );
  }

  ctx.stroke();
}

//
// Input
//

canvas.pointerMove = m => {
  mouseCol = Math.round( m.x );
  mouseRow = Math.round( m.y );

  if ( mouseCol < 0 || COLS <= mouseCol || mouseRow < 0 || ROWS <= mouseRow ) {
    mouseCol = mouseRow = undefined;
  }

  redraw();
};

canvas.pointerDown = m => {
  if ( mouseCol != undefined && mouseRow != undefined ) {
    board.playerInput( mouseCol, mouseRow );
  }

  redraw();
}