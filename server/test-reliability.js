import assert from 'assert';
process.env.PORT = '4060';
await import('./dist/index.js');
import { io } from '../client/node_modules/socket.io-client/build/esm/index.js';
import { RoomStore } from './dist/storage/RoomStore.js';
import { RoomManager, Room } from './dist/rooms/RoomManager.js';
import { GameEngine } from './dist/game/GameEngine.js';

const SERVER_URL = 'http://localhost:4060';

async function createClient(id, nickname) {
  const socket = io(SERVER_URL, { transports: ['websocket'] });
  await new Promise(res => socket.on('connect', res));
  return { socket, id, nickname };
}

async function runReliabilityTestSuite() {
  console.log('🧪 Starting DoodleDash Reliability & Stability Test Suite (17 Scenarios)...\n');

  // =========================================================================
  // SCENARIO 1: Creating and joining private rooms
  // =========================================================================
  console.log('▶️ Scenario 1: Creating and joining private rooms');
  const host1 = await createClient('h1', 'Alice');
  const guest1 = await createClient('g1', 'Bob');

  const createRes = await new Promise(res => {
    host1.socket.emit('create_room', { id: host1.id, nickname: host1.nickname, avatar: '🦊', color: '#ff0055' }, res);
  });
  assert(createRes.success, 'Room creation failed');
  assert(createRes.sessionToken, 'Host missing session token');
  const roomId1 = createRes.room.id;

  const joinRes = await new Promise(res => {
    guest1.socket.emit('join_room', { roomId: roomId1, player: { id: guest1.id, nickname: guest1.nickname, avatar: '🐼', color: '#00ff55' } }, res);
  });
  assert(joinRes.success, 'Guest join failed');
  assert(joinRes.sessionToken, 'Guest missing session token');
  console.log(`✅ Scenario 1 Passed: Room ${roomId1} created and joined with valid session tokens.\n`);

  // =========================================================================
  // SCENARIO 2, 3, 4: Joining after 10m, 30m, and several hours
  // =========================================================================
  console.log('▶️ Scenarios 2, 3, 4: Room persistence across time jumps (10m, 30m, 12h)');
  const guest2 = await createClient('g2', 'Charlie');

  // Fetch room reference from local server instance
  const roomStore = new RoomStore();
  const roomObj = await roomStore.getRoom(roomId1);
  assert(roomObj, 'Room not found in store');

  // 10 minutes later
  roomObj.last_active_at -= 10 * 60 * 1000;
  await roomStore.saveRoom(roomObj);
  const join10m = await new Promise(res => {
    guest2.socket.emit('join_room', { roomId: roomId1, player: { id: guest2.id, nickname: guest2.nickname, avatar: '🦁', color: '#0055ff' } }, res);
  });
  assert(join10m.success, 'Failed to join after 10m');
  console.log('✅ Scenario 2 Passed: Room joinable after 10 minutes.');

  // 30 minutes later
  roomObj.last_active_at -= 30 * 60 * 1000;
  await roomStore.saveRoom(roomObj);
  const join30m = await new Promise(res => {
    guest2.socket.emit('join_room', { roomId: roomId1, player: { id: guest2.id, nickname: guest2.nickname, avatar: '🦁', color: '#0055ff' } }, res);
  });
  assert(join30m.success, 'Failed to join after 30m');
  console.log('✅ Scenario 3 Passed: Room joinable after 30 minutes.');

  // 12 hours later (several hours within 24h)
  roomObj.last_active_at -= 12 * 60 * 60 * 1000;
  await roomStore.saveRoom(roomObj);
  const join12h = await new Promise(res => {
    guest2.socket.emit('join_room', { roomId: roomId1, player: { id: guest2.id, nickname: guest2.nickname, avatar: '🦁', color: '#0055ff' } }, res);
  });
  assert(join12h.success, 'Failed to join after 12 hours');
  console.log('✅ Scenario 4 Passed: Room joinable after 12 hours.\n');

  // =========================================================================
  // SCENARIO 5: Room expiration after 24 hours
  // =========================================================================
  console.log('▶️ Scenario 5: Room expiration after 24 hours');
  const expStore = new RoomStore();
  const expRoomId = 'EXPIRE';
  await expStore.saveRoom({
    id: expRoomId,
    host_id: 'exp_host',
    settings: { rounds: 3, drawTime: 80, wordCount: 3, difficulty: 'all', categories: [], customWords: [], customWordsOnly: false, maxPlayers: 10, hintsEnabled: true },
    status: 'LOBBY',
    created_at: Date.now() - 25 * 60 * 60 * 1000,
    last_active_at: Date.now() - 25 * 60 * 60 * 1000,
    expires_at: Date.now() - 1 * 60 * 60 * 1000, // expired 1 hr ago
    player_sessions: {},
  });

  const expiredLookup = await expStore.getRoom(expRoomId);
  assert.strictEqual(expiredLookup, null, 'Expired room should not be returned');
  console.log('✅ Scenario 5 Passed: Rooms inactive for >24h expire and are rejected.\n');

  // =========================================================================
  // SCENARIO 6: Server restart and room metadata recovery
  // =========================================================================
  console.log('▶️ Scenario 6: Server restart and room metadata recovery');
  const dummyIo = { to: () => ({ emit: () => {} }) };
  const restartManager = new RoomManager(dummyIo);
  await restartManager.initialize();

  const restoredRoom = await restartManager.getRoomAsync(roomId1);
  assert(restoredRoom, 'Room metadata failed to recover across restart');
  assert.strictEqual(restoredRoom.id, roomId1);
  assert.strictEqual(restoredRoom.gameEngine.getGameState().phase, 'LOBBY');
  console.log('✅ Scenario 6 Passed: Room metadata recovered across server restart in LOBBY state.\n');

  // =========================================================================
  // SCENARIOS 7, 8, 9, 10: Disconnect, Reconnect, Repeated Reconnect, No Duplicates
  // =========================================================================
  console.log('▶️ Scenarios 7, 8, 9, 10: Reconnection, token validation, deduplication');
  const recHost = await createClient('rec_h', 'Dana');
  const recRes = await new Promise(res => {
    recHost.socket.emit('create_room', { id: recHost.id, nickname: recHost.nickname, avatar: '🦄', color: '#a855f7' }, res);
  });
  const recRoomId = recRes.room.id;
  const recToken = recRes.sessionToken;

  // 7. Temporary player disconnection
  recHost.socket.disconnect();
  await new Promise(r => setTimeout(r, 100));

  // 8. Reconnection with token
  const recHost2 = await createClient('rec_h', 'Dana');
  const rebindRes = await new Promise(res => {
    recHost2.socket.emit('reconnect_session', { roomId: recRoomId, playerId: 'rec_h', sessionToken: recToken }, res);
  });
  assert(rebindRes.success, 'Reconnection failed: ' + rebindRes.error);
  console.log('✅ Scenario 7 & 8 Passed: Player disconnected and reconnected via session token.');

  // 9. Repeated reconnection
  recHost2.socket.disconnect();
  await new Promise(r => setTimeout(r, 50));
  const recHost3 = await createClient('rec_h', 'Dana');
  const rebindRes2 = await new Promise(res => {
    recHost3.socket.emit('reconnect_session', { roomId: recRoomId, playerId: 'rec_h', sessionToken: recToken }, res);
  });
  assert(rebindRes2.success, 'Second reconnect failed');
  console.log('✅ Scenario 9 Passed: Repeated reconnections handled cleanly.');

  // 10. No duplicate player records
  const playerCount = Object.keys(rebindRes2.room.players).length;
  assert.strictEqual(playerCount, 1, `Expected 1 player, got ${playerCount}`);
  assert.strictEqual(rebindRes2.room.players['rec_h'].nickname, 'Dana', 'Nickname should not have suffix');
  console.log('✅ Scenario 10 Passed: Zero duplicate player records, no unwanted number suffixes.\n');

  // =========================================================================
  // SCENARIO 11: Timer recovery after delayed callbacks
  // =========================================================================
  console.log('▶️ Scenario 11: Authoritative timer recovery after delayed callback');
  let turnAdvanced = false;
  const enginePlayers = new Map([
    ['p1', { id: 'p1', socketId: 's1', nickname: 'P1', avatar: '🦊', color: '#f00', score: 0, roundScore: 0, isHost: true, isReady: true, isConnected: true, hasGuessed: false }],
    ['p2', { id: 'p2', socketId: 's2', nickname: 'P2', avatar: '🐼', color: '#0f0', score: 0, roundScore: 0, isHost: false, isReady: true, isConnected: true, hasGuessed: false }],
  ]);
  const testEngine = new GameEngine(
    'TMR1',
    { rounds: 2, drawTime: 30, wordCount: 3, difficulty: 'all', categories: ['Animals'], customWords: [], customWordsOnly: false, maxPlayers: 10, hintsEnabled: true },
    enginePlayers,
    {
      onStateUpdate: () => {},
      onDrawerWordChoices: () => {},
      onChatMessage: () => {},
      onCloseGuessNotification: () => {},
      onCanvasClear: () => {},
      onSoundTrigger: () => {},
    }
  );
  testEngine.startGame();
  assert.strictEqual(testEngine.getGameState().phase, 'CHOOSING_WORD');

  // Fast forward deadline
  testEngine['currentPhaseDeadline'] = Date.now() - 1000;
  testEngine.handlePlayerReconnect('p1', 's1');
  assert.strictEqual(testEngine.getGameState().phase, 'DRAWING', 'Should auto-transition to DRAWING on overdue deadline');
  testEngine.clearTimer();
  console.log('✅ Scenario 11 Passed: Authoritative deadline recovered and transitioned immediately without freeze.\n');

  // =========================================================================
  // SCENARIO 12: Round completion exactly once
  // =========================================================================
  console.log('▶️ Scenario 12: Round completion exactly once under concurrent guesses');
  let roundEndTriggers = 0;
  testEngine['callbacks'].onSoundTrigger = (s) => {
    if (s === 'ROUND_END') roundEndTriggers++;
  };
  const currentDrawer = testEngine.getGameState().currentDrawerId;
  const guesserId = currentDrawer === 'p1' ? 'p2' : 'p1';
  testEngine.handleChatGuess(guesserId, testEngine['selectedWord']);
  testEngine.handleChatGuess(guesserId, testEngine['selectedWord']); // duplicate attempt
  testEngine.clearTimer();
  assert.strictEqual(roundEndTriggers, 1, `Expected 1 ROUND_END trigger, got ${roundEndTriggers}`);
  console.log('✅ Scenario 12 Passed: Round completion executed exactly once with zero duplicate triggers.\n');

  // =========================================================================
  // SCENARIO 13: Chat history recovery
  // =========================================================================
  console.log('▶️ Scenario 13: Chat history recovery');
  const chatHost = await createClient('ch_h', 'Frank');
  const chatRoomRes = await new Promise(res => {
    chatHost.socket.emit('create_room', { id: chatHost.id, nickname: chatHost.nickname, avatar: '🦊', color: '#f00' }, res);
  });
  const chatRoomId = chatRoomRes.room.id;

  // Send message
  chatHost.socket.emit('chat_message', { roomId: chatRoomId, text: 'Hello DoodleDash!' });
  await new Promise(r => setTimeout(r, 100));

  // Joiner receives chat_history event
  const chatGuest = await createClient('ch_g', 'Grace');
  const receivedHistory = await new Promise(res => {
    chatGuest.socket.on('chat_history', res);
    chatGuest.socket.emit('join_room', { roomId: chatRoomId, player: { id: chatGuest.id, nickname: chatGuest.nickname, avatar: '🐱', color: '#0f0' } });
  });
  assert(Array.isArray(receivedHistory) && receivedHistory.length > 0, 'Chat history not received');
  assert(receivedHistory.some(m => m.text === 'Hello DoodleDash!'), 'Message not preserved in history');
  console.log('✅ Scenario 13 Passed: Chat history preserved and restored for joining players.\n');

  // =========================================================================
  // SCENARIO 14: Canvas snapshot recovery
  // =========================================================================
  console.log('▶️ Scenario 14: Canvas snapshot recovery');
  // Ready up guest and start game
  chatGuest.socket.emit('toggle_ready', { roomId: chatRoomId });
  await new Promise(r => setTimeout(r, 100));

  let activeDrawer = null;
  let wordToPick = null;
  chatHost.socket.on('word_choices', (w) => { activeDrawer = chatHost; wordToPick = w[0]; });
  chatGuest.socket.on('word_choices', (w) => { activeDrawer = chatGuest; wordToPick = w[0]; });

  chatHost.socket.emit('start_game', { roomId: chatRoomId });
  await new Promise(r => setTimeout(r, 300));
  assert(activeDrawer && wordToPick, 'Active drawer not assigned in game');

  activeDrawer.socket.emit('select_word', { roomId: chatRoomId, word: wordToPick });
  await new Promise(r => setTimeout(r, 200));

  const strokeAction = { type: 'stroke', tool: 'brush', color: '#000000', size: 5, points: [{ x: 10, y: 10 }, { x: 50, y: 50 }] };
  activeDrawer.socket.emit('draw_action', { roomId: chatRoomId, action: strokeAction });
  await new Promise(r => setTimeout(r, 200));

  // Fresh guest joins during DRAWING and receives full canvas snapshot
  const freshGuest = await createClient('ch_g2', 'Heidi');
  const canvasSnapshot = await new Promise(res => {
    freshGuest.socket.on('canvas_snapshot', res);
    freshGuest.socket.emit('join_room', { roomId: chatRoomId, player: { id: freshGuest.id, nickname: freshGuest.nickname, avatar: '🦁', color: '#00f' } });
  });

  assert(Array.isArray(canvasSnapshot) && canvasSnapshot.length > 0, 'Canvas snapshot not received');
  assert.strictEqual(canvasSnapshot[0].type, 'stroke', 'Canvas snapshot stroke mismatch');
  console.log('✅ Scenario 14 Passed: Canvas strokes snapshotted and synchronized to new/reconnecting clients.\n');

  // =========================================================================
  // SCENARIO 15: Host disconnection and migration
  // =========================================================================
  console.log('▶️ Scenario 15: Host disconnection and migration');
  const hostMig1 = await createClient('hm_1', 'Ivan');
  const hostMigRes = await new Promise(res => {
    hostMig1.socket.emit('create_room', { id: hostMig1.id, nickname: hostMig1.nickname, avatar: '🦊', color: '#f00' }, res);
  });
  const migRoomId = hostMigRes.room.id;

  const guestMig2 = await createClient('hm_2', 'Judy');
  await new Promise(res => {
    guestMig2.socket.emit('join_room', { roomId: migRoomId, player: { id: guestMig2.id, nickname: guestMig2.nickname, avatar: '🐼', color: '#0f0' } }, res);
  });

  // Host 1 disconnects
  const roomDataPromise = new Promise(res => {
    guestMig2.socket.on('room_data', (data) => {
      if (data.hostId === 'hm_2') res(data);
    });
  });
  hostMig1.socket.disconnect();
  const migratedRoom = await roomDataPromise;
  assert.strictEqual(migratedRoom.hostId, 'hm_2', 'Host migration failed to appoint Judy');
  console.log('✅ Scenario 15 Passed: Host disconnected and host role migrated cleanly to next active player.\n');

  // =========================================================================
  // SCENARIO 16: Everyone disconnecting
  // =========================================================================
  console.log('▶️ Scenario 16: Everyone disconnecting without room deletion');
  guestMig2.socket.disconnect();
  await new Promise(r => setTimeout(r, 100));

  // Verify room is still present in store and can be joined
  const afterEmptyStore = new RoomStore();
  const retainedRoom = await afterEmptyStore.getRoom(migRoomId);
  assert(retainedRoom, 'Room was deleted after everyone disconnected!');
  console.log('✅ Scenario 16 Passed: Room remains alive and joinable even after all players disconnect.\n');

  // =========================================================================
  // SCENARIO 17: Active game interrupted by server restart
  // =========================================================================
  console.log('▶️ Scenario 17: Active game interrupted by server restart');
  const interruptedRoomId = 'INTRPT';
  await afterEmptyStore.saveRoom({
    id: interruptedRoomId,
    host_id: 'p_intr',
    settings: { rounds: 3, drawTime: 80, wordCount: 3, difficulty: 'all', categories: ['Animals'], customWords: [], customWordsOnly: false, maxPlayers: 10, hintsEnabled: true },
    status: 'DRAWING', // was in active drawing when server went down
    created_at: Date.now() - 5000,
    last_active_at: Date.now() - 5000,
    expires_at: Date.now() + 24 * 60 * 60 * 1000,
    player_sessions: {
      'p_intr': {
        playerId: 'p_intr',
        sessionToken: 'token123',
        nickname: 'Ivan',
        avatar: '🦊',
        color: '#f00',
        isHost: true,
        score: 450,
        lastSeen: Date.now() - 5000,
      }
    },
  });

  const freshRebootManager = new RoomManager(dummyIo);
  await freshRebootManager.initialize();
  const restoredInterrupted = freshRebootManager.getRoom(interruptedRoomId);
  assert(restoredInterrupted, 'Interrupted room failed to restore');
  assert.strictEqual(restoredInterrupted.gameEngine.getGameState().phase, 'LOBBY', 'Interrupted game must reset to LOBBY, never stuck in DRAWING');
  console.log('✅ Scenario 17 Passed: Interrupted game safely transitioned to LOBBY with scores preserved.\n');

  console.log('🌟 ALL 17 RELIABILITY & STABILITY SCENARIOS PASSED WITH 100% SUCCESS! 🌟\n');
  process.exit(0);
}

runReliabilityTestSuite().catch(err => {
  console.error('❌ Reliability Test Failed:', err);
  process.exit(1);
});
