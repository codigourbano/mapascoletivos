
/**
 * Module dependencies.
 */

var 
	_ = require('underscore'),
	mongoose = require('mongoose'), 
	Feature = mongoose.model('Feature'),
	utils = require('../../lib/utils'),
	extend = require('util')._extend,
	async = require('async');
	
/**
 * Load
 */

exports.load = function(req, res, next, id){
	Feature.load(id, function (err, feature) {
		if (err) {
			return next(err)
		} else if (!feature) {
			return res.json(400, {
				messages: [{
					status: 'error',
					message: 'Feature not found.'
				}]
			});
		} else {
			req.feature = feature;
			next();
		}
	})
}

/**
 * Create a feature
 */

exports.create = function (req, res) {
	var feature = new Feature(req.body);
	feature.creator = req.user;
	feature.layer = req.layer;
	
	// save feature
	feature.save(function (err) {
		if (err) {
			res.json(400, utils.errorMessages(err.errors || err));
		} else {
			var layer = feature.layer;
			layer.features.addToSet(feature);
			
			// save layer
			layer.save(function(err){
				if (err) res.json(400, utils.errorMessages(err.errors || err));
				res.json(feature);
			});
		}
	});
}

/*
 * Import
 * (Batch create features)
 */

exports.import = function(req, res) {
	var layer = req.layer;
	async.each(req.body, function(feature, cb) {

		var feature = new Feature(feature);
		feature.creator = req.user;
		feature.layer = req.layer;

		// save feature
		feature.save(function (err) {
			if (err) {
				cb(err);
			} else {
				layer.features.addToSet(feature);
				cb();
			}
		});
	}, function(err) {
		if(err) res.json(400, utils.errorMessages(err.errors || err));
		else {			
			// save layer
			layer.save(function(err){
				if(err) {
					if(err) res.json(400, utils.errorMessages(err.errors || err));
				} else {
					res.json(layer.features);
				}
			});
		}
	});
}

/**
 * List
 */

exports.index = function(req, res){
	var page = (req.param('page') > 0 ? req.param('page') : 1) - 1;
	var perPage = (req.param('perPage') > 0 ? req.param('perPage') : 30);
	var options = {
		perPage: perPage,
		page: page
	}

	Feature.list(options, function(err, features) {
		if (err) return res.json(400, utils.errorMessages(err.errors || err));
		Feature.count().exec(function (err, count) {
			if (!err) {
				res.json({options: options, featuresTotal: count, features: features});
			} else {
				res.json(400, utils.errorMessages(err.errors || err))
			}
		})
	})
}


/**
 * Show
 */

exports.show = function(req, res){
	res.json(req.feature)
}

/**
 * Update feature
 */

exports.update = function(req, res){
	var 
		feature = req.feature;
	
	// association to contents should be handled at Content Model.
	delete(req.body['contents']);
	
	feature = extend(feature, req.body);

	feature.save(function(err) {
		if (err) res.json(400, utils.errorMessages(err.errors || err));
		else res.json(feature);
	});
}

/**
 * Add content to feature
 */

exports.addContent = function(req, res){
	var 
		feature = req.feature,
		content = req.content;

	// associate content to feature, if not already 
	if ( ! _.contains(feature.contents, content._id) ) { 
		feature.contents.push(content);
	}
	
	// associate feature to content, if not already 
	if ( ! _.contains(content.features, feature._id) ) { 
		content.features.push(feature);
	}

	// save both
	content.save(function(err){
		 if (err) res.json(400, utils.errorMessages(err.errors || err));
		feature.save(function(err){
			if (err) res.json(400,err)
			else res.json({ messages: [{status: 'ok', text: 'Content added successfully.'}] });
		});
	});

}

/**
 * Remove content from feature
 */

exports.removeContent = function(req, res){
	var 
		feature = req.feature,
		content = req.content;
	
	feature.contents = _.filter(feature.contents, function(c) { 
		return !c._id.equals(content._id); 
	});	
	
	content.features = _.filter(content.features, function(f) { 
		return !f._id.equals(feature._id); 
	});	
	
	// save both
	content.save(function(err){
		 if (err) res.json(400, utils.errorMessages(err.errors || err));
		feature.save(function(err){
			if (err) res.json(400,err)
			else res.json({ messages: [{status: 'ok', text: 'Content removed successfully.'}] });
		});
	});
}