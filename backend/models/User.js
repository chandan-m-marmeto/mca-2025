import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Admin email patterns
const ADMIN_EMAIL_PATTERNS = [
    /@admin\.marmeto\.com$/,  // admin@admin.marmeto.com
    /^admin@marmeto\.com$/,   // admin@marmeto.com
    /^(hr|manager)@marmeto\.com$/  // hr@marmeto.com, manager@marmeto.com
];

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return v.endsWith('@marmeto.com') || v.endsWith('@admin.marmeto.com');
      },
      message: 'Email must be from marmeto.com domain'
    }
  },
  password: {
    type: String,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  votingHistory: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    votedFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Nominee'
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Set admin status based on email pattern
userSchema.pre('save', async function(next) {
  // Set admin status if email matches any admin pattern
  this.isAdmin = ADMIN_EMAIL_PATTERNS.some(pattern => pattern.test(this.email));

  // Only hash password if it's new or modified
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User; 