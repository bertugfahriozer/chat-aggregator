import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws';

const App = () => {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Fetch initial messages
    fetchMessages();
    
    // Setup WebSocket connection
    setupWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${API}/messages?limit=50`);
      const data = await response.json();
      setMessages(data.reverse()); // Reverse to show oldest first
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const setupWebSocket = () => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_message') {
        setMessages(prev => [...prev, data.data]);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      // Reconnect after 3 seconds
      setTimeout(setupWebSocket, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const filteredMessages = selectedPlatform === 'all' 
    ? messages 
    : messages.filter(msg => msg.platform === selectedPlatform);

  const getPlatformColor = (platform) => {
    const colors = {
      youtube: '#FF0000',
      twitch: '#9146FF',
      kick: '#53FC18'
    };
    return colors[platform] || '#FFFFFF';
  };

  const getPlatformIcon = (platform) => {
    const icons = {
      youtube: '▶️',
      twitch: '💜',
      kick: '🟢'
    };
    return icons[platform] || '💬';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const clearMessages = async () => {
    try {
      await fetch(`${API}/messages`, { method: 'DELETE' });
      setMessages([]);
    } catch (error) {
      console.error('Error clearing messages:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-4 text-center">
            🎮 Multi-Platform Chat Aggregator
          </h1>
          
          {/* Connection Status */}
          <div className="flex items-center justify-center mb-4">
            <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm">
              {isConnected ? 'Bağlı - Real-time güncellemeler aktif' : 'Bağlantı kopuk - Yeniden bağlanıyor...'}
            </span>
          </div>

          {/* Platform Filter */}
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => setSelectedPlatform('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedPlatform === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🌐 Tüm Platformlar
            </button>
            <button
              onClick={() => setSelectedPlatform('youtube')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedPlatform === 'youtube' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              ▶️ YouTube
            </button>
            <button
              onClick={() => setSelectedPlatform('twitch')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedPlatform === 'twitch' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              💜 Twitch
            </button>
            <button
              onClick={() => setSelectedPlatform('kick')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedPlatform === 'kick' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🟢 Kick
            </button>
            <button
              onClick={clearMessages}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors ml-4"
            >
              🗑️ Temizle
            </button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-gray-800 rounded-lg border border-gray-700 h-[600px] overflow-y-auto">
          <div className="p-4 space-y-3">
            {filteredMessages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p>Henüz mesaj yok. Chat mesajları burada görünecek...</p>
              </div>
            ) : (
              filteredMessages.map((message) => (
                <div 
                  key={message.id} 
                  className="flex items-start space-x-3 p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                >
                  {/* Platform Icon */}
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ backgroundColor: getPlatformColor(message.platform) }}
                  >
                    {getPlatformIcon(message.platform)}
                  </div>
                  
                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span 
                        className="font-semibold"
                        style={{ color: message.user_color }}
                      >
                        {message.username}
                      </span>
                      
                      {/* Badges */}
                      {message.is_moderator && (
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                          MOD
                        </span>
                      )}
                      {message.is_subscriber && (
                        <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full">
                          SUB
                        </span>
                      )}
                      
                      {/* Platform Name */}
                      <span 
                        className="text-xs px-2 py-1 rounded-full text-white"
                        style={{ backgroundColor: getPlatformColor(message.platform) }}
                      >
                        {message.platform.toUpperCase()}
                      </span>
                      
                      {/* Timestamp */}
                      <span className="text-xs text-gray-400">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    
                    {/* Message Text */}
                    <p className="text-gray-100 break-words">
                      {message.message}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* Stats */}
        <div className="mt-4 text-center text-gray-400 text-sm">
          <p>
            Toplam {filteredMessages.length} mesaj görüntüleniyor
            {selectedPlatform !== 'all' && ` (${selectedPlatform} platformundan)`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
