const express = require('express');
const {
  getAllContactQueries,
  getContactQueryById,
  updateContactQuery,
  deleteContactQuery,
  getContactQueryStats
} = require('../controllers/contactController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * @swagger
 * components:
 *   schemas:
 *     ContactQuery:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "60d5ecb74b24a1234567890a"
 *         name:
 *           type: string
 *           example: "John Doe"
 *         phoneNumber:
 *           type: string
 *           example: "9876543210"
 *         email:
 *           type: string
 *           example: "john@example.com"
 *         query:
 *           type: string
 *           example: "I would like to know about bulk orders for Diwali"
 *         status:
 *           type: string
 *           enum: [new, viewed, in-progress, resolved, closed]
 *           example: "new"
 *         adminNotes:
 *           type: string
 *           example: "Customer contacted via phone"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/admin/contact-queries:
 *   get:
 *     summary: Get all contact queries
 *     description: Retrieve all contact queries with pagination and filtering
 *     tags: [Contact Queries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of queries per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, new, viewed, in-progress, resolved, closed]
 *         description: Filter by status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name, phone, email, or query text
 *     responses:
 *       200:
 *         description: Successfully retrieved contact queries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 queries:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ContactQuery'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalQueries:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *                 statusCounts:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', getAllContactQueries);

/**
 * @swagger
 * /api/admin/contact-queries/stats:
 *   get:
 *     summary: Get contact queries statistics
 *     description: Get statistics about contact queries by status
 *     tags: [Contact Queries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 newQueries:
 *                   type: integer
 *                 viewedQueries:
 *                   type: integer
 *                 inProgressQueries:
 *                   type: integer
 *                 resolvedQueries:
 *                   type: integer
 *                 closedQueries:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/stats', getContactQueryStats);

/**
 * @swagger
 * /api/admin/contact-queries/{id}:
 *   get:
 *     summary: Get contact query by ID
 *     description: Retrieve a specific contact query and mark as viewed if new
 *     tags: [Contact Queries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact query ID
 *     responses:
 *       200:
 *         description: Successfully retrieved contact query
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContactQuery'
 *       404:
 *         description: Contact query not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/:id', getContactQueryById);

/**
 * @swagger
 * /api/admin/contact-queries/{id}:
 *   put:
 *     summary: Update contact query
 *     description: Update contact query status and admin notes
 *     tags: [Contact Queries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact query ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [new, viewed, in-progress, resolved, closed]
 *               adminNotes:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Successfully updated contact query
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 query:
 *                   $ref: '#/components/schemas/ContactQuery'
 *       400:
 *         description: Invalid status value
 *       404:
 *         description: Contact query not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put('/:id', updateContactQuery);

/**
 * @swagger
 * /api/admin/contact-queries/{id}:
 *   delete:
 *     summary: Delete contact query
 *     description: Delete a contact query
 *     tags: [Contact Queries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact query ID
 *     responses:
 *       200:
 *         description: Successfully deleted contact query
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Contact query not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', deleteContactQuery);

module.exports = router;