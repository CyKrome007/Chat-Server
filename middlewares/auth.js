import {TryCatch} from "./error.js";
import {ErrorHandler} from "../utils/utility.js";
import jwt from "jsonwebtoken";
import {adminSecretKey} from "../app.js";
import {User} from "../models/user.js";

const isAuthenticated = (req, res, next) => {
    const token = req.cookies[process.env.COOKIE];
    // console.log('token in auth.js', token);

    if(!token)
        return next(new ErrorHandler('Please Login To Access Profile', 400));

    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decodedData._id;

    // console.log(req.userId);

    next();
};

const adminOnly = (req, res, next) => {
    const token = req.cookies[process.env.ADMIN_COOKIE.toString()];
    // console.log('token in auth.js', token);

    if(!token)
        return next(new ErrorHandler('Only Admin Can Access This Route', 400));

    const secretKey = jwt.verify(token, process.env.JWT_SECRET);

    const isMatched = adminSecretKey === secretKey;

    if(!isMatched)
        return next(new ErrorHandler('Only Admin Can Access This Route', 401));

    // console.log(req.userId);

    next();
};

const socketAuthenticator = async (err, socket, next) => {
    try{
        if(err)
            return next(err);

        const authToken = socket.request.cookies[process.env.COOKIE];

        if(!authToken)
            return next(new ErrorHandler('Please Login To Access This Route', 401));

        const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);
        const user = await User.findById(decodedData._id);
        if(!user)
            return next(new ErrorHandler('Please Login To Access This Route', 401));

        socket.user = user

        return next();

    } catch (e) {
        console.log(e);
        return next(new ErrorHandler('Please Login To Access This Route', 401));
    }
}

export { isAuthenticated, adminOnly, socketAuthenticator };