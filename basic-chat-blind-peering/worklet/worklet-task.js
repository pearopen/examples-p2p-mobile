import BlindPeering from 'blind-peering'
import Corestore from 'corestore'
import debounce from 'debounceify'
import Hyperswarm from 'hyperswarm'
import ReadyResource from 'ready-resource'

import ChatRoom from './chat-room'

export default class WorkletTask extends ReadyResource {
  constructor (rpc, storage, opts = {}) {
    super()

    /** @type {InstanceType<typeof import('../spec/hrpc').default>} */
    this.rpc = rpc
    this.storage = storage
    this.blindPeerKeys = opts.blindPeerKeys || []
    this.name = opts.name || `User ${Date.now()}`

    this.store = new Corestore(storage)
    this.swarm = new Hyperswarm()
    this.swarm.on('connection', (conn) => this.store.replicate(conn))

    this.room = new ChatRoom(this.store, this.swarm)
    this.debounceMessages = debounce(() => this._messages())
    this.room.on('update', () => this.debounceMessages())

    this.blindPeering = null
  }

  async _open () {
    await this.store.ready()

    this.rpc.onAddMessage(async (data) => {
      await this.room.addMessage(data, { name: this.name, at: Date.now() })
    })
    this.rpc.onAddBlindPeer(async (blindPeerKey) => {
      if (this.blindPeering) {
        this.rpc.log({ level: 'warn', message: 'Ignored, already added', at: Date.now() })
        return
      }
      this.blindPeering = new BlindPeering(this.swarm, this.store.namespace('blind-peering'), {
        mirrors: [blindPeerKey]
      })
      await this.blindPeering.addAutobase(this.room.base)
      this.rpc.log({ level: 'info', message: `Added blind peer: ${blindPeerKey}`, at: Date.now() })
    })

    await this.room.localBase.ready()
    if (this.room.localBase.length === 0) {
      this.rpc.start('')
    } else {
      await this.start()
    }
  }

  async _close () {
    await this.blindPeering?.close()
    await this.room.close()
    await this.swarm.destroy()
    await this.store.close()
  }

  async _messages () {
    const messages = await this.room.getMessages()
    messages.sort((a, b) => a.info.at - b.info.at)
    this.rpc.messages(messages)
  }

  async start () {
    await this.room.ready()
    this.rpc.start(await this.room.getInvite())
    await this.debounceMessages()
  }
}
