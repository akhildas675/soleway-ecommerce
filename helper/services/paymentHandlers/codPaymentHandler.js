const {createOrders}=require('../orderServices');
const {clearCart}=require('../../utils/cartUtils');


const handleCodPayments = async (data)=>{
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


module.exports={handleCodPayments}