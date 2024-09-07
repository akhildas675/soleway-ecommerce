require ('dotenv').config();
const config={
    EMAIL: process.env.EMAIL,
    PASSKEY: process.env.PASSKEY
}

const googleAuth={
    CLIENT_ID:process.env.CLIENT_ID,
    CLIENT_SECRET:process.env.CLIENT_SECRET
}

module.exports={
    config,
    googleAuth,
}
