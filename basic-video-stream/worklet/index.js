/* eslint-disable no-undef */

import fs from 'fs'

import Worklet from './worklet'

const { IPC: pipe } = BareKit
const storage = Bare.argv[0]
const name = Bare.argv[1]

const worklet = new Worklet(pipe, storage, name)
worklet.on('reset', async () => {
  await worklet.close()
  await fs.promises.rm(storage, { recursive: true, force: true })
})
await worklet.ready()
