# 📡 API Documentation

**Backend-controlled REST API for Elite Fitness Platform**

---

## 🔐 Authentication

All protected endpoints require a Firebase ID token in the Authorization header:

```http
Authorization: Bearer <firebase_id_token>
```

Get token from frontend:
```javascript
const token = await auth.currentUser.getIdToken();
```

---

## 🏥 Health Check

### GET `/`

Health check endpoint for monitoring services.

**Response:**
```json
{
  "status": "ok",
  "message": "Elite Fitness Backend API",
  "timestamp": "2026-05-01T12:00:00.000Z"
}
```

**Status Codes:**
- `200` - Service healthy
- `500` - Service unhealthy

---

## 🔑 Authentication Endpoints

### POST `/api/auth/sync-user`

Sync Firebase user to Supabase database.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "firebase_uid": "firebase_uid",
    "email": "user@example.com",
    "created_at": "2026-05-01T12:00:00.000Z"
  }
}
```

**Status Codes:**
- `200` - User synced successfully
- `401` - Invalid or missing token
- `500` - Server error

---

### GET `/api/auth/me`

Get current user profile from Supabase.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response:**
```json
{
  "id": "uuid",
  "firebase_uid": "firebase_uid",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "date_of_birth": "1990-01-01",
  "membership_plan": "premium",
  "location": "New York",
  "created_at": "2026-05-01T12:00:00.000Z",
  "updated_at": "2026-05-01T12:00:00.000Z"
}
```

**Status Codes:**
- `200` - Profile retrieved successfully
- `401` - Invalid or missing token
- `404` - User not found
- `500` - Server error

---

### PATCH `/api/auth/me`

Update current user profile.

**Headers:**
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "date_of_birth": "1990-01-01",
  "membership_plan": "premium",
  "location": "New York"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "firebase_uid": "firebase_uid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "date_of_birth": "1990-01-01",
    "membership_plan": "premium",
    "location": "New York",
    "updated_at": "2026-05-01T12:00:00.000Z"
  }
}
```

**Status Codes:**
- `200` - Profile updated successfully
- `401` - Invalid or missing token
- `400` - Invalid request body
- `404` - User not found
- `500` - Server error

---

## 📺 Content Endpoints

### GET `/api/content`

