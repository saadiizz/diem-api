var Validator = require('jsonschema').Validator;
var v = new Validator();
var wepayUserRegisterSchema = require('./wepayUserRegisterSchema');

module.exports.validateSchema = function(req, res, next) {
	var body = req.body;
	var schema = wepayUserRegisterSchema.wepayUserSchema;
	console.log('body<<', body);
	console.log('schema', schema);
	var schemaValidator = v.validate(body, schema);
    if (typeof schemaValidator.errors !== 'undefined' && schemaValidator.errors.length > 0) {
        return res.status(422).send({apiStatus: "fail",msg: schemaValidator.errors});
    }
    else{
        return next();
    }
};
