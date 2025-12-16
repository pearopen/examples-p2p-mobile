import Corestore from 'corestore'
import FramedStream from 'framed-stream'
import fs from 'fs'
import idEnc from 'hypercore-id-encoding'
import Hyperswarm from 'hyperswarm'
import path from 'path'
import ReadyResource from 'ready-resource'

import DriveRoom from './drive-room'
import HRPC from '../spec/hrpc'

export default class Worklet extends ReadyResource {
  constructor (pipe, storage, name) {
    super()

    this.pipe = pipe
    this.stream = new FramedStream(pipe)
    this.rpc = new HRPC(this.stream)
    this.stream.pause()

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
      { name: this.name }
    )

    this.intervalFiles = null
  }

  async _open () {
    await this.store.ready()

    await fs.promises.mkdir(this.myDrivePath, { recursive: true })
    await fs.promises.mkdir(this.sharedDrivesPath, { recursive: true })
    this.rpc.log({ level: 'info', message: `My drive: ${this.myDrivePath}`, at: Date.now() })
    this.rpc.log({ level: 'info', message: `Shared drives: ${this.sharedDrivesPath}`, at: Date.now() })

    this.rpc.onReset(() => this.emit('reset'))
    this.rpc.onStart(async (data) => {
      this.room.invite = data
      await this._start()
    })
    this.rpc.onAddFile(async (data) => {
      await fs.promises.copyFile(data.uri, path.join(this.myDrivePath, data.name))
    })
    this.stream.resume()

    await this.room.localBase.ready()
    if (this.room.localBase.length === 0) {
      this.rpc.start('')
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
    this.rpc.start(await this.room.getInvite())

    this.intervalFiles = setInterval(async () => {
      const rawDrives = await this.room.getDrives()
      const drives = await Promise.all(rawDrives.map(async (drive) => {
        const key = idEnc.normalize(drive.key)
        const dir = path.join(this.sharedDrivesPath, key)
        await fs.promises.mkdir(dir, { recursive: true })
        const files = await fs.promises.readdir(dir, { recursive: true }).catch((err) => {
          if (err.code === 'ENOENT') return []
          throw err
        })
        const isMyDrive = key === idEnc.normalize(this.room.myDrive.key)
        return {
          ...drive,
          info: {
            ...drive.info,
            isMyDrive,
            uri: `file://${isMyDrive ? this.myDrivePath : dir}`,
            files: files.map((name) => ({ name, uri: `file://${path.join(dir, name)}` }))
          }
        }
      }))
      drives.sort((a, b) => {
        if (a.info.isMyDrive && !b.info.isMyDrive) return -1
        if (!a.info.isMyDrive && b.info.isMyDrive) return 1
        return a.info.name.localeCompare(b.info.name)
      })
      this.rpc.drives(drives)
    }, 1000)
  }

  _write (tag, data) {
    this.pipe.write(Buffer.from(JSON.stringify({ tag, data }) + '\n'))
  }
}
