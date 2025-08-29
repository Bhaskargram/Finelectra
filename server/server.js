// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const axios = require('axios'); // --- NEW: Added axios for fetching images ---

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- Database Schemas (No changes needed here) ---
const SettingSchema = new mongoose.Schema({ key: { type: String, required: true, unique: true }, value: mongoose.Schema.Types.Mixed });
const PositionSchema = new mongoose.Schema({ name: { type: String, required: true, unique: true } });
const ElectionSchema = new mongoose.Schema({ status: { type: String, enum: ['Pending', 'Active', 'Finished'], default: 'Pending' }, resultsPublished: { type: Boolean, default: false } });
const CandidateSchema = new mongoose.Schema({ name: { type: String, required: true }, position: { type: String, required: true }, photo: { type: String, default: '' } });
const VoterSchema = new mongoose.Schema({ voterID: { type: String, required: true, unique: true }, name: { type: String, required: true }, password: { type: String, required: true } });
const QRCodeSchema = new mongoose.Schema({ token: { type: String, required: true, unique: true }, isUsed: { type: Boolean, default: false } });
const VoteSchema = new mongoose.Schema({ qrCode: { type: mongoose.Schema.Types.ObjectId, ref: 'QRCode', required: true }, selections: { type: Map, of: String }, timestamp: { type: Date, default: Date.now } });
const ArchivedResultSchema = new mongoose.Schema({ year: { type: Number, required: true }, results: { type: Array, required: true } });
const ActiveSessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voter', required: true, unique: true },
    userName: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: '1m' } },
});
const ScanLogSchema = new mongoose.Schema({
    monitorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voter', required: true },
    monitorName: { type: String, required: true },
    qrToken: { type: String, required: true },
    status: { type: String, enum: ['valid', 'invalid_token', 'already_used'], required: true },
    timestamp: { type: Date, default: Date.now }
});

const Setting = mongoose.model('Setting', SettingSchema);
const Position = mongoose.model('Position', PositionSchema);
const Election = mongoose.model('Election', ElectionSchema);
const Candidate = mongoose.model('Candidate', CandidateSchema);
const Voter = mongoose.model('Voter', VoterSchema);
const QRCodeModel = mongoose.model('QRCode', QRCodeSchema);
const Vote = mongoose.model('Vote', VoteSchema);
const ArchivedResult = mongoose.model('ArchivedResult', ArchivedResultSchema);
const ActiveSession = mongoose.model('ActiveSession', ActiveSessionSchema);
const ScanLog = mongoose.model('ScanLog', ScanLogSchema);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    // --- MODIFIED: Added new settings for initialization ---
    const initialSettings = {
        appTitle: 'Finelectra',
        logoUrl: '',
        secondaryLogoUrl: '',
        collegeName: '',
        collegeLogoUrl: '',
        qrIconUrl: '',
        emergencyLogoutEnabled: false,
        fullscreenButtonEnabled: true,
        publicScreenEnabled: false,
    };
    Object.entries(initialSettings).forEach(async ([key, value]) => {
        const settingExists = await Setting.findOne({ key });
        if (!settingExists) {
            await new Setting({ key, value }).save();
            console.log(`Setting '${key}' initialized.`);
        }
    });
    Election.findOne().then(election => {
        if (!election) new Election().save().then(() => console.log('Election status initialized.'));
    });
  })
  .catch(err => console.error('MongoDB Connection Error:', err));

// --- Middleware & Routers ---
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); } catch (e) { res.status(400).json({ msg: 'Token is not valid' }); }
};
const adminAuth = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied. Admin only.' });
    next();
};
const apiRouter = express.Router();
const adminRouter = express.Router();
adminRouter.use(auth, adminAuth);

