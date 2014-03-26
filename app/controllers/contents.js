
/**
 * Module dependencies.
 */

var mongoose = require('mongoose'), 
	Content = mongoose.model('Content'),
	Layer = mongoose.model('Layer'),
	utils = require('../../lib/utils'),
	extend = require('util')._extend,
	_ = require('underscore');

/**
 * Load
 */

exports.load = function(req, res, next, id){
	Content.load(id, function (err, content) {
		if (err) {
			return next(err)
		} else if (!content) {
			return res.json(400, {
				messages: [{
					status: 'error',
					message: 'Content not found.'
				}]
			});
		} else {
			req.content = content;
			next();
		}
	});
}

/**
 * Create a content
 */

exports.create = function (req, res) {

	// clear field from body that should be handled internally
	delete req.body['creator'];

	var 
		content = new Content(req.body)
		newFeaturesArray = req.body.features;
		
	// associate content to user originating request
	content.creator = req.user;
	
	Layer.findById(req.body['layer'], function(err, layer){
		if (err) res.json(400, utils.errorMessages(err.errors || err));
		else {
			layer.contents.addToSet(content);
			layer.save(function(err){
				if (err) res.json(400, utils.errorMessages(err.errors || err));
				else {
					content.updateSirTrevor(req.body.sirTrevorData, function(err, ct){
						if (err) res.json(400, utils.errorMessages(err.errors || err));
						else
							ct.setFeatures(req.body.features, function(err,ct){
								if (err) res.json(400, utils.errorMessages(err.errors || err));
								else
									content.save(function(err){
										// console.log('salvou o content assim\n'+content);
										if (err) res.json(400, utils.errorMessages(err.errors || err));
										else res.json(content);
									});
							});
					});
				}
			});
		}
	});
}

/**
 * Show
 */

exports.show = function(req, res){
	return res.json(req.content);
}

/**
 * Update content
 */

exports.update = function(req, res){
	
	var 
		content = req.content,
		updatedSirTrevor = req.body.sirTrevorData,
		updatedFeatures = req.body.features;
	
	delete req.body['creator'];
	delete req.body.layer;
	delete req.body.features;

	content = extend(content, req.body)

	content.updateSirTrevor(updatedSirTrevor, function(err, ct){
		if (err) res.json(400, utils.errorMessages(err.errors || err));
		else
			ct.setFeatures(updatedFeatures, function(err, ct){
				if (err) res.json(400, utils.errorMessages(err.errors || err));
				else
					ct.save(function(err){
						if (err) res.json(400, utils.errorMessages(err.errors || err));
						else res.json(ct);
					});
			});
	});

}

/**
 * Destroy content
 */

exports.destroy = function(req, res){
	var 
		content = req.content;

	mongoose.model('Layer').findById(content.layer, function(err, layer){
		if (err) res.json(400, utils.errorMessages(err.errors || err));
		else {

			layer.contents.pull({_id: content._id});

			layer.save(function(err){
				if (err) res.json(400, utils.errorMessages(err.errors || err));
				else {
					content.remove(function(err){
						if (err) res.json(400, utils.errorMessages(err.errors || err));
						else res.json({messages: [{status: 'ok', text: 'Content removed successfully.'}]});
					})
				}
			})
		}
	})
}