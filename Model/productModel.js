
const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const sizeSchema = new mongoose.Schema({
    size: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        default: 0,
    }
});

const reviewSchema =new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    raiting:{
        type:String,
        required:true,
    },
    comment:{
        type:String,
        required:true
    },
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"User"

    }
})

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        
    },
    realPrice: {
        type: Number,
       
    },
    brandName:{
        type:String,
        required:true,

    },
    sizes: [sizeSchema],
    description: {
        type: String,
       
    },
   
    images: {
        type: Array,
    },
    is_active: {
        type: Boolean,
        default: true,
    },
    categoryId: {
        type: ObjectId,
        ref: 'Category',
        required: true
    },
    review:[reviewSchema],
    date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);