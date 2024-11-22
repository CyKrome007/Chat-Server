import express from "express";
import userRoute from "./routes/user.routes.js";
import chatRoute from "./routes/chat.routes.js";
import adminRoute from "./routes/admin.routes.js";
import {connectDB} from "./utils/features.js";
import dotenv from "dotenv";
import {errorMiddleware} from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import {Server} from "socket.io";
import {createServer} from 'http';
import {
    CHAT_JOINED,
    CHAT_LEFT,
    NEW_MESSAGE,
    NEW_MESSAGE_ALERT,
    ONLINE_USERS,
    START_TYPING,
    STOP_TYPING
} from "./constants/events.js";
import {v4 as uuid} from "uuid";
import {getSockets} from "./lib/helper.js";
import {Message} from "./models/message.js";
import cors from "cors";
import {v2 as cloudinary} from "cloudinary";
import {corsOptions} from "./constants/config.js";
import {socketAuthenticator} from "./middlewares/auth.js";

dotenv.config({
    path: "./.env",
})

const dbURI = process.env.DATABASE_URI;
const port = process.env.PORT || 3000;
const envMode = process.env.NODE_ENV.trim() || 'PRODUCTION';
const adminSecretKey = process.env.ADMIN_SECRET_KEY || 'HAZIFUN';
const userSocketIDs = new Map();
const onlineUsers = new Set();

console.log('dbName:', process.env.DATABASE_NAME.toString().trim());
console.log('Cookie Name:', process.env.COOKIE);

connectDB(dbURI, {
    dbName: process.env.DATABASE_NAME.toString().trim()
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME.toString().trim(),
    api_key: process.env.CLOUDINARY_API_KEY.toString().trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET.toString().trim(),
});

// createSingleChats(10);

// createGroupChats(10);
// createMessages(50);

// createUser(10);

const app = express();
const server = createServer(app)
const io = new Server(server, {cors: corsOptions});

app.set('io', io);

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

app.use('/api/v1/user', userRoute);
app.use('/api/v1/chat', chatRoute);
app.use('/api/v1/admin', adminRoute);

app.get("/", (req, res) => {
    res.send("Hello World!");
});

io.use((socket, next) => {

    cookieParser()(socket.request, socket.request['res'], async (err) => {
        await socketAuthenticator(err, socket, next);
    });
});

io.on('connection', (socket) => {

    const user = socket['user'];
    userSocketIDs.set(user._id.toString(), socket.id);

    socket.on(NEW_MESSAGE, async ({chatId, members, message}) => {

        const messageForRealtime = {
            content: message,
            _id: uuid(),
            sender: {
                _id: user._id,
                name: user.name,
            },
            chat: user._id,
            createdAt: new Date().toISOString(),
        }

        const messageForDB = {
            content: message,
            sender: user._id,
            chat: chatId,
        }

        const membersSocket = getSockets(members);

        io.to(membersSocket).emit(NEW_MESSAGE, {
            chatId,
            message: messageForRealtime,
        });
        io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId })
        try {
            await Message.create(messageForDB);
        } catch (err) {
            throw new Error(err);
        }
    });

    socket.on(START_TYPING, ({ members, chatId }) => {
        const memberSockets = getSockets(members);
        socket.to(memberSockets).emit(START_TYPING, { chatId });
    });

    socket.on(STOP_TYPING, ({ members, chatId }) => {
        const memberSockets = getSockets(members);
        socket.to(memberSockets).emit(STOP_TYPING, { chatId });
    });

    socket.on(CHAT_JOINED, ({ members, userId }) => {
        // console.log("Joined Members", members);
        onlineUsers.add(userId.toString());
        const memberSockets = getSockets(members);
        io.to(memberSockets).emit(ONLINE_USERS, Array.from(onlineUsers));
    });

    socket.on(CHAT_LEFT, ({ members, userId }) => {
        // console.log('Left Members', members);
        onlineUsers.delete(userId.toString());
        const memberSockets = getSockets(members);
        io.to(memberSockets).emit(ONLINE_USERS, Array.from(onlineUsers));
    });

    socket.on('disconnect', () => {
        userSocketIDs.delete(user._id.toString());
        onlineUsers.delete(user._id.toString());
        socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
    });
});

app.use(errorMiddleware);

server.listen(port, () => {
    console.log(`Server running on port ${port} in ${envMode} mode`);
});

export {envMode, adminSecretKey, userSocketIDs}
