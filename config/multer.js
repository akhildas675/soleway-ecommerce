const multer = require('multer');
const path = require('path');
const { v4: uuid } = require('uuid');
const fs = require('fs');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../public/Uploads');
       
        fs.mkdir(uploadPath, { recursive: true }, (err) => {
            if (err) {
                return cb(err);
            }
            cb(null, uploadPath);
        });
    },
    filename: function (req, file, cb) {
        const name = `${uuid()}-${file.originalname}`;
        cb(null, name);
    }
});

const upload = multer({ storage: storage });
module.exports = {
    upload
};
