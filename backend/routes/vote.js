import express from 'express';
import { auth } from '../middleware/auth.js';
import Question from '../models/Question.js';
import Nominee from '../models/Nominee.js';
import User from '../models/User.js';

const router = express.Router();

// Get all active questions
router.get('/questions', auth, async (req, res) => {
  try {
    const now = new Date();
    const questions = await Question.find({
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gte: now }
    }).populate('nominees');
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit a vote
router.post('/submit', auth, async (req, res) => {
  try {
    const { questionId, nomineeId } = req.body;
    const now = new Date();

    // Check if question is active and within time limit
    const question = await Question.findOne({
      _id: questionId,
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gte: now }
    });

    if (!question) {
      return res.status(400).json({ error: 'Voting is not active for this question' });
    }

    // Check if user has already voted for this question
    const hasVoted = await User.findOne({
      _id: req.user._id,
      'votingHistory.questionId': questionId
    });

    if (hasVoted) {
      return res.status(400).json({ error: 'You have already voted for this question' });
    }

    // Update nominee votes
    await Nominee.findByIdAndUpdate(nomineeId, { $inc: { votes: 1 } });

    // Record user's vote
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        votingHistory: {
          questionId,
          votedFor: nomineeId,
          votedAt: now
        }
      }
    });

    res.json({ message: 'Vote recorded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 