// --- Public API Endpoints ---
apiRouter.get('/election/config', async (req, res) => {
    try {
        const election = await Election.findOne() || new Election();
        const candidates = await Candidate.find();
        const positions = await Position.find();
        const settingsList = await Setting.find();
        const settingsMap = settingsList.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {});
        // --- MODIFIED: Added all new settings to the config response ---
        res.json({
            election, candidates, positions,
            appTitle: settingsMap.appTitle || 'Finelectra',
            logoUrl: settingsMap.logoUrl || '',
            secondaryLogoUrl: settingsMap.secondaryLogoUrl || '',
            collegeName: settingsMap.collegeName || '',
            collegeLogoUrl: settingsMap.collegeLogoUrl || '',
            qrIconUrl: settingsMap.qrIconUrl || '',
            emergencyLogoutEnabled: settingsMap.emergencyLogoutEnabled === true || settingsMap.emergencyLogoutEnabled === 'true',
            fullscreenButtonEnabled: settingsMap.fullscreenButtonEnabled !== false && settingsMap.fullscreenButtonEnabled !== 'false',
            publicScreenEnabled: settingsMap.publicScreenEnabled === true || settingsMap.publicScreenEnabled === 'true'
        });
    } catch (err) { console.error(err); res.status(500).json({ msg: 'Server Error' }); }
});
apiRouter.get('/public-results', async (req, res) => {
    try {
        const publicScreenEnabled = await Setting.findOne({ key: 'publicScreenEnabled' });
        if (!publicScreenEnabled || (publicScreenEnabled.value !== 'true' && publicScreenEnabled.value !== true)) {
             return res.status(403).json({ msg: 'Public results screen is not enabled.'});
        }
        const votes = await Vote.find();
        const candidates = await Candidate.find();
        const results = {};
        candidates.forEach(c => results[c.id] = { ...c.toObject(), votes: 0 });
        votes.forEach(vote => {
            for (const [, candId] of vote.selections) {
                if (results[candId]) results[candId].votes++;
            }
        });
        res.json(Object.values(results));
    } catch (err) {
        console.error("Public results error:", err);
        res.status(500).json({ msg: 'Server error fetching public results.' });
    }
});
apiRouter.post('/auth/voter-login', async (req, res) => {
    const { voterId, password } = req.body;
    try {
        const election = await Election.findOne() || new Election();
        if (election.status !== 'Active') return res.status(403).json({ msg: `Election is not active. Current status: ${election.status}` });
        const voter = await Voter.findOne({ voterID: voterId });
        if (!voter || !(await bcrypt.compare(password, voter.password))) return res.status(400).json({ msg: 'Invalid Credentials' });
        const sessionLengthInMinutes = 2;
        const expiresAt = new Date(Date.now() + sessionLengthInMinutes * 60 * 1000);
        await ActiveSession.findOneAndUpdate({ userId: voter._id }, { userName: voter.name, expiresAt }, { upsert: true, new: true });
        const payload = { id: voter.id, name: voter.name, role: 'voter' };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
        res.json({ token, user: { id: voter.id, name: voter.name, role: 'voter' } });
    } catch (err) { console.error(err); res.status(500).json({ msg: 'Server Error' }); }
});
apiRouter.post('/auth/admin-login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        const payload = { username: username, role: 'admin' };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, user: { username, role: 'admin' } });
    } else { res.status(401).json({ msg: 'Invalid Admin Credentials' }); }
});
apiRouter.get('/auth/verify', auth, (req, res) => res.json(req.user));

// --- Voter Endpoints ---
apiRouter.post('/vote/validate-qr', auth, async (req, res) => {
    const { qrToken } = req.body;
    const { id: monitorId, name: monitorName } = req.user;
    try {
        const qrCode = await QRCodeModel.findOne({ token: qrToken });
        if (!qrCode) {
            await new ScanLog({ monitorId, monitorName, qrToken, status: 'invalid_token' }).save();
            return res.status(404).json({ msg: 'Invalid QR Code.' });
        }
        if (qrCode.isUsed) {
            await new ScanLog({ monitorId, monitorName, qrToken, status: 'already_used' }).save();
            return res.status(400).json({ msg: 'This QR code has already been used.' });
        }
        await new ScanLog({ monitorId, monitorName, qrToken, status: 'valid' }).save();
        res.json({ msg: 'QR Code is valid.', qrCodeId: qrCode.id });
    } catch (err) { console.error(err); res.status(500).json({ msg: 'Server Error' }); }
});
apiRouter.post('/vote/cast', auth, async (req, res) => {
    const { qrCodeId, selections } = req.body;
    try {
        const qrCode = await QRCodeModel.findById(qrCodeId);
        if (!qrCode || qrCode.isUsed) return res.status(400).json({ msg: 'Vote cannot be cast. QR is invalid or used.' });
        await new Vote({ qrCode: qrCodeId, selections }).save();
        qrCode.isUsed = true;
        await qrCode.save();
        res.json({ msg: 'Vote cast successfully!' });
    } catch (err) { console.error(err); res.status(500).json({ msg: 'Server Error' }); }
});
apiRouter.post('/vote/heartbeat', auth, async (req, res) => {
    try {
        if (req.user.role !== 'voter') return res.status(403).json({ msg: 'Only monitors can send heartbeats.' });
        const sessionLengthInMinutes = 2;
        const expiresAt = new Date(Date.now() + sessionLengthInMinutes * 60 * 1000);
        await ActiveSession.findOneAndUpdate({ userId: req.user.id }, { expiresAt, userName: req.user.name }, { upsert: true });
        res.status(200).json({ msg: 'Heartbeat received.' });
    } catch (err) { console.error('Heartbeat error:', err); res.status(500).json({ msg: 'Server Error' }); }
});

