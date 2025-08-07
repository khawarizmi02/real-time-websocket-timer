import { io } from 'socket.io-client'

export default defineNuxtPlugin(() => {
  const socket = io('http://localhost:3000', {
    autoConnect: false, // Don't auto-connect, we'll do it manually
    transports: ['websocket', 'polling']
  })

  // Provide socket globally
  return {
    provide: {
      socket
    }
  }
})