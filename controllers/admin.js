import { TryCatch } from "../middlewares/error.js";
import { User } from "../models/user.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { ErrorHandler } from "../utils/utility.js";
import jwt from "jsonwebtoken";
import { cookieOptions } from "../utils/features.js";
import { adminSecretKey } from "../app.js";

const adminLogin = TryCatch(async (req, res, next) => {
    const { secretKey } = req.body;

    const isMatched = secretKey === adminSecretKey;

    if(!isMatched)
        return next(new ErrorHandler('Invalid Admin Key', 401));

    const token = jwt.sign(adminSecretKey, process.env.JWT_SECRET);

    return res
        .status(200)
        .cookie(process.env.ADMIN_COOKIE, token, {
            ...cookieOptions,
            maxAge: 1000 * 60 * 15
        })
        .json({
            success: true,
            message: 'Authentication success',
        });
});

const adminLogout = TryCatch(async (req, res) => {
    return res
        .status(200)
        .cookie(process.env.ADMIN_COOKIE, '', {
            ...cookieOptions,
            maxAge: 0
        })
        .json({
            success: true,
            message: 'Logout Success',
        });
});

const getAdminData = TryCatch(async (req, res) => {
    return res.status(200).json({
        admin: true
    });
});

const allUsers = TryCatch(async(req, res) => {
    const users = await User.find({});

    const transformedUsers = await Promise.all(
        users.map(
            async({name, username, avatar, _id}) => {

                const [groups, friends] = await Promise.all([
                    Chat.countDocuments({groupChat: true, members: _id}),
                    Chat.countDocuments({groupChat: false, members: _id}),
                ]);

                return {
                    name,
                    username,
                    avatar: avatar.url,
                    _id,
                    groups,
                    friends
                };
            }
        )
    );

    return res.status(200).json({
        success: true,
        users: transformedUsers
    });
});

const allChats = TryCatch(async(req, res) => {
    const chats = await Chat.find({})
        .populate('members', 'name avatar')
        .populate('creator', 'name avatar');

    const transformedChats = await Promise.all(
        chats.map(async({name, creator, members, avatar, groupChat, _id}) => {

            const totalMessages = await Message.countDocuments({chat: _id});

            const [groups, friends] = await Promise.all([
                Chat.countDocuments({groupChat: true, members: _id}),
                Chat.countDocuments({groupChat: false, members: _id}),
            ]);

            return {
                name,
                _id,
                groupChat,
                avatar: members.slice(0, 3).map((member) => member.avatar),
                members: members.map(({_id, name, avatar}) => ({
                    _id,
                    name,
                    avatar
                })),
                creator: {
                    name: creator?.name || 'None',
                    avatar: creator?.avatar || {},
                },
                totalMembers: members.length,
                totalMessages
            };
        })
    );

    return res.status(200).json({
        success: true,
        chats: transformedChats
    });
});

const allMessages = TryCatch(async(req, res) => {
    const messages = await Message.find({})
        .populate('sender', 'name avatar')
        .populate('chat', 'groupChat');

    const transformedMessages = await Promise.all(
        messages.map(async ({content, attachments, _id, sender, createdAt, chat}) => {

            return{
                _id,
                attachments,
                content,
                createdAt,
                chat: chat._id,
                groupChat: chat.groupChat,
                sender: {
                    _id: sender._id,
                    name: sender.name,
                    avatar: sender.avatar.url
                },
            };
        })
    );

    return res.status(200).json({
        success: true,
        messages: transformedMessages
    });
});

const getDashboardStats = TryCatch(async(req, res) => {

    const [groupsCount, usersCount, messagesCount, totalChats] = await Promise.all([
        Chat.countDocuments({groupChat: true}),
        User.countDocuments({}),
        Message.countDocuments({}),
        Chat.countDocuments({groupChat: false})
    ]);

    const today = new  Date();

    const last7Days = new Date();

    last7Days.setDate(last7Days.getDate() - 7);
    const last7DaysMessages = await Message.find({
        createdAt: {
            $gte: last7Days,
            $lte: today,
        },
    }).select('createdAt');

    const messages = new Array(7).fill(0);

    last7DaysMessages.forEach(message => {
        const index = Math.floor((today.getTime() - message.createdAt.getTime()) / 1000 * 60 * 60 * 24) ;
        messages[6 - index]++;
        console.log(messages);
    });

    const stats = {
        groupsCount,
        usersCount,
        messagesCount,
        totalChats,
        messagesChart: messages
    };

    return res.status(200).json({
        success: true,
        stats
    });
});

export {allUsers, allChats, allMessages, getDashboardStats, adminLogin, adminLogout, getAdminData};
