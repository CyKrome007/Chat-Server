import {body, param, query, validationResult, check} from "express-validator";
import {ErrorHandler} from "../utils/utility.js";

const validateHandler = (req, res, next) => {
    const errors = validationResult(req);
    const errorMessage = errors.array().map(e => e.msg).join(', ');

    if(errors.isEmpty())
        return next();
    else
        return next(new ErrorHandler(errorMessage), 400);
}

const registerValidator = () => [
    body('name', 'Please Enter Name').notEmpty().trim(),
    body('username', 'Please Enter Username').notEmpty().trim(),
    body('bio', 'Please Enter Bio').notEmpty().trim(),
    body('password', 'Please Enter Password').notEmpty().trim(),
];

const loginValidator = () => [
    body('username', 'Please Enter Username').notEmpty().trim(),
    body('password', 'Please Enter Password').notEmpty().trim(),
];

const newGroupValidator = () => [
    body('name', 'Please Enter Group Name').notEmpty().trim(),
    body('members')
        .notEmpty()
        .withMessage('Please Add Members')
        .isArray({
            min: 2,
            max: 100
        })
        .withMessage('Members must be between 3 and 100'),
];

const addMemberValidator = () => [
    body('chatId', 'Please Enter Chat ID').notEmpty().trim(),
    body('members')
        .notEmpty()
        .withMessage('Please Add Members')
        .isArray({
            min: 1,
            max: 97
        })
        .withMessage('You can add 1 to 97 Members Max'),
];

const removeMemberValidator = () => [
    body('chatId', 'Please Enter Chat ID').notEmpty().trim(),
    body('userId', 'Please Enter User ID').notEmpty().trim(),
];

const sendAttachmentsValidator = () => [
    body('chatId', 'Please Enter Chat ID').notEmpty().trim(),
];

const chatIdValidator = () => [
    param('id', 'Please Enter Chat ID').notEmpty().trim(),
];

const renameGroupValidator = () => [
    param('id', 'Please Enter Chat ID').notEmpty().trim(),
    body('name', 'Please Enter New Name').notEmpty().trim(),
];

const sendRequestValidator = () => [
    body('userId', 'Please Enter User ID').notEmpty().trim(),
];


const acceptRequestValidator = () => [
    body('requestId', 'Please Enter Request ID').notEmpty().trim(),
    body('accept', 'Please Add Accept')
        .notEmpty()
        .isBoolean()
        .withMessage('Accept must be boolean'),
];

const adminLoginValidator = () => [
    body('secretKey', 'Please Enter Secret Key').notEmpty().trim(),
];

export {
    registerValidator, loginValidator, newGroupValidator, addMemberValidator, removeMemberValidator, adminLoginValidator,
    sendAttachmentsValidator, chatIdValidator, renameGroupValidator, sendRequestValidator, acceptRequestValidator,
    validateHandler
};
