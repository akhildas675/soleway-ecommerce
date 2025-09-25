function generateOrderId(){

    const timeAndDate = new Date.now().toString();
    const randomChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let orderId = "OID";
    while(orderId.length<13){
        const randomIndex=Math.floor(Math.random()*randomChars.length);
        orderId+=randomChars.charAt(randomIndex)
    }
    return orderId+timeAndDate
}


module.exports={generateOrderId}