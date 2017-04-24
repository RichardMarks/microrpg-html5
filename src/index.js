import React, {Component} from 'react'
import ReactDOM from 'react-dom'
import 'whatwg-fetch'

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
          reject(new Error(`Assets.load() :: FAILURE - Unable to load '${name}' from ${path}`))
        }

        image.src = path
      }

      const loadJson = (path, name) => {
        window.fetch(path)
          .then(response => {
            if (response.status !== 200) {
              return reject(`Assets.load() :: FAILURE - HTTP ${response.status}\nUnable to load '${name}' from ${path}`)
            }
            return response.json()
          })
          .then(json => {
            window.console.log(`Assets.load() :: WORKING - Loaded '${name}' from ${path}`)
            Assets[name] = json
            loaded += 1

            if (loaded >= toLoad) {
              window.console.log(`Assets.load() :: COMPLETE - ${loaded}/${toLoad} assets loaded.`)
              resolve()
            }
          })
      }

      assetIds.forEach(name => {
        const path = manifest[name]

        if (path.match(/png$/)) {
          loadImage(path, name)
        } else if (path.match(/json$/)) {
          loadJson(path, name)
        }
      })
    })
  }
}

const KEY = {
  LEFT: 37,
  RIGHT: 39,
  UP: 38,
  DOWN: 40,
  ENTER: 13,
  SPACE: 32
}

class App extends Component {
  constructor (props) {
    super(props)

    this.loadAssets = this.loadAssets.bind(this)
    this.focusCanvas = this.focusCanvas.bind(this)
    this.start = this.start.bind(this)
    this.loadLocation = this.loadLocation.bind(this)
    this.animate = this.animate.bind(this)
    this.drawLocation = this.drawLocation.bind(this)
    this.drawPlayer = this.drawPlayer.bind(this)
    this.moveEntity = this.moveEntity.bind(this)
    this.checkWarp = this.checkWarp.bind(this)
    this.onKeyDown = this.onKeyDown.bind(this)

    this.populateLocationWithItems = this.populateLocationWithItems.bind(this)
    this.checkItem = this.checkItem.bind(this)
    this.addItemToInventory = this.addItemToInventory.bind(this)
    this.fadeIn = this.fadeIn.bind(this)
    this.fadeOut = this.fadeOut.bind(this)
    this.teleportFlash = this.teleportFlash.bind(this)
    this.drawMessageBox = this.drawMessageBox.bind(this)

    this.state = {
      screenWidth: 320,
      screenHeight: 240,
      screenColor: 'cornflowerblue',
      tileWidth: 8,
      tileHeight: 8,
      location: 'world',
      locations: {
        town: 'OEL_TOWN',
        world: 'OEL_WORLD',
        dungeon: 'OEL_DUNGEON'
      },
      floorTiles: [0, 2, 4, 5, 7, 19],
      player: {
        x: 0,
        y: 0,
        started: false
      },
      inventory: [],
      map: {
        name: '?',
        tiles: [],
        warps: [],
        items: [],
        mask: []
      }
    }
  }

  componentDidMount () {
    const waitForFontsToLoad = () => {
      // no real way to handle this appropriately
      // so we fake the wait with a 1s delay
      return new Promise(resolve => {
        setTimeout(resolve, 1000)
      })
    }

    this.loadAssets()
      .catch(err => {
        window.console.error(err)
      })
      .then(this.loadLocation)
      .then(this.populateLocationWithItems)
      .then(this.focusCanvas)
      .then(waitForFontsToLoad)
      .then(this.start)
      .then(this.fadeIn)
      .then(this.animate)
  }

