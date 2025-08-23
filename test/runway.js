import { Canvas } from '../src/common/Canvas.js';
import { Grid } from '../src/common/Grid.js';

const canvas = new Canvas();
canvas.backgroundColor = '#321';
// canvas.lineWidth = 1;
canvas.zoom = 1 / 10;
canvas.scrollX = -1;
canvas.scrollY = -1;

const grid = new Grid( 0, 0, 8, 8 );

canvas.draw = ( ctx ) => {

  ctx.lineWidth = 0.05;
  grid.draw( ctx );

  //
  // Example pipes
  //

  ctx.lineWidth = 0.5;
  ctx.strokeStyle = 'black';

  drawPipe( ctx, 0b1010, 1, 1 );
  drawPipe( ctx, 0b0110, 2, 1 );
  drawPipe( ctx, 0b0101, 2, 2 );
  drawPipe( ctx, 0b1001, 2, 3 );
  drawPipe( ctx, 0b0011, 3, 3 );
  drawPipe( ctx, 0b1100, 3, 2 );
  drawPipe( ctx, 0b1111, 4, 2 );

  // Palette
  drawPipe( ctx, 0b0011, 0, 4 );
  drawPipe( ctx, 0b0101, 1, 4 );
  drawPipe( ctx, 0b1001, 2, 4 );
  drawPipe( ctx, 0b0110, 0, 5 );
  drawPipe( ctx, 0b1010, 1, 5 );
  drawPipe( ctx, 0b1100, 2, 5 );
  drawPipe( ctx, 0b1111, 1, 6 );


  //
  // Example line
  //

  ctx.lineWidth = 0.3;
  ctx.strokeStyle = 'dodgerblue';

  ctx.beginPath();

  addPath( ctx, 1, 3, 1, 1, 1, true );
  addPath( ctx, 1, 2, 2, 1, 1 );
  addPath( ctx, 0, 2, 2, 2, 1 );
  addPath( ctx, 0, 3, 2, 3, 1 );
  addPath( ctx, 1, 0, 3, 3, 0.75 );

  ctx.stroke();


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
  [  0,   -0.5 ], // top
  [ -0.5,  0   ], // left
  [  0,    0.5 ], // bottom
  [  0.5,  0   ], // right
];

function addPath( path, start, end, x, y, t, newPath = false ) {
  const startX = x + offset[ start ][ 0 ];
  const startY = y + offset[ start ][ 1 ];
  const endX = x + offset[ end ][ 0 ];
  const endY = y + offset[ end ][ 1 ];

  if ( newPath ) {
    path.moveTo( startX, startY );
  }

  addCurve( path, startX, startY, x, y, endX, endY, t );
}

function drawPipe( ctx, pipe, x, y ) {
  ctx.beginPath();
  
  if ( pipe == 0b1111 ) {
    addPath( ctx, 0, 2, x, y, 1, true );
    addPath( ctx, 1, 3, x, y, 1, true );
  }
  else {
    let whichIndex = 0;
    const sideIndices = [ -1, -1 ];
      
    // Assumes exactly two active bits
    for ( let side = 0; side < 4; side ++ ) {
      if ( pipe & ( 1 << side ) ) {
        sideIndices[ whichIndex ] = side;
        whichIndex ++;
      }
    }

    addPath( ctx, sideIndices[ 0 ], sideIndices[ 1 ], x, y, 1, true );
  }

  ctx.stroke();
}