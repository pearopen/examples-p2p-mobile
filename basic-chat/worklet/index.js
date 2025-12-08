/* eslint-disable no-undef */

import fs from 'fs'
import process from 'process'

import Worklet from './worklet'

const { IPC: pipe } = BareKit
const storage = Bare.argv[0]
const name = Bare.argv[1]

process.on('uncaughtException', (err) => {
  write('error', `${err?.stack || err}`)
  pipe.end()
})
process.on('unhandledRejection', (err) => {
  write('error', `${err?.stack || err}`)
  pipe.end()
})

let worklet = new Worklet(pipe, storage, name)
pipe.on('error', () => worklet.close())
pipe.on('close', () => worklet.close())
worklet.on('reset', async () => {
  await worklet.close()
  await fs.promises.rm(storage, { recursive: true, force: true })
  worklet = new Worklet(pipe, storage, name)
  await worklet.ready()
})

await worklet.ready()

function write (tag, data) {
  pipe.write(Buffer.from(JSON.stringify({ tag, data }) + '\n'))
}