Get all content with optional pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "content": [
    {
      "id": "uuid",
      "title": "Workout Video",
      "description": "Intense workout routine",
      "type": "video",
      "category": "fitness",
      "url": "https://example.com/video.mp4",
      "thumbnail": "https://example.com/thumb.jpg",
      "duration": 1800,
      "difficulty": "intermediate",
      "created_at": "2026-05-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

**Status Codes:**
- `200` - Content retrieved successfully
- `500` - Server error

---

### GET `/api/content/:id`

Get specific content by ID.

**Path Parameters:**
- `id`: Content UUID

**Response:**
```json
{
  "id": "uuid",
  "title": "Workout Video",
  "description": "Intense workout routine",
  "type": "video",
  "category": "fitness",
  "url": "https://example.com/video.mp4",
  "thumbnail": "https://example.com/thumb.jpg",
  "duration": 1800,
  "difficulty": "intermediate",
  "tags": ["cardio", "strength"],
  "created_at": "2026-05-01T12:00:00.000Z",
  "updated_at": "2026-05-01T12:00:00.000Z"
}
```

**Status Codes:**
- `200` - Content retrieved successfully
- `404` - Content not found
- `500` - Server error

---

### GET `/api/content/search`

Search content by title or description.

**Query Parameters:**
- `q` (required): Search query
- `category` (optional): Filter by category
- `type` (optional): Filter by type (video, article)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "content": [
    {
      "id": "uuid",
      "title": "Workout Video",
      "description": "Intense workout routine",
      "relevance_score": 0.95
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "pages": 1
  }
}
```

**Status Codes:**
- `200` - Search completed successfully
- `400` - Missing search query
- `500` - Server error

---

### GET `/api/content/category/:category`

Get content by category.

**Path Parameters:**
- `category`: Category name (fitness, nutrition, etc.)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "content": [
    {
      "id": "uuid",
      "title": "Workout Video",
      "category": "fitness",
      "type": "video"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

**Status Codes:**
- `200` - Content retrieved successfully
- `404` - Category not found
- `500` - Server error

---

## ⭐ Favorites Endpoints

### GET `/api/favorites`

Get user's favorite content.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "favorites": [
    {
      "id": "uuid",
      "content_id": "content_uuid",
      "content_type": "video",
      "content": {
        "title": "Workout Video",
        "thumbnail": "https://example.com/thumb.jpg"
      },
      "created_at": "2026-05-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "pages": 1
  }
}
```

**Status Codes:**
- `200` - Favorites retrieved successfully
- `401` - Invalid or missing token
- `500` - Server error

---

### POST `/api/favorites`

Add content to user's favorites.

**Headers:**
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "content_id": "content_uuid",
  "content_type": "video"
}
```

**Response:**
```json
{
  "success": true,
  "favorite": {
    "id": "uuid",
    "content_id": "content_uuid",
    "content_type": "video",
    "created_at": "2026-05-01T12:00:00.000Z"
  }
}
```

**Status Codes:**
- `201` - Favorite added successfully
- `401` - Invalid or missing token
- `400` - Invalid request body
- `409` - Already favorited
- `404` - Content not found
- `500` - Server error

---

### DELETE `/api/favorites/:contentId`

Remove content from user's favorites.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Path Parameters:**
- `contentId`: Content UUID to remove

**Response:**
```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

**Status Codes:**
- `200` - Favorite removed successfully
- `401` - Invalid or missing token
- `404` - Favorite not found
- `500` - Server error

---

### GET `/api/favorites/check/:contentId`

Check if content is in user's favorites.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Path Parameters:**
- `contentId`: Content UUID to check

**Response:**
```json
{
  "is_favorited": true,
  "favorite_id": "uuid"
}
```

**Status Codes:**
- `200` - Check completed successfully
- `401` - Invalid or missing token
- `500` - Server error

---

## 📝 Proposals Endpoints

### GET `/api/proposals`

Get user's workout proposals.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Query Parameters:**
- `status` (optional): Filter by status (pending, approved, rejected)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "proposals": [
    {
      "id": "uuid",
      "user_id": "user_uuid",
      "project_name": "Custom Workout Plan",
      "description": "Personalized workout routine",
      "status": "pending",
      "created_at": "2026-05-01T12:00:00.000Z",
      "updated_at": "2026-05-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

**Status Codes:**
- `200` - Proposals retrieved successfully
- `401` - Invalid or missing token
- `500` - Server error

---

### POST `/api/proposals`

Create new workout proposal.

**Headers:**
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "project_name": "Custom Workout Plan",
  "description": "Personalized workout routine for weight loss",
  "target_audience": "beginners",
  "duration_weeks": 12,
  "equipment_needed": ["dumbbells", "mat"]
}
```

**Response:**
```json
{
  "success": true,
  "proposal": {
    "id": "uuid",
    "user_id": "user_uuid",
    "project_name": "Custom Workout Plan",
    "description": "Personalized workout routine for weight loss",
    "status": "pending",
    "created_at": "2026-05-01T12:00:00.000Z"
  }
}
```

**Status Codes:**
- `201` - Proposal created successfully
- `401` - Invalid or missing token
- `400` - Invalid request body
- `500` - Server error

---

### GET `/api/proposals/:id`

Get specific proposal by ID.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Path Parameters:**
- `id`: Proposal UUID

**Response:**
```json
{
  "id": "uuid",
  "user_id": "user_uuid",
  "project_name": "Custom Workout Plan",
  "description": "Personalized workout routine",
  "target_audience": "beginners",
  "duration_weeks": 12,
  "equipment_needed": ["dumbbells", "mat"],
  "status": "pending",
  "created_at": "2026-05-01T12:00:00.000Z",
  "updated_at": "2026-05-01T12:00:00.000Z"
}
```

**Status Codes:**
- `200` - Proposal retrieved successfully
- `401` - Invalid or missing token
- `404` - Proposal not found
- `500` - Server error

---

### PATCH `/api/proposals/:id`

Update proposal status (admin only).

**Headers:**
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

**Path Parameters:**
- `id`: Proposal UUID

**Request Body:**
```json
{
  "status": "approved",
  "feedback": "Great proposal! Approved for implementation."
}
```

**Response:**
```json
{
  "success": true,
  "proposal": {
    "id": "uuid",
    "status": "approved",
    "feedback": "Great proposal! Approved for implementation.",
    "updated_at": "2026-05-01T12:00:00.000Z"
  }
}
```

**Status Codes:**
- `200` - Proposal updated successfully
- `401` - Invalid or missing token
- `403` - Insufficient permissions
- `404` - Proposal not found
- `500` - Server error

---

### DELETE `/api/proposals/:id`

Delete proposal (user or admin).

**Headers:**
- `Authorization: Bearer <token>` (required)

**Path Parameters:**
- `id`: Proposal UUID

**Response:**
```json
{
  "success": true,
  "message": "Proposal deleted successfully"
}
```

**Status Codes:**
- `200` - Proposal deleted successfully
- `401` - Invalid or missing token
- `403` - Insufficient permissions
- `404` - Proposal not found
- `500` - Server error

---

## 🚨 Error Responses

All endpoints may return these error responses:

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retry_after": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## 📊 Rate Limiting

- **General endpoints**: 60 requests per minute per IP
- **Auth endpoints**: 10 requests per 15 minutes per IP
- **Headers included**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## 🔍 Response Format

All successful responses follow this structure:

```json
{
  "data": {}, // or specific key like "content", "favorites", etc.
  "message": "Success message (optional)",
  "pagination": { // For paginated endpoints
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

## 🌐 Base URL

**Development:** `http://localhost:5000`  
**Production:** `https://your-backend.onrender.com`

---

## 📝 Example Usage

### Get User Profile
```javascript
const token = await auth.currentUser.getIdToken();
const response = await fetch('https://your-backend.onrender.com/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const userData = await response.json();
```

### Add Favorite
```javascript
const token = await auth.currentUser.getIdToken();
const response = await fetch('https://your-backend.onrender.com/api/favorites', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content_id: 'content-uuid',
    content_type: 'video'
  })
});
```

---

**This API is designed to be secure, scalable, and developer-friendly with clear error handling and comprehensive documentation.**
