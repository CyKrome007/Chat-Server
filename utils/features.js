import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import {v4 as uuid} from "uuid";
import {v2 as cloudinary} from "cloudinary";
import {getBase64, getSockets} from "../lib/helper.js";

const cookieOptions = {
    maxAge: 15 * 24 * 60 * 60 * 1000,
    sameSite: 'none',
    httpOnly: true,
    secure: true,
};

const connectDB = (url) => {
    mongoose.connect(url)
        .then((data) => console.log('Connected to db', data.connection.host))
        .catch((err) => {
            throw err;
        })
};

const sendToken = (res, user, code, message) => {
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);

    return res
        .status(code)
        .cookie(process.env.COOKIE, token, cookieOptions)
        .json({
            success: true,
            token,
            message,
            user
        });
};

const emitEvent = (req, event, users, data) => {
    const io = req.app.get('io');
    const usersSocket = getSockets(users);
    io.to(usersSocket).emit(event, data);
    console.log('Emitting Event', event);
};

const uploadFilesToCloudinary = async (files = []) => {
    const uploadPromise = files.map((file) => {
        return new Promise(async (resolve, reject) => {
            cloudinary.uploader.upload(
                getBase64(file),{
                resource_type: "auto",
                publicKey: uuid(),
            }, (error, result) => {
                if (error) {
                    console.log('error', error);
                    return reject(error);
                }
                resolve(result);
            });
        });
    });

    try {
        const results = await Promise.all(uploadPromise);

        const formattedResults = results.map((result) => ({
            public_id: result.public_id,
            url: result.secure_url,
        }));
        return formattedResults;
    } catch (e) {
        console.log('error', e)
        throw new Error('Error uploading files to cloudinary', e);
    }
};

const deleteFilesFromCloudinary = async(public_ids) => {};

export { connectDB, sendToken, cookieOptions, emitEvent, deleteFilesFromCloudinary, uploadFilesToCloudinary };