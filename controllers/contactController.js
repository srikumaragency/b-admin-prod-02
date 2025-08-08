const ContactQuery = require('../models/ContactQuery');

// Get all contact queries with pagination and filtering
const getAllContactQueries = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { query: { $regex: search, $options: 'i' } }
      ];
    }

    // Get queries with pagination
    const queries = await ContactQuery.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await ContactQuery.countDocuments(filter);

    // Get status counts for dashboard
    const statusCounts = await ContactQuery.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusCountsObj = statusCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.json({
      queries,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalQueries: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      statusCounts: statusCountsObj
    });

  } catch (error) {
    console.error('Error fetching contact queries:', error);
    res.status(500).json({
      message: 'Failed to fetch contact queries'
    });
  }
};

// Get single contact query by ID
const getContactQueryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = await ContactQuery.findById(id);
    if (!query) {
      return res.status(404).json({
        message: 'Contact query not found'
      });
    }

    // Mark as viewed if it's new
    if (query.status === 'new') {
      query.status = 'viewed';
      await query.save();
    }

    res.json(query);

  } catch (error) {
    console.error('Error fetching contact query:', error);
    res.status(500).json({
      message: 'Failed to fetch contact query'
    });
  }
};

// Update contact query status and admin notes
const updateContactQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const validStatuses = ['new', 'viewed', 'in-progress', 'resolved', 'closed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid status value'
      });
    }

    const updateData = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    const query = await ContactQuery.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!query) {
      return res.status(404).json({
        message: 'Contact query not found'
      });
    }

    res.json({
      message: 'Contact query updated successfully',
      query
    });

  } catch (error) {
    console.error('Error updating contact query:', error);
    res.status(500).json({
      message: 'Failed to update contact query'
    });
  }
};

// Delete contact query
const deleteContactQuery = async (req, res) => {
  try {
    const { id } = req.params;

    const query = await ContactQuery.findByIdAndDelete(id);
    if (!query) {
      return res.status(404).json({
        message: 'Contact query not found'
      });
    }

    res.json({
      message: 'Contact query deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting contact query:', error);
    res.status(500).json({
      message: 'Failed to delete contact query'
    });
  }
};

// Get contact queries statistics
const getContactQueryStats = async (req, res) => {
  try {
    const stats = await ContactQuery.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          newQueries: {
            $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] }
          },
          viewedQueries: {
            $sum: { $cond: [{ $eq: ['$status', 'viewed'] }, 1, 0] }
          },
          inProgressQueries: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
          },
          resolvedQueries: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          closedQueries: {
            $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      newQueries: 0,
      viewedQueries: 0,
      inProgressQueries: 0,
      resolvedQueries: 0,
      closedQueries: 0
    };

    res.json(result);

  } catch (error) {
    console.error('Error fetching contact query stats:', error);
    res.status(500).json({
      message: 'Failed to fetch contact query statistics'
    });
  }
};

module.exports = {
  getAllContactQueries,
  getContactQueryById,
  updateContactQuery,
  deleteContactQuery,
  getContactQueryStats
};