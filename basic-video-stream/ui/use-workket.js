import { Paths } from 'expo-file-system'
import FramedStream from 'framed-stream'
import { useState, useEffect } from 'react'
import { Worklet } from 'react-native-bare-kit'

import bundle from '../worklet/app.bundle.mjs'
import HRPC from '../spec/hrpc'

const documentDir = Paths.document.uri.substring('file://'.length)
const storage = Paths.join(documentDir, 'basic-video-stream')

const worklet = new Worklet()
worklet.start('/app.bundle', bundle, [storage])
const { IPC: pipe } = worklet

const stream = new FramedStream(pipe)
const rpc = new HRPC(stream)
stream.pause()

export default function useWorklet () {
  const [error, setError] = useState('')
  const [invite, setInvite] = useState()
  const [videos, setVideos] = useState([])
  const [messages, setMessages] = useState([])

  useEffect(() => {
    rpc.onLog((data) => {
      console[data.level || 'log'](new Date(data.at).toISOString(), data.message)
      if (data.level === 'error') {
        setError(data.message)
      }
    })
    rpc.onStart((data) => setInvite(data))
    rpc.onVideos((data) => setVideos(data))
    rpc.onMessages((data) => setMessages(data))
    stream.resume()
    return () => pipe.end()
  }, [])

  return {
    error,
    invite,
    videos,
    messages,
    clearError: () => setError(''),
    reset: () => {
      rpc.reset()
      setInvite('')
      setVideos([])
      setMessages([])
    },
    start: (invite) => rpc.start(invite),
    addVideo: (video) => rpc.addVideo(video),
    addMessage: (message) => rpc.addMessage(message)
  }
}
