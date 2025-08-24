# Live Streaming Signaling Server

This is the WebRTC signaling server for PornCosmos live streaming functionality.

## 🌐 **Free Deployment on Railway**

### Quick Deploy:
1. Push this folder to a GitHub repository
2. Connect your Railway account to GitHub
3. Deploy directly from this repository
4. Railway will automatically detect Node.js and install dependencies

### Environment Variables:
- `PORT`: Automatically set by Railway
- `NODE_ENV`: Set to `production`

### Live URL:
After deployment, your signaling server will be available at:
`https://your-app-name.railway.app`

## 🔧 **Local Development**

```bash
npm install
npm start
```

Server runs on http://localhost:3001

## 📡 **WebRTC Features**

- **Room Management**: Create/join live streaming rooms
- **Peer-to-Peer Streaming**: Direct video/audio streaming between creator and viewers  
- **Real-time Chat**: Live chat during streams
- **Scalable Architecture**: Supports 1000+ concurrent streams
- **CORS Configured**: Works with porncosmos.com and localhost:5173

## 🔐 **Security**

- CORS restricted to specific domains
- Room-based isolation
- Automatic cleanup of disconnected peers

## 🚀 **API Endpoints**

### Socket.io Events:

**Creator Events:**
- `create-room` - Create new streaming room
- `end-stream` - End streaming session  
- `webrtc-offer` - Send WebRTC offer to viewer
- `webrtc-answer` - Receive WebRTC answer from viewer
- `webrtc-ice-candidate` - Exchange ICE candidates

**Viewer Events:**  
- `join-room` - Join existing streaming room
- `webrtc-offer` - Receive WebRTC offer from creator
- `webrtc-answer` - Send WebRTC answer to creator
- `webrtc-ice-candidate` - Exchange ICE candidates

**Chat Events:**
- `chat-message` - Send/receive chat messages
- `viewer-joined` - Notification when viewer joins
- `viewer-left` - Notification when viewer leaves

## 💰 **Cost**

✅ **100% FREE** on Railway's free tier:
- 512MB RAM
- $5/month in usage credits (enough for thousands of streams)
- Automatic HTTPS
- Global CDN
