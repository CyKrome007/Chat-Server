import {envMode} from "../app.js";

const errorMiddleware = (err, req, res, next) => {
    err.message ||= 'Internal Server Error';
    err.statusCode ||= 500;

    if(err.code === 11000) {
        const error = Object.keys(err.keyPattern).join(',');
        err.message = `Duplicate field - ${error}`;
        err.statusCode = 400;
    }

    if(err.name === 'CastError') {
        err.message = `Invalid Format Of ${err.path}`;
        err.statusCode = 400;
    }

    const response = {
        success: false,
        message : err.message,
    };

    if(envMode === "development") {
        response.error = err;
    }

    return res.status(err.statusCode).json(response);
};

const TryCatch = (passedFunction) => async (req, res, next) => {
    try {
        await passedFunction(req, res, next);
    } catch (error) {
        next(error);
    }
};

export { errorMiddleware, TryCatch };