// --- Admin Endpoints ---
adminRouter.get('/live-stats', async (req, res) => {
    try {
        await ActiveSession.deleteMany({ expiresAt: { $lt: new Date() } });
        const fiveSecondsAgo = new Date(Date.now() - 5 * 1000);
        const [totalVotes, activeMonitors, newInvalidScans, newUsedScans] = await Promise.all([
            Vote.countDocuments(),
            ActiveSession.find().select('userName -_id').lean(),
            ScanLog.find({ status: 'invalid_token', timestamp: { $gte: fiveSecondsAgo } }).select('monitorName -_id').lean(),
            ScanLog.find({ status: 'already_used', timestamp: { $gte: fiveSecondsAgo } }).select('monitorName -_id').lean()
        ]);
        res.json({ totalVotes, activeMonitors: activeMonitors.map(m => m.userName), newInvalidScans, newUsedScans, lastUpdated: new Date().toISOString() });
    } catch(err) { console.error('Live stats error:', err); res.status(500).json({ msg: 'Server Error fetching live stats' }); }
});
adminRouter.get('/monitor-details', async(req, res) => {
    try {
        await ActiveSession.deleteMany({ expiresAt: { $lt: new Date() } });
        const [activeMonitors, scanLogs] = await Promise.all([
            ActiveSession.find().select('userName -_id').lean(),
            ScanLog.find().sort({ timestamp: -1 }).limit(100).lean()
        ]);
        res.json({ activeMonitors: activeMonitors.map(m => m.userName), scanLogs });
    } catch(err) { console.error('Monitor details error:', err); res.status(500).json({ msg: 'Server error fetching monitor details.' }); }
});
adminRouter.get('/voters', async (req, res) => res.json(await Voter.find().select('-password')));
adminRouter.post('/voters', async (req, res) => {
    const { voterID, name, password } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        res.status(201).json(await new Voter({ voterID, name, password: hashedPassword }).save());
    } catch (err) { res.status(400).json({ msg: 'Error creating voter. Voter ID may already exist.' }); }
});
adminRouter.put('/voters/:id', async (req, res) => {
    const { voterID, name, password } = req.body;
    try {
        const updatedData = { voterID, name };
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updatedData.password = await bcrypt.hash(password, salt);
        }
        const voter = await Voter.findByIdAndUpdate(req.params.id, updatedData, { new: true });
        res.json(voter);
    } catch (err) { res.status(400).json({ msg: 'Error updating voter.' }); }
});
adminRouter.delete('/voters/:id', async (req, res) => {
    try {
        await Voter.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Voter deleted' });
    } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});
adminRouter.get('/candidates', async (req, res) => res.json(await Candidate.find()));
adminRouter.post('/candidates', async (req, res) => res.status(201).json(await new Candidate(req.body).save()));
adminRouter.put('/candidates/:id', async (req, res) => {
    try {
        const candidate = await Candidate.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(candidate);
    } catch (err) { res.status(400).json({ msg: 'Error updating candidate.' }); }
});
adminRouter.delete('/candidates/:id', async (req, res) => {
    try {
        await Candidate.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Candidate deleted' });
    } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});
