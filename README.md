# Govt Scheme Q&A Web Application

A web platform for government officials to upload scheme documents and citizens to interact with AI-powered Q&A in Marathi language.

## Features

- **Admin Panel**: Upload and manage government scheme documents
- **Citizen Interface**: Browse schemes and ask questions via text/voice
- **Multilingual Support**: Marathi and English
- **AI-Powered Q&A**: RAG-based responses using Google Gemini
- **Document Processing**: PDF extraction and semantic search
- **User Management**: Admin and super admin roles

## Tech Stack

- **Frontend**: React.js with React Router
- **Backend**: Node.js + Express.js
- **Database**: MongoDB with Vector Search
- **AI**: Google Gemini API
- **File Processing**: PDF parsing and text extraction

## Project Structure

```
govt-scheme-qna/
├── client/          # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── utils/         # Utility functions
└── server/          # Node.js backend
    ├── controllers/ # Route controllers
    ├── models/      # Database models
    ├── routes/      # API routes
    ├── services/    # Business logic
    └── middleware/  # Custom middleware
```

## API Routes

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/register` - Register new admin
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

### Schemes
- `GET /api/schemes` - Get all active schemes
- `POST /api/schemes` - Create new scheme (Admin)
- `PUT /api/schemes/:id` - Update scheme (Admin)
- `DELETE /api/schemes/:id` - Delete scheme (Admin)

### Chat
- `POST /api/chat/ask` - Ask questions about schemes
- `GET /api/chat/history` - Get chat history
- `GET /api/chat/popular/questions` - Get popular questions

### File Upload
- `POST /api/upload/document` - Upload scheme documents
- `GET /api/upload/status/:schemeId` - Get processing status

## Quick Start

```bash
# Install all dependencies
npm run install-all

# Start development servers
npm run dev
```

## Environment Setup

1. Copy `server/env.example` to `server/.env`
2. Configure MongoDB URI and API keys
3. Run `node server/seed.js` to create admin user

## License

MIT License