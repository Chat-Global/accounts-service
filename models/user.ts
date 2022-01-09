const { model, Schema } = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new Schema(
    {
        id: {
            type: String,
            required: true,
            unique: true
        },
        username: {
            type: String,
            unique: true,
            required: true,
            trim: true
        },
        avatar: {
            type: String,
            required: false,
        },
        email: {
            type: String,
            unique: true,
            required: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true
        },
        token: {
            type: String,
            required: true,
            unique: true
        }
    }
);

userSchema.pre('save', async function(next: any) {

    const user = this as any;
    
    if (!user.isModified('password')) return next();
    
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(user.password, salt);
    user.password = hash;
    
    next();

});

userSchema.methods.comparePassword = async function(
  password: string
): Promise<Boolean> {
    return await bcrypt.compare(password, this.password);
};

module.exports = model('User', userSchema);