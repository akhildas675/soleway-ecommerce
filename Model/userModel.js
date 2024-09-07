const mongoose=require('mongoose')


const userSchema=mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },

    mobile:{
        type:Number,
        required:true,
    },
    is_admin:{
        type:Boolean,
        default:0,
    },
    is_active:{
        type:Boolean,
        default:true,
    },



},{
    timestamps:true,
})

module.exports=mongoose.model('User',userSchema)