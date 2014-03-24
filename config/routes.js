
/**
 * Module dependencies.
 */

var mongoose = require('mongoose');

/**
 * Controllers dependencies.
 */

var 
	home = require('home'),
	users = require('users'),
	token = require('token'),
	maps = require('maps'),
	layers = require('layers'),
	features = require('features'),
	contents = require('contents'),
	images = require('images'),
	admin = require('admin'),
	importMC = require('importMC'),
	auth = require('./middlewares/authorization');

/**
 * Expose routes
 */

module.exports = function (app, passport) {

	var apiPrefix = '/api/v1';

	app.get('/', home.index);

	/*
	 * Institutional routes
	 */
	app.get('/about', home.about);
	app.get('/tutorial', home.tutorial);
	app.get('/terms-of-use', home.terms);

	/** 
	 * Users routes 
	 **/
	app.get('/login', users.login);
	app.get('/forgot_password', users.forgotPassword);
	app.post('/forgot_password', users.newPasswordToken);	
	app.get('/signup', users.signup);
	app.get('/logout', users.logout);
	app.get('/migrate', users.showMigrate);
	app.post('/migrate', users.migrate);
	
	app.post('/users', users.create)
	app.put(apiPrefix + '/users', auth.requiresLogin, users.update)
	app.get(apiPrefix + '/users/:userId', users.show)
	app.post('/users/session',
		passport.authenticate('local', {
		failureRedirect: '/login',
		failureFlash: true
	}), users.session)
	
	/** 
	 * Token route 
	 **/
	app.get('/activate_account/:tokenId', token.activateAccount);
	app.get('/new_password/:tokenId', token.newPasswordForm);
	app.post('/password_reset/:tokenId', token.newPassword);	
	app.post('/password_needed/:tokenId', token.newPassword);	
	app.get('/migrate_account/:tokenId', token.migrateAccount);	
	app.get('/email_change/:tokenId', token.emailChange);	
	app.param('tokenId', token.load);
	
	/** 
	 * Facebook login routes 
	 **/
	
	app.get('/auth/facebook',
		passport.authenticate('facebook', {
			scope: [ 'email', 'user_about_me'],
			failureRedirect: '/login',
			failureFlash: true
	}), users.signin)
	app.get('/auth/facebook/callback',
		passport.authenticate('facebook', {
		failureRedirect: '/login',
		failureFlash: true
	}), users.authCallback)

	// Google OAuth routes

	app.get('/auth/google',
		passport.authenticate('google', {
		failureRedirect: '/login',
		failureFlash: true,
		scope: [
			'https://www.googleapis.com/auth/userinfo.profile',
			'https://www.googleapis.com/auth/userinfo.email'
		]
	}), users.signin)
	app.get('/auth/google/callback',
		passport.authenticate('google', {
		failureRedirect: '/login',
		failureFlash: true
	}), users.authCallback)

	app.param('userId', users.user)

	/** 
	 * Feature routes 
	 **/
	app.param('featureId', features.load) 
	// new feature should be associated to a layer
	app.get(apiPrefix + '/features', features.index);
	app.get(apiPrefix + '/features/:featureId', features.show);
	app.post(apiPrefix + '/layers/:layerId/features', [auth.requiresLogin, auth.feature.canCreate] , features.create);	
	app.put(apiPrefix + '/features/:featureId', [auth.requiresLogin, auth.feature.canEditOrDelete], features.update);
	
	/** 
	 * Content routes 
	 **/
	
	app.param('contentId', contents.load);
	// new content should be associated to a layer
	app.get(apiPrefix + '/contents/:contentId', contents.show);
	app.post(apiPrefix + '/contents', [auth.requiresLogin, auth.content.canCreate], contents.create);	
	app.put(apiPrefix + '/contents/:contentId', [auth.requiresLogin, auth.content.canEditOrDelete], contents.update);
	app.del(apiPrefix + '/contents/:contentId', [auth.requiresLogin, auth.content.canEditOrDelete], contents.destroy);
	
	/** 
	 * Layer routes 
	 **/
	app.param('layerId', layers.load);
	app.get(apiPrefix + '/layers', layers.index);
	app.post(apiPrefix + '/layers', auth.requiresLogin, layers.create);
	app.get(apiPrefix + '/layers/:layerId', layers.show);
	app.del(apiPrefix + '/layers/:layerId', [auth.requiresLogin, auth.layer.requireOwnership], layers.destroy);
	app.put(apiPrefix + '/layers/:layerId', [auth.requiresLogin, auth.layer.requireOwnership], layers.update);
	app.put(apiPrefix + '/layers/:layerId/contributors/add', [auth.requiresLogin, auth.layer.requireOwnership], layers.addContributor);
	app.del(apiPrefix + '/layers/:layerId/contributors/remove', [auth.requiresLogin, auth.layer.requireOwnership], layers.removeContributor);


	/**
	 * Map routes
	 **/
	app.param('mapId', maps.load);
	app.get(apiPrefix + '/maps', maps.index);
	app.post(apiPrefix + '/maps', auth.requiresLogin, maps.create);
	app.del(apiPrefix + '/maps/:mapId', auth.requiresLogin, maps.destroy);
	app.put(apiPrefix + '/maps/:mapId', auth.requiresLogin, maps.update);
	app.get(apiPrefix + '/maps/:mapId', maps.show);

	
	/**
	 * Images routes
	 **/
	app.param('imageId', images.load);
	app.get(apiPrefix + '/images/:imageId', auth.requiresLogin, images.show);
	app.get('/images', images.showForm);
	app.post(apiPrefix + '/images', auth.requiresLogin, images.create);
	app.del(apiPrefix + '/images', auth.requiresLogin, images.destroy);
	
	/** 
	 * Association routes
	 **/
	
	// layer x feature
	app.put(apiPrefix + '/layers/:layerId/features/:featureId', [auth.requiresLogin, auth.feature.canEditOrDelete], layers.addFeature);
	app.del(apiPrefix + '/layers/:layerId/features/:featureId', [auth.requiresLogin, auth.feature.canEditOrDelete], layers.removeFeature);
	
	// feature x content
	app.put(apiPrefix + '/features/:featureId/contents/:contentId', auth.requiresLogin, features.addContent);
	app.del(apiPrefix + '/features/:featureId/contents/:contentId', auth.requiresLogin, features.removeContent);

	app.get('/import', importMC.import);

	/**
	 * Admin routes
	 */
	app.get('/admin', admin.index);

	app.get('/admin/settings', admin.settings);
	app.get('/admin/settings/privacy', admin.privacy);

	app.get('/admin/users', admin.users);
	app.get('/admin/users/new', admin.newUser);
	app.get('/admin/users/permissions', admin.permissions);

	/*
	 * All other routes enabled for Angular app (no 404)
	 */
	app.get('/*', home.app);

}
