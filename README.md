# 🗺️ Tours Backend API

This project is a backend API that allows tours to be listed, users to register/login, and leave reviews and ratings.
It was developed using JWT-based authentication, secure password storage (hash & salt), and a MongoDB database.

Furthermore, disk storage and memory storage support has been added using multer for file uploads.

## 🚀 Features

- 👤 **User Management**
- User registration
- Login
- Change password
- Reset password (with reset token)
- Authenticate with JWT
- Passwords are hashed and salted with bcrypt

- 🏞️ **Tours**
- List all tours
- View individual tour details
- Add new tours (admin/moderator)
- Update & delete tours (admin/moderator)
- 📷 **Upload tour images (multer + diskStorage)**

- ⭐ **Reviews & Reviews**
- Users can add comments to tours
- Give ratings
- Update/delete comments (only for their own reviews)

- 📂 **File Upload**
- `multer.diskStorage` → Files are saved to disk
- `multer.memoryStorage` → Files are stored in RAM

- 🔐 **Security**
- JWT Authentication
- Role-based Authorization (user/admin)
- Rate Limiting
- XSS & NoSQL Injection Protection
- Cookie & Token Security

## 🛠️ Technologies Used

- [Node.js]
- [Express.js]
- [MongoDB]
- [Mongoose]
- [JWT]
- [bcrypt]
- [Multer] → For file uploads
