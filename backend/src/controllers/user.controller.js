import { asyncHandler } from "../utils/asyncHandler.js";
import { generateToken, generateRefreshToken, verifyRefreshToken, verifyToken } from "../utils/jwt.js";
import { pool } from "../db/index.js";
import bcrypt from "bcryptjs";

export const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }
    const [existingUser] = await pool.execute("SELECT * FROM users WHERE email = ?", [email]);
    if (existingUser.length > 0) {
        return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.execute("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [username, email, hashedPassword]);

    const [createdUser] = await pool.execute("SELECT id, username, email, created_at, updated_at, deleted_at FROM users WHERE email = ?", [email]);
    const user = createdUser[0];

    return res.status(201).json({ message: "User registered successfully", data: { user } });
});

export const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const [users] = await pool.execute("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length === 0) {
        return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = users[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken({ id: user.id });
    const refreshToken = generateRefreshToken({ id: user.id });

    await pool.execute("UPDATE users SET refresh_token = ? WHERE id = ?", [refreshToken, user.id]);

    // Exclude password and refresh_token from response
    delete user.password;
    delete user.refresh_token;

    return res
        .status(200)
        .json({ message: "Login successful",
            data: {
                user,
                token,
                refreshToken
            }
        });
});