  loadAssets () {
    const manifest = {
      GFX_PLAYER: 'player.png',
      GFX_TILES: 'tiles.png',
      OEL_TOWN: 'data/town.json',
      OEL_WORLD: 'data/world.json',
      OEL_DUNGEON: 'data/dungeon.json'
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

  loadLocation () {
    return new Promise(resolve => {
      const {
        location,
        locations,
        floorTiles,
        map,
        player
      } = this.state

      const assetId = locations[location]

      const source = Assets[assetId]

      const {
        width: mapScreenWidth,
        height: mapScreenHeight,
        tiles,
        objects
      } = source

      const {
        tile: tileData = [],
        tileWidth,
        tileHeight,
        set: tileset = ''
      } = tiles

      const {
        warp: warpData = [],
        start
      } = objects

      const mapWidth = ~~(mapScreenWidth / tileWidth)
      const mapHeight = ~~(mapScreenHeight / tileHeight)

      map.id = `OEL_${location.toUpperCase()}`
      map.name = location
      map.tileset = `GFX_${tileset.toUpperCase()}`
      map.width = mapWidth
      map.height = mapHeight
      map.tiles.length = 0

      tileData.forEach(({ x, y, id }) => {
        const column = ~~(x / tileWidth)
        const row = ~~(y / tileHeight)
        const index = column + row * mapWidth
        map.tiles[index] = id
      })

      map.mask = map.tiles.map(id => floorTiles.indexOf(id) === -1)

      map.warps = warpData.map(({ x, y, to_x: destX, to_y: destY, to_map: destLocation }) => {
        const warpPoint = {
          x,
          y,
          destX,
          destY,
          destLocation
        }

        return warpPoint
      })

      if (start) {
        if (!player.started) {
          player.x = start.x
          player.y = start.y
          player.started = true
        }
      }

      this.setState(
        {
          tileWidth,
          tileHeight,
          map,
          player
        },
        resolve
      )
    })
  }

  animate () {
    this.drawLocation()
    this.drawPlayer()
    // this.drawMessageBox()

    return Promise.resolve()
  }

  drawLocation () {
    const {
      map,
      tileWidth,
      tileHeight
    } = this.state

    const {
      tileset,
      tiles,
      items,
      width,
      height,
      name
    } = map

    const tileImage = Assets[tileset]
    const tilesAcross = ~~(tileImage.width / tileWidth)
    const tilesDown = ~~(tileImage.height / tileHeight)
    const tileCount = tilesAcross * tilesDown

    const drawTile = (x, y, tileId) => {
      const index = tileId % tileCount
      const srcX = ~~(index % tilesAcross)
      const srcY = ~~(tileId / tilesAcross)
      this.ctx.drawImage(tileImage, srcX * tileWidth, srcY * tileHeight, tileWidth, tileHeight, x, y, tileWidth, tileHeight)
    }

    for (let row = 0; row < height; row += 1) {
      for (let column = 0; column < width; column += 1) {
        const index = column + row * width
        const tileId = tiles[index]

        drawTile(column * tileWidth, row * tileHeight, tileId)
      }
    }

    const itemWidth = ~~(tileWidth * 0.5)
    const itemCx = ~~((tileWidth - itemWidth) * 0.5)
    const itemCy = ~~((tileHeight - itemWidth) * 0.5)
    items.forEach(item => {
      this.ctx.fillStyle = 'yellow'
      this.ctx.fillRect(item.x + itemCx, item.y + itemCy, itemWidth, itemWidth)
    })

    // this.ctx.save()
    // this.ctx.fillStyle = 'white'
    // this.ctx.textBaseline = 'bottom'
    // this.ctx.textAlign = 'center'
    // this.ctx.font = 'bold 16px monospace'
    // this.ctx.fillText(name, this.state.screenWidth / 2, this.state.screenHeight)
    // this.ctx.restore()
  }

  drawPlayer () {
    const { player } = this.state

    const playerImage = Assets.GFX_PLAYER

    const {
      width,
      height
    } = playerImage

    this.ctx.save()
    this.ctx.translate(player.x, player.y)
    this.ctx.drawImage(playerImage, 0, 0, width, height, 0, 0, width, height)
    this.ctx.restore()
  }

  moveEntity (entity, { x: xMove = 0, y: yMove = 0, noClip = false }) {
    const { x, y } = entity

    const {
      tileWidth,
      tileHeight,
      map
    } = this.state

    const step = tileWidth

    if (noClip) {
      entity.x += (xMove * step)
      entity.y += (yMove * step)
    } else {
      const nextX = ~~((x + (xMove * step)) / tileWidth)
      const nextY = ~~((y + (yMove * step)) / tileHeight)
      const isSolid = (lookX, lookY) => map.mask[lookX + (lookY * map.width)]

      if (!isSolid(nextX, nextY)) {
        entity.x = nextX * tileWidth
        entity.y = nextY * tileHeight
      }
    }

    return Promise.resolve(entity)
  }

  checkWarp () {
    const {
      player,
      map
    } = this.state

    let warpPoint = null

    const movePlayerToWarpDestination = () => {
      return new Promise(resolve => {
        player.x = warpPoint.destX
        player.y = warpPoint.destY

        this.setState(
          {
            player
          },
          resolve
        )
      })
    }

    const changeLocationToWarpDestination = () => {
      return new Promise(resolve => {
        this.setState(
          {
            location: warpPoint.destLocation
          },
          () => {
            this.loadLocation()
              .then(this.populateLocationWithItems)
              .then(this.animate)
              .then(resolve)
          }
        )
      })
    }

    return new Promise(resolve => {
      warpPoint = map.warps.filter(warp => {
        return warp.x === player.x && warp.y === player.y
      })[0]

      if (warpPoint) {
        if (map.name !== warpPoint.destLocation) {
          this.fadeOut()
            .then(movePlayerToWarpDestination)
            .then(changeLocationToWarpDestination)
            .then(this.fadeIn)
            .then(resolve)
        } else {
          this.teleportFlash()
            .then(movePlayerToWarpDestination)
            .then(resolve)
        }
      } else {
        resolve()
      }
    })
  }

  onKeyDown (event) {
    const redraw = this.animate
    const controls = {
      [KEY.UP] () {
        this.moveEntity(this.state.player, { y: -1 })
          .then(player => this.setState({ player }, () => this.checkWarp().then(redraw)))
      },
      [KEY.DOWN] () {
        this.moveEntity(this.state.player, { y: 1 })
          .then(player => this.setState({ player }, () => this.checkWarp().then(redraw)))
      },
      [KEY.LEFT] () {
        this.moveEntity(this.state.player, { x: -1 })
          .then(player => this.setState({ player }, () => this.checkWarp().then(redraw)))
      },
      [KEY.RIGHT] () {
        this.moveEntity(this.state.player, { x: 1 })
          .then(player => this.setState({ player }, () => this.checkWarp().then(redraw)))
      },
      [KEY.SPACE] () {
        this.checkItem()
          .then(foundItem => {
            if (foundItem) {
              window.console.warn('Found Item!', foundItem.name)
              this.addItemToInventory(foundItem)
                .then(redraw)
            }
          })
      },
      [KEY.ENTER] () {}
    }

    const control = controls[event.keyCode]

    control && control.bind(this)()
  }

  populateLocationWithItems () {
    return new Promise(resolve => {
      const {
        map,
        tileWidth,
        tileHeight
      } = this.state

      const {
        width,
        height,
        mask,
        warps
      } = map

      // build linear array of positions that are not solid
      // and are not warp tiles
      const openCells = []

      const isWarp = (column, row) => {
        const samePosition = warp => {
          return (warp.x === column * tileWidth) && (warp.y === row * tileHeight)
        }

        return warps.filter(samePosition).length > 0
      }

      for (let row = 0; row < height; row += 1) {
        for (let column = 0; column < width; column += 1) {
          const index = column + row * width

          if (!mask[index] && !isWarp(column, row)) {
            const cell = { row, column }

            openCells.push(cell)
          }
        }
      }

      const numItems = 3 + ~~(Math.random() * 12)

      const getRandomUnusedMapCell = () => {
        const index = ~~(Math.random() * openCells.length)

        const cell = openCells[index]

        openCells.splice(index, 1)

        return cell
      }

      const itemFactories = [
        () => {
          return {
            name: 'Potion',
            sell: 5,
            buy: 10,
            usable: ['field', 'battle'],
            targets: ['ally'],
            use (target) {
              target && (target.health += ~~(target.maxHealth * 0.25))
              target && (target.health = target.health > target.maxHealth ? target.maxHealth : target.health)
            }
          }
        },
        () => {
          return {
            name: 'Antidote',
            sell: 10,
            buy: 25,
            usable: ['field', 'battle'],
            targets: ['ally'],
            use (target) {
              target && target.poisoned && (target.poisoned = false)
            }
          }
        },
        () => {
          const stick = {
            name: 'Stick',
            attack: 5,
            critical: 10,
            sell: 1,
            buy: 0,
            usable: ['battle'],
            targets: ['foe'],
            use (target) {
              target && (target.health -= (stick.attack + ~~(Math.random() * stick.critical)))
            }
          }

          return stick
        }
      ]

      const randomItem = (props) => {
        const index = ~~(Math.random() * itemFactories.length)

        const item = itemFactories[index]()

        Object.assign(item, props)

        return item
      }

      map.items.length = 0

      for (let i = 0; i < numItems; i += 1) {
        const cell = getRandomUnusedMapCell()

        const item = randomItem(
          {
            id: i,
            x: cell.column * tileWidth,
            y: cell.row * tileHeight,
            removeFromMap: () => {
              return new Promise(resolve => {
                const { map } = this.state

                map.items.splice(item.id, 1)
                delete item.x
                delete item.y
                delete item.removeFromMap
                delete item.id

                map.items.forEach((itemOnMap, index) => {
                  itemOnMap.id = index
                })

                this.setState(
                  {
                    map
                  },
                  resolve
                )
              })
            }
          }
        )

        map.items[i] = item
      }

      this.setState(
        {
          map
        },
        resolve
      )
    })
  }

  checkItem () {
    return new Promise(resolve => {
      const {
        player,
        map
      } = this.state

      const foundItem = map.items.filter(item => {
        return item.x === player.x && item.y === player.y
      })[0]

      if (foundItem) {
        resolve(foundItem)
      } else {
        resolve(undefined)
      }
    })
  }

  addItemToInventory (item) {
    return new Promise(resolve => {
      const { inventory } = this.state

      inventory.push(item)

      this.setState(
        {
          inventory
        },
        () => item.removeFromMap().then(resolve)
      )
    })
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
            style={{
              width: this.state.screenWidth * 3,
              height: this.state.screenHeight * 3
            }}
          />
        </div>
        {
          this.state.fading && (
            <div className={this.state.fadeClass} />
          )
        }
      </div>
    )
  }

  fadeIn () {
    return new Promise(resolve => {
      this.setState(
        {
          fading: true,
          fadeClass: 'app__fader app__fader--fade-in'
        },
        () => {
          setTimeout(() => {
            this.setState(
              {
                fading: false
              },
              resolve
            )
          },
          1000)
        }
      )
    })
  }

  fadeOut () {
    return new Promise(resolve => {
      this.setState(
        {
          fading: true,
          fadeClass: 'app__fader app__fader--fade-out'
        },
        () => {
          setTimeout(() => {
            this.setState(
              {
                fading: false
              },
              resolve
            )
          },
          1000)
        }
      )
    })
  }

  teleportFlash () {
    return new Promise(resolve => {
      this.setState(
        {
          fading: true,
          fadeClass: 'app__fader app__fader--teleport-flash'
        },
        () => {
          setTimeout(() => {
            this.setState(
              {
                fading: false
              },
              resolve
            )
          },
          60)
        }
      )
    })
  }

  drawMessageBox () {
    const { ctx } = this
    const { screenWidth, screenHeight } = this.state

    const boxWidth = ~~(screenWidth * 0.9)
    const boxHeight = ~~(screenHeight * 0.3)

    const boxCx = ~~((screenWidth - boxWidth) * 0.5)

    ctx.save()

    const radius = {
      topLeft: 16,
      topRight: 16,
      bottomLeft: 16,
      bottomRight: 16
    }

    const backFill = ctx.createLinearGradient(0, 0, 0, boxHeight)
    backFill.addColorStop(0, 'blue')
    backFill.addColorStop(1, 'navy')


    ctx.font = '8px "Press Start 2P"'
    ctx.textBaseline = 'top'

    ctx.lineWidth = 2

    ctx.translate(boxCx, screenHeight - (boxHeight + boxCx))

    const roundRect = () => {
      ctx.beginPath()
      ctx.moveTo(radius.topLeft, 0)
      ctx.lineTo(boxWidth - radius.topRight, 0)
      ctx.quadraticCurveTo(boxWidth, 0, boxWidth, radius.topRight)
      ctx.lineTo(boxWidth, boxHeight - radius.bottomRight)
      ctx.quadraticCurveTo(boxWidth, boxHeight, boxWidth - radius.bottomRight, boxHeight)
      ctx.lineTo(radius.bottomLeft, boxHeight)
      ctx.quadraticCurveTo(0, boxHeight, 0, boxHeight - radius.bottomLeft)
      ctx.lineTo(0, radius.topLeft)
      ctx.quadraticCurveTo(0, 0, radius.topLeft, 0)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle && ctx.stroke()
    }

    const shadowX = 4
    const shadowY = 8

    ctx.translate(-shadowX, shadowY)
    ctx.fillStyle = 'rgba(40, 0, 40, 0.8)'
    ctx.strokeStyle = 'rgba(0, 0, 0, 0)'
    roundRect()
    ctx.translate(shadowX, -shadowY)
    ctx.strokeStyle = 'white'
    ctx.fillStyle = backFill
    roundRect()

    const writeText = (text) => {
      ctx.strokeText(text, 0, cursorY)
      ctx.fillText(text, 0, cursorY)
    }

    let cursorY = 0
    const fontSize = 8
    const lineHeight = 1.95
    const cursorMoveY = ~~(lineHeight * fontSize)
    ctx.translate(16, 16)
    ctx.fillStyle = 'white'
    ctx.strokeStyle = '#222'
    ctx.lineWidth = 4
    ctx.miterLimit = 1
    ctx.lineJoin = 'miter'
    writeText('Hello, Traveler. 0123456789')
    cursorY += cursorMoveY
    writeText('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef', 0, cursorY)
    cursorY += cursorMoveY
    writeText('This is a Moji test: 😎 🍕 💥', 0, cursorY)
    cursorY += cursorMoveY
    ctx.beginPath()

    const arrowX = boxWidth - (boxCx + 32)
    cursorY -= 4
    ctx.moveTo(arrowX, cursorY)
    ctx.lineTo(arrowX + 16, cursorY)
    ctx.lineTo(arrowX + 8, cursorY + 8)
    ctx.closePath()
    ctx.stroke()
    ctx.fill()

    ctx.restore()
  }
}

ReactDOM.render(<App />, document.getElementById('root'))
