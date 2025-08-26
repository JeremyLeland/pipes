import { Canvas, GameState } from '../src/common/Canvas.js';
import { Board } from '../src/Pipes.js';


let state = {}; //new GameState( 'pipeDreamState_testRotate' );
state.board = new Board( state.board );

state.board.generateMaze();


const canvas = new Canvas();
canvas.backgroundColor = '#321';
canvas.zoom = 1 / 8;
canvas.scrollX = 0.5;
canvas.scrollY = -1;


canvas.draw = ( ctx ) => {
  state.board.draw( ctx );
}

