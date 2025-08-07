export const useSocket = () => {
  const { $socket } = useNuxtApp()
  const isConnected = ref(false)

  const connect = () => {
    $socket.connect()
  }

  const disconnect = () => {
    $socket.disconnect()
  }

  const emit = (event, data) => {
    $socket.emit(event, data)
  }

  const on = (event, callback) => {
    $socket.on(event, callback)
  }

  const off = (event, callback) => {
    $socket.off(event, callback)
  }

  // Set up connection status tracking
  onMounted(() => {
    $socket.on('connect', () => {
      isConnected.value = true
    })

    $socket.on('disconnect', () => {
      isConnected.value = false
    })
  })

  return {
    socket: $socket,
    isConnected: readonly(isConnected),
    connect,
    disconnect,
    emit,
    on,
    off
  }
}