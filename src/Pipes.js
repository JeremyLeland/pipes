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

const Direction = {
  Up: 0b0001,
  Left: 0b0010,
  Down: 0b0100,
  Right: 0b1000,
};

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

    this.map[ this.indexAt( ...this.start ) ] = randomFrom( StartPipes );
    
    this.timeUntilFlow = FlowDelay;

    this.flowSpeedMultiplier = 1;
    this.flowLength = 0;

    this.#flowPath = null;

    this.defeat = false;
  }

  generateMaze() {
    this.map = Array.from( Array( this.cols * this.rows ), _ => 0 );

    this.start = [
      Math.floor( this.cols * ( 0.25 + 0.5 * Math.random() ) ),
      Math.floor( this.rows * ( 0.25 + 0.5 * Math.random() ) ),
    ];


    // This was inspired by maze generation, e.g. https://en.wikipedia.org/wiki/Prim's_algorithm
    // However, we are just trying to guarentee one path from start to end
    // We don't care about false paths, since we're going to scramble everything anyway
    // And we have a limitation on pieces with only two connections
    // TODO: Make paths that cross over each other so we can use the 4-way pieces?

    const visited = Array.from( this.map, _ => false );
    const stack = [];

    let current = this.start;

    for ( let i = 0; i < 100; i ++ ) {
      const currentIndex = this.indexAt( ...current );
      visited[ currentIndex ] = true;

      const currentPipe = this.map[ currentIndex ];

      // TODO: Can we skip this work if currentPipe isn't a 1-way?
      const neighbors = [
        [ current[ 0 ]    , current[ 1 ] - 1 ], // up
        [ current[ 0 ] - 1, current[ 1 ]     ], // left
        [ current[ 0 ]    , current[ 1 ] + 1 ], // bottom
        [ current[ 0 ] + 1, current[ 1 ]     ], // right
      ].filter( e => this.inBounds( ...e ) && !visited[ this.indexAt( ...e ) ] );
      
      if ( ( currentPipe == 0 || StartPipes.includes( currentPipe ) ) && neighbors.length > 0 ) {
        const next = randomFrom( neighbors );
        const nextIndex = this.indexAt( ...next );
        stack.push( current );

        // Up
        if ( next[ 1 ] < current[ 1 ] ) {
          this.map[ currentIndex ] |= Direction.Up;
          this.map[ nextIndex ] |= Direction.Down;
        }

        // Left
        if ( next[ 0 ] < current[ 0 ] ) {
          this.map[ currentIndex ] |= Direction.Left;
          this.map[ nextIndex ] |= Direction.Right;
        }

        // Down
        if ( current[ 1 ] < next[ 1 ] ) {
          this.map[ currentIndex ] |= Direction.Down;
          this.map[ nextIndex ] |= Direction.Up;
        }

        // Right
        if ( current[ 0 ] < next[ 0 ] ) {
          this.map[ currentIndex ] |= Direction.Right;
          this.map[ nextIndex ] |= Direction.Left;
        }

        current = next;
      }
      else {
        this.end = current;
        
        console.log( stack.length );

        // current = stack.pop();

        // if ( current == undefined ) {
          break;
        // }
      }
    }

    // Clean up results
    for ( let row = 0; row < this.rows; row ++ ) {
      for ( let col = 0; col < this.cols; col ++ ) {
        const index = this.indexAt( col, row );

        // Fill in blank spaces
        this.map[ index ] ||= randomFrom( PlaceablePipes );

        if ( col == this.start[ 0 ] && row == this.start[ 1 ] ) {
          // skip start
        }
        else if ( col == this.end[ 0 ] && row == this.end[ 1 ] ) {
          // skip end
        }
        else {
          this.map[ index ] = rotatePipe( this.map[ index ], Math.floor( Math.random() * 4 ) );
        }
      }
    }
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
      let currPipe = this.map[ this.indexAt( currX, currY ) ];
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

        currPipe = this.map[ this.indexAt( currX, currY ) ];
        
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

        if ( col == this.start[ 0 ] && row == this.start[ 1 ] ) {
          ctx.fillStyle = 'orange';
          ctx.fillRect( col - 0.5, row - 0.5, 1, 1 );
        }

        if ( col == this.end[ 0 ] && row == this.end[ 1 ] ) {
          ctx.fillStyle = 'yellow';
          ctx.fillRect( col - 0.5, row - 0.5, 1, 1 );
        }

        drawPipe( ctx, this.map[ this.indexAt( col, row ) ], col, row );
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
    else if ( this.inBounds( mouseCol, mouseRow ) ) {
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
    else if ( col == this.start[ 0 ] && row == this.start[ 1 ] ) {
      // don't rotate start
    }
    else if ( col == this.end[ 0 ] && row == this.end[ 1 ] ) {
      // don't rotate end
    }
    else if ( this.inBounds( col, row ) ) {
      const rotateFunc = [
        pipe => pipe,                   // no click (shouldn't ever be called)
        pipe => rotatePipe( pipe, 3 ),  // left click => rotate right
        pipe => rotatePipe( pipe, 1 ),  // right click => rotate left
        pipe => pipe,                   // L + R (or something else?)
      ];

      const index = this.indexAt( col, row );
      this.map[ index ] = rotateFunc[ buttons ]( this.map[ index ] );
    }
  }

  indexAt( col, row ) {
    // console.log( `indexAt( ${ col }, ${ row } ) = ${ col + row * this.cols }` );

    return col + row * this.cols;
  }

  inBounds( col, row ) {
    return 0 <= col && col < this.cols && 0 <= row && row < this.rows;
  }
}

function rotatePipe( pipe, turns ) {
  return ( pipe << turns ) | ( pipe >> ( 4 - turns ) );
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

  // TODO: If start is -1, do a circle in the center to make start clearer
  //       Or round it off some other way

  // TODO: Handle end pieces

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

  // // Debug warning for 3-way pieces
  // if ( isThreeWay( pipe ) ) {
  //   ctx.fillStyle = 'red';
  //   ctx.fillRect( x - 0.5, y - 0.5, 1, 1 );
  //   // return;
  // }

  // // Debug show 1-way pieces
  // if ( isOneWay( pipe ) ) {
  //   ctx.fillStyle = '#0f08';
  //   ctx.fillRect( x - 0.5, y - 0.5, 1, 1 );
  // }

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
