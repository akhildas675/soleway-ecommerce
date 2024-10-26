const User=require('../Model/userModel')


const isLogin = async (req,res,next)=>{
    try{
        // console.log("inside auth");
        if(req.session.userData){
           
            next()
        }
        else{
            res.redirect('/Login')
            
        }

    } catch (error){
        console.log(error.message);
    }
}


const isLogOut = async (req,res,next)=>{
    try{
    
        if(req.session.userData){
            res.redirect("/")

        }else{
            // console.log("login")
            // res.redirect('/login')
            next()
        }
       

    } catch (error){
        console.log(error.message);
    }
}

const userBlocked=async (req,res,next)=>{
    try {
        const user=await User.findOne({_id:req.session.userData._id})
        if(user&&user.is_active===false){
            res.status(404).redirect('/',{message:'user Blocked'})
        }else{
            next()
        }
        
    } catch (error) {
        
    }
}



module.exports ={
    isLogin,
    isLogOut,
    userBlocked,
}