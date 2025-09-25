const Products = require('../../Model/productModel')



const updateProductStock= async(productId,size,quantity)=>{
    await Products.updateOne(
        {id:productId,"size.size":size},
        {$inc:{"sizes.$.quantity":quantity}}
    );
};

module.export={updateProductStock}