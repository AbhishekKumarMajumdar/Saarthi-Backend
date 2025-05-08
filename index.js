const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // ✅ For password hashing
const cors = require('cors');

require('dotenv').config();

const User = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// ✅ Registration Route with Password Hashing
app.post('/register', async (req, res) => {
    try {
        const { password, ...rest } = req.body;

        if (!password) {
            return res.status(400).json({ message: 'Password is required' });
        }

        // ✅ Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Create new user object
        const newUser = new User({
            ...rest,
            password: hashedPassword
        });

        const savedUser = await newUser.save();

        // ✅ Remove password before sending back
        const userWithoutPassword = savedUser.toObject();
        delete userWithoutPassword.password;

        res.status(201).json({ message: 'User registered successfully', user: userWithoutPassword });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: 'Error registering user', error: error.errors || error.message });
    }
});

// ✅ Route to fetch user by mobile number
app.get('/user/:mobileNumber', async (req, res) => {
    try {
        const { mobileNumber } = req.params;

        const user = await User.findOne({ mobileNumber });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // ✅ Optional: hide password
        const userWithoutPassword = user.toObject();
        delete userWithoutPassword.password;

        res.status(200).json({ user: userWithoutPassword });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: 'Internal server error', error });
    }
});

// ✅ Login Route with Debugging
// ✅ Login Route with Debugging
app.post('/login', async (req, res) => {
    try {
        const { mobileNumber, password } = req.body;

        // Log the incoming request body for debugging
        console.log("Request body:", req.body); // Add this line to check

        // ✅ Check if mobileNumber or password is missing
        if (!mobileNumber || !password) {
            return res.status(400).json({ message: 'Mobile number and password are required' });
        }

        // ✅ Find user by mobileNumber
        const user = await User.findOne({ mobileNumber });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Debugging: Log user object to ensure password exists
        console.log("Fetched user:", user); // Log the user object

        // ✅ Ensure that user has a password field
        if (!user.password) {
            return res.status(500).json({ message: 'User password not found in the database' });
        }

        // ✅ Compare the provided password with the stored hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        // ✅ Remove password before sending response
        const userWithoutPassword = user.toObject();
        delete userWithoutPassword.password;

        // ✅ Success response
        res.status(200).json({ message: 'Login successful', user: userWithoutPassword });

    } catch (error) {
        console.error("Login error:", error); // Log the full error here for better debugging
        res.status(500).json({ message: 'Internal server error', error: error.message || error });
    }
});


// ✅ Default route
app.get('/', (req, res) => {
    res.send('Hello from Backend!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
