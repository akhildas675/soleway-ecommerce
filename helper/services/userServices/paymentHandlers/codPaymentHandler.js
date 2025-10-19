const {createOrders}=require('../orderServices');
const {clearCart}=require('../../../utils/userUtils/cartUtils');


const handleCODPayment = async (data)=>{
     const {findCart,findAddress,userId,totalAmount,discountAmount, couponDetails, paymentMethod}=data;

     const orderIds = await createOrders({
        findCart,
        findAddress,
        userId,
        totalAmount,
        discountAmount,
        couponDetails,
        paymentMethod,
        orderStatus:"Order Placed",
        paymentStatus:"Received",
     })

     await clearCart(userId);


     return {
        success:true,
        message: "Order placed Successfully",
        orderIds
     };
};


module.exports={handleCODPayment}