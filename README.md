# Marmeto Choice Awards (MCA) 2025

A premium voting portal for Marmeto's annual awards ceremony. This application allows employees to vote for their colleagues in various award categories and provides an admin dashboard for managing the voting process.

## Features

- Secure authentication with @marmeto.com email domain restriction
- Real-time voting system with concurrent request handling
- Time-restricted voting (3 hours per question)
- Admin dashboard for creating questions and viewing results
- Beautiful dark theme UI with modern design
- Mobile responsive layout
- Real-time vote counting and result visualization

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB
- JWT for authentication
- Socket.io for real-time updates

### Frontend
- Vanilla JavaScript
- HTML5/CSS3
- Chart.js for vote visualization

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mca2025
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Create a .env file in the backend directory with the following content:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/mca2025
JWT_SECRET=your_jwt_secret_key_here
VOTING_DURATION_HOURS=3
ALLOWED_DOMAIN=marmeto.com
```

4. Start the backend server:
```bash
npm run dev
```

5. Open a new terminal and serve the frontend:
```bash
cd ../frontend
npx http-server
```

The application will be available at:
- Frontend: http://localhost:8080
- Backend API: http://localhost:3000

## Usage

### For Employees
1. Register/Login with your @marmeto.com email
2. View active voting questions
3. Vote for nominees (one vote per question)
4. Track remaining voting time

### For Admins
1. Login with admin credentials
2. Create new voting questions
3. Add nominees to questions
4. View real-time voting results
5. Monitor voting status

## Security Features

- Email domain restriction (@marmeto.com only)
- JWT-based authentication
- Rate limiting for API endpoints
- Secure password hashing
- XSS protection
- CORS configuration

## Performance Optimizations

- Database indexing for faster queries
- Rate limiting to handle concurrent requests
- Efficient vote counting mechanism
- Optimized frontend assets

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is proprietary and confidential. Unauthorized copying or distribution of this project's files, via any medium, is strictly prohibited.

## Support

For support, please contact the IT department or create an issue in the repository. 