/* eslint-disable no-undef */

import FramedStream from 'framed-stream'
import fs from 'fs'
import goodbye from 'graceful-goodbye'

import HRPC from '../spec/hrpc'
import WorkletTask from './worklet-task'

const { IPC: pipe } = BareKit
const storage = Bare.argv[0]
const name = Bare.argv[1]

const stream = new FramedStream(pipe)
const rpc = new HRPC(stream)
stream.pause()

let workletTask = new WorkletTask(rpc, storage, { name })
goodbye(() => workletTask.close())
rpc.onReset(async () => {
  stream.pause()
  await workletTask.close()
  await fs.promises.rm(storage, { recursive: true, force: true })
  workletTask = new WorkletTask(rpc, storage, { name })
  await workletTask.ready()
  stream.resume()
})
rpc.onStart(async (data) => {
  workletTask.room.invite = data
  await workletTask.start()
})
await workletTask.ready()
stream.resume()
