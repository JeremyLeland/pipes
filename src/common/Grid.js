export class Grid {
  #path;

  minX = 0;
  minY = 0;
  maxX = 0;
  maxY = 0;

  constructor( minX, minY, maxX, maxY ) {
    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;

    this.#path = getGrid( minX, minY, maxX, maxY );
  }

  draw( ctx ) {
    ctx.save(); {

      // Make it look like:
      // + - - +
      // |     |
      // |     |
      // + - - +
      ctx.setLineDash( [ 0.1, 0.2, 0.1, 0.2, 0.1, 0.2, 0.1, 0 ] );
      ctx.fillStyle = ctx.strokeStyle = '#ccc8';

      ctx.stroke( this.#path );

      ctx.font = '0.2px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';   // this looks wrong in FF

      for ( let row = this.minY; row <= this.maxY; row ++ ) {
        for ( let col = this.minX; col <= this.maxX; col ++ ) {
          ctx.fillText( `(${ col },${ row })`, col, row );
        }
      }
    }
    ctx.restore();
  }
}

function getGrid( minX, minY, maxX, maxY ) {
  const grid = new Path2D();

  for ( let col = minX; col <= maxX + 1; col ++ ) {
    grid.moveTo( col - 0.5, minY - 0.5 );
    grid.lineTo( col - 0.5, maxY + 0.5 );
  }

  for ( let row = minY; row <= maxY + 1; row ++ ) {
    grid.moveTo( minX - 0.5, row - 0.5 );
    grid.lineTo( maxX + 0.5, row - 0.5 );
  }

  return grid;
}