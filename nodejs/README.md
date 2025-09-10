# Node.js InjectiBank Application

This is a Node.js/TypeScript/Express equivalent of the Python Flask InjectiBank application, designed for security vulnerability training and demonstration.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL Database

### Installation & Setup

1. **Install Dependencies**
   ```bash
   cd nodejs
   npm install
   ```

2. **Configure Database**
   Copy `src/config/index.example.ts` to `src/config/index.ts` and update PostgreSQL settings:
   ```typescript
   export const config = {
     database: {
       type: 'postgres',
       host: 'localhost',
       port: 5432,
       username: 'bankuser',
       password: 'securepassword123',
       database: 'banking'
     }
   };
   ```

3. **Build and Run**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production build and start
   npm run build
   npm start
   
   # Populate database with test data
   npm run populate
   ```

4. **Access Application**
   - Open http://localhost:3000
   - Admin: `admin@injectibank.com` / `admin123`
   - Test User: `test@example.com` / `password`

## 🔒 Security Vulnerabilities (For Training)

This application intentionally contains the following vulnerabilities:

### 1. SQL Injection
- **Location**: Transaction search (`/search`)
- **Test**: Use `' OR '1'='1' --` in search fields
- **Files**: `src/routes/transaction.ts`

### 2. Cross-Site Scripting (XSS)
- **Location**: Feedback display, user profiles
- **Test**: Submit `<script>alert('XSS')</script>` in feedback
- **Files**: `views/feedback_detail.ejs`, `src/routes/feedback.ts`

### 3. Command Injection
- **Location**: Export functionality (`/export`)
- **Test**: Use `; ls` or `& dir` in filename parameter
- **Files**: `src/routes/api.ts`

### 4. Weak Password Hashing
- **Location**: User authentication
- **Issue**: MD5 hashing instead of bcrypt
- **Files**: `src/models/User.ts`

### 5. Session Management Issues
- **Location**: Throughout application
- **Issues**: No session timeout, weak session IDs
- **Files**: `src/app.ts`, `src/middleware/auth.ts`

## 📁 Project Structure

```
nodejs/
├── src/
│   ├── app.ts              # Main Express application
│   ├── config/
│   │   ├── index.ts        # Configuration settings
│   │   └── database.ts     # Database connection setup
│   ├── models/
│   │   ├── User.ts         # User entity (TypeORM)
│   │   ├── Transaction.ts  # Transaction entity
│   │   └── Feedback.ts     # Feedback entity
│   ├── routes/
│   │   ├── index.ts        # Route registration
│   │   ├── home.ts         # Home and dashboard routes
│   │   ├── user.ts         # Authentication routes
│   │   ├── transaction.ts  # Transaction search routes
│   │   ├── feedback.ts     # Feedback routes
│   │   ├── api.ts          # API endpoints
│   │   └── ai.ts           # AI integration routes
│   └── middleware/
│       └── auth.ts         # Authentication middleware
├── views/                  # EJS templates
├── public/                 # Static assets
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── populate-db.ts          # Database population script
```

## 🔧 Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database ORM**: TypeORM
- **Templates**: EJS (equivalent to Jinja2)
- **Authentication**: express-session
- **Validation**: class-validator
- **Security**: helmet, express-rate-limit

## 🔄 Comparison with Python Version

| Feature | Python (Flask) | Node.js (Express) |
|---------|----------------|-------------------|
| **Framework** | Flask | Express.js |
| **Language** | Python | TypeScript |
| **ORM** | SQLAlchemy | TypeORM |
| **Templates** | Jinja2 | EJS |
| **Sessions** | Flask-Session | express-session |
| **Validation** | WTForms | class-validator |
| **Database** | PostgreSQL | PostgreSQL |

## 📝 Available Scripts

```bash
# Development
npm run dev          # Start with nodemon (auto-reload)
npm run build        # Compile TypeScript
npm start            # Start production server

# Database
npm run populate     # Populate with test data
npm run migrate      # Run database migrations

# Testing
npm test             # Run unit tests
npm run test:watch   # Run tests in watch mode

# Utilities
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

## 🐳 Docker Support

The application includes Docker support:

```bash
# Build and run with Docker Compose
docker-compose -f ../docker-compose.yml up nodejs

# Or build standalone
docker build -t injectibank-nodejs .
docker run -p 3000:3000 injectibank-nodejs
```

## 🎯 Learning Objectives

1. **Understand equivalent vulnerabilities across languages**
2. **Compare security implementations in Python vs Node.js**
3. **Practice vulnerability identification and exploitation**
4. **Learn secure coding practices in both ecosystems**

## ⚠️ Important Notes

- **DO NOT use this code in production**
- Vulnerabilities are intentional for educational purposes
- Always validate and sanitize user input in real applications
- Use proper password hashing (bcrypt, not MD5)
- Implement proper session management and CSRF protection

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [TypeORM Security](https://typeorm.io/#/security)

## 🤝 Contributing

This is a training application. If you find additional vulnerabilities or want to add new educational examples, please submit a pull request with detailed documentation.

## 📄 License

Educational use only. See LICENSE file for details.
