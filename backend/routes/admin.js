import express from 'express';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import Question from '../models/Question.js';
import Nominee from '../models/Nominee.js';

const router = express.Router();

// Protect all admin routes
router.use(authenticateToken);
router.use(isAdmin);

// Create a new question
router.post('/questions', async (req, res) => {
  try {
    const { title, description, nominees, startTime, endTime } = req.body;
    
    // Create nominees first
    const createdNominees = await Promise.all(
      nominees.map(nominee => new Nominee(nominee).save())
    );

    const question = new Question({
      title,
      description,
      nominees: createdNominees.map(n => n._id),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      isActive: true
    });

    await question.save();
    res.status(201).json(await question.populate('nominees'));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all questions with results
router.get('/results', async (req, res) => {
  try {
    const questions = await Question.find()
      .populate('nominees')
      .sort('-createdAt');

    const results = questions.map(question => ({
      id: question._id,
      title: question.title,
      description: question.description,
      startTime: question.startTime,
      endTime: question.endTime,
      isActive: question.isActive,
      nominees: question.nominees.map(nominee => ({
        id: nominee._id,
        name: nominee.name,
        department: nominee.department,
        votes: nominee.votes
      }))
    }));

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get dashboard statistics
router.get('/statistics', async (req, res) => {
  try {
    const now = new Date();
    const [totalQuestions, activeQuestions, totalVotes] = await Promise.all([
      Question.countDocuments(),
      Question.countDocuments({
        isActive: true,
        startTime: { $lte: now },
        endTime: { $gte: now }
      }),
      Nominee.aggregate([
        {
          $group: {
            _id: null,
            totalVotes: { $sum: '$votes' }
          }
        }
      ])
    ]);

    res.json({
      totalQuestions,
      activeQuestions,
      totalVotes: totalVotes[0]?.totalVotes || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update question
router.put('/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, nominees, startTime, endTime } = req.body;
    
    // Get existing question
    const question = await Question.findById(id).populate('nominees');
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Update question fields
    question.title = title;
    question.description = description;
    question.startTime = new Date(startTime);
    question.endTime = new Date(endTime);

    // Handle nominees
    const existingNominees = question.nominees;
    const updatedNominees = [];

    // Update or create nominees
    for (const nomineeData of nominees) {
      const existingNominee = existingNominees.find(n => 
        n.name === nomineeData.name && n.department === nomineeData.department
      );

      if (existingNominee) {
        // Update existing nominee
        existingNominee.name = nomineeData.name;
        existingNominee.department = nomineeData.department;
        await existingNominee.save();
        updatedNominees.push(existingNominee);
      } else {
        // Create new nominee
        const newNominee = new Nominee({
          ...nomineeData,
          votes: 0
        });
        await newNominee.save();
        updatedNominees.push(newNominee);
      }
    }

    // Remove nominees that are no longer in the list
    const updatedNomineeIds = updatedNominees.map(n => n._id.toString());
    const removedNominees = existingNominees.filter(n => 
      !updatedNomineeIds.includes(n._id.toString())
    );

    if (removedNominees.length > 0) {
      await Nominee.deleteMany({
        _id: { $in: removedNominees.map(n => n._id) }
      });
    }

    // Update question's nominees list
    question.nominees = updatedNominees.map(n => n._id);
    await question.save();
    
    // Return updated question with populated nominees
    const updatedQuestion = await Question.findById(id).populate('nominees');
    res.json(updatedQuestion);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update question status
router.patch('/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const question = await Question.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    ).populate('nominees');
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    res.json(question);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete question
router.delete('/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Question.startSession();
    session.startTransaction();

    try {
      // Get question with nominees
      const question = await Question.findById(id);
      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }

      // Delete nominees
      await Nominee.deleteMany(
        { _id: { $in: question.nominees } },
        { session }
      );

      // Delete question
      await Question.findByIdAndDelete(id, { session });

      await session.commitTransaction();
      session.endSession();

      res.json({ message: 'Question deleted successfully' });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get traffic analytics
router.get('/traffic', async (req, res) => {
  try {
    const { range = '24h' } = req.query;
    const now = new Date();
    let startDate;

    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // 24h
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const trafficData = await Nominee.aggregate([
      {
        $match: {
          lastVoteAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d-%H",
              date: "$lastVoteAt"
            }
          },
          count: { $sum: "$votes" }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);

    // Calculate total traffic and growth
    const totalTraffic = trafficData.reduce((sum, hour) => sum + hour.count, 0);
    const peakHour = trafficData.reduce((max, hour) => 
      hour.count > max.count ? hour : max, 
      { count: 0 }
    );

    // Calculate growth (comparing with previous period)
    const previousStartDate = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
    const previousTraffic = await Nominee.aggregate([
      {
        $match: {
          lastVoteAt: { 
            $gte: previousStartDate,
            $lt: startDate
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$votes" }
        }
      }
    ]);

    const previousTotal = previousTraffic[0]?.total || 0;
    const growth = previousTotal === 0 ? 0 : 
      ((totalTraffic - previousTotal) / previousTotal * 100).toFixed(1);

    res.json({
      data: trafficData.map(hour => ({
        timestamp: hour._id,
        count: hour.count
      })),
      totalTraffic,
      peakHour: peakHour._id || '--:--',
      growth
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 