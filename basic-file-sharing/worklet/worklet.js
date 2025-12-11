import Corestore from 'corestore'
import fs from 'fs'
import idEnc from 'hypercore-id-encoding'
import Hyperswarm from 'hyperswarm'
import NewlineDecoder from 'newline-decoder'
import path from 'path'
import ReadyResource from 'ready-resource'

import DriveRoom from './drive-room'

export default class Worklet extends ReadyResource {
  constructor (pipe, storage, name) {
    super()

    this.pipe = pipe
    this.storage = storage
    this.name = name || `User ${Date.now()}`

    this.store = new Corestore(storage)
    this.swarm = new Hyperswarm()
    this.swarm.on('connection', (conn) => this.store.replicate(conn))

    this.myDrivePath = path.join(this.storage, 'my-drive')
    this.sharedDrivesPath = path.join(this.storage, 'shared-drives')
    this.room = new DriveRoom(
      this.myDrivePath,
      this.sharedDrivesPath,
      this.store,
      this.swarm,
      this.invite,
      { name: this.name }
    )

    this.intervalFiles = null
  }

  async _open () {
    await this.store.ready()

    await fs.promises.mkdir(this.myDrivePath, { recursive: true })
    await fs.promises.mkdir(this.sharedDrivesPath, { recursive: true })
    this._write('log', `My drive: ${this.myDrivePath}`)
    this._write('log', `Shared drives: ${this.sharedDrivesPath}`)

    const lineDecoder = new NewlineDecoder()
    this.pipe.on('data', async (data) => {
      const str = data.toString()
      for (const line of lineDecoder.push(str)) {
        try {
          const obj = JSON.parse(line)
          if (obj.tag === 'reset') {
            this.emit('reset')
          } else if (obj.tag === 'start') {
            this.room.invite = obj.data
            await this._start()
          } else if (obj.tag === 'add-file') {
            await fs.promises.copyFile(obj.data.uri, path.join(this.myDrivePath, obj.data.name))
          }
        } catch (err) {
          this._write('error', `${line} ~ ${err}`)
        }
      }
    })

    await this.room.localBase.ready()
    if (this.room.localBase.length === 0) {
      this._write('invite', '')
    } else {
      await this._start()
    }
  }

  async _close () {
    clearInterval(this.intervalFiles)
    await this.room.close()
    await this.swarm.destroy()
    await this.store.close()
  }

  async _start () {
    await this.room.ready()
    this._write('invite', await this.room.getInvite())

    this.intervalFiles = setInterval(async () => {
      const myDriveFiles = {
        name: 'My drive',
        dir: `file://${this.myDrivePath}`,
        files: (await fs.promises.readdir(this.myDrivePath)).map((name) => ({
          name,
          url: `file://${path.join(this.myDrivePath, name)}`
        }))
      }

      const drives = await this.room.getDrives()
      const driveFiles = await Promise.all(drives.map(async (drive) => {
        const key = idEnc.normalize(drive.key)
        const dir = path.join(this.sharedDrivesPath, key)
        const files = await fs.promises.readdir(dir, { recursive: true }).catch((err) => {
          if (err.code === 'ENOENT') return []
          throw err
        })
        return {
          name: `Shared drive: ${key}`,
          dir: `file://${dir}`,
          files: files.map((name) => ({ name, url: `file://${path.join(dir, name)}` }))
        }
      }))
      this._write('files', [myDriveFiles, ...driveFiles])
    }, 2000)
  }

  _write (tag, data) {
    this.pipe.write(Buffer.from(JSON.stringify({ tag, data }) + '\n'))
  }
}
