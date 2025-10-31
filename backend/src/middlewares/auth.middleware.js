// Simple single-user middleware - No authentication needed
export const setSingleUser = (req, res, next) => {
    // Set default user ID for single-user mode
    req.user = {
        id: 'default_user'
    };
    next();
}

// Keep old name for compatibility
export const authenticateToken = setSingleUser;