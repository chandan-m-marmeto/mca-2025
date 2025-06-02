import mongoose from 'mongoose';

const nomineeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: null // No default image - use CSS initials instead
  },
  votes: {
    type: Number,
    default: 0
  },
  imageProcessed: {
    type: Boolean,
    default: true // Default true since no image to process
  }
}, {
  timestamps: true
});

const Nominee = mongoose.model('Nominee', nomineeSchema);
export default Nominee; 