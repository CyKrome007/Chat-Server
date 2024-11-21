import {User} from '../models/user.js';
import {cookieOptions, emitEvent, sendToken, uploadFilesToCloudinary} from "../utils/features.js";
import {compare} from "bcrypt";
import {TryCatch} from "../middlewares/error.js";
import {ErrorHandler} from "../utils/utility.js";
import {Chat} from "../models/chat.js";
import {Request} from "../models/request.js";
import {NEW_REQUEST, REFETCH_CHATS} from "../constants/events.js";
import {getOtherMember} from "../lib/helper.js";

const register = TryCatch(async (req, res, next) => {
    const { name, username, password, bio } = req.body;

    const file = req.file;

    console.log(req)

    if(!file)
        return next(new ErrorHandler('Please Upload Avatar'));

    const result = await uploadFilesToCloudinary([file]);

    const avatar = {
        public_id: result[0].public_id,
        url: result[0].url,
    }

    const user = await User.create({
        name,
        bio,
        username,
        password,
        avatar,
    });

    sendToken(res, user, 201, 'User created successfully.');
});

const login = TryCatch(async (req, res, next) => {
    const {username, password} = req.body;
    const user = await User.findOne({username}).select('+password');
    if(!user) {
        return next(new ErrorHandler('Invalid Username.', 401));
    }

    const isPasswordMatch = await compare(password, user.password);
    if(!isPasswordMatch) {
        return next(new ErrorHandler('Invalid Password.', 401));
    }

    sendToken(res, user, 200, `Welcome Back, ${user.name}.`);

});

const getMyProfile = TryCatch(async (req, res, next) => {

    const userId = await User.findById(req.userId).select('+password');

    if(!userId)
        return next(new ErrorHandler('User not found.', 404));

    res.status(200).json({
        success: true,
        message: 'getMyProfileSuccess',
        data: userId,
    });
});

const logout = TryCatch(async (req, res) => {

    return res
        .status(200)
        .cookie(process.env.COOKIE, '', { ...cookieOptions, maxAge: 0 })
        .json({
            success: true,
            message: 'Logout success',
        });
});

const searchUser = TryCatch(async (req, res) => {

    const {name} = req.query;

    const myChats = await Chat.find({
        groupChat: false,
        members: req.userId,
    });

    const allUsersFromMyChats = myChats.flatMap((chat) => chat.members);

    const allUsersExceptMeAndFriends = await User.find({
        _id: { $nin: allUsersFromMyChats },
        name: { $regex: name, $options: 'i' }, // options 'i' -> case-insensitive
    });

    const users = allUsersExceptMeAndFriends.map(({_id, name, avatar}) => ({
        _id,
        name,
        avatar: avatar.url
    }));

    return res
        .status(200)
        .json({
            success: true,
            message: 'Chats Retrieved',
            users
        });
});

const sendFriendRequest = TryCatch(async (req, res, next) => {

    const { userId: otherUserId } = req.body;

    // const request = await Request.findOne({
    //     $or: [
    //         { sender: req.userId, receiver: otherUserId },
    //         { sender: otherUserId, receiver: req.userId }
    //     ]
    // });

    const sentRequest = await Request.findOne({
        sender: req.userId, receiver: otherUserId,
    })

    if(sentRequest)
        return next(new ErrorHandler('Request Already Sent', 400));
    else {
        const receivedRequest = await Request.findOne({
            receiver: req.userId, sender: otherUserId,
        })
        if(receivedRequest)
            return next(new ErrorHandler('You Already Have A Pending Request From Them', 400));
    }

    await Request.create({
        sender: req.userId,
        receiver: otherUserId
    });

    emitEvent(req, NEW_REQUEST, [otherUserId], 'request');

    return res
        .status(200)
        .json({
            success: true,
            message: 'Friend Request Sent',
        });
});

const acceptFriendRequest = TryCatch(async (req, res, next) => {

    const { requestId, accept } = req.body;

    const request = await Request.findById(requestId).populate('sender', 'name').populate('receiver', 'name');

    if(!request)
        return next(new ErrorHandler('Request Not Found', 404));

    // console.log('request.receiver', request.receiver._id.toString());
    // console.log('req.userId', req.userId.toString());

    if(request.receiver._id.toString() !== req.userId.toString())
        return next(new ErrorHandler('You are not authorized to accept this request.', 401));

    if(!accept) {
        await request.deleteOne();

        return res.status(200).json({
            success: true,
            message: 'Request Rejected',
        })
    }

    const members = [request.sender._id, request.receiver._id];

    await Promise.all([Chat.create({
            members,
            name: `${request.sender.name}-${request.receiver.name}`,
        }),
        request.deleteOne()
    ]);

    emitEvent(req, REFETCH_CHATS, members);

    return res
        .status(200)
        .json({
            success: true,
            message: 'Request Accepted',
            senderId: request.sender._id
        });
});

const getMyNotifications = TryCatch(async (req, res, next) => {

    const request = await Request.find({ receiver: req.userId }).populate('sender', 'name avatar');

    const allRequests = request.map(({_id, sender}) => ({
        _id,
        sender: {
            _id: sender._id,
            name: sender.name,
            avatar: sender.avatar.url
        }
    }));

    return res
        .status(200)
        .json({
            success: true,
            message: 'Requests Retrieved',
            Request: allRequests
        });
});

const getMyFriends = TryCatch(async (req, res, next) => {

    const chatId = req.query.chatId;

    const chat = await Chat.find({
        members: req.userId,
        groupChat: false
    }).populate('members', 'name avatar');

    const friends = chat.map(({members}) => {
        const otherUser = getOtherMember(members, req.userId);
        return {
            _id: otherUser._id,
            name: otherUser.name,
            avatar: otherUser.avatar.url
        };
    });

    if(chatId) {
        const chat = await Chat.findById(chatId);
        const availableFriends = friends.filter(
            (friend) => !chat.members.includes(friend._id)
        );
        return res.status(200).json({
            success: true,
            friends: availableFriends
        });
    } else {
        return res
            .status(200)
            .json({
                success: true,
                friends
            });

    }
});

export {
    login,
    register,
    getMyProfile,
    logout,
    searchUser,
    sendFriendRequest,
    acceptFriendRequest,
    getMyNotifications,
    getMyFriends,
};