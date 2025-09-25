const Order = require('../../Model/orderModel');
const { generateOrderId } = require('./user/utils/generateOrderId');
const {updateProductStock}=require('./user/utils/productUtils')



const createSingleOrder=async(orderData) =>{
    const {

        item,
        findAddress,
        userId,
        finalProductTotal,
        couponDetails,
        paymentMethod,
        orderStatus,
        paymentStatus,

    }=orderData


    const newOrderId=generateOrderId();

    const newOrder = new Order({
        userId: userId,
        orderId: newOrderId,
        products:[
            {
                productId:item.productId._id,
                quantity: item.quantity,
                size: item.size,
            },
        ],

        address:{
            addressName:findAddress.name,
            mobile:findAddress.mobile,
            homeAddress: findAddress.homeAddress,
            city: findAddress.city,
            district: findAddress.district,
            state: findAddress.state,
            pincode: findAddress.pincode,

        },
        totalAmount:finalProductTotal,
        coupon: couponDetails,
        orderStatus: orderStatus,
        paymentMethod: paymentMethod,
        paymentStatus: paymentStatus,
    });

    const savedOrder = await newOrder.save();
    return savedOrder.id;
    
};



const createOrders = async (orderData)=>{
    const {
        findCart,
        findAddress,
        userId,
        totalAmount,
        discountAmount,
        couponDetails,
        paymentMethod,
        orderStatus,
        paymentStatus,
        updateStock=true
        

    }=orderData;


    const orderIds=[];


    for(let item of findCart.cartProducts){
        const product = item.productId;
        const productPrice = product.offerPrice || product.realPrice;
        const productTotal = productPrice * item.quantity;
        const productDiscount = couponDetails.couponCode ? (productTotal/totalAmount)*discountAmount : 0;

        const finalProductTotal = productTotal - productDiscount;

        const orderId = await createSingleOrder({
            item,
            findAddress,
            userId,
            finalProductTotal,
            couponDetails,
            paymentMethod,
            orderStatus,
            paymentStatus
        });

        orderId.push(orderId);


        //update Stock


        if(updateStock){
            await updateProductStock(product._id, item.size, item.quantity);
        }

        
    }
    

    return orderIds;




}


module.exports={createSingleOrder,createOrders}