import React, {Component} from 'react'
import ReactDOM from 'react-dom'
import './index.css'

const Assets = window.Assets = {
  GFX_PLAYER: null,
  GFX_TILES: null,
  OEL_WORLD: null,
  OEL_TOWN: null,
  OEL_DUNGEON: null,

  load (manifest) {
    return new Promise((resolve, reject) => {
      let loaded = 0
      const assetIds = Object.keys(manifest)
      const toLoad = assetIds.length
      const loadImage = (path, name) => {
        const image = new window.Image()
        image.onload = () => {
          window.console.log(`Assets.load() :: WORKING - Loaded '${name}' from ${path}`)
          Assets[name] = image
          loaded += 1

          if (loaded >= toLoad) {
            window.console.log(`Assets.load() :: COMPLETE - ${loaded}/${toLoad} assets loaded.`)
            resolve()
          }
        }

        image.onerror = () => {
          reject(new Error(`Unable to load '${name}' from ${path}`))
        }

        image.src = path
      }

      assetIds.forEach(name => {
        const path = manifest[name]

        if (path.match(/png$/)) {
          loadImage(path, name)
        }
      })
    })
  }
}

class App extends Component {
  constructor (props) {
    super(props)

    this.loadAssets = this.loadAssets.bind(this)
    this.focusCanvas = this.focusCanvas.bind(this)
    this.start = this.start.bind(this)

    this.onKeyDown = this.onKeyDown.bind(this)
    this.onKeyPress = this.onKeyPress.bind(this)
    this.animate = this.animate.bind(this)

    this.state = {
      screenWidth: 640,
      screenHeight: 480,
      screenColor: 'cornflowerblue',
      map: {
        name: '?',
        tiles: []
      }
    }
  }

  componentDidMount () {
    this.loadAssets()
      .catch(err => {
        window.console.error(err)
      })
      .then(this.focusCanvas)
      .then(this.start)
  }

  loadAssets () {
    const manifest = {
      GFX_TILES: 'tiles.png'
    }

    return Assets.load(manifest)
  }

  focusCanvas () {
    this.controllerDiv.focus()

    return Promise.resolve()
  }

  start () {
    this.canvas && this.animate()

    return Promise.resolve()
  }

  animate () {
    window.requestAnimationFrame(this.animate)
    this.ctx.fillStyle = this.state.screenColor
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  onKeyDown (event) {

  }

  onKeyPress (event) {

  }

  render () {
    return (
      <div className='app__main-container'>
        <div
          ref={(div) => { this.controllerDiv = div }}
          tabIndex={0}
          onKeyDown={this.onKeyDown}
          onKeyPress={this.onKeyPress}
          className='app__controller'>
          <canvas
            ref={(canvas) => {
              this.canvas = canvas
              canvas && (this.ctx = canvas.getContext('2d'))
            }}
            className='app__canvas'
            width={this.state.screenWidth}
            height={this.state.screenHeight}
          />
        </div>
      </div>
    )
  }
}

ReactDOM.render(<App />, document.getElementById('root'))
