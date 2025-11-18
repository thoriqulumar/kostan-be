# WebSocket Notifications Guide

This guide explains how to connect to the real-time notification system using WebSocket.

## Overview

The backend provides a WebSocket gateway for real-time notifications at `/notifications` namespace. When a payment is approved, rejected, or a reminder is sent, users will receive instant notifications.

## Connection URL

```
ws://localhost:3000/notifications
```

For production:
```
wss://your-domain.com/notifications
```

## Authentication

The WebSocket connection requires JWT authentication. You can provide the token in two ways:

1. **Query parameter:**
   ```javascript
   ?token=YOUR_JWT_TOKEN
   ```

2. **Authorization header:**
   ```javascript
   Authorization: Bearer YOUR_JWT_TOKEN
   ```

## Events

### Client to Server Events

#### `get_notifications`
Get all notifications for the current user.

```javascript
socket.emit('get_notifications');
```

Response event: `notifications`

#### `get_unread_count`
Get count of unread notifications.

```javascript
socket.emit('get_unread_count');
```

Response event: `unread_count`

#### `mark_as_read`
Mark a specific notification as read.

```javascript
socket.emit('mark_as_read', { notificationId: 'uuid-here' });
```

Response event: `unread_count` (updated count)

#### `mark_all_as_read`
Mark all notifications as read.

```javascript
socket.emit('mark_all_as_read');
```

Response event: `unread_count` (will be 0)

### Server to Client Events

#### `new_notification`
Received when a new notification is created for the user.

```javascript
socket.on('new_notification', (notification) => {
  console.log('New notification:', notification);
  // notification structure:
  // {
  //   id: string,
  //   userId: string,
  //   type: 'payment_reminder' | 'payment_approved' | 'payment_rejected',
  //   title: string,
  //   message: string,
  //   paymentMonth: number,
  //   paymentYear: number,
  //   isRead: boolean,
  //   createdAt: string
  // }
});
```

#### `unread_count`
Received when unread count changes (sent automatically on connection and after marking as read).

```javascript
socket.on('unread_count', (count) => {
  console.log('Unread notifications:', count);
});
```

#### `notifications`
Received as response to `get_notifications` event.

```javascript
socket.on('notifications', (notifications) => {
  console.log('All notifications:', notifications);
});
```

## Frontend Examples

### Vanilla JavaScript / HTML

```html
<!DOCTYPE html>
<html>
<head>
  <title>Notifications Demo</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
  <h1>Real-time Notifications</h1>
  <div id="unread-count">Unread: 0</div>
  <div id="notifications"></div>

  <script>
    const token = 'YOUR_JWT_TOKEN'; // Get from login

    const socket = io('http://localhost:3000/notifications', {
      query: { token },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
      socket.emit('get_notifications');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });

    socket.on('new_notification', (notification) => {
      console.log('New notification:', notification);
      showNotification(notification);

      // Optional: Show browser notification
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message
        });
      }
    });

    socket.on('unread_count', (count) => {
      document.getElementById('unread-count').textContent = `Unread: ${count}`;
    });

    socket.on('notifications', (notifications) => {
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
    });

    function showNotification(notification) {
      // Add notification to UI
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

    function markAsRead(notificationId) {
      socket.emit('mark_as_read', { notificationId });
      socket.emit('get_notifications'); // Refresh list
    }

    function markAllAsRead() {
      socket.emit('mark_all_as_read');
      socket.emit('get_notifications'); // Refresh list
    }

    // Request browser notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
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
  </style>
</body>
</html>
```

### React Example

```bash
npm install socket.io-client
```

#### Create a WebSocket Hook

```typescript
// hooks/useNotifications.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Notification {
  id: string;
  userId: string;
  type: 'payment_reminder' | 'payment_approved' | 'payment_rejected';
  title: string;
  message: string;
  paymentMonth?: number;
  paymentYear?: number;
  isRead: boolean;
  createdAt: string;
}

export const useNotifications = (token: string | null) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const newSocket = io('http://localhost:3000/notifications', {
      query: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket');
      setConnected(true);
      newSocket.emit('get_notifications');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
      setConnected(false);
    });

    newSocket.on('new_notification', (notification: Notification) => {
      console.log('New notification:', notification);
      setNotifications((prev) => [notification, ...prev]);

      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
        });
      }
    });

    newSocket.on('unread_count', (count: number) => {
      setUnreadCount(count);
    });

    newSocket.on('notifications', (notifs: Notification[]) => {
      setNotifications(notifs);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  const markAsRead = (notificationId: string) => {
    socket?.emit('mark_as_read', { notificationId });
  };

  const markAllAsRead = () => {
    socket?.emit('mark_all_as_read');
  };

  const refreshNotifications = () => {
    socket?.emit('get_notifications');
  };

  return {
    notifications,
    unreadCount,
    connected,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  };
};
```

#### Use in Component

