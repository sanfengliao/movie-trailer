const mongoose = require('mongoose')
//const bcrypt = require('bcrypt')
const Schema = mongoose.Schema
const Mixed = mongoose.Types.Mixed
const SALT_WORK_FACTOR = 5
const MAX_LOGIN_ATTEMPTS = 5
const LOCK_TIME = 2 * 60 * 60 * 1000

const userSchema = new Schema({
  username: {
    unique: true,
    required: true,
    type: String,
  },

  email: {
    unique: true,
    required: true,
    type: String
    
  },

  password: {
    unique: true,
    type: String
  },

  loginAttempt: {
    type: Number,
    required: true,
    default: 0
  },
  
  lockUtil: Number,
  meta: {
    creatAt: {
      type: Date,
      default: Date.now()
    },
    updateAt: {
      type: Date,
      default: Date.now()
    }
  }
})

userSchema.virtual('isLocked').get(function() {
  return !!(this.isLocked && this.lockUtil > Date.now())
})

userSchema.pre('save', function(next) {
  if (this.isNew) {
    this.meta.creatAt = Date.now()
  } else {
    this.meta.updateAt = Date.now()
  }
  next()
})

// userSchema.pre('save', function(next) {
//   if (!this.isModified('password')) return next()
//   bcrypt.genSalt(SALT_WORK_FACTOR, (err, salt) => {
//     if(err) return next(err)
//     bcrypt.hash(this.password, salt, (err, hash) => {
//       if (err) return next(err)
//       this.password = hash
//       next()
//     })
//   })
// })

userSchema.methods = {
  // comparePassword: (_password, password) => {
  //   return new Promise((resolve, reject) => {
  //     bcrypt.compare(_password, password,(err, isMach) => {
  //         if(!err) resolve(isMach)
  //         else reject(err)
  //     })
  //   })
  // },
  incLoginAttempts: function (user){
    return new Promise((resolve, reject) => {
      if (this.lockUtil && this.lockUtil < Date.now()) {
        this.update({
          $set: {
            loginAttempt: 1
          },
          $unset: {
            lockUtil: 1
          }
        }, (err) => {
          if(err) {
            reject(err)
          } else {
            resolve(true)
          }
        })
      } else {
        let update = {
          $inc: {
            loginAttempt: 1
          }
        }
        if(this.loginAttempt + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
          update.$set = {
            lockUtil: Date.now() + LOCK_TIME
          }
        }
        this.update(update, err => {
          if(!err) resolve(true)
          else reject(err)
        })
      }
    })
  }
}

mongoose.model('User', userSchema)


