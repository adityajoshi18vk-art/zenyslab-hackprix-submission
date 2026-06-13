/**
 * Echo – Decision Blind Spot Detector
 * MongoDB simulations route handler.
 *
 * Routes:
 *   GET  /api/simulations          — list all, sorted by createdAt desc (limit 50)
 *   POST /api/simulations          — insert one simulation document
 *   DELETE /api/simulations/:id    — delete by MongoDB ObjectId string
 */

const { Router } = require('express');
const { ObjectId } = require('mongodb');
const sanitizeHtml = require('sanitize-html');

const router = Router();

/** Returns the `simulations` collection from the db attached to req.app. */
function getCollection(req) {
  return req.app.locals.db.collection('simulations');
}

// ---------------------------------------------------------------------------
// GET /api/simulations
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const collection = getCollection(req);
    const docs = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Map _id ObjectId → mongoId string so the Expo app can use it directly
    const records = docs.map(({ _id, ...rest }) => ({
      ...rest,
      mongoId: _id.toString(),
    }));

    res.json(records);
  } catch (err) {
    console.error('[GET /api/simulations]', err);
    res.status(500).json({ error: 'Failed to fetch simulations', detail: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/simulations
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const collection = getCollection(req);

    // Strip any client-side mongoId / _id before inserting
    const { mongoId, _id, ...document } = req.body;

    if (!document.decisionTitle) {
      return res.status(400).json({ error: 'decisionTitle is required' });
    }

    // Sanitize string inputs: strip HTML, max length 1000
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      const clean = sanitizeHtml(str, {
        allowedTags: [], // Strip all tags
        allowedAttributes: {}
      });
      return clean.substring(0, 1000);
    };

    const sanitizedDoc = {};
    for (const [key, value] of Object.entries(document)) {
      if (typeof value === 'string') {
        sanitizedDoc[key] = sanitizeString(value);
      } else if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
        sanitizedDoc[key] = value.map(sanitizeString);
      } else {
        // Deep objects like 'analysis' are harder to sanitize perfectly without a schema,
        // but since we are preventing NoSQL injection and XSS at the UI layer,
        // we'll pass them through or recursively sanitize if needed.
        sanitizedDoc[key] = value;
      }
    }

    const doc = {
      ...sanitizedDoc,
      createdAt: new Date().toISOString(),
    };

    const result = await collection.insertOne(doc);
    res.status(201).json({ mongoId: result.insertedId.toString() });
  } catch (err) {
    console.error('[POST /api/simulations]', err);
    res.status(500).json({ error: 'Failed to save simulation', detail: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/simulations/:id
// ---------------------------------------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    const collection = getCollection(req);
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid MongoDB ObjectId' });
    }

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Simulation not found' });
    }

    res.status(200).json({ deleted: true });
  } catch (err) {
    console.error('[DELETE /api/simulations/:id]', err);
    res.status(500).json({ error: 'Failed to delete simulation', detail: err.message });
  }
});

module.exports = router;
