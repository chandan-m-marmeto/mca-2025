import mongoose from 'mongoose';

const nomineeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: 'default-avatar.png'
  },
  votes: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const Nominee = mongoose.model('Nominee', nomineeSchema);
export default Nominee; 