```typescript
// components/Notifications.tsx
import React, { useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';

interface Props {
  token: string;
}

export const Notifications: React.FC<Props> = ({ token }) => {
  const {
    notifications,
    unreadCount,
    connected,
    markAsRead,
    markAllAsRead,
  } = useNotifications(token);

  useEffect(() => {
    // Request browser notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div>
      <div className="header">
        <h2>Notifications</h2>
        <span className="badge">{unreadCount} Unread</span>
        <span className={`status ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead}>Mark All as Read</button>
        )}
      </div>

      <div className="notifications-list">
        {notifications.length === 0 ? (
          <p>No notifications</p>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification ${notification.isRead ? 'read' : 'unread'}`}
            >
              <div className="notification-header">
                <h3>{notification.title}</h3>
                <span className={`type type-${notification.type}`}>
                  {notification.type.replace('_', ' ')}
                </span>
              </div>
              <p>{notification.message}</p>
              <div className="notification-footer">
                <small>{new Date(notification.createdAt).toLocaleString()}</small>
                {!notification.isRead && (
                  <button onClick={() => markAsRead(notification.id)}>
                    Mark as Read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
```

### Vue.js Example

```bash
npm install socket.io-client
```

```vue
<template>
  <div class="notifications">
    <div class="header">
      <h2>Notifications</h2>
      <span class="badge">{{ unreadCount }} Unread</span>
      <span :class="['status', connected ? 'connected' : 'disconnected']">
        {{ connected ? '🟢 Connected' : '🔴 Disconnected' }}
      </span>
      <button v-if="unreadCount > 0" @click="markAllAsRead">
        Mark All as Read
      </button>
    </div>

    <div class="notifications-list">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="['notification', notification.isRead ? 'read' : 'unread']"
      >
        <div class="notification-header">
          <h3>{{ notification.title }}</h3>
          <span :class="['type', `type-${notification.type}`]">
            {{ notification.type.replace('_', ' ') }}
          </span>
        </div>
        <p>{{ notification.message }}</p>
        <div class="notification-footer">
          <small>{{ formatDate(notification.createdAt) }}</small>
          <button v-if="!notification.isRead" @click="markAsRead(notification.id)">
            Mark as Read
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';

interface Props {
  token: string;
}

const props = defineProps<Props>();

const socket = ref<Socket | null>(null);
const notifications = ref<any[]>([]);
const unreadCount = ref(0);
const connected = ref(false);

onMounted(() => {
  socket.value = io('http://localhost:3000/notifications', {
    query: { token: props.token },
    transports: ['websocket'],
  });

  socket.value.on('connect', () => {
    console.log('Connected to WebSocket');
    connected.value = true;
    socket.value?.emit('get_notifications');
  });

  socket.value.on('disconnect', () => {
    console.log('Disconnected from WebSocket');
    connected.value = false;
  });

  socket.value.on('new_notification', (notification) => {
    console.log('New notification:', notification);
    notifications.value.unshift(notification);

    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
      });
    }
  });

  socket.value.on('unread_count', (count) => {
    unreadCount.value = count;
  });

  socket.value.on('notifications', (notifs) => {
    notifications.value = notifs;
  });

  // Request browser notification permission
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
});

onUnmounted(() => {
  socket.value?.close();
});

const markAsRead = (notificationId: string) => {
  socket.value?.emit('mark_as_read', { notificationId });
};

const markAllAsRead = () => {
  socket.value?.emit('mark_all_as_read');
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleString();
};
</script>

<style scoped>
.notification.unread {
  background: #fffbcc;
  border-left: 3px solid #ffa500;
  padding: 15px;
  margin: 10px 0;
}

.notification.read {
  background: #f5f5f5;
  padding: 15px;
  margin: 10px 0;
}

.status.connected {
  color: green;
}

.status.disconnected {
  color: red;
}
</style>
```

## Testing WebSocket Connection

You can test the WebSocket connection using a simple curl command or browser console:

### Browser Console Test

```javascript
// Open browser console on http://localhost:3000
const token = 'YOUR_JWT_TOKEN'; // Get from localStorage or login response

const socket = io('http://localhost:3000/notifications', {
  query: { token },
  transports: ['websocket']
});

socket.on('connect', () => console.log('Connected!'));
socket.on('new_notification', (n) => console.log('New notification:', n));
socket.on('unread_count', (c) => console.log('Unread count:', c));

// Get notifications
socket.emit('get_notifications');

// Get unread count
socket.emit('get_unread_count');
```

## Troubleshooting

### Connection Issues

1. **CORS Error:**
   - Make sure your frontend URL is added to the CORS configuration in `notifications.gateway.ts`
   - Current allowed origins: `http://localhost:3001`, `http://localhost:5173`

2. **Authentication Failed:**
   - Verify that the JWT token is valid
   - Check that the token is not expired
   - Ensure the token is passed correctly (query or header)

3. **Disconnects Immediately:**
   - Check server logs for authentication errors
   - Verify the token format (should be the raw JWT string, not "Bearer TOKEN")

### Debug Mode

Enable Socket.IO debug logging:

```javascript
localStorage.debug = 'socket.io-client:socket';
```

Then refresh the page to see detailed connection logs.

## Security Notes

1. Always use HTTPS/WSS in production
2. Keep JWT tokens secure (use httpOnly cookies when possible)
3. Implement token refresh mechanism for long-lived connections
4. Add rate limiting to prevent WebSocket abuse
5. Validate all incoming messages on the server

## Performance Tips

1. Disconnect socket when component unmounts
2. Debounce frequent emit events
3. Use namespaces to separate different notification types
4. Implement reconnection logic with exponential backoff
5. Consider using Redis adapter for horizontal scaling
