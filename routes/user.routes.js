import express from 'express';
import {
    acceptFriendRequest,
    getMyNotifications,
    getMyFriends,
    getMyProfile,
    login,
    logout,
    register,
    searchUser,
    sendFriendRequest,
    updateMyProfile
} from '../controllers/user.js';
import {singleAvatar} from "../middlewares/multer.js";
import {isAuthenticated} from "../middlewares/auth.js";
import {
    acceptRequestValidator,
    loginValidator,
    registerValidator,
    sendRequestValidator,
    validateHandler
} from "../lib/validators.js";

const app = express.Router();

app.post('/register', singleAvatar, registerValidator(), validateHandler, register);
app.post('/login', loginValidator(), validateHandler, login);

app.use(isAuthenticated);
app.get('/profile', getMyProfile);
app.post('/update', singleAvatar, updateMyProfile);
app.get('/logout', logout);
app.get('/search', searchUser);
app.put('/sendrequest', sendRequestValidator(), validateHandler, sendFriendRequest);
app.put('/acceptrequest', acceptRequestValidator(), validateHandler, acceptFriendRequest);
app.get('/notifications', getMyNotifications);
app.get('/friends', getMyFriends);

export default app;
