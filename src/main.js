import { Canvas, GameState } from './common/Canvas.js';
import { Board } from './Pipes.js';

let mouseCol, mouseRow;

let state = new GameState( 'pipeDreamState' );
if ( state.board ) {
  state.board = new Board( state.board );
}

const canvas = new Canvas();
canvas.backgroundColor = '#321';
// canvas.lineWidth = 1;
canvas.zoom = 1 / 12;
canvas.scrollX = -1.5;
canvas.scrollY = -1;

canvas.update = ( dt ) => {
  if ( state.board ) {
    state.board.update( dt );
  }
}

canvas.draw = ( ctx ) => {
  if ( state.board ) {
    state.board.draw( ctx, mouseCol, mouseRow );
  }
  else {
    // Splash screen
    ctx.font = '1.5px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillStyle = 'white';
    ctx.fillText( 'Pipe Dream', 4.5, 3 );

    ctx.font = '0.5px Arial';
    ctx.fillText( 'Click to continue', 4.5, 5 );
  }
}

canvas.start();


//
// Input
//

canvas.pointerMove = m => {
  mouseCol = Math.round( m.x );
  mouseRow = Math.round( m.y );
  canvas.redraw();
};

canvas.pointerDown = m => {
  mouseCol = Math.round( m.x );
  mouseRow = Math.round( m.y );

  if ( state.board && !state.board.defeat ) {
    state.board.playerInput( mouseCol, mouseRow );
  }
  else {
    state.board = new Board();
  }

  canvas.redraw();
}