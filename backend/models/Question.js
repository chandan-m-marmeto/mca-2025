import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  nominees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nominee'
  }],
  isActive: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Question = mongoose.model('Question', questionSchema);
export default Question; 