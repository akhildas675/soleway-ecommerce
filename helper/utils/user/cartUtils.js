const Cart = require('../../../Model/cartModel')


const clearCart = async(userId)=>{
    await Cart.findOneAndUpdate(
        {userId:userId},
        {$set:{cartProducts:[]}}
    );
};


module.export={clearCart}