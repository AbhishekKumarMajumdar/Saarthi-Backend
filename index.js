const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const yojanaDatas = require('./data/yojanaData.json');
require('dotenv').config();

const User = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection with error handling
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// Read the yojana data from the JSON file
const yojanaDataPath = path.join(__dirname, 'data', 'yojanaData.json');
let yojanaData = [];

fs.readFile(yojanaDataPath, 'utf8', (err, data) => {
  if (err) {
    console.error("Error reading yojana data:", err);
    return;
  }
  yojanaData = JSON.parse(data);
});

// Register route with eligibility check
// ✅ Registration Route with Default Role
app.post('/register', async (req, res) => {
    try {
        const { password, ...rest } = req.body;

        if (!password) {
            return res.status(400).json({ message: 'Password is required' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Calculate age
        const age = calculateAge(rest.dob);

        // Check eligible schemes
        const eligibleSchemes = yojanaData.filter(scheme => {
            const e = scheme.EligibilityModel;
            return (
                age >= e.age &&
                age <= e.maxAge &&
                rest.income <= e.income &&
                rest.caste === e.caste &&
                rest.gender.trim().toLowerCase() === e.Gender.trim().toLowerCase()
            );
        });

        const newUser = new User({
            ...rest,
            password: hashedPassword,
            role: 'user', // Default role
            SchemeEligibility: eligibleSchemes
        });

        const savedUser = await newUser.save();

        const userWithoutPassword = savedUser.toObject();
        delete userWithoutPassword.password;

        res.status(201).json({ message: 'User registered successfully', user: userWithoutPassword });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: 'Error registering user', error: error.errors || error.message });
    }
});

app.post('/login', async (req, res) => {
  try {
    const { mobileNumber, password } = req.body;

    if (!mobileNumber || !password) {
      return res.status(400).json({ message: 'Mobile number and password are required' });
    }

    const userData = await User.findOne({ mobileNumber });
    if (!userData) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, userData.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // ✅ Recheck eligibility on login
    const eligibleSchemes = await checkEligibility(userData);
    userData.SchemeEligibility = eligibleSchemes;
    await userData.save();

    // ✅ Prepare response
    const userWithoutPassword = userData.toObject();
    delete userWithoutPassword.password;

    res.status(200).json({ message: 'Login successful', user: userWithoutPassword });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: 'Internal server error', error: error.message || error });
  }
});

app.get('/user/schemes/:mobileNumber', async (req, res) => {
  try {
    const { mobileNumber } = req.params;

    const user = await User.findOne({ mobileNumber });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Eligible schemes fetched successfully',
      SchemeEligibility: user.SchemeEligibility || []
    });
  } catch (error) {
    console.error("Error fetching scheme eligibility:", error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Route to return full Yojana Data
app.get('/all-yojana-data', (req, res) => {
  try {
    res.status(200).json({ message: 'All Yojana Data', data: yojanaDatas });
  } catch (error) {
    console.error("Error reading Yojana data:", error);
    res.status(500).json({ message: 'Error fetching yojana data', error: error.message });
  }
});



// Eligibility check function
async function checkEligibility(userData) {
  const { dob, income, caste, gender } = userData;

  // Calculate age from DOB
  const age = calculateAge(dob);

  // Filter eligible schemes based on the user's data
  const eligibleSchemes = yojanaData.filter(scheme => {
    const eligibilityModel = scheme.EligibilityModel;

    // Debugging log to verify scheme eligibility criteria
    console.log("Checking eligibility for scheme:", scheme.title);
    console.log("User Age:", age, "Scheme Age Range:", eligibilityModel.age, eligibilityModel.maxAge);
    console.log("User Income:", income, "Scheme Income Limit:", eligibilityModel.income);
    console.log("User Caste:", caste, "Scheme Caste:", eligibilityModel.caste);
    console.log("User Gender:", gender, "Scheme Gender:", eligibilityModel.Gender);

    // Check eligibility for age, income, caste, and gender
    const isEligible =
      (age >= eligibilityModel.age && age <= eligibilityModel.maxAge) &&
      income <= eligibilityModel.income &&
      caste === eligibilityModel.caste &&
      gender.trim().toLowerCase() === eligibilityModel.Gender.trim().toLowerCase();

    return isEligible;
  });

  // Return eligible schemes or an empty array if no eligible schemes found
  return eligibleSchemes;
}

// Function to calculate age from the given DOB
function calculateAge(dob) {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const month = today.getMonth();

  // Adjust age if the birthday hasn't occurred yet this year
  if (month < birthDate.getMonth() || (month === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

// Default route
app.get('/', (req, res) => {
  res.send('Hello from Backend!');
});

// Ensure the app listens on the correct port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
