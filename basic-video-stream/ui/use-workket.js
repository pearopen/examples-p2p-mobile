import b4a from 'b4a'
import { Paths } from 'expo-file-system'
import NewlineDecoder from 'newline-decoder'
import { useState, useEffect } from 'react'
import { Worklet } from 'react-native-bare-kit'

import bundle from '../worklet/app.bundle.mjs'

const documentDir = Paths.document.uri.substring('file://'.length)
const storage = Paths.join(documentDir, 'basic-video-stream')

const worklet = new Worklet()
worklet.start('/app.bundle', bundle, [storage])
const { IPC: pipe } = worklet

export default function useWorklet () {
  const [invite, setInvite] = useState()
  const [messages, setMessages] = useState([])
  const [videos, setVideos] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const lineDecoder = new NewlineDecoder()
    pipe.on('data', (data) => {
      const str = b4a.toString(data)
      for (const line of lineDecoder.push(str)) {
        try {
          const obj = JSON.parse(line)
          if (obj.tag === 'invite') {
            setInvite(obj.data)
          } else if (obj.tag === 'messages') {
            setMessages(obj.data)
          } else if (obj.tag === 'videos') {
            setVideos(obj.data)
          } else if (obj.tag === 'error') {
            console.log(obj.data)
            setError(obj.data)
          } else if (obj.tag === 'log') {
            console.log(obj.data)
          }
        } catch (err) {
          write('error', `${line} ~ ${err}`)
        }
      }
    })
    return () => pipe.end()
  }, [])

  return {
    invite,
    videos,
    messages,
    error,
    start: (invite) => write('start', invite),
    addMessage: (message) => write('add-message', message),
    addVideo: (filePath) => write('add-video', filePath),
    reset: () => {
      write('reset')
      setMessages([])
    },
    clearError: () => setError('')
  }
}

function write (tag, data) {
  pipe.write(b4a.from(JSON.stringify({ tag, data }) + '\n'))
}
