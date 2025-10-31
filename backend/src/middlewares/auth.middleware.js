import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
    
        if (!token) {
            return res
                .status(401)
                .json(new ApiError(401, "Authentication token is required"));
        }
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) {
                return res
                    .status(403)
                    .json(new ApiError(403, "Invalid or expired token"));
            }
            req.user = user;
            next();
        });
    } catch (error) {
        console.log("error in the middleware: ", error);
       return res.status(500).json(new ApiError(500, "Internal Server Error"));
    }
}