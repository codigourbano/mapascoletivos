
/*!
 * Module dependencies
 */

var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	crypto = require('crypto'),
	moment = require('moment'),
	oAuthTypes = ['facebook', 'google'];

/**
 * User schema
 */

var UserSchema = new Schema({
	name: { type: String, default: '' },
	email: { type: String, default: '' },
	username: String,
	isAdmin: {type: Boolean, default: false},
	needsEmailConfirmation: {type: Boolean, default: true},	
	hashed_password: { type: String, default: '' },
	logins: Number,
	lastLogin: Date,
	localization: String,
	bio: {type: String, default: '' },
	web: String,
	status: {type: String, enum: ['to_migrate', 'inactive', 'active'], default: 'inactive' },
	salt: { type: String, default: '' },
	layers: [{type: Schema.ObjectId, ref: 'Layer'}],
	authToken: { type: String, default: '' }, 
	facebook: {},
	google: {},
	updatedAt: Date,
	oldId: Number // to store id used in old Mapas Coletivos
});

/**
 * Virtuals
 */

UserSchema
	.virtual('password')
	.set(function(password) {
		this._password = password
		this.salt = this.makeSalt()
		this.hashed_password = this.encryptPassword(password)
	})
	.get(function() { return this._password });

/**
 * Validations
 */

var validatePresenceOf = function (value) {
	return value && value.length;
}

// the below 5 validations only apply if you are signing up traditionally

UserSchema.path('name').validate(function (name) {
	if (this.doesNotRequireValidation()) return true
	return name.length;
}, 'Name cannot be blank');

UserSchema.path('email').validate(function (email) {
	if (this.doesNotRequireValidation()) return true
	return email.length
}, 'Email cannot be blank');

UserSchema.path('email').validate(function (email, fn) {
	var User = mongoose.model('User')
	if (this.doesNotRequireValidation()) fn(true)

	// Check only when it is a new user or when email field is modified
	if (this.isNew || this.isModified('email')) {
		User.find({ email: email }).exec(function (err, users) {
			fn(!err && users.length === 0)
		})
	} else 
		fn(true);
}, 'Este e-mail já existe.');

UserSchema.path('username').validate(function (username, fn) {
	var User = mongoose.model('User');

	// Check only when it is a new user or when username field is modified
	if (this.isNew || this.isModified('username')) {
		User.find({ username: username }).exec(function (err, users) {
			fn(!err && users.length === 0)
		})
	} else 
		fn(true);
}, 'Este nome de usuário já é utilizado.');


/**
 * Pre-save hook
 */

// UserSchema.pre('save', function(next) {
// 	if (!this.isNew) return next();

// 	if (!validatePresenceOf(this.password)
// 		&& !this.doesNotRequireValidation())
// 		next(new Error('Invalid password'));
// 	else
// 		next();
// })

/**
 * Methods
 */

UserSchema.methods = {

	/**
	 * Authenticate - check if the passwords are the same
	 *
	 * @param {String} plainText
	 * @return {Boolean}
	 * @api public
	 */

	authenticate: function (plainText) {
		return this.encryptPassword(plainText) === this.hashed_password
	},

	/**
	 * Make salt
	 *
	 * @return {String}
	 * @api public
	 */

	makeSalt: function () {
		return Math.round((new Date().valueOf() * Math.random())) + ''
	},

	/**
	 * Encrypt password
	 *
	 * @param {String} password
	 * @return {String}
	 * @api public
	 */

	encryptPassword: function (password) {
		if (!password) return ''
		var encrypred
		try {
			encrypred = crypto.createHmac('sha1', this.salt).update(password).digest('hex')
			return encrypred
		} catch (err) {
			return ''
		}
	},

	/**
	 * Send reset password token if not using OAuth
	 */

	sendResetToken: function() {
		var 
			Token = mongoose.model('Token'),
			self = this,
			token;

			
		if (self.doesNotRequireValidation){
			var seed = crypto.randomBytes(20);
			var id = crypto.createHash('sha1').update(seed).digest('hex');
			
			token = new Token({
				_id: id,
				user: self,
				expiresAt: moment().add('hour', 1).toDate()
			}).save();
		} 
	},

	/**
	 * Validation is not required if using OAuth
	 */

	doesNotRequireValidation: function() {
		return ~oAuthTypes.indexOf(this.provider);
	}
}


/**
 * Statics
 */

UserSchema.static({

})

/**
 * Register
 */

mongoose.model('User', UserSchema)
