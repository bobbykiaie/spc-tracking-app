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

const authenticate = (req, res, next) => {
    const token = req.cookies.auth_token;
    if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }
};

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

app.get("/inspection_logs/:lot_number/:mp_number", (req, res) => {
    const { lot_number, mp_number } = req.params;

    const query = `
        SELECT * FROM inspection_logs 
        WHERE lot_number = ? AND mp_number = ?
        ORDER BY unit_number ASC
    `;

    db.all(query, [lot_number, mp_number], (err, rows) => {
        if (err) {
            console.error("❌ Error fetching inspection logs:", err);
            return res.status(500).json({ error: "Internal server error" });
        }
        if (rows.length === 0) {
            console.log("⚠️ No inspections found for this lot.");
            return res.json([]); // Return empty array instead of 404
        }
        console.log("✅ Fetched inspection logs:", rows);
        res.json(rows);
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

app.get('/specs/by-config-mp/:config_number/:mp_number', (req, res) => {
    const { config_number, mp_number } = req.params;

    const query = `
        SELECT spec_name, type, upper_spec, lower_spec, nominal, attribute_value
        FROM config_mp_specs
        WHERE config_number = ? AND mp_number = ?;
    `;

    db.all(query, [config_number, mp_number], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (rows.length === 0) {
            res.status(404).json({ error: "No specifications found for this configuration and MP." });
            return;
        }
        res.json(rows);
    });
});




// ✅ Log Inspection
app.post("/log_inspection", (req, res) => {
    const { username, lot_number, config_number, mp_number, spec_name, inspection_type, unit_number, inspection_value } = req.body;

    const checkQuery = `
        SELECT * FROM inspection_logs 
        WHERE lot_number = ? AND unit_number = ? AND spec_name = ? AND mp_number = ?
    `;

    db.get(checkQuery, [lot_number, unit_number, spec_name, mp_number], (err, row) => {
        if (err) {
            console.error("❌ Error checking inspection log:", err);
            return res.status(500).json({ error: "Database error" });
        }

        let pass_fail = "Fail";

        // ✅ Fetch spec limits to determine pass/fail
        const getSpecQuery = `SELECT * FROM config_mp_specs WHERE config_number = ? AND mp_number = ? AND spec_name = ?`;
        db.get(getSpecQuery, [config_number, mp_number, spec_name], (specErr, spec) => {
            if (specErr) {
                console.error("❌ Error fetching spec:", specErr);
                return res.status(500).json({ error: "Failed to retrieve spec" });
            }

            if (spec) {
                if (inspection_type === "Variable") {
                    const lower = spec.lower_spec !== null ? spec.lower_spec : -Infinity;
                    const upper = spec.upper_spec !== null ? spec.upper_spec : Infinity;
                    pass_fail = inspection_value >= lower && inspection_value <= upper ? "Pass" : "Fail";
                } else if (inspection_type === "Attribute") {
                    pass_fail = inspection_value === spec.attribute_value ? "Pass" : "Fail";
                }
            }

            if (row) {
                // ✅ Update existing inspection
                const updateQuery = `
                    UPDATE inspection_logs 
                    SET username = ?, inspection_value = ?, pass_fail = ?, timestamp = CURRENT_TIMESTAMP
                    WHERE lot_number = ? AND unit_number = ? AND spec_name = ? AND mp_number = ?
                `;
                db.run(updateQuery, [username, inspection_value, pass_fail, lot_number, unit_number, spec_name, mp_number], (updateErr) => {
                    if (updateErr) {
                        console.error("❌ Error updating inspection:", updateErr);
                        return res.status(500).json({ error: "Failed to update inspection" });
                    }
                    console.log("✅ Inspection updated successfully with result:", pass_fail);
                    res.json({ success: true, pass_fail });
                });
            } else {
                // ✅ Insert new inspection
                const insertQuery = `
                    INSERT INTO inspection_logs (username, lot_number, config_number, mp_number, spec_name, inspection_type, unit_number, inspection_value, pass_fail, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `;
                db.run(insertQuery, [username, lot_number, config_number, mp_number, spec_name, inspection_type, unit_number, inspection_value, pass_fail], function (insertErr) {
                    if (insertErr) {
                        console.error("❌ Error inserting inspection:", insertErr);
                        return res.status(500).json({ error: "Failed to log inspection" });
                    }
                    console.log("✅ Inspection logged successfully with result:", pass_fail);
                    res.json({ success: true, pass_fail });
                });
            }
        });
    });
});



// ✅ Get Lot Details by Lot Number
app.get('/lots/:lot_number', (req, res) => {
    const { lot_number } = req.params;

    const query = `SELECT lot_number, ys_number, config_number, quantity FROM lots WHERE lot_number = ?`;

    db.get(query, [lot_number], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: "Lot not found" });
        }
        res.json(row);
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


    
app.get('/yield/:lot_number/:mp_number', (req, res) => {
  const { lot_number, mp_number } = req.params;

  // Query to get total distinct units with at least one inspection (processed units)
  const totalProcessedUnitsQuery = `
    SELECT COUNT(DISTINCT unit_number) AS total_processed_units
    FROM inspection_logs 
    WHERE lot_number = ? AND mp_number = ?
  `;

  // Query to get distinct units with at least one "Fail" inspection (rejected units)
  const rejectedUnitsQuery = `
    SELECT COUNT(DISTINCT unit_number) AS rejected_units
    FROM inspection_logs 
    WHERE lot_number = ? AND mp_number = ?
    AND unit_number IN (
      SELECT unit_number 
      FROM inspection_logs 
      WHERE lot_number = ? AND mp_number = ? AND pass_fail = 'Fail'
    )
  `;

  // Query to get distinct units with no "Fail" inspections (passed units)
  const passedUnitsQuery = `
    SELECT COUNT(DISTINCT unit_number) AS passed_units
    FROM inspection_logs 
    WHERE lot_number = ? AND mp_number = ?
    AND unit_number NOT IN (
      SELECT unit_number 
      FROM inspection_logs 
      WHERE lot_number = ? AND mp_number = ? AND pass_fail = 'Fail'
    )
  `;

  db.get(totalProcessedUnitsQuery, [lot_number, mp_number], (err, totalRow) => {
    if (err) {
      console.error("❌ Error fetching total processed units:", err);
      return res.status(500).json({ error: "Database error" });
    }
    const totalProcessedUnits = totalRow?.total_processed_units || 0;

    db.get(rejectedUnitsQuery, [lot_number, mp_number, lot_number, mp_number], (err, rejectedRow) => {
      if (err) {
        console.error("❌ Error fetching rejected units:", err);
        return res.status(500).json({ error: "Database error" });
      }
      const rejectedUnits = rejectedRow?.rejected_units || 0;

      db.get(passedUnitsQuery, [lot_number, mp_number, lot_number, mp_number], (err, passedRow) => {
        if (err) {
          console.error("❌ Error fetching passed units:", err);
          return res.status(500).json({ error: "Database error" });
        }
        const passedUnits = passedRow?.passed_units || 0;
        const yieldPercentage = totalProcessedUnits > 0 ? ((passedUnits / totalProcessedUnits) * 100).toFixed(2) : 100;

        res.json({ yield: yieldPercentage, totalProcessedUnits, passedUnits, rejectedUnits });
      });
    });
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
