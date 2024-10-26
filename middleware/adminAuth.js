const isLogin= async (req,res,next)=>{
    try {
        if(req.session.adminData){
            // console.log("middle",req.session.adminData);
            
            next()
        }else{
       
           res.redirect('/')
        }
        
    } catch (error) {
        console.log(error);
    }
}


const isLogout=async(req,res,next)=>{
    try {
        if(!req.session.adminData){
            next()
        }else{
            res.redirect('/admin/Home')
        }
    } catch (error) {
        console.log(error)
    }
}


module.exports={
    isLogin,
    isLogout,
}