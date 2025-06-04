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
    
    // Only return currently active questions
    const questions = await Question.find({
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gte: now }
    }).populate('nominees').sort({ createdAt: -1 });
    
    console.log(`Found ${questions.length} active questions`);
    
    res.json({ 
      success: true,
      questions: questions 
    });
  } catch (error) {
    console.error('Error loading questions:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Helper function to get question status
const getQuestionStatus = (question) => {
  const now = new Date();
  const start = new Date(question.startTime);
  const end = new Date(question.endTime);

  if (!question.isActive) return 'inactive';
  if (now < start) return 'scheduled';
  if (now > end) return 'expired';
  return 'active';
};

// Submit a vote
router.post('/submit', auth, async (req, res) => {
  try {
    const { questionId, nomineeId } = req.body;
    const now = new Date();

    // Check if question exists and is active
    const question = await Question.findOne({
      _id: questionId,
      isActive: true
      // Remove strict time checking for demo
    });

    if (!question) {
      return res.status(400).json({ 
        success: false,
        error: 'Question not found or not active' 
      });
    }

    // Check if user has already voted for this question
    const hasVoted = await User.findOne({
      _id: req.user._id,
      'votingHistory.questionId': questionId
    });

    if (hasVoted) {
      return res.status(400).json({ 
        success: false,
        error: 'You have already voted for this question' 
      });
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

    res.json({ 
      success: true,
      message: 'Vote recorded successfully' 
    });
  } catch (error) {
    console.error('Error submitting vote:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router; 