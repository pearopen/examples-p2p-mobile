/* eslint-disable no-undef, react/jsx-handler-names */
import { useState } from 'react'
import { StyleSheet, Text, View, TextInput, Button, ScrollView, TouchableOpacity, TouchableWithoutFeedback, Keyboard, Linking } from 'react-native'
import { setStringAsync } from 'expo-clipboard'
import { getDocumentAsync } from 'expo-document-picker'
import { shareAsync } from 'expo-sharing'

import useWorklet from './use-workket'

export default function App () {
  const { error, invite, drives, clearError, reset, start, addFile } = useWorklet()

  const [mode, setMode] = useState('create')
  const [joinInvite, setJoinInvite] = useState('')

  const initializing = invite === undefined

  const onStart = () => {
    if (initializing) {
      alert('Still initializing, please try later')
      return
    }
    if (mode === 'join' && !joinInvite) {
      alert('Please provide invite to join room')
      return
    }
    start(mode === 'join' ? joinInvite : '')
  }

  const onReset = () => {
    reset()
  }

  const onAddFile = async () => {
    const result = await getDocumentAsync()
    for (const asset of result.assets) {
      addFile({ name: asset.name, uri: asset.uri.substring('file://'.length) })
    }
  }

  const onOpenFile = async (url) => {
    await shareAsync(url)
  }

  const renderSetupRoom = () => (
    <>
      {initializing && <Text style={styles.title}>Initializing...</Text>}
      <View style={styles.radioRow}>
        <TouchableOpacity style={styles.radioOption} onPress={() => setMode('create')}>
          <View style={[styles.radioCircle, mode === 'create' && styles.radioSelected]} />
          <Text>Create Room</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.radioOption} onPress={() => setMode('join')}>
          <View style={[styles.radioCircle, mode === 'join' && styles.radioSelected]} />
          <Text>Join Room</Text>
        </TouchableOpacity>
      </View>
      {mode === 'join' && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={joinInvite}
            onChangeText={val => setJoinInvite(val.trim())}
            placeholder='Invite...'
          />
        </View>
      )}
      <View style={styles.inviteActionRow}>
        <Button
          title={mode === 'create' ? 'Create Room' : 'Join Room'}
          onPress={onStart}
        />
        <TouchableOpacity style={styles.resetButton} onPress={() => onReset()}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </>
  )

  const renderDrives = () => (
    <>
      <Text>Invite: {invite}</Text>
      <View style={styles.inviteActionRow}>
        <TouchableOpacity style={styles.copyButton} onPress={() => setStringAsync(invite)}>
          <Text style={styles.copyText}>Copy Invite</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetButton} onPress={() => onReset()}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.title}>Drives</Text>
      <TouchableOpacity style={styles.addFileButton} onPress={onAddFile}>
        <Text style={styles.addFileText}>Add File</Text>
      </TouchableOpacity>
      <ScrollView style={styles.files}>
        {drives.map((drive, idx) => (
          <View key={idx} style={styles.driveRow}>
            <Text>{drive.info.name} {drive.info.isMyDrive && '(My drive)'}</Text>
            <View>
              {drive.info.files.map((file, idx) => (
                <View key={idx} style={styles.fileRow}>
                  <Text>- </Text>
                  <Text
                    style={styles.underlineText}
                    onPress={() => onOpenFile(file.uri)}
                  >
                    {file.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </>
  )

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        {error && (
          <>
            <Text style={styles.title}>{error}</Text>
            <TouchableOpacity style={styles.resetButton} onPress={() => clearError()}>
              <Text style={styles.resetText}>Clear</Text>
            </TouchableOpacity>
          </>
        )}
        {!invite ? renderSetupRoom() : renderDrives()}
      </View>
    </TouchableWithoutFeedback>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 100,
    paddingHorizontal: 16
  },
  radioRow: {
    flexDirection: 'row',
    marginBottom: 8
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#888',
    marginRight: 8,
    backgroundColor: '#fff'
  },
  radioSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 8
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginRight: 8
  },
  inviteActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16
  },
  copyButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#007AFF'
  },
  copyText: {
    color: '#fff'
  },
  resetButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'red',
    marginTop: 12,
    marginBottom: 12
  },
  resetText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12
  },
  addFileButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#34C759',
    marginLeft: 8
  },
  addFileText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  drives: {
    flex: 1,
    alignSelf: 'stretch',
    marginBottom: 16
  },
  driveRow: {
    borderBottomWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 8
  },
  underlineText: {
    textDecorationLine: 'underline',
    color: '#007AFF'
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center'
  }
})
