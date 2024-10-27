"use strict"

class ResponseCreator {

  /**
   * Helper method to create JSON response for all data returning from server
   * @param  {String} title       title of API
   * @param  {String} requestType Request type of API
   * @param  {String} baseUri     URI of API call
   * @param  {Number} statusCode  Return status of API request
   * @param  {String} message     Message from server
   * @param  {String} moreInfo    additional info from server
   * @param  {Object} data        Data returned from server
   * @return {Callback}           Return is an asynchronous callback method
   */
  static create(title, requestType, baseUri, statusCode, message, moreInfo, data) {
  	var status = {};

  	switch (statusCode) {
  		// SUCCESSFUL
  		case 200:
  			status = "OK";
  			break;
  		case 201:
  			if (requestType == "POST") {
  				status = "CREATED";
  			} else {
  				status = "UPDATED";
  			}
  			break;
  		case 202:
  			status = "ACCEPTED";
  			break;
  		case 203:
  			status = "NON-AUTHORITATIVE-INFORMATION";
  			break;
  		case 204:
  			status = "NO CONTENT";
  			break;
  		case 205:
  			status = "RESET CONTENT";
  			break;
  		case 206:
  			status = "PARTIAL CONTENT";
  			break;

  		// CLIENT ERROR
  		case 400:
  			status = "BAD REQUEST";
  			break;
  		case 401:
  			status = "UNAUTHORIZED";
  			break;
  		case 402:
  			status = "PAYMENT REQUIRED";
  			break;
  		case 403:
  			status = "DENIED";
  			break;
  		case 404:
  			status = "NOT FOUND";
  			break;
  		case 405:
  			status = "METHOD NOT ALLOWED";
  			break;
  		case 406:
  			status = "NOT ACCEPTABLE";
  			break;
  		case 407:
  			status = "PROXY AUTHENTICATION REQUIRED";
  			break;
  		case 408:
  			status = "REQUEST TIMEOUT";
  			break;
  		case 409:
  			status = "CONFLICT";
  			break;
  		case 410:
  			status = "GONE";
  			break;
  		case 411:
  			status = "LENGTH REQUIRED";
  			break;
  		case 412:
  			status = "PRECONDITION FAILED";
  			break;
  		case 413:
  			status = "REQUEST ENTITY TOO LARGE";
  			break;
  		case 414:
  			status = "REQUEST-URI TOO LONG";
  			break;
  		case 415:
  			status = "UNSUPPORTED MEDIA TYPE";
  			break;
  		case 416:
  			status = "REQUESTED RANGE NOT SATISFIABLE";
  			break;
  		case 417:
  			status = "EXPECTATION FAILED";
  			break;

  		// SERVER ERROR
  		case 500:
  			status = "INTERNAL SERVER ERROR";
  			break;
  		case 501:
  			status = "NOT IMPLEMENTED";
  			break;
  		case 500:
  			status = "BAD GATEWAY";
  			break;
  		case 500:
  			status = "SERVICE UNAVAILABLE";
  			break;
  		case 500:
  			status = "GATEWAY TIMEOUT";
  			break;
  		case 500:
  			status = "HTTP VERSION NOT SUPPORTED";
  			break;
  		case 500:
  			status = "NETWORK AUTHENTICATION REQUIRED";
  			break;

  		default:
  			console.log("Status code required.");
  			return;
  	}

  	if (data == null) {
  		data = {};
  	}

  	if (moreInfo == null) {
  		moreInfo = {};
  	}

  	const json = {
  		meta 	: {
  			title			   : title,
  			request_type : requestType,
  			base_URI		 : baseUri,
  			version			 : 1,
  			status_code  : statusCode,
  			status 			 : status,
  			message 		 : message,
  			more_info		 : moreInfo
  		},
  		data	: data
  	};

  	return json;
  }

  /**
   * Helper method to generate random code
   * @param  {Number} min Minimum of range to generate random code
   * @param  {Number} max Maximum of range to generate random code
   * @return {Number}     Random generated code created from min and max value
   */
  static generateCode(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

module.export = ResponseCreator;
