export class Canvas {
  zoom = 1;
  scrollX = 0;
  scrollY = 0;

  backgroundColor = 'black';
  lineWidth = 0.1;

  #scale = 1;
  #offsetX = 0;
  #offsetY = 0;

  #reqId;

  #mouse = {
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    buttons: 0,
    wheel: 0,
    ctrlKey: false,
    shiftKey: false,
  };

  constructor( canvas ) {
    this.canvas = canvas;
    
    if ( !this.canvas ) {
      this.canvas = document.createElement( 'canvas' );
      document.body.appendChild( this.canvas );
    }
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    
    this.canvas.oncontextmenu = () => { return false };
    
    this.ctx = this.canvas.getContext( '2d' /*, { alpha: false }*/ );

    //
    // Resize with parent element
    //

    const resizeObserver = new ResizeObserver( entries => {
      entries.forEach( entry => {
        // safari does not support devicePixelContentBoxSize, attempting to work around
        const width = entry.devicePixelContentBoxSize?.[ 0 ].inlineSize ?? ( entry.contentBoxSize[ 0 ].inlineSize * devicePixelRatio );
        const height = entry.devicePixelContentBoxSize?.[ 0 ].blockSize ?? ( entry.contentBoxSize[ 0 ].blockSize * devicePixelRatio );
        this.canvas.width = width;
        this.canvas.height = height;

        // this still needs to be based on content box
        const inlineSize = entry.contentBoxSize[ 0 ].inlineSize;
        const blockSize = entry.contentBoxSize[ 0 ].blockSize;

        this.#scale = Math.min( inlineSize, blockSize );

        // this might get messed up if writing mode is vertical
        this.#offsetX = ( inlineSize - this.#scale ) / 2;
        this.#offsetY = ( blockSize - this.#scale ) / 2;

        // console.log( 'inlineSize = ' + inlineSize + ', blockSize = ' + blockSize + ', scale = ' + this.#scale + ', offsetX = ' + this.#offsetX );
      } );
      
      this.redraw();
    } );

    resizeObserver.observe( this.canvas );

    //
    // Pointer input
    //

    this.canvas.addEventListener( 'pointerdown', e => {
      this.#mouse.x = this.getPointerX( e );
      this.#mouse.y = this.getPointerY( e );
      this.#mouse.buttons = e.buttons;
      this.#mouse.ctrlKey = e.ctrlKey;
      this.#mouse.shiftKey = e.shiftKey;

      this.pointerDown( this.#mouse );
    } );

    this.canvas.addEventListener( 'pointermove', e => {
      const lastX = this.#mouse.x;
      const lastY = this.#mouse.y;
      this.#mouse.x = this.getPointerX( e );
      this.#mouse.y = this.getPointerY( e );
      this.#mouse.dx = this.#mouse.x - lastX;
      this.#mouse.dy = this.#mouse.y - lastY;
      this.#mouse.ctrlKey = e.ctrlKey;
      this.#mouse.shiftKey = e.shiftKey;
      
      this.pointerMove( this.#mouse );

      this.#mouse.dx = 0;
      this.#mouse.dy = 0;
    } );

    this.canvas.addEventListener( 'pointerup', e => {
      this.#mouse.buttons = e.buttons;

      this.pointerUp( this.#mouse );
    } );

    this.canvas.addEventListener( 'wheel', e => {
      this.#mouse.x = this.getPointerX( e );
      this.#mouse.y = this.getPointerY( e );
      this.#mouse.wheel = e.wheelDelta;
      this.#mouse.ctrlKey = e.ctrlKey;
      this.#mouse.shiftKey = e.shiftKey;
      
      this.wheelInput( this.#mouse );

      this.#mouse.wheel = 0;

      e.preventDefault();
    } );
  }

  #doDraw() {
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect( 0, 0, this.ctx.canvas.width, this.ctx.canvas.height );

    this.ctx.save(); {
      this.ctx.scale( devicePixelRatio, devicePixelRatio );

      this.ctx.translate( this.#offsetX, this.#offsetY );
      this.ctx.scale( this.#scale, this.#scale );

      this.ctx.scale( this.zoom, this.zoom );
      this.ctx.translate( -this.scrollX, -this.scrollY );

      this.ctx.lineWidth = this.lineWidth;// / ( this.#scale * this.zoom );

      try {
        this.draw( this.ctx );
      }
      catch ( e ) {
        console.error( e );
      }
    }
    this.ctx.restore();
  }

  start() {
    if ( !this.#reqId ) {     // don't try to start again if already started
      let lastTime;
      const animate = ( now ) => {
        lastTime ??= now;  // for first call only
        this.update( now - lastTime );
        lastTime = now;

        this.#doDraw();

        if ( this.#reqId ) {    // make sure we didn't stop it
          this.#reqId = requestAnimationFrame( animate );
        }
      };

      this.#reqId = requestAnimationFrame( animate );
    }
  }

  stop() {
    cancelAnimationFrame( this.#reqId );
    this.#reqId = null;   // so we can check if stopped
  }

  redraw() {
    if ( !this.#reqId ) {   // don't draw if we are animated
      this.#doDraw();
    }
  }


  update( dt ) {}
  draw( ctx ) {}

  pointerDown( pointerInfo ) {}
  pointerMove( pointerInfo ) {}
  pointerUp( pointerInfo ) {}
  wheelInput( pointerInfo ) {}

  getPointerX( e ) {
    return ( ( e.clientX - this.#offsetX ) / this.#scale ) / this.zoom + this.scrollX;
  }

  getPointerY( e ) {
    return ( ( e.clientY - this.#offsetY ) / this.#scale ) / this.zoom + this.scrollY;
  }

  zoomAt( x, y, amount ) {
    this.zoom *= amount;
    
    this.scrollX = x - ( x - this.scrollX ) / amount;
    this.scrollY = y - ( y - this.scrollY ) / amount;

    // Don't need to update pointer position because we intentionally kept it the same
  }
}

//
// Persisting state to localStorage
// - Not really a canvas thing, but putting here for now because I use it a lot
//

export class GameState {
  #stateKey;

  constructor( stateKey ) {
    this.#stateKey = stateKey;

    try {
      const state = localStorage.getItem( this.#stateKey );
      const jsonState = JSON.parse( state );
      Object.assign( this, jsonState );
    }
    catch( e ) {
      console.log( `Error parsing existing state JSON: ${ e } ` );
    }

    window.addEventListener( 'beforeunload', _ => {
      this.save();
    } );
  }
  
  save() {
    localStorage.setItem( this.#stateKey, JSON.stringify( this ) );
  }

  remove() {
    localStorage.removeItem( this.#stateKey );
  }
}
