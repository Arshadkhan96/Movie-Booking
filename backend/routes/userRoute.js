import express from 'express';
import { registerUser,login, getAllUsers } from '../controllers/userController.js';

const userRouter = express.Router();

// REGISTER USER
 userRouter.post('/register',registerUser);

// LOGIN USER
 userRouter.post('/login',login);

// GET ALL USERS
userRouter.get('/', getAllUsers);

 export default userRouter;