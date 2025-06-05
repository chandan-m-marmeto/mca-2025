import mongoose from 'mongoose';

const votingSessionSchema = new mongoose.Schema({
  isActive: {
    type: Boolean,
    default: false,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Only allow one active session at a time
votingSessionSchema.pre('save', async function(next) {
  if (this.isActive) {
    const activeSession = await this.constructor.findOne({ 
      isActive: true,
      _id: { $ne: this._id }
    });
    if (activeSession) {
      throw new Error('Another voting session is already active');
    }
  }
  next();
});

const VotingSession = mongoose.model('VotingSession', votingSessionSchema);
export default VotingSession; 