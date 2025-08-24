const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["https://porncosmos.com", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: ["https://porncosmos.com", "http://localhost:5173"],
  credentials: true
}));
app.use(express.json());

// Room management
const rooms = new Map();

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'PornCosmos Live Streaming Server', 
    activeRooms: rooms.size,
    timestamp: new Date().toISOString()
  });
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Creator creates live room
  socket.on('create-room', (data) => {
    const { roomId, creatorInfo } = data;
    
    rooms.set(roomId, {
      creator: socket.id,
      creatorInfo,
      viewers: new Map(),
      createdAt: Date.now(),
      isLive: true,
      maxViewers: 1000
    });
    
    socket.join(roomId);
    console.log(`🎥 Room created: ${roomId} by ${creatorInfo.name || socket.id}`);
    
    socket.emit('room-created', { 
      roomId, 
      isCreator: true,
      shareLink: `https://porncosmos.com/live/${roomId}`
    });
  });

  // Viewer joins room
  socket.on('join-room', (data) => {
    const { roomId, viewerInfo } = data;
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('room-not-found');
      return;
    }

    if (!room.isLive) {
      socket.emit('stream-ended');
      return;
    }

    if (room.viewers.size >= room.maxViewers) {
      socket.emit('room-full');
      return;
    }
    
    // Add viewer
    room.viewers.set(socket.id, {
      info: viewerInfo,
      joinedAt: Date.now()
    });
    
    socket.join(roomId);
    
    // Notify creator
    io.to(room.creator).emit('viewer-joined', {
      viewerId: socket.id,
      viewerInfo,
      totalViewers: room.viewers.size
    });
    
    // Notify viewer
    socket.emit('room-joined', {
      roomId,
      creatorInfo: room.creatorInfo,
      isCreator: false,
      totalViewers: room.viewers.size
    });
    
    console.log(`👁️ Viewer joined room ${roomId}. Total: ${room.viewers.size}`);
  });

  // WebRTC Signaling
  socket.on('webrtc-offer', (data) => {
    socket.to(data.target).emit('webrtc-offer', {
      offer: data.offer,
      sender: socket.id
    });
  });

  socket.on('webrtc-answer', (data) => {
    socket.to(data.target).emit('webrtc-answer', {
      answer: data.answer,
      sender: socket.id
    });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    socket.to(data.target).emit('webrtc-ice-candidate', {
      candidate: data.candidate,
      sender: socket.id
    });
  });

  // Chat system
  socket.on('chat-message', (data) => {
    const { roomId, message, senderInfo } = data;
    io.to(roomId).emit('chat-message', {
      message,
      senderInfo,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    });
  });

  // Creator controls
  socket.on('kick-viewer', (data) => {
    const { roomId, viewerId } = data;
    const room = rooms.get(roomId);
    
    if (room && room.creator === socket.id) {
      room.viewers.delete(viewerId);
      io.to(viewerId).emit('kicked-from-room');
      socket.emit('viewer-kicked', { viewerId });
    }
  });

  // Join request handling
  socket.on('join-request', (data) => {
    const { roomId, userInfo } = data;
    const room = rooms.get(roomId);
    
    if (room && room.isLive) {
      // Store user ID on socket for later reference
      socket.userId = userInfo.id;
      
      // Notify creator about join request
      io.to(room.creator).emit('join-request', {
        userInfo,
        roomId,
        requestId: socket.id
      });
      
      console.log(`🙋 Join request from ${userInfo.name} (${userInfo.id}) to room ${roomId}`);
    } else {
      socket.emit('room-not-found');
    }
  });

  socket.on('join-request-response', (data) => {
    const { roomId, requestId, approved } = data;
    const room = rooms.get(roomId);
    
    if (room && room.creator === socket.id) {
      // Find the requesting user's socket by request ID (socket ID)
      const userSocket = io.sockets.sockets.get(requestId);
      
      if (userSocket) {
        userSocket.emit('join-request-response', {
          roomId,
          approved
        });
        
        // If approved, allow them to join directly
        if (approved) {
          userSocket.emit('join-approved', { roomId });
        }
        
        console.log(`${approved ? '✅' : '❌'} Join request ${approved ? 'approved' : 'denied'} for request ${requestId} in room ${roomId}`);
      }
    }
  });

  // Direct join after approval
  socket.on('join-room-direct', (data) => {
    const { roomId, viewerInfo } = data;
    const room = rooms.get(roomId);
    
    if (room && room.isLive) {
      socket.join(roomId);
      socket.userId = viewerInfo.id;
      socket.roomId = roomId;
      
      room.viewers.set(socket.id, viewerInfo);
      
      // Notify creator about new viewer
      socket.to(room.creator).emit('viewer-joined', {
        viewerId: socket.id,
        viewerInfo,
        totalViewers: room.viewers.size
      });
      
      // Notify all viewers about updated count
      io.to(roomId).emit('viewer-count-update', {
        totalViewers: room.viewers.size
      });
      
      console.log(`👁️ Approved viewer joined room ${roomId}. Total: ${room.viewers.size}`);
    }
  });

  socket.on('end-stream', (data) => {
    const { roomId } = data;
    const room = rooms.get(roomId);
    
    if (room && room.creator === socket.id) {
      room.isLive = false;
      io.to(roomId).emit('stream-ended');
      rooms.delete(roomId);
      console.log(`🔴 Stream ended: ${roomId}`);
    }
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    for (const [roomId, room] of rooms.entries()) {
      if (room.creator === socket.id) {
        // Creator left - end stream
        io.to(roomId).emit('stream-ended');
        rooms.delete(roomId);
        console.log(`🔴 Creator left, stream ended: ${roomId}`);
      } else if (room.viewers.has(socket.id)) {
        // Viewer left
        room.viewers.delete(socket.id);
        io.to(room.creator).emit('viewer-left', {
          viewerId: socket.id,
          totalViewers: room.viewers.size
        });
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 PornCosmos Live Streaming Server running on port ${PORT}`);
});
