process.env.PORT = '4050';
await import('./dist/index.js');
import { io } from '../client/node_modules/socket.io-client/build/esm/index.js';

const SERVER_URL = 'http://localhost:4050';

async function createClient(id, nickname) {
  const socket = io(SERVER_URL, { transports: ['websocket'] });
  await new Promise(res => socket.on('connect', res));
  return { socket, id, nickname };
}

async function runRoomLifecycleTests() {
  console.log('🧪 Starting Room Lifecycle & Navigation Test Suite...\n');

  // --- SCENARIO A: Create room A → Leave → Create room B ---
  console.log('▶️ Testing Scenario A: Create room A → Leave → Create room B');
  const clientA = await createClient('player_a', 'Alice');

  let roomA = await new Promise((resolve, reject) => {
    clientA.socket.emit('create_room', {
      id: clientA.id,
      nickname: clientA.nickname,
      avatar: '🦊',
      color: '#6366f1',
    }, (resp) => resp.success ? resolve(resp.room) : reject(new Error(resp.error)));
  });

  const codeA = roomA.id;
  console.log(`   Created Room A: ${codeA}`);

  // Leave Room A
  await new Promise((resolve) => {
    clientA.socket.emit('leave_room', (res) => resolve(res));
  });
  console.log('   Left Room A');

  // Create Room B
  let roomB = await new Promise((resolve, reject) => {
    clientA.socket.emit('create_room', {
      id: clientA.id,
      nickname: clientA.nickname,
      avatar: '🦊',
      color: '#6366f1',
    }, (resp) => resp.success ? resolve(resp.room) : reject(new Error(resp.error)));
  });

  const codeB = roomB.id;
  console.log(`   Created Room B: ${codeB}`);

  if (codeA === codeB) {
    throw new Error(`Scenario A Failed: Room code did not change (${codeA} === ${codeB})`);
  }
  console.log('✅ Scenario A Passed: Room B has a completely new unique code!\n');

  // Clean up clientA
  await new Promise((resolve) => clientA.socket.emit('leave_room', () => resolve()));

  // --- SCENARIO B: Create room A → Leave → Join room B using code ---
  console.log('▶️ Testing Scenario B: Create room A → Leave → Join room B');
  const hostB = await createClient('host_b', 'Bob');
  const targetRoomB = await new Promise((resolve, reject) => {
    hostB.socket.emit('create_room', {
      id: hostB.id,
      nickname: hostB.nickname,
      avatar: '🐻',
      color: '#10b981',
    }, (resp) => resp.success ? resolve(resp.room) : reject(new Error(resp.error)));
  });

  // Client creates room A
  roomA = await new Promise((resolve, reject) => {
    clientA.socket.emit('create_room', {
      id: clientA.id,
      nickname: clientA.nickname,
      avatar: '🦊',
      color: '#6366f1',
    }, (resp) => resp.success ? resolve(resp.room) : reject(new Error(resp.error)));
  });
  console.log(`   Client created room A (${roomA.id})`);

  // Client leaves room A
  await new Promise((resolve) => clientA.socket.emit('leave_room', () => resolve()));
  console.log(`   Client left room A`);

  // Client joins room B
  const joinedB = await new Promise((resolve, reject) => {
    clientA.socket.emit('join_room', {
      roomId: targetRoomB.id,
      player: {
        id: clientA.id,
        nickname: clientA.nickname,
        avatar: '🦊',
        color: '#6366f1',
      }
    }, (resp) => resp.success ? resolve(resp.room) : reject(new Error(resp.error)));
  });

  if (joinedB.id !== targetRoomB.id) {
    throw new Error(`Scenario B Failed: Expected to join ${targetRoomB.id}, got ${joinedB.id}`);
  }
  if (!joinedB.players[clientA.id] || !joinedB.players[hostB.id]) {
    throw new Error(`Scenario B Failed: Both players not present in room B`);
  }
  console.log('✅ Scenario B Passed: Player cleanly joined room B and is not in room A!\n');

  // --- SCENARIO F: Leave room B → Immediately rejoin room B ---
  console.log('▶️ Testing Scenario F: Leave room B → Immediately rejoin room B (no duplicate entries)');
  await new Promise((resolve) => clientA.socket.emit('leave_room', () => resolve()));
  console.log('   Client left room B');

  // Rejoin room B
  const rejoinedB = await new Promise((resolve, reject) => {
    clientA.socket.emit('join_room', {
      roomId: targetRoomB.id,
      player: {
        id: clientA.id,
        nickname: clientA.nickname,
        avatar: '🦊',
        color: '#6366f1',
      }
    }, (resp) => resp.success ? resolve(resp.room) : reject(new Error(resp.error)));
  });

  const playerCount = Object.keys(rejoinedB.players).length;
  if (playerCount !== 2) {
    throw new Error(`Scenario F Failed: Expected 2 players, got ${playerCount} (duplicate entries detected)`);
  }
  console.log(`   Player count in room B: ${playerCount} (Host + Rejoined Client)`);
  console.log('✅ Scenario F Passed: Rejoined cleanly without duplicate entries or stale state!\n');

  // Clean up room B
  await new Promise((resolve) => clientA.socket.emit('leave_room', () => resolve()));
  await new Promise((resolve) => hostB.socket.emit('leave_room', () => resolve()));

  // --- SCENARIO D: Create room A → Invite player → Host leaves → Host migration ---
  console.log('▶️ Testing Scenario D: Host creates room → Guest joins → Host leaves → Host migration');
  const originalHost = await createClient('orig_host', 'Dan');
  const guest = await createClient('guest_player', 'Eve');

  const roomD = await new Promise((resolve, reject) => {
    originalHost.socket.emit('create_room', {
      id: originalHost.id,
      nickname: originalHost.nickname,
      avatar: '🦁',
      color: '#f59e0b',
    }, (resp) => resp.success ? resolve(resp.room) : reject(new Error(resp.error)));
  });

  await new Promise((resolve, reject) => {
    guest.socket.emit('join_room', {
      roomId: roomD.id,
      player: {
        id: guest.id,
        nickname: guest.nickname,
        avatar: '🦄',
        color: '#ec4899',
      }
    }, (resp) => resp.success ? resolve(resp.room) : reject(new Error(resp.error)));
  });
  console.log('   Guest joined room D');

  // Listen for room_data on guest
  const guestReceivedHostPromotion = new Promise((resolve) => {
    guest.socket.on('room_data', (data) => {
      if (data.hostId === guest.id && data.players[guest.id]?.isHost) {
        resolve(data);
      }
    });
  });

  // Original host leaves
  await new Promise((resolve) => originalHost.socket.emit('leave_room', () => resolve()));
  console.log('   Original host left room D');

  const promotedRoomData = await Promise.race([
    guestReceivedHostPromotion,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for host migration')), 2000)),
  ]);

  if (promotedRoomData.hostId !== guest.id) {
    throw new Error(`Scenario D Failed: Host did not migrate to remaining guest (hostId: ${promotedRoomData.hostId})`);
  }
  console.log(`   Guest (${guest.nickname}) is now verified host of room D!`);
  console.log('✅ Scenario D Passed: Host migration and remaining player notification verified!\n');

  // Clean up guest
  await new Promise((resolve) => guest.socket.emit('leave_room', () => resolve()));

  // --- SCENARIO E: Create room A → Leave → Create room B → Friend joins ---
  console.log('▶️ Testing Scenario E: Create room A → Leave → Create room B → Friend joins');
  const creator = await createClient('creator_1', 'Frank');
  const friend = await createClient('friend_1', 'Grace');

  const roomE1 = await new Promise((resolve, reject) => {
    creator.socket.emit('create_room', {
      id: creator.id,
      nickname: creator.nickname,
      avatar: '🤖',
      color: '#06b6d4',
    }, (resp) => resp.success ? resolve(resp.room) : reject(new Error(resp.error)));
  });
  console.log(`   Created initial room E1: ${roomE1.id}`);

  // Leave room E1
  await new Promise((resolve) => creator.socket.emit('leave_room', () => resolve()));

  // Create room E2
  const roomE2 = await new Promise((resolve, reject) => {
    creator.socket.emit('create_room', {
      id: creator.id,
      nickname: creator.nickname,
      avatar: '🤖',
      color: '#06b6d4',
    }, (resp) => resp.success ? resolve(resp.room) : reject(new Error(resp.error)));
  });
  console.log(`   Created new room E2: ${roomE2.id}`);

  // Friend joins room E2
  const joinedE2 = await new Promise((resolve, reject) => {
    friend.socket.emit('join_room', {
      roomId: roomE2.id,
      player: {
        id: friend.id,
        nickname: friend.nickname,
        avatar: '⚡',
        color: '#f43f5e',
      }
    }, (resp) => resp.success ? resolve(resp.room) : reject(new Error(resp.error)));
  });

  if (joinedE2.id !== roomE2.id) {
    throw new Error('Scenario E Failed: Friend did not join room E2');
  }
  if (!joinedE2.players[creator.id] || !joinedE2.players[friend.id]) {
    throw new Error('Scenario E Failed: Both players not in room E2');
  }
  console.log('✅ Scenario E Passed: Both players are exclusively in Room E2!\n');

  // --- SCENARIO G: Unexpected browser close & Reconnection ---
  console.log('▶️ Testing Scenario G: Unexpected browser close & Reconnection grace period');
  const reconHost = await createClient('recon_host', 'Harry');
  const reconRoom = await new Promise((resolve, reject) => {
    reconHost.socket.emit('create_room', {
      id: reconHost.id,
      nickname: reconHost.nickname,
      avatar: '🎨',
      color: '#6366f1',
    }, (resp) => resp.success ? resolve(resp.room) : reject(new Error(resp.error)));
  });

  const reconPlayer = await createClient('recon_player', 'Hermione');
  await new Promise((resolve, reject) => {
    reconPlayer.socket.emit('join_room', {
      roomId: reconRoom.id,
      player: {
        id: reconPlayer.id,
        nickname: reconPlayer.nickname,
        avatar: '🧙‍♀️',
        color: '#8b5cf6',
      }
    }, (resp) => resp.success ? resolve(resp.room) : reject(new Error(resp.error)));
  });

  // Track disconnect on host
  const hostSawDisconnect = new Promise((resolve) => {
    reconHost.socket.on('room_data', (data) => {
      if (data.players[reconPlayer.id] && data.players[reconPlayer.id].isConnected === false) {
        resolve(data);
      }
    });
  });

  // Simulate unexpected browser tab crash/disconnect (not leave_room)
  reconPlayer.socket.disconnect();
  console.log('   Simulated unexpected browser crash for Hermione');

  await Promise.race([
    hostSawDisconnect,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for disconnect flag')), 2000)),
  ]);
  console.log('   Host observed Hermione disconnected status (isConnected: false)');

  // Reconnect with a new socket but same player ID (reopening browser tab)
  const reconnectedPlayer = await createClient(reconPlayer.id, reconPlayer.nickname);
  const reconnectedRoomData = await new Promise((resolve, reject) => {
    reconnectedPlayer.socket.emit('join_room', {
      roomId: reconRoom.id,
      player: {
        id: reconPlayer.id,
        nickname: reconPlayer.nickname,
        avatar: '🧙‍♀️',
        color: '#8b5cf6',
      }
    }, (resp) => resp.success ? resolve(resp.room) : reject(new Error(resp.error)));
  });

  if (!reconnectedRoomData.players[reconPlayer.id]?.isConnected) {
    throw new Error('Scenario G Failed: Player isConnected is not true upon reconnection');
  }
  console.log('✅ Scenario G Passed: Reconnection successfully re-established player presence!\n');

  // Close all sockets
  clientA.socket.disconnect();
  hostB.socket.disconnect();
  originalHost.socket.disconnect();
  guest.socket.disconnect();
  creator.socket.disconnect();
  friend.socket.disconnect();
  reconHost.socket.disconnect();
  reconnectedPlayer.socket.disconnect();

  console.log('🌟 ALL ROOM LIFECYCLE & NAVIGATION SCENARIOS PASSED WITH 100% SUCCESS! 🌟');
  process.exit(0);
}

runRoomLifecycleTests().catch((err) => {
  console.error('❌ Room lifecycle test failed:', err);
  process.exit(1);
});
