import jwt from "jsonwebtoken";
import User from "../models/User.js";

//function to  generate token

// const generate token =(id , role)=> jwt.sign({id , role}, process.env.JWT_SECRET ,{expiryTime : 500})

 export const registerUser = async(req, res) => {
     const{userName , email, password } = req.body;

    //  hash password using bcrypt
    const hashedpassword = bcrypt.hash(password , 10 );

     try {
          
        const user = await User.create ({id ,email ,  userName, password ,role }) 
      res.status(200).json(
        { 
            _id : user._id,
            email: user.email,
          username : user.userName,
          password : user.hashedpassword,
          role : user.role
        }
      )
        
     } catch (error) {
        //  console.error({"error" : error.message})
        res.status(400).json({message : error.message})
     }

}