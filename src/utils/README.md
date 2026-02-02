# Utils Folder (Utilities)

## What is this folder?

This folder contains **helper functions** that are used throughout the application.

## Simple Explanation

Think of this folder as a **toolbox** with useful tools:
- These are reusable functions that multiple parts of your app need
- They handle common tasks like error handling, logging, formatting responses
- They make the code cleaner and easier to maintain

## What files are here?

- `errors.js` - Custom error classes (different types of errors)
- `logger.js` - Logging system (records what happens in your app)
- `response.js` - Response formatting (makes sure all API responses look the same)
- `sanitize.js` - Input sanitization (cleans user input to prevent attacks)
- `asyncHandler.js` - Error handler wrapper (catches and handles errors automatically)
- `queryParams.js` - Query parameter parsing (extracts URL parameters)
- `validateQuery.js` - Query validation (validates URL parameters)

## How does it work?

These are utility functions used by other parts of the application:

1. **errors.js** - Defines different error types (NotFoundError, BadRequestError, etc.)
2. **logger.js** - Logs events with different levels (error, warning, info, debug)
3. **response.js** - Formats API responses consistently (success/error format)
4. **sanitize.js** - Cleans user input to prevent security issues
5. **asyncHandler.js** - Wraps functions to automatically catch and handle errors
6. **queryParams.js** - Extracts query parameters from URLs
7. **validateQuery.js** - Validates query parameters

## Example

When an error occurs:
- `asyncHandler.js` catches the error
- `errors.js` defines what type of error it is
- `logger.js` logs the error
- `response.js` formats the error response
- The formatted error is sent back to the user

## Why use utilities?

- **Reusability**: Write once, use everywhere
- **Consistency**: All errors/responses look the same
- **Maintainability**: Change in one place, affects everywhere
- **Clean code**: Makes the main code simpler and easier to read

