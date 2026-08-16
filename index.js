require("dotenv").config();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");

const { HoldingsModel } = require("./model/HoldingsModel");
const { PositionsModel } = require("./model/PositionsModel");
const { OrdersModel } = require("./model/OrdersModel");
const { UserModel } = require("./model/UserModel");

const PORT = process.env.PORT || 3002;
const uri = process.env.MONGO_URL;
const JWT_SECRET =
  process.env.JWT_SECRET || "zerodha_clone_secret_2026";

const app = express();

app.use(cors());
app.use(bodyParser.json());


// ==================== AUTH MIDDLEWARE ====================

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Invalid token",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();

  } catch (error) {
    console.log("Token Error:", error);

    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};


// ==================== HOLDINGS ====================

app.get("/allHoldings", async (req, res) => {
  try {
    const allHoldings = await HoldingsModel.find({});
    res.json(allHoldings);
  } catch (error) {
    console.log("Holdings Error:", error);

    res.status(500).json({
      message: "Failed to fetch holdings",
    });
  }
});


// ==================== POSITIONS ====================

app.get("/allPositions", async (req, res) => {
  try {
    const allPositions = await PositionsModel.find({});
    res.json(allPositions);
  } catch (error) {
    console.log("Positions Error:", error);

    res.status(500).json({
      message: "Failed to fetch positions",
    });
  }
});


// ==================== SIGNUP ====================

app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const existingUser = await UserModel.findOne({
      email,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const newUser = new UserModel({
      name: name,
      email: email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({
      message: "Signup successful",
    });

  } catch (error) {
    console.log("Signup Error:", error);

    res.status(500).json({
      message: "Signup failed",
    });
  }
});


// ==================== LOGIN ====================

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Login Email:", email);

    const user = await UserModel.findOne({
      email,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        name: user.name,
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.status(200).json({
      message: "Login successful",

      token: token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });

  } catch (error) {
    console.log("Login Error:", error);

    res.status(500).json({
      message: "Login failed",
    });
  }
});


// ==================== VERIFY LOGIN ====================

app.get("/verify", verifyToken, async (req, res) => {
  try {
    const user = await UserModel.findById(
      req.user.userId
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "Authentication successful",
      user: user,
    });

  } catch (error) {
    console.log("Verify Error:", error);

    res.status(500).json({
      message: "Authentication failed",
    });
  }
});


// ==================== NEW ORDER ====================

app.post("/newOrders", async (req, res) => {
  try {
    const newOrders = new OrdersModel({
      name: req.body.name,
      qty: req.body.qty,
      price: req.body.price,
      mode: req.body.mode,
    });

    await newOrders.save();

    res.status(201).json({
      message: "Order saved",
    });

  } catch (error) {
    console.log("Order Error:", error);

    res.status(500).json({
      message: "Order failed",
    });
  }
});


// ==================== DATABASE + SERVER ====================

const startServer = async () => {
  try {
    await mongoose.connect(uri);

    console.log("MongoDB Connected");

    app.listen(PORT, () => {
      console.log(`App started on port ${PORT}`);
    });

  } catch (error) {
    console.log("MongoDB Connection Error:", error);
  }
};

startServer();