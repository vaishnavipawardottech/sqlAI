class ApiError extends Error {
    constructor (
        statusCode,
        message = "something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message)
        this.statusCode = statusCode; // HTTP status code
        this.message = message; // Error message
        this.data = null; // Data to be returned in the response, if any
        this.success = false; // Indicates failure
        this.errors = errors; // Additional error details, if any

        if (stack) {
            this.stack = stack; // Stack trace for debugging
        } else {
            Error.captureStackTrace(this, this.constructor); // Capture stack trace if not provided
        }
    }
}

export { ApiError }