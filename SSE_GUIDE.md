# SSE Notifications Guide

This guide explains how to connect to the real-time notification system using Server-Sent Events (SSE).

## Overview

The backend provides an SSE endpoint for real-time notifications at `/notifications/stream`. When a payment is approved, rejected, or a reminder is sent, users will receive instant notifications through SSE.

SSE is simpler and more efficient than WebSocket for unidirectional server-to-client communication.

## Connection URL

**Development:**
```
http://localhost:3000/notifications/stream?token=YOUR_JWT_TOKEN
```

**Production:**
```
https://your-domain.com/notifications/stream?token=YOUR_JWT_TOKEN
```

## Authentication

The SSE connection requires JWT authentication via query parameter:

```javascript
?token=YOUR_JWT_TOKEN
```

The token is verified on connection. If invalid, you'll receive a 401 response.

## SSE Events

The server sends the following event types:

### `connected`
Sent immediately after successful connection.

**Data:**
```json
{
  "message": "Connected to notifications stream"
}
```

### `notification`
Sent when a new notification is created for the user.

**Data:**
```json
{
  "id": "uuid-string",
  "userId": "uuid-string",
  "type": "payment_reminder" | "payment_approved" | "payment_rejected",
  "title": "Notification Title",
  "message": "Notification message content",
  "paymentMonth": 1,
  "paymentYear": 2024,
  "isRead": false,
  "emailSent": true,
  "emailSentAt": "2024-01-15T10:30:00Z",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### `unread_count`
Sent when the unread notification count changes (on connection, after marking as read, or new notification).

**Data:**
```json
{
  "count": 5
}
```

### `:heartbeat`
Keep-alive ping sent every 30 seconds to prevent connection timeout.

**Data:** None (just a comment line to keep connection alive)

## REST API Endpoints

For client-to-server actions, use these REST endpoints:

### Get All Notifications

```http
GET /notifications
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "type": "payment_reminder",
    "title": "Payment Reminder",
    "message": "Your payment is due...",
    "paymentMonth": 1,
    "paymentYear": 2024,
    "isRead": false,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

### Get Unread Notifications

```http
GET /notifications/unread
Authorization: Bearer YOUR_JWT_TOKEN
```

### Get Unread Count

```http
GET /notifications/unread/count
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "count": 5
}
```

### Mark Notification as Read

```http
PATCH /notifications/:id/read
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "message": "Notification marked as read"
}
```

**SSE Update:** Server automatically sends `unread_count` event to the user.

### Mark All as Read

```http
PATCH /notifications/read-all
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "message": "All notifications marked as read"
}
```

**SSE Update:** Server automatically sends `unread_count` event with count: 0.

## Frontend Examples

### Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <title>SSE Notifications Demo</title>
</head>
<body>
  <h1>Real-time Notifications (SSE)</h1>
  <div id="connection-status">Disconnected</div>
  <div id="unread-count">Unread: 0</div>
  <div id="notifications"></div>

  <script>
    const token = 'YOUR_JWT_TOKEN'; // Get from login
    let eventSource = null;

    function connect() {
      const url = `http://localhost:3000/notifications/stream?token=${encodeURIComponent(token)}`;
      eventSource = new EventSource(url);

      eventSource.addEventListener('open', () => {
        console.log('SSE connection opened');
        document.getElementById('connection-status').textContent = 'Connected';
        document.getElementById('connection-status').style.color = 'green';
      });

      eventSource.addEventListener('error', (error) => {
        console.error('SSE connection error:', error);
        document.getElementById('connection-status').textContent = 'Disconnected';
        document.getElementById('connection-status').style.color = 'red';
      });

      eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        console.log('Connected:', data.message);
        fetchNotifications();
      });

      eventSource.addEventListener('notification', (event) => {
        const notification = JSON.parse(event.data);
        console.log('New notification:', notification);
        showNotification(notification);

        // Show browser notification
        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message
          });
        }
      });

      eventSource.addEventListener('unread_count', (event) => {
        const data = JSON.parse(event.data);
        console.log('Unread count:', data.count);
        document.getElementById('unread-count').textContent = `Unread: ${data.count}`;
      });
    }

    async function fetchNotifications() {
      try {
        const response = await fetch('http://localhost:3000/notifications', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const notifications = await response.json();
        displayNotifications(notifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    }

    function displayNotifications(notifications) {
      const container = document.getElementById('notifications');
      container.innerHTML = notifications.map(n => `
        <div class="${n.isRead ? 'read' : 'unread'}">
          <h3>${n.title}</h3>
          <p>${n.message}</p>
          <small>${new Date(n.createdAt).toLocaleString()}</small>
          ${!n.isRead ? `
            <button onclick="markAsRead('${n.id}')">Mark as Read</button>
          ` : ''}
        </div>
      `).join('');
    }

    function showNotification(notification) {
      const container = document.getElementById('notifications');
      const div = document.createElement('div');
      div.className = 'unread';
      div.innerHTML = `
        <h3>${notification.title}</h3>
        <p>${notification.message}</p>
        <small>${new Date(notification.createdAt).toLocaleString()}</small>
        <button onclick="markAsRead('${notification.id}')">Mark as Read</button>
      `;
      container.prepend(div);
    }

    async function markAsRead(notificationId) {
      try {
        await fetch(`http://localhost:3000/notifications/${notificationId}/read`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        // UI will update via SSE unread_count event
        fetchNotifications();
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    async function markAllAsRead() {
      try {
        await fetch('http://localhost:3000/notifications/read-all', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        fetchNotifications();
      } catch (error) {
        console.error('Error marking all as read:', error);
      }
    }

    // Request browser notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Connect on page load
    connect();

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (eventSource) {
        eventSource.close();
      }
    });
  </script>

  <style>
    .unread {
      background: #fffbcc;
      border-left: 3px solid #ffa500;
      padding: 10px;
      margin: 10px 0;
    }
    .read {
      background: #f5f5f5;
      padding: 10px;
      margin: 10px 0;
    }
    #connection-status {
      font-weight: bold;
      margin-bottom: 10px;
    }
  </style>
</body>
</html>
```

### React Example

#### SSE Service (sseService.js)

```javascript
class SseService {
  constructor() {
    this.eventSource = null;
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isManuallyDisconnected = false;
  }

  connect(token) {
    if (this.eventSource) {
      console.log('SSE already connected');
      return;
    }

    this.isManuallyDisconnected = false;
    const url = `http://localhost:3000/notifications/stream?token=${encodeURIComponent(token)}`;

    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      console.log('SSE connection opened');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.emit('connect');
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);

      if (this.eventSource.readyState === EventSource.CLOSED) {
        this.eventSource = null;
        this.emit('disconnect', 'Connection closed');

        if (!this.isManuallyDisconnected && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => {
            if (!this.isManuallyDisconnected) {
              this.connect(token);
            }
          }, this.reconnectDelay);

          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
        }
      }
    };

    this.eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      console.log('SSE connected:', data);
    });

    this.eventSource.addEventListener('notification', (event) => {
      const data = JSON.parse(event.data);
      this.emit('new_notification', data);
    });

    this.eventSource.addEventListener('unread_count', (event) => {
      const data = JSON.parse(event.data);
      this.emit('unread_count', data.count);
    });
  }

  disconnect() {
    this.isManuallyDisconnected = true;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.listeners = {};
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    if (callback) {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    } else {
      delete this.listeners[event];
    }
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => callback(data));
  }

  isConnected() {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

export default new SseService();
```

#### Notification API (notificationApi.js)

```javascript
import axios from 'axios';

const API_URL = 'http://localhost:3000';

class NotificationApi {
  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/notifications`,
    });
  }

  setAuthToken(token) {
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common['Authorization'];
    }
  }

  async getAllNotifications() {
    const response = await this.client.get('/');
    return response.data;
  }

  async getUnreadNotifications() {
    const response = await this.client.get('/unread');
    return response.data;
  }

  async getUnreadCount() {
    const response = await this.client.get('/unread/count');
    return response.data.count;
  }

  async markAsRead(notificationId) {
    const response = await this.client.patch(`/${notificationId}/read`);
    return response.data;
  }

  async markAllAsRead() {
    const response = await this.client.patch('/read-all');
    return response.data;
  }
}

export default new NotificationApi();
```

#### Use in Component

```jsx
import { useState, useEffect } from 'react';
import sseService from '../services/sseService';
import notificationApi from '../services/notificationApi';

export function NotificationBell({ token }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!token) return;

    // Set API token
    notificationApi.setAuthToken(token);

    // Fetch initial notifications
    const fetchNotifications = async () => {
      try {
        const data = await notificationApi.getAllNotifications();
        setNotifications(data);
        const unread = data.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    // Connect to SSE
    sseService.connect(token);

    // Listen for events
    const handleConnect = () => {
      console.log('Connected to SSE');
      fetchNotifications();
    };

    const handleNewNotification = (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    const handleUnreadCount = (count) => {
      setUnreadCount(count);
    };

    sseService.on('connect', handleConnect);
    sseService.on('new_notification', handleNewNotification);
    sseService.on('unread_count', handleUnreadCount);

    return () => {
      sseService.off('connect', handleConnect);
      sseService.off('new_notification', handleNewNotification);
      sseService.off('unread_count', handleUnreadCount);
      sseService.disconnect();
    };
  }, [token]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return (
    <div className="notification-bell">
      <button className="bell-icon">
        🔔
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>

      <div className="notification-dropdown">
        <div className="header">
          <h3>Notifications</h3>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllAsRead}>Mark all as read</button>
          )}
        </div>

        <div className="notification-list">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
            >
              <h4>{notification.title}</h4>
              <p>{notification.message}</p>
              <small>{new Date(notification.createdAt).toLocaleString()}</small>
              {!notification.isRead && (
                <button onClick={() => handleMarkAsRead(notification.id)}>
                  Mark as read
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Testing SSE Connection

### Browser DevTools

1. Open DevTools → Network tab
2. Filter by "stream"
3. Look for persistent EventSource connection
4. Click on it to see events being received in real-time

### Browser Console Test

```javascript
const token = 'YOUR_JWT_TOKEN';
const eventSource = new EventSource(`http://localhost:3000/notifications/stream?token=${token}`);

eventSource.addEventListener('connected', (e) => console.log('Connected:', e.data));
eventSource.addEventListener('notification', (e) => console.log('Notification:', e.data));
eventSource.addEventListener('unread_count', (e) => console.log('Unread:', e.data));

// Close connection when done
eventSource.close();
```

## Troubleshooting

### Connection Not Opening

1. **Check JWT token is valid**
   - Token must not be expired
   - Token should be properly encoded in URL

2. **Check CORS settings**
   - Backend must allow your frontend origin
   - SSE uses HTTP GET, so CORS applies

3. **Check browser console**
   - Look for 401 Unauthorized errors
   - Look for CORS errors

### Events Not Received

1. **Verify connection is open**
   - Check DevTools → Network → stream should show "pending" status
   - EventSource readyState should be 1 (OPEN)

2. **Check backend logs**
   - Verify SSE service is sending events
   - Check for errors in notification creation

3. **Test with curl**
   ```bash
   curl -N -H "Accept: text/event-stream" \
     "http://localhost:3000/notifications/stream?token=YOUR_TOKEN"
   ```

### Connection Keeps Dropping

1. **Check heartbeat**
   - Should receive `:heartbeat` comment every 30 seconds
   - If not, check `SseHeartbeatScheduler`

2. **Check proxy/nginx settings**
   - Disable buffering: `X-Accel-Buffering: no`
   - Increase timeout settings

3. **Network issues**
   - Poor connection may cause drops
   - EventSource should auto-reconnect

## Security Notes

1. **Always use HTTPS in production** (SSE over TLS)
2. **Validate JWT tokens** on every connection
3. **Set proper CORS headers** to restrict access
4. **Implement rate limiting** to prevent abuse
5. **Use httpOnly cookies** for tokens when possible (requires different auth approach)

## Performance Benefits

Compared to WebSocket:

| Metric | WebSocket | SSE | Benefit |
|--------|-----------|-----|---------|
| Memory per connection | ~50-100 KB | ~10-20 KB | **70% less** |
| Protocol overhead | WebSocket handshake | HTTP GET | **Simpler** |
| Reconnection | Manual implementation | Built-in | **Automatic** |
| Browser support | Modern browsers | All browsers (IE10+) | **Better** |
| Debugging | Custom tools | DevTools Network tab | **Easier** |

## Production Checklist

- [ ] Use HTTPS/TLS
- [ ] Configure proper CORS origins
- [ ] Set up load balancer with SSE support
- [ ] Configure nginx/proxy for SSE (disable buffering, increase timeout)
- [ ] Monitor connection counts and memory usage
- [ ] Implement graceful shutdown (close all connections)
- [ ] Add logging for connection/disconnection events
- [ ] Test reconnection behavior under various network conditions
