const mongoose=require('mongoose');
const MONGO_URL='mongodb://127.0.0.1:27017/webtech';

async function main(){
    await mongoose.connect(MONGO_URL);
}

module.exports = () => {
    main()
    .then(()=>{
        console.log("database connected");
    }).catch((err)=>{
        console.log(err);   
    });
};