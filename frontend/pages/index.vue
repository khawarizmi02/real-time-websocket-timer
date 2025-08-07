<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useSocket } from '../composables/useSocket'

// Type definitions
interface TimerState {
	roomId: string;
	time: number;
	isRunning: boolean;
}

const rooms = ref<string[]>([]);
const timers = ref<{ [key: string]: number }>({});
const isRunning = ref<{ [key: string]: boolean }>({});

const canvases = ref<{ [key: string]: HTMLCanvasElement }>({});

const DEFAULT_DURATION = 5 * 60 * 1000;

const { isConnected, connect, disconnect, emit, on } = useSocket()

// Load initial timer state from server on mount
onMounted(() => {
	connect();
	emit('room:list');

	// Handle room list
	on('room:list', (data: string[]) => {
		rooms.value = data || [];
		console.log('Rooms received:', data);
		// Join each room and request timer state
		data.forEach((roomId: string) => {
			emit('room:read', roomId);
		});
	});

	// Handle timer state updates
	on('room:state', ({ roomId, time, isRunning: running }: TimerState) => {
		timers.value[roomId] = Math.floor(time / 1000) * 1000; // Convert to seconds
		isRunning.value[roomId] = running;
		console.log(`Timer state for ${roomId}: ${time}ms, running: ${running}`);
	});

	// Handle real-time timer updates
	on('room:update', ({ roomId, time }: { roomId: string; time: number }) => {
		timers.value[roomId] = Math.floor(time / 1000) * 1000;
		console.log(`Timer update for ${roomId}: ${time}ms`);
	});

	// Handle timer finished
	on('room:finished', ({ roomId }: { roomId: string }) => {
		playAlarm();
		console.log(`Timer finished for ${roomId}`);
	});

	// Handle timer paused
	on('room:paused', ({ roomId, time }: { roomId: string; time: number }) => {
		timers.value[roomId] = Math.floor(time / 1000) * 1000;
		isRunning.value[roomId] = false;
		console.log(`Timer paused for ${roomId}: ${time}ms`);
	});

	// Handle errors
	on('error', ({ message }: { message: string }) => {
		console.error('Server error:', message);
	});

	on('connect', () => {
		console.log('Connected to server');
	});

	on('disconnect', () => {
		console.log('Disconnected from server');
	});
});

onUnmounted(() => {
	disconnect();
});

// Timer actions
const startTimer = (roomId: string) => {
	emit('room:start', roomId);
};

const pauseTimer = (roomId: string) => {
	emit('room:pause', roomId);
};

// const stopTimer = (roomId: string) => {
// 	emit('room:stop', roomId);
// };

const resetTimer = (roomId: string) => {
	emit('room:reset', roomId);
};

// Format time (mm:ss)
interface FormatTimeFn {
	(seconds: number): string;
}

const formatTime: FormatTimeFn = (seconds) => {
	const mins: number = Math.floor(seconds / 60);
	const secs: number = seconds % 60;
	return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Play alarm (simple alert for now, can replace with audio)
const playAlarm = () => {
	alert('Timer reached 00:00! Alarm!')
	// To use audio: <audio ref="alarm" src="/alarm.mp3" /> and play with alarm.value.play()
}

// Format room ID for display (e.g., "room1" -> "Room 1")
const formatRoomName = (roomId: string) => {
	return `Room ${roomId.replace('room', '')}`;
};

// Draw clock circle for a given room
const drawClockCircle = (roomId: string) => {
	const canvas = canvases.value[roomId];
	if (!canvas) return;

	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	const time = timers.value[roomId] || DEFAULT_DURATION;
	const progress = time / DEFAULT_DURATION; // Progress from 0 to 1
	const radius = canvas.width / 2 - 10;
	const centerX = canvas.width / 2;
	const centerY = canvas.height / 2;

	// Clear canvas
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// Draw background circle
	ctx.beginPath();
	ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
	ctx.lineWidth = 8;
	ctx.strokeStyle = '#e5e7eb'; // Light gray background
	ctx.stroke();

	// Draw progress arc
	ctx.beginPath();
	ctx.arc(centerX, centerY, radius, -Math.PI / 2, (2 * Math.PI * progress) - Math.PI / 2);
	ctx.strokeStyle = '#3b82f6'; // Blue progress arc
	ctx.stroke();
};

// Watch for timer updates and redraw canvas
watch(timers, () => {
	rooms.value.forEach((roomId) => {
		drawClockCircle(roomId);
	});
}, { deep: true });

// Redraw when rooms are added
watch(rooms, () => {
	rooms.value.forEach((roomId) => {
		setTimeout(() => drawClockCircle(roomId), 0); // Ensure canvas is rendered
	});
});
</script>

<template>
	<div class="flex flex-col gap-4 p-4 items-center">
		<h1 class="text-xl font-bold text-center mb-3">Count Down Rooms</h1>
		<!-- <p>Connection Status: {{ isConnected ? 'Connected' : 'Disconnected' }}</p>
		<UButton @click="connect" v-if="!isConnected">Connect</UButton>
		<UButton @click="disconnect" v-if="isConnected">Disconnect</UButton> -->
		<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-center">
			<UCard v-for="room in rooms" :key="room" class="flex flex-col justify-center items-center">
				<template #header>
					<div class="text-lg font-semibold">{{ formatRoomName(room) }}</div>
				</template>
				<template #default>
					<div class="container justify-center items-center flex flex-col">
						<canvas :ref="(el) => canvases[room] = el" width="130" height="130" class="absolute my-2 p-y2"></canvas>
						<div class="text-center py-2 my-4">
							<div class="text-2xl font-mono">{{ timers[room] ? formatTime(timers[room] / 1000) : '00:00' }}</div>
							<div class="text-sm">{{ isRunning[room] ? 'Running' : 'Stopped' }}</div>
						</div>
					</div>
				</template>
				<template #footer>
					<div class="gap-2 flex justify-center items-center mt-2">
						<UButton icon="i-material-symbols-play-circle-outline" color="primary" @click="startTimer(room)"
							:disabled="isRunning[room] || timers[room] == 0">Start</UButton>
						<UButton icon="i-material-symbols-pause-circle-outline-rounded" color="warning" @click="pauseTimer(room)"
							:disabled="!isRunning[room]">Pause</UButton>
						<UButton icon="i-material-symbols-restart-alt-rounded" color="neutral" @click="resetTimer(room)">Reset
						</UButton>

					</div>
				</template>
			</UCard>
		</div>
	</div>
</template>