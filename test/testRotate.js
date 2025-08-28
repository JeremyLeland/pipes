import { Canvas, GameState } from '../src/common/Canvas.js';
import { Board } from '../src/Pipes.js';

let mouseCol, mouseRow;

let state = {}; //new GameState( 'pipeDreamState_testRotate' );
state.board = new Board( state.board );
state.board.generateMaze();

const canvas = new Canvas();
canvas.backgroundColor = '#321';
// canvas.lineWidth = 1;
canvas.zoom = 1 / 8;
canvas.scrollX = 0.5;
canvas.scrollY = -1;

canvas.update = ( dt ) => {
  state.board.update( dt );

  lengthSlider.value = state.board.flowLength;
}

canvas.draw = ( ctx ) => {
  state.board.draw( ctx, mouseCol, mouseRow );
}

canvas.start();


//
// UI
//
const playButton = document.createElement( 'button' );

Object.assign( playButton.style, {
  border: 0,
  padding: 0,
  verticalAlign: 'super',
} );

function updatePlayButtonLabel() {
  playButton.textContent = state.board.flowSpeedMultiplier == 0 ? '▶️' : '⏸️';
}
updatePlayButtonLabel();

playButton.addEventListener( 'click', _ => {
  state.board.flowSpeedMultiplier = ( state.board.flowSpeedMultiplier + 1 ) % 2;
  updatePlayButtonLabel();
} );

// const resetButton = document.createElement( 'button' );
// resetButton.textContent = 'Reset';

// resetButton.addEventListener( 'click', _ => {
//   state.board = new Board();
// } );

const lengthSlider = document.createElement( 'input' );

Object.assign( lengthSlider.style, {
  width: '90%',
} );

Object.assign( lengthSlider, {
  type: 'range',
  value: state.board.flowLength,
  min: 0,
  max: 50,
  step: 0.01,
} );

lengthSlider.addEventListener( 'input', _ => {
  state.board.flowLength = +lengthSlider.value;

  canvas.redraw();
} );

const ui = document.createElement( 'div' );
Object.assign( ui.style, {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '99%',
} );

ui.appendChild( playButton );
ui.appendChild( lengthSlider );
// ui.appendChild( resetButton );
document.body.appendChild( ui );


//
// Input
//

canvas.pointerMove = m => {
  mouseCol = Math.round( m.x );
  mouseRow = Math.round( m.y );
  canvas.redraw();
};

canvas.pointerDown = m => {
  state.board.playerInput( mouseCol, mouseRow, m.buttons );
  canvas.redraw();
}