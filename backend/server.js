import 'dotenv/config';
import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = "your_secret_key"; // Replace with an actual secret in .env

// ✅ Enable Middleware
app.use(cors({
    origin: "http://localhost:5173", // ✅ Allow frontend requests
    credentials: true, // ✅ Allow cookies, authorization headers
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json()); // ✅ Parses incoming JSON requests
app.use(express.urlencoded({ extended: true })); // ✅ Parses URL-encoded data
app.use(cookieParser()); // ✅ Required for reading cookies

// ✅ Connect to SQLite Database
const db = new sqlite3.Database('./manufacturing.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('❌ Error connecting to database:', err.message);
    } else {
        console.log('✅ Connected to SQLite database');
    }
});

// ✅ Test Route
app.get('/', (req, res) => {
    res.send('API is running! 🚀');
});

app.get('/manufacturing_procedures/by-lot/:lot_number', (req, res) => {
    const { lot_number } = req.params;

    const query = `
        SELECT mp.mp_number, mp.procedure_name
        FROM lots l
        JOIN config_mp_specs cs ON l.config_number = cs.config_number
        JOIN manufacturing_procedures mp ON cs.mp_number = mp.mp_number
        WHERE l.lot_number = ?;
    `;

    db.all(query, [lot_number], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (rows.length === 0) {
            res.status(404).json({ error: "No MPs found for this lot number." });
            return;
        }
        res.json(rows);
    });
});

// ✅ Register a new user
app.post('/register', async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`;

        db.run(query, [username, hashedPassword, role], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: "✅ User registered successfully!" });
        });
    } catch (error) {
        res.status(500).json({ error: "Error registering user" });
    }
});

// ✅ User Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    const query = `SELECT * FROM users WHERE username = ?`;

    db.get(query, [username], async (err, user) => {
        if (err) {
            console.error("❌ Database Error:", err.message);
            return res.status(500).json({ error: err.message });
        }
        if (!user) {
            console.log("❌ User not found:", username);
            return res.status(401).json({ error: "User not found" });
        }

        console.log("✅ Found user:", user.username);
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            console.log("❌ Incorrect password");
            return res.status(401).json({ error: "Incorrect password" });
        }

        console.log("✅ Password Matched! Logging in...");
        const token = jwt.sign(
            { user_id: user.user_id, username: user.username, role: user.role },
            SECRET_KEY,
            { expiresIn: "1h" }
        );

        res.cookie("auth_token", token, { httpOnly: true, secure: false, maxAge: 3600000 });
        res.json({ message: "✅ Login successful!", role: user.role });
    });
});

// ✅ Get Current Logged-in User
app.get('/current_user', (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    const token = req.cookies.auth_token;

    if (!token) {
        console.log("❌ No token found in cookies");
        return res.status(401).json({ error: "Not authenticated" });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        console.log("✅ User authenticated:", decoded);
        res.json({ user_id: decoded.user_id, username: decoded.username, role: decoded.role });
    } catch (error) {
        console.log("❌ Invalid token:", error.message);
        res.status(401).json({ error: "Invalid token" });
    }
});

// ✅ User Logout
app.post('/logout', (req, res) => {
    res.clearCookie("auth_token");
    res.json({ message: "✅ Logged out successfully!" });
});

// ✅ Get all products
app.get('/products', (req, res) => {
    db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// ✅ Get MVD Config using BR#
app.get('/configurations/by-br/:br_number', (req, res) => {
    const { br_number } = req.params;
    const query = `
        SELECT c.config_number, c.mvd_number, b.br_number 
        FROM configurations c
        JOIN build_records b ON c.config_number = b.config_number
        WHERE b.br_number = ?;
    `;
    db.get(query, [br_number], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: "Configuration not found for this BR#" });
        }
        res.json(row);
    });
});

app.get('/configurations/by-ys/:ys_number', (req, res) => {
    const { ys_number } = req.params;

    const query = `
        SELECT l.config_number, b.br_number
        FROM lots l
        JOIN build_records b ON l.config_number = b.config_number
        WHERE l.ys_number = ?;
    `;

    db.all(query, [ys_number], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (rows.length === 0) {
            res.status(404).json({ error: "No configurations found for this YS#" });
            return;
        }
        res.json(rows);
    });
});
app.get('/manufacturing_procedures/by-config/:config_number', (req, res) => {
    const { config_number } = req.params;

    const query = `
        SELECT mp.mp_number, mp.procedure_name
        FROM config_mp_specs cs
        JOIN manufacturing_procedures mp ON cs.mp_number = mp.mp_number
        WHERE cs.config_number = ?;
    `;

    db.all(query, [config_number], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (rows.length === 0) {
            res.status(404).json({ error: "No MPs found for this configuration." });
            return;
        }
        res.json(rows);
    });
});


// ✅ Start a Build
app.post('/start_build', (req, res) => {
    const { username, lot_number, mp_number } = req.body;

    if (!username || !lot_number || !mp_number) {
        return res.status(400).json({ error: "Username, Lot Number, and MP Number are required" });
    }

    // ✅ Fetch the correct config_number for the given lot_number
    const fetchConfigQuery = `SELECT config_number FROM lots WHERE lot_number = ?`;

    db.get(fetchConfigQuery, [lot_number], (err, row) => {
        if (err) {
            console.error("❌ Error fetching config_number:", err.message);
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: "Lot number not found." });
        }

        const config_number = row.config_number;

        // ✅ Insert or update active_builds with the correct config_number
        const query = `
            INSERT INTO active_builds (username, lot_number, config_number, mp_number, start_time)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(username) DO UPDATE 
            SET lot_number = excluded.lot_number, 
                config_number = excluded.config_number, 
                mp_number = excluded.mp_number, 
                start_time = CURRENT_TIMESTAMP;
        `;

        db.run(query, [username, lot_number, config_number, mp_number], function (err) {
            if (err) {
                console.error("❌ Error starting build:", err.message);
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: `✅ Build started for User ${username} (Lot: ${lot_number}, Config: ${config_number}, MP: ${mp_number})` });
        });
    });
});




// ✅ End a Build


// ✅ Get Active Builds
app.get('/active_builds/:username', (req, res) => {
    const { username } = req.params;

    const query = `
        SELECT build_id, username, lot_number, config_number, mp_number, start_time
        FROM active_builds
        WHERE username = ?;
    `;

    db.get(query, [username], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(row || null);
    });
});
// ✅ Get All Active Builds
app.get('/active_builds', (req, res) => {
    const query = `
        SELECT build_id, username, lot_number, config_number, mp_number, start_time
        FROM active_builds;
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// ✅ End a Build by Username
// ✅ Corrected End Build API
app.post('/end_build', (req, res) => {
    const { username } = req.body;  // ✅ Use username instead of user_id

    if (!username) {
        return res.status(400).json({ error: "Username is required" });
    }

    const query = `DELETE FROM active_builds WHERE username = ?`;

    db.run(query, [username], function (err) {
        if (err) {
            console.error("❌ Error ending build:", err.message);
            return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: "No active build found for this user." });
        }

        res.json({ message: `✅ Build ended for User ${username}` });
    });
});




// ✅ Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
