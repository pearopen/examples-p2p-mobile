import Corestore from 'corestore'
import debounce from 'debounceify'
import FramedStream from 'framed-stream'
import Hyperswarm from 'hyperswarm'
import ReadyResource from 'ready-resource'

import ChatRoom from './chat-room'
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

    this.room = new ChatRoom(this.store, this.swarm)
    this.debounceMessages = debounce(() => this._messages())
    this.room.on('update', () => this.debounceMessages())
  }

  async _open () {
    await this.store.ready()

    this.rpc.onReset(() => this.emit('reset'))
    this.rpc.onStart(async (data) => {
      this.room.invite = data
      await this._start()
    })
    this.rpc.onAddMessage(async (data) => {
      await this.room.addMessage(data, { name: this.name, at: Date.now() })
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
    await this.room.close()
    await this.swarm.destroy()
    await this.store.close()
  }

  async _start () {
    await this.room.ready()
    this.rpc.start(await this.room.getInvite())
    await this.debounceMessages()
  }

  async _messages () {
    const messages = await this.room.getMessages()
    messages.sort((a, b) => a.info.at - b.info.at)
    this.rpc.messages(messages)
  }
}
