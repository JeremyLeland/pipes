import { Canvas } from '../src/common/Canvas.js';
import { Grid } from '../src/common/Grid.js';


const flow = {
  start: [ 1, 1 ],
  length: 7.5,
};

let mouseCol, mouseRow;

const COLS = 10, ROWS = 7;
const map = Array( COLS * ROWS ).fill( 0 );
map[ 1 + 1 * COLS ] = 0b1000;
map[ 2 + 1 * COLS ] = 0b0110;
map[ 2 + 2 * COLS ] = 0b0101;
map[ 2 + 3 * COLS ] = 0b1001;
map[ 3 + 3 * COLS ] = 0b0011;
map[ 3 + 2 * COLS ] = 0b1100;
map[ 4 + 2 * COLS ] = 0b1111;
map[ 5 + 2 * COLS ] = 0b0011;
map[ 5 + 1 * COLS ] = 0b0110;
map[ 4 + 1 * COLS ] = 0b1100;
map[ 4 + 3 * COLS ] = 0b1001;
map[ 5 + 3 * COLS ] = 0b0011;

// Testing start pieces
// map[ 0 + 5 * COLS ] = 0b0001;
// map[ 1 + 5 * COLS ] = 0b0010;
// map[ 2 + 5 * COLS ] = 0b0100;
// map[ 3 + 5 * COLS ] = 0b1000;


const canvas = new Canvas();
canvas.backgroundColor = '#321';
// canvas.lineWidth = 1;
canvas.zoom = 1 / 8;
canvas.scrollX = 0.5;
canvas.scrollY = -1;

const grid = new Grid( 0, 0, COLS - 1, ROWS - 1 );

canvas.draw = ( ctx ) => {

  // Grid
  ctx.lineWidth = 0.05;
  grid.draw( ctx );

  // Pipes
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = 'black';

  for ( let row = 0; row < ROWS; row ++ ) {
    for ( let col = 0; col < COLS; col ++ ) {
      drawPipe( ctx, map[ col + row * COLS ], col, row );
    }
  }

  // TODO: What if we create a Path2D during update() (while finding path) and display during draw?

  // Flow
  ctx.lineWidth = 0.3;
  ctx.strokeStyle = 'dodgerblue';

  ctx.beginPath();

  let [ currX, currY ] = flow.start;
  let start = -1;
  let currPipe = map[ currX + currY * COLS ];
  let end = Math.log2( currPipe & -currPipe );
  
  addPath( ctx, start, end, currX, currY, Math.min( 1, flow.length ), true );

  for ( let i = 1; i < flow.length; i ++ ) {
    const dir = offset[ end ];
    currX += dir[ 0 ];
    currY += dir[ 1 ];
    
    if ( currX < 0 || currX >= COLS || currY < 0 || currY >= ROWS ) {
      console.log( 'Out of bounds!' );
      break;    // TODO: loss condition
    }

    currPipe = map[ currX + currY * COLS ];
    
    start = ( end + 2 ) % 4;

    if ( !( currPipe & ( 1 << start ) ) ) {
      console.log( 'Game over!' );    
      break;    // TODO: Loss condition
    }

    const straight = ( start + 2 ) % 4;   // test straight first in case it's the cross piece
    const left     = ( start + 3 ) % 4;
    const right    = ( start + 1 ) % 4;

    end = [ straight, left, right ].find( dir => currPipe & ( 1 << dir ) );

    addPath( ctx, start, end, currX, currY, Math.min( 1, flow.length - i ) );
  }

  ctx.stroke();


  // Mouse
  ctx.lineWidth = 0.05;
  ctx.strokeStyle = 'white';
  ctx.strokeRect( mouseCol - 0.5, mouseRow - 0.5, 1, 1 );
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
// Slider
//
const lengthSlider = document.createElement( 'input' );

Object.assign( lengthSlider.style, {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '99%',
} );

Object.assign( lengthSlider, {
  type: 'range',
  value: flow.length,
  min: 0,
  max: 18,
  step: 0.01,
} );

document.body.appendChild( lengthSlider );

lengthSlider.addEventListener( 'input', _ => {
  flow.length = +lengthSlider.value;

  canvas.redraw();
} );

//
// Input
//

const KeyToPipe = {
  'q': 0b1100,
  'w': 0b1010,
  'e': 0b0110,
  'a': 0b0101,
  's': 0b1111,
  'd': 0b0101,
  'z': 0b1001,
  'x': 0b1010,
  'c': 0b0011,
};

document.addEventListener( 'keydown', e => {
  const pipe = KeyToPipe[ e.key ];

  if ( pipe != undefined &&
       0 <= mouseCol && mouseCol < COLS &&
       0 <= mouseRow && mouseRow < ROWS ) {
    map[ mouseCol + mouseRow * COLS ] = pipe;
  }

  canvas.redraw();
} );

canvas.pointerMove = m => {
  mouseCol = Math.round( m.x );
  mouseRow = Math.round( m.y );

  canvas.redraw();
};