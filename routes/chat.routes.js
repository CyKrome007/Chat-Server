import express from 'express';
import {isAuthenticated} from "../middlewares/auth.js";
import {
    addMembers, deleteChat,
    getChatDetails, getMessages,
    getMyChats, getMyGroups,
    leaveGroup,
    newGroup,
    removeMember, renameGroup,
    sendAttachments
} from "../controllers/chat.js";
import {attachmentsMulter} from "../middlewares/multer.js";
import {
    addMemberValidator, chatIdValidator,
    newGroupValidator,
    removeMemberValidator, renameGroupValidator, sendAttachmentsValidator,
    validateHandler
} from "../lib/validators.js";
import {validate} from "uuid";

const app = express.Router();

app.use(isAuthenticated);

app.post('/new', newGroupValidator(), validateHandler, newGroup);

app.get('/my', getMyChats);

app.get('/my/groups', getMyGroups);

app.put('/addMembers', addMemberValidator(), validateHandler, addMembers);

app.delete('/removeMember', removeMemberValidator(), validateHandler, removeMember);

app.delete('/leave/:id', chatIdValidator(), validateHandler, leaveGroup);

app.post('/message', attachmentsMulter, sendAttachmentsValidator(), validateHandler, sendAttachments);

app.get('/message/:id', chatIdValidator(), validateHandler, getMessages)

app.route('/:id')
    .get(chatIdValidator(), validateHandler, getChatDetails)
    .put(renameGroupValidator(), validateHandler, renameGroup)
    .delete(chatIdValidator(), validateHandler, deleteChat);

export default app;
