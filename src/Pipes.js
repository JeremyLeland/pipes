import { Grid } from '../src/common/Grid.js';

const PlaceablePipes = [
  0b0011,
  0b0110,
  0b1100,
  0b1001,
  0b0101,
  0b1010,
  0b1111,
];

const StartPipes = [
  0b0001,
  0b0010,
  0b0100,
  0b1000,
];

function randomFrom( array ) {
  return array[ Math.floor( Math.random() * array.length ) ];
}

const FlowSpeed = 0.0005;
const FlowDelay = 10000;

export class Board {
  #grid;
  #flowPath;

  constructor( json ) {
    Object.assign( this, json );

    this.cols ??= 10;
    this.rows ??= 7;

    if ( this.map == undefined ) {
      this.reset();
    }
  }

  reset() {
    this.#grid = new Grid( 0, 0, this.cols - 1, this.rows - 1 );

    this.map = Array.from( Array( this.cols * this.rows ), _ => randomFrom( PlaceablePipes ) );

    this.start = [
      Math.floor( this.cols * ( 0.25 + 0.5 * Math.random() ) ),
      Math.floor( this.rows * ( 0.25 + 0.5 * Math.random() ) ),
    ];

    this.map[ this.start[ 0 ] + this.start[ 1 ] * this.cols ] = randomFrom( StartPipes );
    
    this.timeUntilFlow = FlowDelay;

    this.flowSpeedMultiplier = 1;
    this.flowLength = 0;

    this.#flowPath = null;

    this.defeat = false;
  }

  update( dt ) {
    if ( this.defeat ) {
      return;
    }

    this.timeUntilFlow = Math.max( 0, this.timeUntilFlow - dt );

    if ( this.timeUntilFlow == 0 ) {
      this.flowLength += FlowSpeed * this.flowSpeedMultiplier * dt;

      //
      // TODO: Avoid excessive garbage collection by not creating Path2D object each time?
      //
      this.#flowPath = new Path2D();

      let [ currX, currY ] = this.start;
      let start = -1;
      let currPipe = this.map[ currX + currY * this.cols ];
      let end = Math.log2( currPipe & -currPipe );
      
      addPath( this.#flowPath, start, end, currX, currY, Math.min( 1, this.flowLength ), true );

      for ( let i = 1; i < this.flowLength; i ++ ) {
        const dir = offset[ end ];
        currX += dir[ 0 ];
        currY += dir[ 1 ];
        
        if ( currX < 0 || currX >= this.cols || currY < 0 || currY >= this.rows ) {
          this.defeat = true;
          break;
        }

        currPipe = this.map[ currX + currY * this.cols ];
        
        start = ( end + 2 ) % 4;

        if ( !( currPipe & ( 1 << start ) ) ) {
          this.defeat = true;
          break;
        }

        const straight = ( start + 2 ) % 4;   // test straight first in case it's the cross piece
        const left     = ( start + 3 ) % 4;
        const right    = ( start + 1 ) % 4;

        end = [ straight, left, right ].find( dir => currPipe & ( 1 << dir ) );

        addPath( this.#flowPath, start, end, currX, currY, Math.min( 1, this.flowLength - i ) );
      }
    }
  }

  draw( ctx, mouseCol, mouseRow ) {
    // Grid
    ctx.lineWidth = 0.05;
    this.#grid.draw( ctx );

    // Pipes
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'black';

    for ( let row = 0; row < this.rows; row ++ ) {
      for ( let col = 0; col < this.cols; col ++ ) {
        drawPipe( ctx, this.map[ col + row * this.cols ], col, row );
      }
    }

    // Flow
    if ( this.#flowPath ) {
      ctx.lineWidth = 0.3;
      ctx.strokeStyle = 'dodgerblue';
      ctx.stroke( this.#flowPath );
    }

    if ( this.defeat ) {
      ctx.fillStyle = '#0005';
      ctx.fillRect( -10, -10, 30, 30 );   // not sure how big it needs to be, just make it big

      ctx.font = '1px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      ctx.fillStyle = 'white';
      ctx.fillText( 'Game Over', 4.5, 3 );

      ctx.font = '0.5px Arial';
      ctx.fillText( 'Click to Continue', 4.5, 4 );
    }
    else if ( this.mouseInBounds( mouseCol, mouseRow ) ) {
      // Pipe preview
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'black';
      
      // Grid outline
      ctx.lineWidth = 0.05;
      ctx.strokeStyle = 'white';
      ctx.strokeRect( mouseCol - 0.5, mouseRow - 0.5, 1, 1 );
    }
  }

  playerInput( col, row, buttons ) {
    if ( this.defeat ) {
      this.reset();
    }
    else if ( this.mouseInBounds( col, row ) ) {
      const rotateFunc = [
        pipe => pipe,                           // no click (shouldn't ever be called)
        pipe => ( pipe << 3 ) | ( pipe >> 1 ),  // left click => rotate right
        pipe => ( pipe << 1 ) | ( pipe >> 3 ),  // right click => rotate left
        pipe => pipe,                           // L + R (or something else?)
      ];

      const index = col + row * this.cols;
      this.map[ index ] = rotateFunc[ buttons ]( this.map[ index ] );
    }
  }

  mouseInBounds( col, row ) {
    return 0 <= col && col < this.cols && 0 <= row && row < this.rows;
  }
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
