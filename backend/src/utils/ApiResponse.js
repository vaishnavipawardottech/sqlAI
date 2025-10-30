class ApiResponse {
    constructor(statusCode, data, message = "success") {
        this.statusCode = statusCode; // HTTP status code
        this.data = data; // Data to be returned in the response
        this.message = message; // Optional message for additional context
        this.success = statusCode < 400; // Determine success based on status code
    }
}

export { ApiResponse }