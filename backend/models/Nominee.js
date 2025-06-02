import mongoose from 'mongoose';

const nomineeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: '/uploads/nominees/default-avatar.png'
  },
  votes: {
    type: Number,
    default: 0
  },
  imageProcessed: {
    type: Boolean,
    default: true // Default true for nominees without uploaded images
  },
  tempImagePath: {
    type: String,
    default: null // Stores temporary file path while processing
  },
  imageJobId: {
    type: String,
    default: null // Stores queue job ID for tracking
  }
}, {
  timestamps: true
});

const Nominee = mongoose.model('Nominee', nomineeSchema);
export default Nominee; 