adminRouter.put('/election/status', async (req, res) => res.json(await Election.findOneAndUpdate({}, req.body, { new: true, upsert: true })));
adminRouter.get('/results', async (req, res) => {
    const votes = await Vote.find();
    const candidates = await Candidate.find();
    const results = {};
    candidates.forEach(c => results[c.id] = { ...c.toObject(), votes: 0 });
    votes.forEach(vote => {
        for (const [pos, candId] of vote.selections) {
            if (results[candId]) results[candId].votes++;
        }
    });
    res.json(Object.values(results));
});
adminRouter.put('/settings', async (req, res) => {
    const { key, value } = req.body;
    // --- MODIFIED: Added new setting keys to the validation list ---
    const validKeys = [
        'appTitle', 'logoUrl', 'secondaryLogoUrl', 'collegeName', 'collegeLogoUrl',
        'qrIconUrl', 'emergencyLogoutEnabled', 'fullscreenButtonEnabled', 'publicScreenEnabled'
    ];
    if (!validKeys.includes(key)) return res.status(400).json({ msg: 'Invalid setting key' });
    res.json(await Setting.findOneAndUpdate({ key }, { value }, { new: true, upsert: true }));
});
adminRouter.get('/positions', async (req, res) => res.json(await Position.find()));
adminRouter.post('/positions', async (req, res) => res.status(201).json(await new Position({ name: req.body.name }).save()));
adminRouter.delete('/positions/:id', async (req, res) => res.json(await Position.findByIdAndDelete(req.params.id)));
adminRouter.post('/election/reset', async (req, res) => {
    try {
        const votes = await Vote.find();
        if (votes.length > 0) {
            const candidates = await Candidate.find();
            const results = {};
            candidates.forEach(c => results[c.id] = { ...c.toObject(), votes: 0 });
            votes.forEach(vote => {
                for (const [pos, candId] of vote.selections) {
                    if (results[candId]) results[candId].votes++;
                }
            });
            await new ArchivedResult({ year: new Date().getFullYear(), results: Object.values(results) }).save();
        }
        await Vote.deleteMany({});
        await QRCodeModel.deleteMany({});
        await ActiveSession.deleteMany({});
        await ScanLog.deleteMany({});
        const updatedElection = await Election.findOneAndUpdate({}, { status: 'Pending', resultsPublished: false }, { new: true, upsert: true });
        res.json({ msg: 'Election has been reset successfully.', election: updatedElection });
    } catch (err) { console.error("Error resetting election:", err); if (!res.headersSent) res.status(500).json({ msg: 'Server Error during reset' }); }
});
adminRouter.get('/generate-qrcodes', async (req, res) => {
    try {
        const count = parseInt(req.query.count, 10);
        if (isNaN(count) || count <= 0 || count > 5000) return res.status(400).json({ msg: 'Please provide a valid count between 1 and 5000.' });

        // --- MODIFIED: This logic now safely adds new codes without checking election state ---
        // This allows generating more codes even during an 'Active' election.

        const doc = new PDFDocument({ margin: 50, layout: 'portrait', size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=qrcodes_${count}.pdf`);
        doc.pipe(res);
        const codesPerPage = 12, colWidth = (doc.page.width - 100) / 3, rowHeight = (doc.page.height - 100) / 4;
        for (let i = 0; i < count; i++) {
            const token = `ELECTION-TOKEN-${crypto.randomBytes(16).toString('hex')}`;
            await new QRCodeModel({ token }).save(); // This adds a new code
            const qrDataURL = await QRCode.toDataURL(token);
            const x = 50 + (i % 3) * colWidth, y = 50 + Math.floor((i % codesPerPage) / 3) * rowHeight;
            doc.image(qrDataURL, x + 20, y + 20, { width: 120 });
            doc.text(`Code #${i + 1}`, x, y + 150, { align: 'center', width: colWidth });
            if ((i + 1) % codesPerPage === 0 && (i + 1) < count) doc.addPage();
        }
        doc.end();
    } catch (err) { console.error(err); res.status(500).json({ msg: 'Server Error during PDF generation' }); }
});
adminRouter.get('/archived-results', async (req, res) => res.json(await ArchivedResult.find().sort({ year: -1 })));

// --- CORRECTED: Replace the entire old '/results/published-download' route with this new one ---
adminRouter.get('/results/published-download', async (req, res) => {
    try {
        const election = await Election.findOne();
        if (!election || !election.resultsPublished) return res.status(403).json({ msg: 'Results are not published yet.' });

        // 1. Fetch all required data
        const [votes, candidates, positions, settingsList] = await Promise.all([
            Vote.find(),
            Candidate.find(),
            Position.find(),
            Setting.find()
        ]);

        const settingsMap = settingsList.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {});

        const collegeName = settingsMap.collegeName || 'Election Committee';
        const appTitle = settingsMap.appTitle || 'Official Election';

        // 2. Fetch college logo if URL is provided
        let logoImageBuffer = null;
        if (settingsMap.collegeLogoUrl) {
            try {
                const response = await axios.get(settingsMap.collegeLogoUrl, { responseType: 'arraybuffer' });
                logoImageBuffer = Buffer.from(response.data, 'binary');
            } catch (error) {
                console.error(`Failed to fetch college logo from ${settingsMap.collegeLogoUrl}:`, error.message);
            }
        }

        // 3. Setup PDF Document
        const doc = new PDFDocument({ margin: 50, bufferPages: true });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=official_election_results_${new Date().getFullYear()}.pdf`);
        doc.pipe(res);

        // 4. Define a reusable header function with corrected alignment
        const addHeader = (pdfDoc) => {
            const pageMargin = 50;
            const headerY = pageMargin - 20; // Starting Y position for the header

            // Draw logo on the left
            if (logoImageBuffer) {
                pdfDoc.image(logoImageBuffer, pageMargin, headerY, { height: 50, keepAspectRatio: true });
            }

            // Draw text aligned to the right
            pdfDoc.fontSize(18).text(collegeName, { align: 'right' });
            pdfDoc.moveDown(0.5);
            pdfDoc.fontSize(14).text(`${appTitle} Results - ${new Date().getFullYear()}`, { align: 'right' });

            // Draw a line below the header content
            const lineY = headerY + 65;
            pdfDoc.moveTo(pageMargin, lineY).lineTo(pdfDoc.page.width - pageMargin, lineY).stroke();

            // Set the cursor position for the main content, well below the header
            pdfDoc.y = lineY + 20;
        };

        // 5. Add header to the first page and set up for subsequent pages
        addHeader(doc);
        doc.on('pageAdded', () => addHeader(doc));

        // 6. Calculate results
        const results = {};
        candidates.forEach(c => results[c._id] = { ...c.toObject(), votes: 0 });
        votes.forEach(vote => {
            for (const [posName, candId] of vote.selections) {
                if (results[candId]) results[candId].votes++;
            }
        });

        const groupedResults = positions.reduce((acc, position) => {
            acc[position.name] = candidates.filter(c => c.position === position.name).map(c => ({ ...c.toObject(), votes: results[c._id]?.votes || 0 })).sort((a, b) => b.votes - a.votes);
            return acc;
        }, {});

        // 7. Add content to the PDF
        for (const positionName in groupedResults) {
            const candidatesForPosition = groupedResults[positionName];
            
            // Check if content fits, if not, add a new page (header will be added automatically)
            const contentHeight = (candidatesForPosition.length + 2) * 25;
            if (doc.y + contentHeight > doc.page.height - doc.page.margins.bottom) {
                 doc.addPage();
            }

            doc.fontSize(20).text(positionName.charAt(0).toUpperCase() + positionName.slice(1), { underline: true });
            doc.moveDown(0.5);
            
            if (candidatesForPosition.length === 0) {
                doc.fontSize(12).text('No candidates for this position.', { indent: 20 });
                doc.moveDown();
                continue;
            }

            candidatesForPosition.forEach((c, index) => {
                const winnerText = index === 0 && c.votes > 0 ? ' (Winner)' : '';
                doc.fontSize(14).text(`${c.name}: ${c.votes} votes${winnerText}`, { indent: 20 });
            });
            doc.moveDown();
        }

        // 8. Finalize the PDF
        doc.end();

    } catch (err) {
        console.error("Error generating published results PDF:", err);
        if (!res.headersSent) res.status(500).json({ msg: 'Server Error during published PDF generation' });
    }
});


app.use('/api/admin', adminRouter);
app.use('/api', apiRouter);

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));